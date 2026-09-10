// VIP Craft 4 — Tägliches Gehalt auf das Numismatics-Konto buchen
//
// Registriert den Konsolenbefehl
//
//     vipgehalt <spieler-uuid> <spurs> <beleg-id>
//
// und schreibt jede Auszahlung nach kubejs/data/salary.json. Die Website
// schickt den Befehl über Crafty (dieselbe Anbindung wie "whitelist add") und
// liest anschließend diese Datei, um zu PRÜFEN, dass das Geld wirklich
// angekommen ist — erst dann gilt der Tag als abgeholt.
//
// WARUM DIE QUITTUNGSDATEI: Crafty meldet nur, dass der Befehl in die Konsole
// geschrieben wurde, nicht ob der Server ihn ausgeführt hat. Wäre dieses Skript
// nicht geladen, liefe "vipgehalt" ins Leere ("Unknown command"), Crafty
// meldete trotzdem Erfolg — die Website hätte den Tag verbraucht und niemand
// hätte Geld bekommen. Deshalb zählt nur, was hier in der Datei steht.
//
// WARUM DIE UUID STATT DES NAMENS: Damit die Auszahlung auch für Offline-
// Spieler funktioniert und eine Namensänderung nichts verschiebt. Numismatics
// führt seine Konten ohnehin über die UUID.
//
// WARUM basicCommand STATT commandRegistry: ServerEvents.basicCommand ist die
// einfache Form ohne Brigadier-Baum (KubeJS 1.21+). Sie braucht weder
// Argumenttypen noch Commands/Arguments-Objekte — der Rest der Eingabe kommt
// als event.input, und weniger API heißt hier weniger, das beim Deployment
// schiefgehen kann.
//
// Zu den Rhino- und Pfad-Eigenheiten (var statt const/let, EIN einzelner
// resolve()-Aufruf mit komplettem Unterpfad) steht die ausführliche Begründung
// in numismatics-export.js — dieselben Regeln gelten hier.
//
// Geprüft gegen Create: Numismatics (github.com/Layers-of-Railways/CreateNumismatics):
//   GlobalBankManager.getOrCreateAccount(UUID, BankAccount.Type)  — legt das Konto
//     an, falls es noch keins gibt (auf diesem Server hat anfangs NIEMAND eins,
//     starter_cogs steht in der Numismatics-Config auf 0)
//   BankAccount.deposit(int)  — schreibt den Betrag in Spurs gut
//
// ERINNERUNG BEIM BETRETEN: Wer sein Gehalt heute noch nicht geholt hat, wird
// beim Betreten daran erinnert. Wer noch offen ist, steht in
// kubejs/data/salary-open.json - diese Datei pflegt die WEBSITE (siehe
// schreibeGehaltsListe in lib/salary.ts), denn nur sie kennt die Kalendertage
// und die Konten. Andersherum ginge es nicht: Die Website erfaehrt erst mit bis
// zu einer Minute Verzoegerung, dass jemand da ist - fuer eine Begruessung viel
// zu spaet.
//
// Zugestellt wird ueber eine kleine Warteschlange im Tick statt sofort: Direkt
// beim Login geht die Nachricht im Ladegetuemmel unter.
//
// INSTALLATION
//   1. Datei nach kubejs/server_scripts/salary.js (npm run kubejs:deploy)
//   2. Konsolenbefehl "reload" absetzen — der normale Datapack-Reload laedt die
//      server_scripts mit neu, ohne dass jemand vom Server fliegt. NICHT
//      "kubejs reload server_scripts": diesen Befehl kennt der Server nicht, er
//      quittiert ihn mit einem Parse-Fehler (am 06.09.2026 im Log geprueft).
//      Ein Serverneustart tut es natuerlich auch.
//   3. kubejs/data/salary.json prüfen: Dort muss "ready": true stehen. Steht
//      dort ein Fehler, zahlt die Website nichts aus und sagt auch warum.

// ALLE Namen hier tragen bewusst das Praefix GEHALT_/gehalt: KubeJS laedt alle
// server_scripts in EIN gemeinsames globales Rhino-Scope. Ein zweites "var
// OUTPUT_FILE_NAME" haette also die gleichnamige Variable in
// numismatics-export.js ueberschrieben - beim ersten Anlauf genau passiert:
// Der Kontenexport schrieb daraufhin in salary.json statt in numismatics.json.
// Dasselbe galt fuer MAX_EINTRAEGE und fehler aus insights-log.js.
var GEHALT_DATEI = "salary.json";
var GEHALT_OFFENE_DATEI = "salary-open.json"; // von der Website gepflegt
var GEHALT_VERZOEGERUNG = 60; // Ticks bis zur Erinnerung (3 s)
var gehaltWartende = []; // { uuid, faelligTick }
var GEHALT_MAX_BELEGE = 200; // Ringpuffer – die Website braucht nur die letzten Belege.

var GehaltPathsClass = null;
var GehaltJsonIO = null;
var GehaltNumismatics = null;
var GehaltBankTyp = null;
var GehaltUUID = null;

try {
    GehaltPathsClass = Java.loadClass("dev.latvian.mods.kubejs.KubeJSPaths");
    GehaltJsonIO = Java.loadClass("dev.latvian.mods.kubejs.util.JsonIO");
} catch (e) {
    console.error("[salary] KubeJS-Klassen konnten nicht geladen werden: " + e);
}
try {
    GehaltNumismatics = Java.loadClass("dev.ithundxr.createnumismatics.Numismatics");
    GehaltBankTyp = Java.loadClass("dev.ithundxr.createnumismatics.content.backend.BankAccount$Type");
} catch (e) {
    console.error("[salary] Numismatics-Klassen konnten nicht geladen werden: " + e);
}
try {
    GehaltUUID = Java.loadClass("java.util.UUID");
} catch (e) {
    console.error("[salary] java.util.UUID konnte nicht geladen werden: " + e);
}

// Belege dieses Serverlaufs. Bewusst nur im Arbeitsspeicher: Die Website
// bestätigt jede Auszahlung binnen Sekunden, und ihre eigene Datenbank ist die
// dauerhafte Buchführung.
var gehaltBelege = [];
var gehaltFehler = [];
var gehaltBereit = false;

function gehaltSchreibeDatei() {
    try {
        if (GehaltPathsClass === null || GehaltJsonIO === null) return;
        var ziel = GehaltPathsClass.GAMEDIR.resolve("kubejs/data/" + GEHALT_DATEI);
        var inhalt = {
            generatedAt: new Date().toISOString(),
            ready: gehaltBereit,
            errors: gehaltFehler,
            payouts: gehaltBelege,
        };
        GehaltJsonIO.write(ziel, GehaltJsonIO.parseRaw(JSON.stringify(inhalt, null, 2)));
    } catch (e) {
        console.error("[salary] Datei-Schreibfehler: " + e);
    }
}

function gehaltMerkeFehler(text) {
    gehaltFehler.push({ at: new Date().toISOString(), error: String(text) });
    if (gehaltFehler.length > 20) gehaltFehler.shift();
    console.error("[salary] " + text);
    gehaltSchreibeDatei();
}

/**
 * Bucht den Betrag und hinterlegt den Beleg.
 * Gibt eine kurze Klartextmeldung für die Konsole zurück.
 */
function gehaltZahleAus(uuidText, spurs, belegId) {
    if (GehaltNumismatics === null || GehaltBankTyp === null || GehaltUUID === null) {
        return "FEHLER: Numismatics-Klassen fehlen";
    }

    // Schon gebucht? Dann nicht doppelt zahlen. Schützt davor, dass ein
    // wiederholter Befehl (Netzproblem, zweiter Klick) zweimal Geld schöpft.
    for (var i = 0; i < gehaltBelege.length; i++) {
        if (gehaltBelege[i].claimId === belegId) return "OK (bereits gebucht): " + belegId;
    }

    var uuid = GehaltUUID.fromString(uuidText);
    var konto = GehaltNumismatics.BANK.getOrCreateAccount(uuid, GehaltBankTyp.PLAYER);
    konto.deposit(spurs);

    gehaltBelege.push({
        claimId: belegId,
        uuid: uuidText,
        spurs: spurs,
        balanceAfter: konto.getBalance(),
        at: new Date().toISOString(),
    });
    if (gehaltBelege.length > GEHALT_MAX_BELEGE) gehaltBelege.shift();
    gehaltSchreibeDatei();

    return "OK: " + spurs + " Spur auf " + uuidText + " (neuer Stand " + konto.getBalance() + ")";
}

/** Liest die von der Website gepflegte Liste der offenen Gehaelter. */
function gehaltLiesOffene() {
    try {
        if (GehaltPathsClass === null || GehaltJsonIO === null) return null;
        var quelle = GehaltPathsClass.GAMEDIR.resolve("kubejs/data/" + GEHALT_OFFENE_DATEI);
        var roh = GehaltJsonIO.read(quelle);
        if (roh === null || roh === undefined) return null;
        var text = String(roh);
        if (!text || text === "null") return null;
        return JSON.parse(text);
    } catch (e) {
        // Solange die Website noch nie geschrieben hat, gibt es die Datei nicht.
        // Das ist kein Fehler, sondern der Anfangszustand.
        return null;
    }
}

/** Schickt eine Zeile, moeglichst in Gruen - es sind gute Nachrichten. */
function gehaltSage(spieler, text) {
    try {
        spieler.tell(Text.green(text));
    } catch (e) {
        try {
            spieler.tell(text);
        } catch (e2) {
            /* Geht auch das nicht, ist die Erinnerung verloren - kein Drama. */
        }
    }
}

function gehaltErinnere(spieler, offene) {
    if (offene === null || !offene.uuids || offene.uuids.length === 0) return;

    var uuid = String(spieler.getUuid()).toLowerCase();
    var dabei = false;
    for (var i = 0; i < offene.uuids.length; i++) {
        if (String(offene.uuids[i]).toLowerCase() === uuid) {
            dabei = true;
            break;
        }
    }
    if (!dabei) return;

    var betrag = offene.cogs ? offene.cogs : "?";
    gehaltSage(spieler, "Dein taegliches Gehalt von " + betrag + " Cog liegt noch bereit.");
    gehaltSage(spieler, "Abholen kannst du es auf der Website unter Dashboard.");
}

try {
    PlayerEvents.loggedIn(function (event) {
        try {
            var spieler = event.player || event.getPlayer();
            gehaltWartende.push({
                uuid: String(spieler.getUuid()),
                faelligTick: event.server.getTickCount() + GEHALT_VERZOEGERUNG,
            });
        } catch (e) {
            gehaltMerkeFehler("Login nicht vermerkt: " + e);
        }
    });
} catch (e) {
    gehaltMerkeFehler("PlayerEvents.loggedIn nicht registrierbar: " + e);
}

try {
    ServerEvents.tick(function (event) {
        if (gehaltWartende.length === 0) return;
        try {
            var tick = event.server.getTickCount();
            var offen = [];
            var liste = null;
            var gelesen = false;
            for (var i = 0; i < gehaltWartende.length; i++) {
                var eintrag = gehaltWartende[i];
                if (tick < eintrag.faelligTick) {
                    offen.push(eintrag);
                    continue;
                }
                // Erst lesen, wenn wirklich jemand zu erinnern ist.
                if (!gelesen) {
                    liste = gehaltLiesOffene();
                    gelesen = true;
                }
                var spieler = null;
                event.server.getPlayers().forEach(function (p) {
                    if (String(p.getUuid()) === eintrag.uuid) spieler = p;
                });
                if (spieler !== null) gehaltErinnere(spieler, liste);
            }
            gehaltWartende = offen;
        } catch (e) {
            gehaltWartende = [];
            gehaltMerkeFehler("Erinnerung fehlgeschlagen: " + e);
        }
    });
} catch (e) {
    gehaltMerkeFehler("ServerEvents.tick nicht registrierbar: " + e);
}

try {
    ServerEvents.basicCommand("vipgehalt", function (event) {
        try {
            // event.input ist der Rest hinter dem Befehlsnamen. Falls eine
            // KubeJS-Fassung den Namen doch mitschickt, fliegt er hier raus.
            var eingabe = String(event.input || "").trim();
            if (eingabe.indexOf("vipgehalt") === 0) eingabe = eingabe.substring(9).trim();

            var teile = eingabe.split(/\s+/);
            if (teile.length < 3) {
                console.log("[salary] Aufruf: vipgehalt <uuid> <spurs> <belegId>");
                return;
            }

            var spurs = parseInt(teile[1], 10);
            if (!isFinite(spurs) || spurs <= 0 || spurs > 1000000) {
                console.log("[salary] Betrag unplausibel: " + teile[1]);
                return;
            }

            console.log("[salary] " + gehaltZahleAus(teile[0], spurs, teile[2]));
        } catch (e) {
            gehaltMerkeFehler("Auszahlung fehlgeschlagen: " + e);
        }
    });

    gehaltBereit = true;
} catch (e) {
    gehaltMerkeFehler("Befehl konnte nicht registriert werden: " + e);
}

// Sofort beim Laden schreiben: Daran erkennt die Website, dass dieses Skript
// überhaupt läuft — und erst dann bietet sie die Auszahlung an.
gehaltSchreibeDatei();

try {
    ServerEvents.loaded(function (event) {
        gehaltSchreibeDatei();
    });
} catch (e) {
    gehaltMerkeFehler("ServerEvents.loaded fehlgeschlagen: " + e);
}
