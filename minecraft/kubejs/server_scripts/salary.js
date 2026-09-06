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
// INSTALLATION
//   1. Datei nach kubejs/server_scripts/salary.js (npm run kubejs:deploy)
//   2. Server neu starten — "kubejs reload server_scripts" schlägt auf diesem
//      Server fehl, server_scripts werden nur beim Start geladen.
//   3. kubejs/data/salary.json prüfen: Dort muss "ready": true stehen. Steht
//      dort ein Fehler, zahlt die Website nichts aus und sagt auch warum.

var OUTPUT_FILE_NAME = "salary.json";
var MAX_EINTRAEGE = 200; // Ringpuffer – die Website braucht nur die letzten Belege.

var KubeJSPathsClass = null;
var JsonIOClass = null;
var NumismaticsClass = null;
var BankAccountTypeClass = null;
var UUIDClass = null;

try {
    KubeJSPathsClass = Java.loadClass("dev.latvian.mods.kubejs.KubeJSPaths");
    JsonIOClass = Java.loadClass("dev.latvian.mods.kubejs.util.JsonIO");
} catch (e) {
    console.error("[salary] KubeJS-Klassen konnten nicht geladen werden: " + e);
}
try {
    NumismaticsClass = Java.loadClass("dev.ithundxr.createnumismatics.Numismatics");
    BankAccountTypeClass = Java.loadClass("dev.ithundxr.createnumismatics.content.backend.BankAccount$Type");
} catch (e) {
    console.error("[salary] Numismatics-Klassen konnten nicht geladen werden: " + e);
}
try {
    UUIDClass = Java.loadClass("java.util.UUID");
} catch (e) {
    console.error("[salary] java.util.UUID konnte nicht geladen werden: " + e);
}

// Belege dieses Serverlaufs. Bewusst nur im Arbeitsspeicher: Die Website
// bestätigt jede Auszahlung binnen Sekunden, und ihre eigene Datenbank ist die
// dauerhafte Buchführung.
var belege = [];
var fehler = [];
var bereit = false;

function schreibeDatei() {
    try {
        if (KubeJSPathsClass === null || JsonIOClass === null) return;
        var ziel = KubeJSPathsClass.GAMEDIR.resolve("kubejs/data/" + OUTPUT_FILE_NAME);
        var inhalt = {
            generatedAt: new Date().toISOString(),
            ready: bereit,
            errors: fehler,
            payouts: belege,
        };
        JsonIOClass.write(ziel, JsonIOClass.parseRaw(JSON.stringify(inhalt, null, 2)));
    } catch (e) {
        console.error("[salary] Datei-Schreibfehler: " + e);
    }
}

function merkeFehler(text) {
    fehler.push({ at: new Date().toISOString(), error: String(text) });
    if (fehler.length > 20) fehler.shift();
    console.error("[salary] " + text);
    schreibeDatei();
}

/**
 * Bucht den Betrag und hinterlegt den Beleg.
 * Gibt eine kurze Klartextmeldung für die Konsole zurück.
 */
function zahleAus(uuidText, spurs, belegId) {
    if (NumismaticsClass === null || BankAccountTypeClass === null || UUIDClass === null) {
        return "FEHLER: Numismatics-Klassen fehlen";
    }

    // Schon gebucht? Dann nicht doppelt zahlen. Schützt davor, dass ein
    // wiederholter Befehl (Netzproblem, zweiter Klick) zweimal Geld schöpft.
    for (var i = 0; i < belege.length; i++) {
        if (belege[i].claimId === belegId) return "OK (bereits gebucht): " + belegId;
    }

    var uuid = UUIDClass.fromString(uuidText);
    var konto = NumismaticsClass.BANK.getOrCreateAccount(uuid, BankAccountTypeClass.PLAYER);
    konto.deposit(spurs);

    belege.push({
        claimId: belegId,
        uuid: uuidText,
        spurs: spurs,
        balanceAfter: konto.getBalance(),
        at: new Date().toISOString(),
    });
    if (belege.length > MAX_EINTRAEGE) belege.shift();
    schreibeDatei();

    return "OK: " + spurs + " Spur auf " + uuidText + " (neuer Stand " + konto.getBalance() + ")";
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

            console.log("[salary] " + zahleAus(teile[0], spurs, teile[2]));
        } catch (e) {
            merkeFehler("Auszahlung fehlgeschlagen: " + e);
        }
    });

    bereit = true;
} catch (e) {
    merkeFehler("Befehl konnte nicht registriert werden: " + e);
}

// Sofort beim Laden schreiben: Daran erkennt die Website, dass dieses Skript
// überhaupt läuft — und erst dann bietet sie die Auszahlung an.
schreibeDatei();

try {
    ServerEvents.loaded(function (event) {
        schreibeDatei();
    });
} catch (e) {
    merkeFehler("ServerEvents.loaded fehlgeschlagen: " + e);
}
