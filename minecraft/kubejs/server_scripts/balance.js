// VIP Craft 4 — Kontostand im Spiel: "/vip balance" und eine Zeile beim Betreten
//
// Zwei Dinge, beide ohne die Website:
//   1. "/vip balance" sagt jedem, wie viel Geld er hat — auch ohne Rechte.
//   2. Wer den Server betritt, bekommt seinen Kontostand direkt nach den
//      offenen Kopfgeldern angesagt.
//
// WARUM basicPublicCommand UND NICHT basicCommand: ServerEvents.basicCommand
// registriert den Befehl mit .requires(spOrOP) — nur Konsole und Operatoren
// dürften ihn dann benutzen, für "jeder soll seinen Stand sehen können" also
// unbrauchbar. ServerEvents.basicPublicCommand registriert denselben Befehl
// OHNE requires. Beides nachgesehen in KubeJSCommands.java, Branch 2101
// (passend zu kubejs-neoforge-2101.7.2):
//     dispatcher.register(Commands.literal(id)
//         .requires(spOrOP)                                  <- nur basicCommand
//         .executes(... BASIC_COMMAND ...)
//         .then(Commands.argument("input", greedyString()) ...));
// Der Rest hinter dem Befehlsnamen kommt in beiden Fällen als event.input an;
// ohne Argument ist er leer.
//
// WARUM EIN UNTERBEFEHL ("/vip balance") STATT "/balance": Ein eigener
// Namensraum kollidiert nicht mit anderen Mods, und weitere Unterbefehle lassen
// sich später anhängen, ohne dass jeder einen eigenen Weltbefehl belegt.
//
// WARUM DIE ZEILE BEIM BETRETEN HIER LIEGT UND NICHT IN bounty.js: Der
// Kontostand hat mit Kopfgeldern nichts zu tun, und bounty.js läuft. Die
// Reihenfolge stimmt trotzdem: Die Kopfgeld-Begrüßung steht nach 60 Ticks an
// (KOPF_VERZOEGERUNG), diese Zeile nach 100 — also zwei Sekunden später und
// damit immer darunter.
//
// Geprüft gegen Create: Numismatics (github.com/Layers-of-Railways/CreateNumismatics,
// Branch 1.21.1/dev):
//   GlobalBankManager.accounts            public Map<UUID, BankAccount>
//   GlobalBankManager.getAccount(UUID)    @Nullable, legt NICHTS an
//   GlobalBankManager.getAccount(Player)  ruft getOrCreateAccount auf — deshalb
//     wird hier bewusst die UUID übergeben: Ein Kontostand-Befehl soll kein Konto anlegen.
//   BankAccount.getBalance()              Guthaben in Spurs
//   BankAccount.getLabel()                Name, nur bei BLAZE_BANKER gesetzt
//   BankAccount.isAuthorized(UUID)        true, wenn es das eigene Konto ist oder
//     der Spieler auf der Vertrauensliste eines Blaze-Banker-Kontos steht
//
// WARUM DIE SIGNATUR AUSGESCHRIEBEN WIRD: BankAccount hat isAuthorized(Player)
// UND isAuthorized(UUID). Rhino sucht sich bei Ueberladungen die passende
// Methode selbst - und scheiterte hier live am 17.09.2026 mit
//     InternalError: The choice of Java method ... isAuthorized matching
//     JavaScript argument types (net.minecraft.server.level.ServerPlayer) is
//     ambiguous; candidate methods are: isAuthorized(Player) / isAuthorized(UUID)
// Der Kontostand kam durch, die Zeile mit den gemeinsamen Kassen fiel aus.
// In Rhino waehlt konto["isAuthorized(java.util.UUID)"](uuid) genau eine
// Ueberladung aus. Welcher Weg tatsaechlich funktioniert hat, steht als "weg"
// in balance.json - dort ist auch zu sehen, wenn keiner geht.
//
// WICHTIG zu spieler.getUuid(): KubeJS benennt getUUID() für Skripte in
// getUuid() um (EntityMixin, @RemapForJS("getUuid")). getUUID() gibt es im
// Skript NICHT — dieser Fehler hat in inventory.js schon einmal die Entnahme
// lahmgelegt.
//
// Zu den Rhino- und Pfad-Eigenheiten (var statt const/let, EIN einzelner
// resolve()-Aufruf mit komplettem Unterpfad) steht die Begründung ausführlich
// in numismatics-export.js — dieselben Regeln gelten hier.
//
// ALLE Namen tragen das Präfix KONTO_/konto: KubeJS lädt alle server_scripts in
// EIN gemeinsames globales Rhino-Scope, gleichnamige Variablen aus zwei Dateien
// überschreiben sich gegenseitig.
//
// INSTALLATION
//   1. Datei nach kubejs/server_scripts/balance.js (npm run kubejs:deploy)
//   2. Konsolenbefehl "reload" — server_scripts werden dabei neu geladen, ohne
//      dass jemand vom Server fliegt. NICHT "kubejs reload server_scripts",
//      das quittiert dieser Server mit einem Parse-Fehler.
//   3. kubejs/data/balance.json prüfen: Dort muss "ready": true stehen.

var KONTO_FASSUNG = 2;
var KONTO_DATEI = "balance.json";
var KONTO_VERZOEGERUNG = 100; // Ticks bis zur Begruessung (5 s) — nach der Kopfgeldliste
var KONTO_MAX_KASSEN = 5; // so viele gemeinsame Kassen nennt die Ansage
var KONTO_SPURS_JE_COG = 64;

var kontoWartende = []; // { uuid, faelligTick }
var kontoWeg = null; // "signatur" | "uuid" | "aus" - siehe kontoWaehleWeg
var kontoFehler = [];
var kontoBereit = false;
var kontoAbfragen = 0;

var KontoPaths = null;
var KontoJsonIO = null;
var KontoNumismatics = null;

try {
    KontoPaths = Java.loadClass("dev.latvian.mods.kubejs.KubeJSPaths");
    KontoJsonIO = Java.loadClass("dev.latvian.mods.kubejs.util.JsonIO");
} catch (e) {
    console.error("[balance] KubeJS-Klassen konnten nicht geladen werden: " + e);
}
try {
    KontoNumismatics = Java.loadClass("dev.ithundxr.createnumismatics.Numismatics");
} catch (e) {
    console.error("[balance] Numismatics-Klasse konnte nicht geladen werden: " + e);
}

function kontoSchreibeDatei() {
    try {
        if (KontoPaths === null || KontoJsonIO === null) return;
        var ziel = KontoPaths.GAMEDIR.resolve("kubejs/data/" + KONTO_DATEI);
        var inhalt = {
            generatedAt: new Date().toISOString(),
            ready: kontoBereit,
            script: KONTO_FASSUNG,
            lookups: kontoAbfragen,
            weg: kontoWeg,
            errors: kontoFehler,
        };
        KontoJsonIO.write(ziel, KontoJsonIO.parseRaw(JSON.stringify(inhalt, null, 2)));
    } catch (e) {
        console.error("[balance] Datei-Schreibfehler: " + e);
    }
}

function kontoMerkeFehler(text) {
    kontoFehler.push({ at: new Date().toISOString(), error: String(text) });
    if (kontoFehler.length > 20) kontoFehler.shift();
    console.error("[balance] " + text);
    kontoSchreibeDatei();
}

/** "1.216 Spur" ist niemandem eine Hilfe: "19 Cog" bzw. "19 Cog 12 Spur". */
function kontoText(spurs) {
    var cogs = Math.floor(spurs / KONTO_SPURS_JE_COG);
    var rest = spurs % KONTO_SPURS_JE_COG;
    return rest === 0 ? cogs + " Cog" : cogs + " Cog " + rest + " Spur";
}

function kontoSage(spieler, text) {
    try {
        spieler.tell(Text.gold(text));
    } catch (e) {
        try {
            spieler.tell(text);
        } catch (e2) {
            /* Dann eben nicht - eine verlorene Zeile ist kein Grund, etwas abzubrechen. */
        }
    }
}

/**
 * Guthaben des eigenen Kontos in Spurs.
 *
 * Bewusst ueber die UUID: getAccount(Player) wuerde das Konto anlegen, wenn es
 * noch keins gibt. Wer noch nie Geld hatte, hat schlicht 0.
 */
function kontoStandVon(spieler) {
    var bank = KontoNumismatics.BANK;
    var eigenes = bank.getAccount(spieler.getUuid());
    return eigenes === null ? 0 : eigenes.getBalance();
}

/**
 * Einmal herausfinden, wie sich isAuthorized in diesem Rhino aufrufen laesst.
 * Beide Versuche schreiben ihren Fehler mit - stillschweigend aufgeben waere
 * genau der Grund, warum die Kassen beim ersten Anlauf gefehlt haben.
 */
function kontoWaehleWeg(konto, uuid) {
    try {
        konto["isAuthorized(java.util.UUID)"](uuid);
        return "signatur";
    } catch (e) {
        kontoMerkeFehler("isAuthorized mit ausgeschriebener Signatur nicht aufrufbar: " + e);
    }
    try {
        konto.isAuthorized(uuid);
        return "uuid";
    } catch (e) {
        kontoMerkeFehler("isAuthorized mit UUID nicht aufrufbar: " + e);
    }
    return "aus";
}

/** Darf der Spieler an dieses Konto? Genau die Pruefung der Mod selbst. */
function kontoDarfAn(konto, uuid) {
    if (kontoWeg === null) {
        kontoWeg = kontoWaehleWeg(konto, uuid);
        // Einmal festhalten, welcher Weg genommen wurde - sonst stuende in der
        // Datei fuer immer "null", und im gutmuetigen Fall (kein Fehler, also
        // kein Schreibanlass) waere von aussen gar nicht zu sehen, was laeuft.
        kontoSchreibeDatei();
    }
    if (kontoWeg === "signatur") return konto["isAuthorized(java.util.UUID)"](uuid) ? true : false;
    if (kontoWeg === "uuid") return konto.isAuthorized(uuid) ? true : false;
    return false;
}

/**
 * Die gemeinsamen Kassen, an die der Spieler herankommt.
 *
 * Die Vertrauensliste eines Kontos ist privat und von hier nicht lesbar -
 * deshalb fragt dieses Skript die Mod, statt selbst zu vergleichen.
 */
function kontoKassen(spieler) {
    var kassen = [];
    try {
        var uuid = spieler.getUuid();
        var bank = KontoNumismatics.BANK;
        bank.accounts.entrySet().forEach(function (eintrag) {
            var konto = eintrag.getValue();
            if (String(konto.type) !== "BLAZE_BANKER") return;
            if (!kontoDarfAn(konto, uuid)) return;
            var name = konto.getLabel();
            kassen.push({ name: name ? String(name) : "Gemeinsame Kasse", spurs: konto.getBalance() });
        });
    } catch (e) {
        // Folgenlos: Dann steht eben nur das eigene Konto da.
        kontoMerkeFehler("Kassen nicht lesbar: " + e);
    }
    return kassen;
}

/** Die eigentliche Ansage - benutzt vom Befehl und von der Begruessung. */
function kontoZeigen(spieler, mitUeberschrift) {
    if (KontoNumismatics === null) {
        kontoSage(spieler, "Der Kontostand ist gerade nicht abrufbar.");
        return;
    }

    kontoAbfragen += 1;
    var stand = kontoStandVon(spieler);
    if (mitUeberschrift) kontoSage(spieler, "--- Dein Konto ---");
    kontoSage(spieler, "Guthaben: " + kontoText(stand));

    var kassen = kontoKassen(spieler);
    var bis = Math.min(kassen.length, KONTO_MAX_KASSEN);
    for (var i = 0; i < bis; i++) {
        kontoSage(spieler, "Zugriff auf " + kassen[i].name + ": " + kontoText(kassen[i].spurs));
    }
    if (kassen.length > bis) {
        kontoSage(spieler, "... und " + (kassen.length - bis) + " weitere Kassen.");
    }
}

// ---------------------------------------------------------------------------
// /vip balance
// ---------------------------------------------------------------------------

try {
    ServerEvents.basicPublicCommand("vip", function (event) {
        try {
            // event.input ist der Rest hinter dem Befehlsnamen. Falls eine
            // KubeJS-Fassung den Namen doch mitschickt, fliegt er hier raus.
            var eingabe = String(event.input || "")
                .trim()
                .toLowerCase();
            if (eingabe.indexOf("vip ") === 0) eingabe = eingabe.substring(4).trim();
            if (eingabe === "vip") eingabe = "";

            var spieler = event.player;
            if (spieler === null || spieler === undefined) {
                // Von der Konsole aus gibt es kein "eigenes" Konto.
                console.log("[balance] /vip balance funktioniert nur im Spiel.");
                return;
            }

            if (eingabe === "balance" || eingabe === "konto" || eingabe === "geld" || eingabe === "kontostand") {
                kontoZeigen(spieler, true);
                return;
            }

            kontoSage(spieler, "/vip balance - zeigt dein Guthaben.");
        } catch (e) {
            kontoMerkeFehler("Befehl fehlgeschlagen: " + e);
        }
    });

    kontoBereit = true;
} catch (e) {
    kontoMerkeFehler("Befehl konnte nicht registriert werden: " + e);
}

// ---------------------------------------------------------------------------
// Beim Betreten
// ---------------------------------------------------------------------------

try {
    PlayerEvents.loggedIn(function (event) {
        try {
            var spieler = event.player || event.getPlayer();
            kontoWartende.push({
                uuid: String(spieler.getUuid()),
                faelligTick: event.server.getTickCount() + KONTO_VERZOEGERUNG,
            });
        } catch (e) {
            kontoMerkeFehler("Login nicht vermerkt: " + e);
        }
    });
} catch (e) {
    kontoMerkeFehler("PlayerEvents.loggedIn nicht registrierbar: " + e);
}

try {
    ServerEvents.tick(function (event) {
        if (kontoWartende.length === 0) return;
        try {
            var tick = event.server.getTickCount();
            var offen = [];
            for (var i = 0; i < kontoWartende.length; i++) {
                var eintrag = kontoWartende[i];
                if (tick < eintrag.faelligTick) {
                    offen.push(eintrag);
                    continue;
                }
                var spieler = null;
                event.server.getPlayers().forEach(function (p) {
                    if (String(p.getUuid()) === eintrag.uuid) spieler = p;
                });
                // Wer in der Zwischenzeit wieder gegangen ist, faellt hier durch.
                if (spieler !== null) kontoZeigen(spieler, false);
            }
            kontoWartende = offen;
        } catch (e) {
            kontoWartende = [];
            kontoMerkeFehler("Begruessung fehlgeschlagen: " + e);
        }
    });
} catch (e) {
    kontoMerkeFehler("ServerEvents.tick nicht registrierbar: " + e);
}

// Sofort beim Laden schreiben: Daran ist von aussen zu sehen, dass das Skript laeuft.
kontoSchreibeDatei();

try {
    ServerEvents.loaded(function (event) {
        kontoSchreibeDatei();
    });
} catch (e) {
    kontoMerkeFehler("ServerEvents.loaded fehlgeschlagen: " + e);
}
