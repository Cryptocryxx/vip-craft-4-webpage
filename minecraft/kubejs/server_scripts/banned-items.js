// VIP Craft 4 — Gesperrte Rezepte und der Elytren-Bann
//
// Nimmt drei Dinge aus dem Spiel:
//
//   create:schematicannon           Rezept entfernt
//   createthrusters:physics_staff   Rezept entfernt  (Create Aeronautics: Gadgets & Gizmos)
//   minecraft:elytra                Rezept entfernt UND aus Inventaren geloescht
//
// WARUM BEI DER ELYTRE MEHR ALS DAS REZEPT NOETIG IST: Die Elytre hat gar
// keins. Sie haengt in einem Rahmen im Endschiff, und zwar als Teil der
// Struktur selbst — nicht in einer Beuteliste. Es gibt also nichts, was sich
// per Loot-Tabelle abschalten liesse: Wer zum Endschiff fliegt, nimmt sie aus
// dem Rahmen und hat sie. Deshalb wird sie hier aus dem Inventar entfernt,
// sobald sie darin auftaucht. Das Rezept wird trotzdem mit entfernt: Unter 132
// Mods kann eine durchaus eins mitbringen, und dann faellt es gleich mit weg.
//
// ZWEI WEGE, ABSICHTLICH: Der Ereignisweg (PlayerEvents.inventoryChanged)
// greift sofort, sobald eine Elytre in einem Inventarfach landet. Die
// regelmaessige Runde im Tick greift auch bei Elytren, die schon VOR diesem
// Skript in einer Truhe im Inventar lagen und seitdem niemand angefasst hat —
// die loesen naemlich kein Ereignis aus. Ohne die Runde blieben genau die
// liegen, um die es hier gerade geht.
//
// WAS DER BANN NICHT ERREICHT: Was in einer Kiste, einer Enderkiste oder einem
// Rucksack liegt, wird nicht durchsucht — nur was ein Spieler bei sich traegt
// (inklusive Ruestungsplaetze). Um dort hinein zu kommen, muss die Elytre
// allerdings durch das Inventar gewandert sein, und spaetestens dort ist sie
// weg. Der Vollstaendigkeit halber steht es hier trotzdem.
//
// GEPRUEFT AN DER QUELLE (11.09.2026), weil geratene Signaturen hier schon
// einmal Zeit gekostet haben:
//   KubeJS 2101.7.2 auf diesem Server (mods/kubejs-neoforge-2101.7.2-*.jar),
//   Quelltext github.com/KubeJS-Mods/KubeJS, Zweig 2101:
//     ServerEvents.recipes → RecipesKubeEvent#remove(RecipeFilter) gibt NICHTS
//       zurueck, deshalb steht die Anzahl ueber findRecipeIds() davor im Log.
//     PlayerEvents.inventoryChanged ist auf ein Item eingrenzbar
//       (PlayerEvents.java: INVENTORY_CHANGED … supportsTarget(ItemEvents.TARGET)).
//     ItemStackKJS ist mit @RemapPrefixForJS("kjs$") versehen — kjs$getId()
//       heisst in JS also getId().
//     NICHT benutzt: inventory.clear(predicate). InventoryKJS#kjs$clear zaehlt
//       von kjs$getSlots() abwaerts und greift damit im ersten Durchlauf ein
//       Fach hinter das letzte. Die Schleife unten laeuft deshalb von Hand.
//   createthrusters:physics_staff stammt aus dem Mod-Jar selbst
//     (createthrusters-bundled-V1.1.3.jar, Eintrag
//     data/createthrusters/recipe/physics_staff.json) — nicht aus einem Wiki.
//
// ALLE Namen tragen das Praefix BAN_/ban: KubeJS laedt alle server_scripts in
// EIN gemeinsames globales Scope, siehe die Warnung in flight-log.js.
//
// INSTALLATION
//   1. npm run kubejs:deploy -- banned
//   2. Konsolenbefehl "reload" (laedt die Datenpakete neu, wirft niemanden vom
//      Server — derselbe Weg wie bei flight-log.js). Danach greifen die
//      Rezeptsperren. Ein Neustart tut es genauso.
//   3. Im Serverlog nach "[bann]" suchen: Dort steht, welche Rezept-IDs
//      wirklich entfernt wurden. Eine leere Liste heisst, dass die Item-ID
//      nicht stimmt — dann faellt es sofort auf und nicht erst im Spiel.

var BAN_FASSUNG = 1;

/** Diese Rezepte soll es nicht mehr geben. */
var BAN_REZEPTE = ["create:schematicannon", "createthrusters:physics_staff", "minecraft:elytra"];

/** Diese Gegenstaende werden zusaetzlich aus Inventaren entfernt. */
var BAN_ITEMS = ["minecraft:elytra"];

/** Wie oft die Runde ueber alle Online-Spieler geht. 20 Ticks = 1 Sekunde. */
var BAN_RUNDE_TAKT = 20 * 10;

/**
 * Spieler, die im naechsten Tick geprueft werden sollen (UUID als Text).
 *
 * Warum nicht sofort im Ereignis: Das Ereignis kommt aus
 * AbstractContainerMenu#broadcastChanges — also mitten aus dem Abgleich
 * zwischen Server und Client. Wer dort hineingreift, riskiert ein Fach, das
 * beim Spieler noch als voll angezeigt wird. Einen Tick spaeter ist der
 * Abgleich durch und das Entfernen geht sauber ueber die Leitung.
 */
var banGleich = {};

// ---------------------------------------------------------------------------
// Rezepte
// ---------------------------------------------------------------------------

try {
    ServerEvents.recipes(function (event) {
        BAN_REZEPTE.forEach(function (id) {
            try {
                var treffer = event.findRecipeIds({ output: id });
                var anzahl = treffer ? treffer.size() : 0;
                console.info("[bann] " + id + ": " + anzahl + " Rezept(e) entfernt " + treffer);
                event.remove({ output: id });
            } catch (e) {
                // Ein kaputtes Filter-Argument darf nicht die anderen Sperren
                // mitreissen - deshalb je Eintrag ein eigener Versuch.
                console.error("[bann] " + id + " liess sich nicht entfernen: " + e);
            }
        });
    });
} catch (e) {
    console.error("[bann] ServerEvents.recipes nicht registrierbar: " + e);
}

// ---------------------------------------------------------------------------
// Elytren einsammeln
// ---------------------------------------------------------------------------

/** Steht dieser Gegenstand auf der Sperrliste? */
function banGesperrt(stack) {
    try {
        if (!stack || stack.isEmpty()) return false;
        return BAN_ITEMS.indexOf(String(stack.getId())) >= 0;
    } catch (e) {
        console.error("[bann] Gegenstand nicht lesbar: " + e);
        return false;
    }
}

/**
 * Raeumt das Inventar eines Spielers und gibt zurueck, wie viel weg ist.
 *
 * getContainerSize() deckt in 1.21 auch die vier Ruestungsplaetze und die
 * zweite Hand ab - eine angezogene Elytre faellt also mit darunter.
 */
function banRaeumeAuf(spieler) {
    var entfernt = 0;
    try {
        var inventar = spieler.getInventory();
        for (var i = 0; i < inventar.getContainerSize(); i++) {
            var stack = inventar.getItem(i);
            if (!banGesperrt(stack)) continue;
            var anzahl = stack.getCount();
            inventar.removeItem(i, anzahl);
            entfernt += anzahl;
        }
    } catch (e) {
        console.error("[bann] Inventar nicht durchsuchbar: " + e);
        return entfernt;
    }

    if (entfernt > 0) {
        console.info("[bann] " + spieler.getUsername() + ": " + entfernt + " Elytre(n) entfernt");
        banSage(spieler, "Elytren gibt es auf VIP Craft 4 nicht - geflogen wird mit Luftschiffen.");
    }
    return entfernt;
}

/** Schickt eine Zeile, moeglichst in Gold (wie in bounty.js). */
function banSage(spieler, text) {
    try {
        spieler.tell(Text.gold(text));
    } catch (e) {
        try {
            spieler.tell(text);
        } catch (e2) {
            console.error("[bann] Hinweis nicht zustellbar: " + e2);
        }
    }
}

try {
    PlayerEvents.inventoryChanged("minecraft:elytra", function (event) {
        try {
            var spieler = event.player || event.getPlayer();
            if (spieler) banGleich[String(spieler.getUuid())] = true;
        } catch (e) {
            console.error("[bann] inventoryChanged fehlgeschlagen: " + e);
        }
    });
} catch (e) {
    console.error("[bann] PlayerEvents.inventoryChanged nicht registrierbar: " + e);
}

try {
    ServerEvents.tick(function (event) {
        try {
            var server = event.server;
            var runde = server.getTickCount() % BAN_RUNDE_TAKT === 0;

            server.getPlayers().forEach(function (spieler) {
                var uuid = String(spieler.getUuid());
                if (!runde && !banGleich[uuid]) return;
                delete banGleich[uuid];
                banRaeumeAuf(spieler);
            });

            // Reste von Spielern, die zwischen Ereignis und Tick gegangen
            // sind - sonst waechst die Merkliste ueber Wochen leise mit.
            if (runde) banGleich = {};
        } catch (e) {
            console.error("[bann] Tick fehlgeschlagen: " + e);
        }
    });
} catch (e) {
    console.error("[bann] ServerEvents.tick nicht registrierbar: " + e);
}

console.info("[bann] Skript geladen, Fassung " + BAN_FASSUNG);
