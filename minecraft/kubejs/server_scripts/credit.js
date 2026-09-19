// VIP Craft 4 — Kredite: Buchungen und Ansagen im Spiel
//
// Registriert den Konsolenbefehl
//
//     vipkredit abbuchen     <spieler-uuid> <spurs> <beleg-id>
//     vipkredit gutschreiben <spieler-uuid> <spurs> <beleg-id>
//     vipkredit sag <angebot|angenommen|abgelehnt|abgelaufen|beglichen> <an> <von> <spurs> [zins]
//
// Die Website (src/lib/kredite.ts) entscheidet, WANN Geld fliesst; dieses
// Skript bucht nur und quittiert jede Buchung in kubejs/data/credit.json.
// Crafty meldet der Website bloss, dass ein Befehl in der Konsole ankam - erst
// die Quittung sagt, ob er gewirkt hat. Dasselbe Verfahren wie bounty.js.
//
// JEDE BELEG-ID WIRD HOECHSTENS EINMAL GEBUCHT. Die Website wiederholt eine
// unbestaetigte Buchung mit derselben ID so lange, bis eine Quittung da ist.
// Stuende die ID schon hier, kommt die alte Quittung zurueck, statt ein zweites
// Mal zu buchen. Anders als bounty.js liest dieses Skript seine Quittungen beim
// Laden aus der eigenen Datei wieder ein: Sonst koennte eine Buchung, deren
// Quittung die Website wegen eines Neustarts nicht mehr gesehen hat, nach dem
// Neustart ein zweites Mal durchgehen - bei einem Kredit waere das echtes Geld.
//
// Geprueft gegen Create: Numismatics (github.com/Layers-of-Railways/CreateNumismatics,
// Branch 1.21.1/dev) und live in bounty.js erprobt:
//   Numismatics.BANK.getOrCreateAccount(UUID, BankAccount$Type.PLAYER)
//   BankAccount.getBalance() : int
//   BankAccount.deposit(int)
//   BankAccount.deduct(int amount, boolean force) : boolean
//     -> false, wenn das Guthaben nicht reicht (force=false bucht dann nichts ab)
//
// Zu den Rhino- und Pfad-Eigenheiten (var statt const/let, EIN einzelner
// resolve()-Aufruf mit komplettem Unterpfad, JsonIO.readString statt read)
// steht die Begruendung in numismatics-export.js und bounty.js.
//
// ALLE Namen tragen das Praefix KREDIT_/kredit: KubeJS laedt alle
// server_scripts in EIN gemeinsames globales Rhino-Scope.
//
// INSTALLATION
//   1. npm run kubejs:deploy -- credit
//   2. Konsolenbefehl "reload" (wirft niemanden vom Server)
//   3. kubejs/data/credit.json pruefen: "ready": true und "script": 1

var KREDIT_FASSUNG = 1;
var KREDIT_DATEI = "credit.json";
/** Genug fuer Wochen - die Website braucht nur die juengsten, das Wiedereinlesen alle. */
var KREDIT_MAX_BELEGE = 500;
var KREDIT_MAX_SPURS = 10000000;
var KREDIT_SPURS_JE_COG = 64;

var KREDIT_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var KREDIT_BELEG_RE = /^[a-z0-9]{20,40}-[a-z]{3}[0-9]*$/;
var KREDIT_NAME_RE = /^[A-Za-z0-9_]{3,16}$/;

var kreditBelege = [];
var kreditFehler = [];
var kreditAnsagen = []; // { art, an, von, spurs, zins }
var kreditBereit = false;
var kreditWiederEingelesen = 0;

var KreditPaths = null;
var KreditJsonIO = null;
var KreditNumismatics = null;
var KreditBankTyp = null;
var KreditUUID = null;

try {
    KreditPaths = Java.loadClass("dev.latvian.mods.kubejs.KubeJSPaths");
    KreditJsonIO = Java.loadClass("dev.latvian.mods.kubejs.util.JsonIO");
} catch (e) {
    console.error("[credit] KubeJS-Klassen konnten nicht geladen werden: " + e);
}
try {
    KreditNumismatics = Java.loadClass("dev.ithundxr.createnumismatics.Numismatics");
    KreditBankTyp = Java.loadClass("dev.ithundxr.createnumismatics.content.backend.BankAccount$Type");
    KreditUUID = Java.loadClass("java.util.UUID");
} catch (e) {
    console.error("[credit] Numismatics-Klassen konnten nicht geladen werden: " + e);
}

function kreditPfad() {
    return KreditPaths.GAMEDIR.resolve("kubejs/data/" + KREDIT_DATEI);
}

function kreditSchreibeDatei() {
    try {
        if (KreditPaths === null || KreditJsonIO === null) return;
        var inhalt = {
            generatedAt: new Date().toISOString(),
            ready: kreditBereit,
            script: KREDIT_FASSUNG,
            restored: kreditWiederEingelesen,
            errors: kreditFehler,
            receipts: kreditBelege,
        };
        KreditJsonIO.write(kreditPfad(), KreditJsonIO.parseRaw(JSON.stringify(inhalt, null, 2)));
    } catch (e) {
        console.error("[credit] Datei-Schreibfehler: " + e);
    }
}

function kreditMerkeFehler(text) {
    kreditFehler.push({ at: new Date().toISOString(), error: String(text) });
    if (kreditFehler.length > 20) kreditFehler.shift();
    console.error("[credit] " + text);
    kreditSchreibeDatei();
}

/**
 * Die Quittungen des letzten Laufs wieder einlesen.
 *
 * Fehlt die Datei, ist das der normale Anfang. Ist sie kaputt, wird das
 * festgehalten - dann ist der Schutz gegen doppelte Buchungen fuer alte IDs
 * weg, und das soll man sehen koennen.
 */
function kreditLiesAlteBelege() {
    if (KreditPaths === null || KreditJsonIO === null) return;
    var text = null;
    try {
        text = String(KreditJsonIO.readString(kreditPfad()));
    } catch (e) {
        return; // noch keine Datei
    }
    try {
        if (!text || text === "null" || text === "undefined") return;
        var alt = JSON.parse(text);
        if (!alt || !alt.receipts || !alt.receipts.length) return;
        for (var i = 0; i < alt.receipts.length; i++) {
            var q = alt.receipts[i];
            if (q && typeof q.belegId === "string") kreditBelege.push(q);
        }
        while (kreditBelege.length > KREDIT_MAX_BELEGE) kreditBelege.shift();
        kreditWiederEingelesen = kreditBelege.length;
    } catch (e) {
        kreditFehler.push({ at: new Date().toISOString(), error: "Alte Quittungen nicht lesbar: " + e });
    }
}

function kreditFinde(belegId) {
    for (var i = 0; i < kreditBelege.length; i++) {
        if (kreditBelege[i].belegId === belegId) return kreditBelege[i];
    }
    return null;
}

function kreditNotiere(beleg) {
    kreditBelege.push(beleg);
    while (kreditBelege.length > KREDIT_MAX_BELEGE) kreditBelege.shift();
    kreditSchreibeDatei();
}

function kreditKonto(uuidText) {
    return KreditNumismatics.BANK.getOrCreateAccount(KreditUUID.fromString(uuidText), KreditBankTyp.PLAYER);
}

/** Bucht ab - aber nur, wenn es reicht. Sonst wird NICHTS gebucht, und die Quittung sagt warum. */
function kreditBucheAb(uuidText, spurs, belegId) {
    if (kreditFinde(belegId) !== null) return "OK (bereits gebucht): " + belegId;

    var konto = kreditKonto(uuidText);
    var stand = konto.getBalance();
    var erfolg = stand >= spurs ? String(konto.deduct(spurs, false)) === "true" : false;

    kreditNotiere({
        belegId: belegId,
        art: "abbuchen",
        uuid: uuidText,
        spurs: spurs,
        ok: erfolg,
        grund: erfolg ? null : stand < spurs ? "zu-wenig" : "abgelehnt",
        balanceAfter: konto.getBalance(),
        at: new Date().toISOString(),
    });
    return (erfolg ? "OK: " : "ABGELEHNT: ") + spurs + " Spur von " + uuidText + " (Stand " + konto.getBalance() + ")";
}

/** Schreibt gut. Kann nur an der Buchung selbst scheitern. */
function kreditSchreibeGut(uuidText, spurs, belegId) {
    if (kreditFinde(belegId) !== null) return "OK (bereits gebucht): " + belegId;

    var konto = kreditKonto(uuidText);
    konto.deposit(spurs);

    kreditNotiere({
        belegId: belegId,
        art: "gutschreiben",
        uuid: uuidText,
        spurs: spurs,
        ok: true,
        grund: null,
        balanceAfter: konto.getBalance(),
        at: new Date().toISOString(),
    });
    return "OK: " + spurs + " Spur auf " + uuidText + " (Stand " + konto.getBalance() + ")";
}

// ---------------------------------------------------------------------------
// Ansagen
// ---------------------------------------------------------------------------

/** "100 Cog" bzw. "100 Cog 16 Spur". */
function kreditCogText(spurs) {
    var cogs = Math.floor(spurs / KREDIT_SPURS_JE_COG);
    var rest = spurs % KREDIT_SPURS_JE_COG;
    return rest === 0 ? cogs + " Cog" : cogs + " Cog " + rest + " Spur";
}

function kreditText(a) {
    var betrag = kreditCogText(a.spurs);
    if (a.art === "angebot") {
        return (
            a.von +
            " bietet dir einen Kredit ueber " +
            betrag +
            " zu " +
            a.zins +
            " % an. Annehmen oder ablehnen auf der Website unter Wirtschaft > Kredite."
        );
    }
    if (a.art === "angenommen") return a.von + " hat deinen Kredit ueber " + betrag + " angenommen.";
    if (a.art === "abgelehnt") return a.von + " hat deinen Kredit ueber " + betrag + " abgelehnt. Der Betrag ist zurueck auf deinem Konto.";
    if (a.art === "abgelaufen") {
        return "Dein Kreditangebot an " + a.von + " ueber " + betrag + " ist abgelaufen. Der Betrag ist zurueck auf deinem Konto.";
    }
    if (a.art === "beglichen") return a.von + " hat den Kredit beglichen: " + betrag + " sind auf deinem Konto.";
    return null;
}

function kreditSageAn(server, ansage) {
    var text = kreditText(ansage);
    if (text === null) return;
    var ziel = String(ansage.an).toLowerCase();
    server.getPlayers().forEach(function (spieler) {
        try {
            if (String(spieler.getUsername()).toLowerCase() !== ziel) return;
            try {
                spieler.tell(Text.gold(text));
            } catch (e1) {
                spieler.tell(text);
            }
        } catch (e) {
            /* Eine verlorene Zeile ist kein Grund, etwas abzubrechen. */
        }
    });
}

// ---------------------------------------------------------------------------
// Befehl
// ---------------------------------------------------------------------------

try {
    ServerEvents.basicCommand("vipkredit", function (event) {
        try {
            var eingabe = String(event.input || "").trim();
            if (eingabe.indexOf("vipkredit") === 0) eingabe = eingabe.substring(9).trim();
            var teile = eingabe.split(/\s+/);
            var art = teile[0];

            if (art === "sag") {
                // sag <art> <an> <von> <spurs> [zins]
                var spursAnsage = parseInt(teile[4], 10);
                if (teile.length < 5 || !KREDIT_NAME_RE.test(teile[2]) || !KREDIT_NAME_RE.test(teile[3]) || !(spursAnsage > 0)) {
                    console.log("[credit] Aufruf: vipkredit sag <art> <an> <von> <spurs> [zins]");
                    return;
                }
                kreditAnsagen.push({
                    art: teile[1],
                    an: teile[2],
                    von: teile[3],
                    spurs: spursAnsage,
                    zins: teile.length > 5 ? parseInt(teile[5], 10) : 0,
                });
                return;
            }

            if (teile.length < 4 || (art !== "abbuchen" && art !== "gutschreiben")) {
                console.log("[credit] Aufruf: vipkredit <abbuchen|gutschreiben> <uuid> <spurs> <beleg>");
                return;
            }
            var uuid = teile[1];
            var spurs = parseInt(teile[2], 10);
            var beleg = teile[3];
            if (!KREDIT_UUID_RE.test(uuid) || !KREDIT_BELEG_RE.test(beleg) || !(spurs > 0) || spurs > KREDIT_MAX_SPURS) {
                console.log("[credit] Unplausible Buchung verworfen: " + eingabe);
                return;
            }
            if (KreditNumismatics === null || KreditBankTyp === null || KreditUUID === null) {
                kreditMerkeFehler("Numismatics-Klassen fehlen - keine Buchung moeglich");
                return;
            }

            if (art === "abbuchen") console.log("[credit] " + kreditBucheAb(uuid, spurs, beleg));
            else console.log("[credit] " + kreditSchreibeGut(uuid, spurs, beleg));
        } catch (e) {
            kreditMerkeFehler("Buchung fehlgeschlagen: " + e);
        }
    });

    kreditBereit = KreditNumismatics !== null && KreditBankTyp !== null && KreditUUID !== null;
} catch (e) {
    kreditMerkeFehler("Befehl konnte nicht registriert werden: " + e);
}

try {
    ServerEvents.tick(function (event) {
        if (kreditAnsagen.length === 0) return;
        while (kreditAnsagen.length > 0) {
            var ansage = kreditAnsagen.shift();
            try {
                kreditSageAn(event.server, ansage);
            } catch (e) {
                kreditMerkeFehler("Ansage fehlgeschlagen: " + e);
            }
        }
    });
} catch (e) {
    kreditMerkeFehler("ServerEvents.tick nicht registrierbar: " + e);
}

// Erst die alten Quittungen einlesen, DANN schreiben - sonst ueberschriebe die
// frische, leere Datei genau das, was gegen doppelte Buchungen schuetzt.
kreditLiesAlteBelege();
kreditSchreibeDatei();

try {
    ServerEvents.loaded(function (event) {
        kreditSchreibeDatei();
    });
} catch (e) {
    kreditMerkeFehler("ServerEvents.loaded fehlgeschlagen: " + e);
}
