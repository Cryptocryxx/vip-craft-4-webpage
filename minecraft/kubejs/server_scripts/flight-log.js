// VIP Craft 4 — Flugzeit und Flugstrecke auf Luftschiffen mitschreiben
//
// Schreibt kubejs/data/flight.json: je Spieler die Sekunden und Meter, die er
// auf einem Luftschiff zurückgelegt hat. Die Website holt die Datei ab und
// rechnet die Läufe zusammen (siehe lib/flight.ts).
//
// WARUM ÜBERHAUPT: Minecraft zählt Reisestrecken nur für seine eigenen
// Fahrzeuge (Boot, Lore, Pferd, Schwein, Strider) und für Elytren. Eine
// Contraption ist keins davon — im Spielstand steht zu Luftschiffen deshalb
// nichts, in KEINER Kategorie (am 07.09.2026 im Spielstand geprüft).
//
// KEIN getClass(): KubeJS sperrt getClass() (Schutz vor Reflection). Der erste
// Anlauf hat genau daran gehangen: 7069-mal saß jemand auf einem Fahrzeug,
// 7069-mal ist die Messung abgestürzt, gezählt wurde nie etwas. Den Namen
// liefert stattdessen Entity.toString() — die Ausgabe beginnt mit dem einfachen
// Klassennamen, z. B. "Boat['Oak Boat'/1667133, l='ServerLevel[New World]', …]"
// — ergänzt um die Registry-Kennung aus getEncodeId().
//
// WAS ALS FLUG ZÄHLT: Der Spieler sitzt auf einem Luftschiff oder auf etwas,
// das selbst auf einem sitzt (Sitze zählen als Zwischenstufe), und das Schiff
// ist nicht am Boden. Welche Fahrzeuge das sind, ist NICHT geraten, sondern am
// 08.09.2026 aus der Entity-Registry dieses Servers abgelesen:
//
//   aeronautics:propeller_bearing_contraption   ← das Luftschiff
//   create:carriage_contraption                 ← Zug, fährt
//   create:stationary_contraption               ← Lager, steht
//   create:gantry_contraption                   ← Portal, schiebt
//   create:contraption                          ← Flaschenzug, Lore, Lager
//   createbigcannons:pitch_contraption, offroad:borehead_contraption_entity
//
// Deshalb die enge Regel unten: nur Luftschiffe, keine Contraption im
// Allgemeinen. Sonst zählte ein Windmühlen-Lager, auf dem jemand sitzt, als
// Flugzeit — genau die Sorte Unsinn, wegen der schon "Strecke geflogen"
// umbenannt werden musste.
//
// SELBSTDIAGNOSE: "seen" hält fest, welche Fahrzeuge wirklich vorkamen und wie
// oft — getrennt nach gezählt und übersprungen. "nearby" zählt Luftschiffe, die
// neben einem Spieler OHNE Fahrzeug standen: falls man ein Luftschiff auch
// fliegen kann, ohne auf ihm zu sitzen, steht es dort und die Erkennung muss
// erweitert werden. "entityTypes" listet die in Frage kommenden Kennungen.
//
// ALLE Namen tragen das Präfix FLUG_/flug: KubeJS lädt alle server_scripts in
// EIN gemeinsames globales Scope. Ein zweites "var DATEI" würde die
// gleichnamige Variable eines anderen Skripts überschreiben — genau das ist
// beim Gehalts-Skript schon einmal passiert (siehe salary.js).
//
// INSTALLATION
//   1. npm run kubejs:deploy -- flight
//   2. Konsolenbefehl "reload" (wirft niemanden vom Server)
//   3. kubejs/data/flight.json prüfen: "script": 3 und "errors": []

var FLUG_DATEI = "flight.json";
var FLUG_FASSUNG = 3; // hochzaehlen bei Aenderungen, damit sich Alt und Neu unterscheiden
var FLUG_TAKT = 20; // einmal pro Sekunde messen
var FLUG_SCHREIB_TAKT = 20 * 30; // alle 30 Sekunden wegschreiben
var FLUG_SPRUNG_METER = 200; // groessere Spruenge sind Teleports, nicht Flug
var FLUG_TIEFE = 3; // so viele Stufen der Fahrzeugkette werden verfolgt
var FLUG_UMKREIS = 8; // Diagnose: Suchradius fuer Luftschiffe neben dem Spieler

var FlugPathsClass = null;
var FlugJsonIO = null;
var FlugAABB = null;

try {
    FlugPathsClass = Java.loadClass("dev.latvian.mods.kubejs.KubeJSPaths");
    FlugJsonIO = Java.loadClass("dev.latvian.mods.kubejs.util.JsonIO");
} catch (e) {
    console.error("[flight] KubeJS-Klassen konnten nicht geladen werden: " + e);
}
try {
    FlugAABB = Java.loadClass("net.minecraft.world.phys.AABB");
} catch (e) {
    // Ohne AABB entfaellt nur die Umgebungsdiagnose, nicht die Messung.
}

var flugLaufId = new Date().toISOString() + "-" + Math.floor(Math.random() * 100000);
var flugSpieler = {}; // uuid -> { name, seconds, meters }
var flugLetztePos = {}; // uuid -> { x, z }
var flugGesehen = {}; // Fahrzeugname -> { gezaehlt, uebersprungen }
var flugNahebei = {}; // Fahrzeugname -> Anzahl (Spieler sass NICHT drauf)
var flugFehler = [];
var flugFehlerBekannt = {};
var flugSchmutzig = false;

/*
 * Zaehler, damit sich "niemand ist geflogen" von "die Messung laeuft gar nicht"
 * unterscheiden laesst. Ohne die waere eine leere Datei zweideutig — und genau
 * diese Zahlen haben den getClass()-Fehler ueberhaupt erst sichtbar gemacht.
 */
var flugMessungen = 0; // Durchlaeufe der Messschleife
var flugProben = 0; // dabei betrachtete Spieler
var flugMitFahrzeug = 0; // davon sassen auf irgendetwas

/**
 * Welche Fahrzeuge kennt dieser Server ueberhaupt?
 *
 * Einmal beim Laden aus der Registry gezogen. Damit steht schwarz auf weiss in
 * der Datei, wie die Luftschiffe hier heissen — die Erkennung unten beruht auf
 * dieser Liste und nicht auf geratenen Namen.
 */
function flugSammleTypen() {
    var treffer = [];
    try {
        var Registries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
        var it = Registries.ENTITY_TYPE.keySet().iterator();
        while (it.hasNext()) {
            var id = String(it.next());
            var klein = id.toLowerCase();
            if (
                klein.indexOf("contraption") >= 0 ||
                klein.indexOf("airship") >= 0 ||
                klein.indexOf("aeronaut") >= 0 ||
                klein.indexOf("aircraft") >= 0 ||
                klein.indexOf("propeller") >= 0 ||
                klein.indexOf("balloon") >= 0 ||
                klein.indexOf("blimp") >= 0 ||
                klein.indexOf("zeppelin") >= 0 ||
                klein.indexOf("seat") >= 0
            ) {
                treffer.push(id);
            }
        }
    } catch (e) {
        treffer.push("FEHLER: " + e);
    }
    return treffer;
}

var flugTypen = flugSammleTypen();

function flugSchreibeDatei() {
    try {
        if (FlugPathsClass === null || FlugJsonIO === null) return;
        var ziel = FlugPathsClass.GAMEDIR.resolve("kubejs/data/" + FLUG_DATEI);
        var inhalt = {
            generatedAt: new Date().toISOString(),
            runId: flugLaufId,
            ready: true,
            script: FLUG_FASSUNG,
            errors: flugFehler,
            passes: flugMessungen,
            samples: flugProben,
            withVehicle: flugMitFahrzeug,
            entityTypes: flugTypen,
            seen: flugGesehen,
            nearby: flugNahebei,
            players: flugSpieler,
        };
        FlugJsonIO.write(ziel, FlugJsonIO.parseRaw(JSON.stringify(inhalt, null, 2)));
    } catch (e) {
        console.error("[flight] Datei-Schreibfehler: " + e);
    }
}

/** Jede Fehlerart nur einmal — sonst verdraengen 20 gleiche Zeilen alles andere. */
function flugMerkeFehler(text) {
    var schluessel = String(text).substring(0, 90);
    if (flugFehlerBekannt[schluessel]) return;
    flugFehlerBekannt[schluessel] = true;
    flugFehler.push({ at: new Date().toISOString(), error: String(text) });
    if (flugFehler.length > 20) flugFehler.shift();
    console.error("[flight] " + text);
}

/**
 * Name eines Fahrzeugs, ohne getClass().
 *
 * Entity.toString() beginnt mit dem einfachen Klassennamen; getEncodeId()
 * liefert zusaetzlich die Registry-Kennung. Beides zusammen ist eindeutig genug
 * fuer die Einordnung und fuer die Nachkontrolle in "seen".
 */
function flugName(fahrzeug) {
    var einfach = "unbekannt";
    try {
        var text = String(fahrzeug);
        var klammer = text.indexOf("[");
        einfach = klammer > 0 ? text.substring(0, klammer) : text;
    } catch (e) {
        /* Name bleibt "unbekannt" — die Messung soll daran nicht scheitern. */
    }
    try {
        var roh = fahrzeug.getEncodeId();
        if (roh) return einfach + " (" + String(roh) + ")";
    } catch (e) {
        /* Ohne Registry-Kennung reicht der Klassenname. */
    }
    return einfach;
}

/**
 * Ist das ein Luftschiff?
 *
 * Die Ausschluesse zuerst, weil "…_contraption" in fast allen Namen steckt.
 * "propeller" faengt den Fall ab, dass getEncodeId() nichts liefert und nur der
 * Klassenname (PropellerBearingContraptionEntity) uebrig bleibt.
 */
function flugIstLuftschiff(name) {
    var klein = name.toLowerCase();
    if (
        klein.indexOf("carriage") >= 0 ||
        klein.indexOf("stationary") >= 0 ||
        klein.indexOf("gantry") >= 0 ||
        klein.indexOf("seat") >= 0 ||
        klein.indexOf("borehead") >= 0 ||
        klein.indexOf("cannon") >= 0 ||
        klein.indexOf("pitch") >= 0
    ) {
        return false;
    }
    return (
        klein.indexOf("aeronaut") >= 0 ||
        klein.indexOf("propeller") >= 0 ||
        klein.indexOf("airship") >= 0 ||
        klein.indexOf("aircraft") >= 0 ||
        klein.indexOf("blimp") >= 0 ||
        klein.indexOf("zeppelin") >= 0
    );
}

function flugAmBoden(fahrzeug) {
    try {
        return fahrzeug.onGround() === true;
    } catch (e) {
        // Kennt die Fassung onGround() nicht, zaehlen wir lieber mit als gar nicht.
        return false;
    }
}

function flugNotiereName(name, gezaehlt) {
    if (!flugGesehen[name]) flugGesehen[name] = { gezaehlt: 0, uebersprungen: 0 };
    if (gezaehlt) flugGesehen[name].gezaehlt += 1;
    else flugGesehen[name].uebersprungen += 1;
    flugSchmutzig = true;
}

/**
 * Sucht in der Fahrzeugkette nach einem fliegenden Luftschiff.
 *
 * Mehrere Stufen, weil ein Sitz dazwischenhaengen kann: Spieler sitzt auf Sitz,
 * Sitz haengt am Schiff. Dass es create:seat auf diesem Server gibt, steht in
 * der Registry-Liste oben.
 */
function flugPruefeKette(erstes) {
    var traeger = erstes;
    var stufe = 0;
    var fliegt = false;
    while (traeger !== null && traeger !== undefined && stufe < FLUG_TIEFE) {
        var name = flugName(traeger);
        var treffer = flugIstLuftschiff(name) && !flugAmBoden(traeger);
        flugNotiereName(name, treffer);
        if (treffer) fliegt = true;
        try {
            traeger = traeger.getVehicle();
        } catch (e) {
            traeger = null;
        }
        stufe += 1;
    }
    return fliegt;
}

/**
 * Nur Diagnose: Steht ein Luftschiff neben einem Spieler, der auf nichts sitzt?
 *
 * Offene Frage, die sich nicht am Schreibtisch klaeren laesst: Ob man ein
 * Luftschiff auch fliegt, ohne darauf zu SITZEN — dann waere die Messung oben
 * blind. Taucht hier etwas auf, muss sie erweitert werden. Zaehlt nichts.
 */
function flugSchauUmher(spieler) {
    if (FlugAABB === null) return;
    var level = null;
    try {
        level = spieler.getLevel();
    } catch (e) {
        try {
            level = spieler.level;
        } catch (e2) {
            level = null;
        }
    }
    if (!level) return;

    var x = spieler.getX();
    var y = spieler.getY();
    var z = spieler.getZ();
    var box = new FlugAABB(
        x - FLUG_UMKREIS,
        y - FLUG_UMKREIS,
        z - FLUG_UMKREIS,
        x + FLUG_UMKREIS,
        y + FLUG_UMKREIS,
        z + FLUG_UMKREIS,
    );
    var liste = level.getEntities(spieler, box);
    var it = liste.iterator();
    while (it.hasNext()) {
        var name = flugName(it.next());
        if (!flugIstLuftschiff(name)) continue;
        flugNahebei[name] = (flugNahebei[name] || 0) + 1;
        flugSchmutzig = true;
    }
}

function flugMissSpieler(spieler) {
    var uuid = String(spieler.getUuid());

    var fahrzeug = null;
    try {
        fahrzeug = spieler.getVehicle();
    } catch (e) {
        // Nicht verschlucken: Waere getVehicle() hier nicht zu haben, saehe die
        // Datei aus wie ein Abend, an dem niemand geflogen ist.
        flugMerkeFehler("getVehicle() nicht verfuegbar: " + e);
        fahrzeug = null;
    }

    if (!fahrzeug) {
        delete flugLetztePos[uuid];
        // Nur jede fuenfte Messung, das reicht als Stichprobe fuer die Diagnose.
        if (flugMessungen % 5 === 0) {
            try {
                flugSchauUmher(spieler);
            } catch (e) {
                flugMerkeFehler("Umgebungsdiagnose nicht moeglich: " + e);
            }
        }
        return;
    }

    flugMitFahrzeug += 1;
    if (!flugPruefeKette(fahrzeug)) {
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
}

function flugMessen(server) {
    server.getPlayers().forEach(function (spieler) {
        flugProben += 1;
        try {
            flugMissSpieler(spieler);
        } catch (e) {
            // JE SPIELER abfangen: Beim ersten Anlauf hat ein einziges
            // unerwartetes Fahrzeug den kompletten Durchlauf beendet — und damit
            // auch die Messung fuer alle anderen.
            flugMerkeFehler("Spieler uebersprungen: " + e);
        }
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
