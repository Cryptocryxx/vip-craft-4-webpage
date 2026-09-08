// VIP Craft 4 — Kopfgelder: abbuchen, auszahlen, beim Betreten ankündigen
//
// Registriert zwei Konsolenbefehle:
//
//     vipkopfgeld abbuchen  <spieler-uuid> <spurs> <beleg-id>
//     vipkopfgeld auszahlen <spieler-uuid> <spurs> <beleg-id>
//     vipkopfgeld melden    <ziel-name> <cogs> <frist|->
//
// und schreibt jede Buchung nach kubejs/data/bounty.json. Die Website liest
// diese Quittung und glaubt erst dann, dass etwas passiert ist — genau wie beim
// Gehalt (salary.js). Crafty meldet nur, dass der Befehl in der Konsole gelandet
// ist; ohne dieses Skript liefe er als "Unknown command" ins Leere, und die
// Website hätte ein Kopfgeld ausgeschrieben, für das nie jemand bezahlt hat.
//
// WARUM ABBUCHEN ANDERS IST ALS AUSZAHLEN: Beim Gehalt entsteht Geld aus dem
// Nichts, das geht immer. Hier muss es jemand HABEN. Numismatics' deduct()
// liefert false, wenn das Konto nicht deckt — dieses false steht als
// "ok": false in der Quittung, und die Website legt das Kopfgeld dann gar nicht
// erst an. Ein Kopfgeld ohne Deckung wäre Falschgeld.
//
// ZWEI ARTEN VON ANKÜNDIGUNG, und sie brauchen verschiedene Wege:
//
//   Beim BETRETEN liest dieses Skript kubejs/data/bounty-list.json, das die
//   Website pflegt. Bewusst so herum: Die Website erfährt erst mit bis zu einer
//   Minute Verzögerung, dass jemand da ist (sie liest das Protokoll) — für eine
//   Begrüßung viel zu spät.
//
//   Beim AUSSETZEN schickt die Website "vipkopfgeld melden" und alle, die
//   gerade online sind, erfahren es sofort. Andersherum ginge es nicht: Das
//   Skript müsste die Liste dauernd nach neuen Zeilen absuchen, um zu merken,
//   dass etwas dazugekommen ist.
//
//   Die Ansage geht erst raus, wenn das Geld abgebucht IST — siehe
//   setzeKopfgeldAus in lib/bounties.ts. Ein angekündigtes Kopfgeld, das an der
//   Bezahlung scheitert, wäre schlimmer als gar keine Ansage.
//
// ALLE Namen tragen das Präfix KOPF_/kopf: KubeJS lädt alle server_scripts in
// EIN gemeinsames globales Scope. Ein zweites "var DATEI" würde die
// gleichnamige Variable eines anderen Skripts überschreiben — beim
// Gehalts-Skript schon einmal passiert (siehe salary.js).
//
// Geprüft gegen Create: Numismatics (github.com/Layers-of-Railways/CreateNumismatics):
//   Numismatics.BANK.getOrCreateAccount(UUID, BankAccount$Type.PLAYER)
//   BankAccount.getBalance() : int
//   BankAccount.deposit(int)
//   BankAccount.deduct(int amount, boolean force) : boolean
//     → false, wenn das Guthaben nicht reicht (force=false bucht dann nichts ab)
//
// INSTALLATION
//   1. npm run kubejs:deploy -- bounty
//   2. Konsolenbefehl "reload" (wirft niemanden vom Server)
//   3. kubejs/data/bounty.json prüfen: "ready": true und "script": 2

var KOPF_FASSUNG = 2; // hochzaehlen bei Aenderungen, damit sich Alt und Neu unterscheiden
var KOPF_DATEI = "bounty.json"; // Quittungen, geschrieben von HIER
var KOPF_LISTE = "bounty-list.json"; // offene Kopfgelder, geschrieben von der WEBSITE
var KOPF_MAX_BELEGE = 200;
var KOPF_MAX_MELDUNGEN = 5; // so viele Kopfgelder nennt die Begruessung namentlich
var KOPF_VERZOEGERUNG = 60; // Ticks bis zur Begruessung (3 s) - direkt beim Login
                            // geht die Nachricht im Ladegetuemmel unter.

var KopfPathsClass = null;
var KopfJsonIO = null;
var KopfNumismatics = null;
var KopfBankTyp = null;
var KopfUUID = null;

try {
    KopfPathsClass = Java.loadClass("dev.latvian.mods.kubejs.KubeJSPaths");
    KopfJsonIO = Java.loadClass("dev.latvian.mods.kubejs.util.JsonIO");
} catch (e) {
    console.error("[bounty] KubeJS-Klassen konnten nicht geladen werden: " + e);
}
try {
    KopfNumismatics = Java.loadClass("dev.ithundxr.createnumismatics.Numismatics");
    KopfBankTyp = Java.loadClass("dev.ithundxr.createnumismatics.content.backend.BankAccount$Type");
} catch (e) {
    console.error("[bounty] Numismatics-Klassen konnten nicht geladen werden: " + e);
}
try {
    KopfUUID = Java.loadClass("java.util.UUID");
} catch (e) {
    console.error("[bounty] java.util.UUID konnte nicht geladen werden: " + e);
}

var kopfBelege = [];
var kopfFehler = [];
var kopfBereit = false;
var kopfWartende = []; // { uuid, faelligTick } - Begruessungen, die noch anstehen
/*
 * Ansagen, die beim naechsten Tick rausgehen. Der Umweg ueber die
 * Warteschlange, weil im Befehl-Ereignis nicht sicher ein Server-Objekt
 * bereitsteht - der Tick liefert eins nachweislich (siehe flight-log.js), und
 * eine Verzoegerung von einem Tick merkt niemand.
 */
var kopfAnsagen = []; // { ziel, cogs, frist }

function kopfSchreibeDatei() {
    try {
        if (KopfPathsClass === null || KopfJsonIO === null) return;
        var ziel = KopfPathsClass.GAMEDIR.resolve("kubejs/data/" + KOPF_DATEI);
        var inhalt = {
            generatedAt: new Date().toISOString(),
            ready: kopfBereit,
            script: KOPF_FASSUNG,
            errors: kopfFehler,
            receipts: kopfBelege,
        };
        KopfJsonIO.write(ziel, KopfJsonIO.parseRaw(JSON.stringify(inhalt, null, 2)));
    } catch (e) {
        console.error("[bounty] Datei-Schreibfehler: " + e);
    }
}

function kopfMerkeFehler(text) {
    kopfFehler.push({ at: new Date().toISOString(), error: String(text) });
    if (kopfFehler.length > 20) kopfFehler.shift();
    console.error("[bounty] " + text);
    kopfSchreibeDatei();
}

function kopfKonto(uuidText) {
    var uuid = KopfUUID.fromString(uuidText);
    return KopfNumismatics.BANK.getOrCreateAccount(uuid, KopfBankTyp.PLAYER);
}

/** Schon gebucht? Dann den alten Beleg zurueckgeben statt ein zweites Mal zu buchen. */
function kopfFinde(belegId) {
    for (var i = 0; i < kopfBelege.length; i++) {
        if (kopfBelege[i].belegId === belegId) return kopfBelege[i];
    }
    return null;
}

function kopfNotiere(beleg) {
    kopfBelege.push(beleg);
    if (kopfBelege.length > KOPF_MAX_BELEGE) kopfBelege.shift();
    kopfSchreibeDatei();
}

/**
 * Bucht ab. Reicht das Guthaben nicht, wird NICHTS gebucht und der Beleg sagt
 * warum — die Website legt das Kopfgeld dann nicht an.
 */
function kopfBucheAb(uuidText, spurs, belegId) {
    var alt = kopfFinde(belegId);
    if (alt !== null) return "OK (bereits gebucht): " + belegId;

    var konto = kopfKonto(uuidText);
    var stand = konto.getBalance();

    if (stand < spurs) {
        kopfNotiere({
            belegId: belegId,
            art: "abbuchen",
            uuid: uuidText,
            spurs: spurs,
            ok: false,
            grund: "zu-wenig",
            balanceAfter: stand,
            at: new Date().toISOString(),
        });
        return "ABGELEHNT: " + uuidText + " hat " + stand + " Spur, gebraucht " + spurs;
    }

    // deduct(betrag, force=false) bucht nur ab, wenn es reicht, und sagt es.
    var erfolg = konto.deduct(spurs, false);
    if (String(erfolg) !== "true") {
        kopfNotiere({
            belegId: belegId,
            art: "abbuchen",
            uuid: uuidText,
            spurs: spurs,
            ok: false,
            grund: "abgelehnt",
            balanceAfter: konto.getBalance(),
            at: new Date().toISOString(),
        });
        return "ABGELEHNT durch Numismatics: " + uuidText;
    }

    kopfNotiere({
        belegId: belegId,
        art: "abbuchen",
        uuid: uuidText,
        spurs: spurs,
        ok: true,
        grund: null,
        balanceAfter: konto.getBalance(),
        at: new Date().toISOString(),
    });
    return "OK: " + spurs + " Spur von " + uuidText + " (neuer Stand " + konto.getBalance() + ")";
}

/** Zahlt aus. Hier kann nichts fehlschlagen ausser der Buchung selbst. */
function kopfZahleAus(uuidText, spurs, belegId) {
    var alt = kopfFinde(belegId);
    if (alt !== null) return "OK (bereits gebucht): " + belegId;

    var konto = kopfKonto(uuidText);
    konto.deposit(spurs);

    kopfNotiere({
        belegId: belegId,
        art: "auszahlen",
        uuid: uuidText,
        spurs: spurs,
        ok: true,
        grund: null,
        balanceAfter: konto.getBalance(),
        at: new Date().toISOString(),
    });
    return "OK: " + spurs + " Spur auf " + uuidText + " (neuer Stand " + konto.getBalance() + ")";
}

// ---------------------------------------------------------------------------
// Begruessung beim Betreten
// ---------------------------------------------------------------------------

/** Liest die von der Website gepflegte Liste. Fehlt sie, gibt es eben nichts zu sagen. */
function kopfLiesListe() {
    try {
        if (KopfPathsClass === null || KopfJsonIO === null) return null;
        var quelle = KopfPathsClass.GAMEDIR.resolve("kubejs/data/" + KOPF_LISTE);
        var roh = KopfJsonIO.read(quelle);
        if (roh === null || roh === undefined) return null;
        var text = String(roh);
        if (!text || text === "null") return null;
        return JSON.parse(text);
    } catch (e) {
        // Kein Fehler im engeren Sinn: Solange die Website noch nie geschrieben
        // hat, gibt es die Datei schlicht nicht.
        return null;
    }
}

/** Schickt eine Zeile, moeglichst in Gold. */
function kopfSage(spieler, text) {
    try {
        spieler.tell(Text.gold(text));
    } catch (e) {
        try {
            spieler.tell(text);
        } catch (e2) {
            /* Wenn nicht einmal das geht, ist die Begruessung verloren - egal. */
        }
    }
}

/**
 * Sagt ein frisch ausgesetztes Kopfgeld allen an, die gerade da sind.
 *
 * Wer selbst gemeint ist, bekommt es deutlicher gesagt - das ist die
 * Nachricht, auf die es fuer ihn ankommt.
 */
function kopfSageAnsageAn(server, ansage) {
    var frist = ansage.frist && ansage.frist !== "-" ? " bis zum " + ansage.frist : "";
    var fuerAlle = "Neu ausgesetzt: Auf " + ansage.ziel + " steht" + frist + " ein Kopfgeld von " + ansage.cogs + " Cog.";
    var fuersZiel = "Achtung: Auf DICH steht ab jetzt" + frist + " ein Kopfgeld von " + ansage.cogs + " Cog.";
    var zielKlein = String(ansage.ziel).toLowerCase();

    server.getPlayers().forEach(function (spieler) {
        try {
            var name = String(spieler.getUsername()).toLowerCase();
            kopfSage(spieler, name === zielKlein ? fuersZiel : fuerAlle);
        } catch (e) {
            /* Einer, der die Nachricht nicht bekommt, darf die anderen nicht kosten. */
        }
    });
}

function kopfBegruesse(spieler) {
    var liste = kopfLiesListe();
    if (liste === null || !liste.entries || liste.entries.length === 0) return;

    var name = String(spieler.getUsername());
    var eigene = [];
    var fremde = [];

    for (var i = 0; i < liste.entries.length; i++) {
        var e = liste.entries[i];
        if (!e || !e.target) continue;
        if (String(e.target).toLowerCase() === name.toLowerCase()) eigene.push(e);
        else fremde.push(e);
    }

    // Zuerst die eigene Haut: Wer gejagt wird, soll es als Erstes erfahren.
    for (var j = 0; j < eigene.length; j++) {
        var m = eigene[j];
        kopfSage(
            spieler,
            "Achtung: Auf DICH steht" +
                (m.until ? " bis zum " + m.until : "") +
                " ein Kopfgeld von " +
                m.cogs +
                " Cog.",
        );
    }

    if (fremde.length === 0) return;

    kopfSage(spieler, "--- Offene Kopfgelder ---");
    var bis = Math.min(fremde.length, KOPF_MAX_MELDUNGEN);
    for (var k = 0; k < bis; k++) {
        var f = fremde[k];
        kopfSage(
            spieler,
            "Auf " + f.target + " steht" + (f.until ? " bis zum " + f.until : "") + " ein Kopfgeld von " + f.cogs + " Cog.",
        );
    }
    if (fremde.length > bis) {
        kopfSage(spieler, "... und " + (fremde.length - bis) + " weitere. Alle auf der Website.");
    }
}

// ---------------------------------------------------------------------------
// Anmeldung
// ---------------------------------------------------------------------------

try {
    ServerEvents.basicCommand("vipkopfgeld", function (event) {
        try {
            var eingabe = String(event.input || "").trim();
            if (eingabe.indexOf("vipkopfgeld") === 0) eingabe = eingabe.substring(11).trim();

            var teile = eingabe.split(/\s+/);
            if (teile.length < 4) {
                console.log("[bounty] Aufruf: vipkopfgeld <abbuchen|auszahlen> <uuid> <spurs> <belegId>");
                console.log("[bounty]     oder: vipkopfgeld melden <ziel> <cogs> <frist|->");
                return;
            }

            var art = teile[0];

            // Reine Ansage, keine Buchung: braucht weder Numismatics noch einen Beleg.
            if (art === "melden") {
                var cogs = parseInt(teile[2], 10);
                if (!isFinite(cogs) || cogs <= 0) {
                    console.log("[bounty] Betrag unplausibel: " + teile[2]);
                    return;
                }
                kopfAnsagen.push({ ziel: teile[1], cogs: cogs, frist: teile[3] });
                return;
            }

            var spurs = parseInt(teile[2], 10);
            if (!isFinite(spurs) || spurs <= 0 || spurs > 10000000) {
                console.log("[bounty] Betrag unplausibel: " + teile[2]);
                return;
            }

            if (KopfNumismatics === null || KopfBankTyp === null || KopfUUID === null) {
                kopfMerkeFehler("Numismatics-Klassen fehlen - keine Buchung moeglich");
                return;
            }

            if (art === "abbuchen") console.log("[bounty] " + kopfBucheAb(teile[1], spurs, teile[3]));
            else if (art === "auszahlen") console.log("[bounty] " + kopfZahleAus(teile[1], spurs, teile[3]));
            else console.log("[bounty] Unbekannte Buchungsart: " + art);
        } catch (e) {
            kopfMerkeFehler("Buchung fehlgeschlagen: " + e);
        }
    });

    kopfBereit = true;
} catch (e) {
    kopfMerkeFehler("Befehl konnte nicht registriert werden: " + e);
}

/*
 * Die Begruessung laeuft ueber eine kleine Warteschlange statt ueber einen
 * Zeitgeber: ServerEvents.tick ist die eine Zeitquelle, die auf diesem Server
 * nachweislich funktioniert (siehe flight-log.js). Wer in der Zwischenzeit
 * wieder geht, faellt beim Nachschlagen einfach durch.
 */
try {
    PlayerEvents.loggedIn(function (event) {
        try {
            var spieler = event.player || event.getPlayer();
            kopfWartende.push({
                uuid: String(spieler.getUuid()),
                faelligTick: event.server.getTickCount() + KOPF_VERZOEGERUNG,
            });
        } catch (e) {
            kopfMerkeFehler("Login nicht vermerkt: " + e);
        }
    });
} catch (e) {
    kopfMerkeFehler("PlayerEvents.loggedIn nicht registrierbar: " + e);
}

try {
    ServerEvents.tick(function (event) {
        if (kopfWartende.length === 0 && kopfAnsagen.length === 0) return;

        // Ansagen zuerst und getrennt abgesichert: Sie sollen nicht ausfallen,
        // nur weil bei einer Begruessung etwas schiefgeht.
        while (kopfAnsagen.length > 0) {
            var ansage = kopfAnsagen.shift();
            try {
                kopfSageAnsageAn(event.server, ansage);
            } catch (e) {
                kopfMerkeFehler("Ansage fehlgeschlagen: " + e);
            }
        }

        if (kopfWartende.length === 0) return;
        try {
            var tick = event.server.getTickCount();
            var offen = [];
            for (var i = 0; i < kopfWartende.length; i++) {
                var eintrag = kopfWartende[i];
                if (tick < eintrag.faelligTick) {
                    offen.push(eintrag);
                    continue;
                }
                var spieler = null;
                event.server.getPlayers().forEach(function (p) {
                    if (String(p.getUuid()) === eintrag.uuid) spieler = p;
                });
                if (spieler !== null) kopfBegruesse(spieler);
            }
            kopfWartende = offen;
        } catch (e) {
            kopfWartende = [];
            kopfMerkeFehler("Begruessung fehlgeschlagen: " + e);
        }
    });
} catch (e) {
    kopfMerkeFehler("ServerEvents.tick nicht registrierbar: " + e);
}

// Sofort beim Laden schreiben: Daran erkennt die Website, dass das Skript laeuft
// — und erst dann laesst sie ueberhaupt ein Kopfgeld aussetzen.
kopfSchreibeDatei();

try {
    ServerEvents.loaded(function (event) {
        kopfSchreibeDatei();
    });
} catch (e) {
    kopfMerkeFehler("ServerEvents.loaded fehlgeschlagen: " + e);
}
