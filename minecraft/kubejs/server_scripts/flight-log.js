// VIP Craft 4 — Flugzeit und Flugstrecke auf Luftschiffen mitschreiben
//
// Schreibt kubejs/data/flight.json: je Spieler die Sekunden und Meter, die er
// auf einer FLIEGENDEN Contraption zurückgelegt hat. Die Website holt die Datei
// ab und rechnet die Läufe zusammen (siehe lib/flight.ts).
//
// WARUM ÜBERHAUPT: Minecraft zählt Reisestrecken nur für seine eigenen
// Fahrzeuge (Boot, Lore, Pferd, Schwein, Strider) und für Elytren. Eine
// Create-Contraption ist keins davon — im Spielstand steht zu Luftschiffen
// deshalb nichts, in KEINER Kategorie (am 07.09.2026 im Spielstand geprüft).
// Wer es haben will, muss es selbst zählen.
//
// WAS ALS FLUG ZÄHLT: Der Spieler sitzt auf einer Create-Contraption, und die
// ist gerade nicht am Boden. Züge sind ausgenommen — die sind technisch
// ebenfalls Contraptions, fahren aber und fliegen nicht.
//
// SELBSTDIAGNOSE: Unter "seen" steht, welche Fahrzeugklassen tatsächlich
// vorkamen und wie oft — getrennt nach gezählt und übersprungen. Daran lässt
// sich nachprüfen, ob die Einordnung stimmt, ohne die Klassennamen vorher zu
// erraten. Weicht etwas ab, wird hier nachgeschärft.
//
// ALLE Namen tragen das Präfix FLUG_/flug: KubeJS lädt alle server_scripts in
// EIN gemeinsames globales Scope. Ein zweites "var DATEI" würde die
// gleichnamige Variable eines anderen Skripts überschreiben — genau das ist
// beim Gehalts-Skript schon einmal passiert (siehe salary.js).
//
// INSTALLATION
//   1. npm run kubejs:deploy -- flight
//   2. Konsolenbefehl "reload" (wirft niemanden vom Server)
//   3. kubejs/data/flight.json prüfen: "ready": true

var FLUG_DATEI = "flight.json";
var FLUG_TAKT = 20; // einmal pro Sekunde messen
var FLUG_SCHREIB_TAKT = 20 * 30; // alle 30 Sekunden wegschreiben
var FLUG_SPRUNG_METER = 200; // groessere Spruenge sind Teleports, nicht Flug

var FlugPathsClass = null;
var FlugJsonIO = null;

try {
    FlugPathsClass = Java.loadClass("dev.latvian.mods.kubejs.KubeJSPaths");
    FlugJsonIO = Java.loadClass("dev.latvian.mods.kubejs.util.JsonIO");
} catch (e) {
    console.error("[flight] KubeJS-Klassen konnten nicht geladen werden: " + e);
}

var flugLaufId = new Date().toISOString() + "-" + Math.floor(Math.random() * 100000);
var flugSpieler = {}; // uuid -> { name, seconds, meters }
var flugLetztePos = {}; // uuid -> { x, z }
var flugGesehen = {}; // Klassenname -> { gezaehlt, uebersprungen }
var flugFehler = [];
var flugSchmutzig = false;

/*
 * Zaehler, damit sich "niemand ist geflogen" von "die Messung laeuft gar nicht"
 * unterscheiden laesst. Ohne die waere eine leere Datei zweideutig: Faengt
 * getVehicle() eine Ausnahme, saehe es genauso aus wie ein ruhiger Abend.
 */
var flugMessungen = 0; // Durchlaeufe der Messschleife
var flugProben = 0;    // dabei betrachtete Spieler
var flugMitFahrzeug = 0; // davon sassen auf irgendetwas

function flugSchreibeDatei() {
    try {
        if (FlugPathsClass === null || FlugJsonIO === null) return;
        var ziel = FlugPathsClass.GAMEDIR.resolve("kubejs/data/" + FLUG_DATEI);
        var inhalt = {
            generatedAt: new Date().toISOString(),
            runId: flugLaufId,
            ready: true,
            errors: flugFehler,
            passes: flugMessungen,
            samples: flugProben,
            withVehicle: flugMitFahrzeug,
            seen: flugGesehen,
            players: flugSpieler,
        };
        FlugJsonIO.write(ziel, FlugJsonIO.parseRaw(JSON.stringify(inhalt, null, 2)));
    } catch (e) {
        console.error("[flight] Datei-Schreibfehler: " + e);
    }
}

function flugMerkeFehler(text) {
    flugFehler.push({ at: new Date().toISOString(), error: String(text) });
    if (flugFehler.length > 20) flugFehler.shift();
    console.error("[flight] " + text);
}

/**
 * Zaehlt mit, welche Fahrzeugklassen vorkamen – fuer die Nachkontrolle.
 *
 * Setzt auch dann "schmutzig", wenn nur uebersprungen wurde: Sonst stuende die
 * Diagnose erst in der Datei, sobald zum ersten Mal jemand wirklich fliegt –
 * und bis dahin liesse sich gar nicht pruefen, ob die Erkennung greift.
 */
function flugNotiereKlasse(name, gezaehlt) {
    if (!flugGesehen[name]) flugGesehen[name] = { gezaehlt: 0, uebersprungen: 0 };
    if (gezaehlt) flugGesehen[name].gezaehlt += 1;
    else flugGesehen[name].uebersprungen += 1;
    flugSchmutzig = true;
}

/**
 * Fliegt der Spieler gerade?
 *
 * Create-Contraptions heissen alle "...ContraptionEntity". Zuege (Carriage)
 * sind ausgenommen: technisch dasselbe, fahren aber. Und am Boden ist kein Flug.
 */
function flugIstFlug(fahrzeug, klasse) {
    if (klasse.indexOf("Contraption") < 0) return false;
    if (klasse.indexOf("Carriage") >= 0) return false;
    try {
        if (fahrzeug.onGround()) return false;
    } catch (e) {
        // Kennt die Fassung onGround() nicht, zaehlen wir lieber mit als gar nicht.
    }
    return true;
}

function flugMessen(server) {
    server.getPlayers().forEach(function (spieler) {
        var uuid = String(spieler.getUuid());

        flugProben += 1;

        var fahrzeug = null;
        try {
            fahrzeug = spieler.getVehicle();
        } catch (e) {
            // Nicht verschlucken: Waere getVehicle() hier nicht zu haben, saehe
            // die Datei aus wie ein Abend, an dem niemand geflogen ist.
            if (flugFehler.length === 0) flugMerkeFehler("getVehicle() nicht verfuegbar: " + e);
            fahrzeug = null;
        }

        if (!fahrzeug) {
            delete flugLetztePos[uuid];
            return;
        }

        flugMitFahrzeug += 1;
        var klasse = String(fahrzeug.getClass().getName());
        var fliegt = flugIstFlug(fahrzeug, klasse);
        flugNotiereKlasse(klasse, fliegt);

        if (!fliegt) {
            delete flugLetztePos[uuid];
            return;
        }

        if (!flugSpieler[uuid]) {
            flugSpieler[uuid] = { name: String(spieler.getUsername()), seconds: 0, meters: 0 };
        }
        var eintrag = flugSpieler[uuid];
        eintrag.name = String(spieler.getUsername());
        eintrag.seconds += 1;

        var x = spieler.getX();
        var z = spieler.getZ();
        var vorher = flugLetztePos[uuid];
        if (vorher) {
            var dx = x - vorher.x;
            var dz = z - vorher.z;
            var strecke = Math.sqrt(dx * dx + dz * dz);
            // Waagerecht gemessen, wie Minecraft es bei seinen eigenen
            // Streckenzaehlern auch macht.
            if (strecke < FLUG_SPRUNG_METER) eintrag.meters += strecke;
        }
        flugLetztePos[uuid] = { x: x, z: z };
        flugSchmutzig = true;
    });
}

try {
    ServerEvents.tick(function (event) {
        try {
            var tick = event.server.getTickCount();
            if (tick % FLUG_TAKT === 0) {
                flugMessungen += 1;
                flugMessen(event.server);
            }
            if (tick % FLUG_SCHREIB_TAKT === 0 && flugSchmutzig) {
                flugSchreibeDatei();
                flugSchmutzig = false;
            } else if (tick % (20 * 300) === 0) {
                // Lebenszeichen alle fuenf Minuten, auch ohne Flugbetrieb.
                flugSchreibeDatei();
            }
        } catch (e) {
            flugMerkeFehler("Messung fehlgeschlagen: " + e);
        }
    });
} catch (e) {
    flugMerkeFehler("ServerEvents.tick nicht registrierbar: " + e);
}

// Sofort beim Laden schreiben: Daran erkennt die Website, dass das Skript laeuft.
flugSchreibeDatei();
