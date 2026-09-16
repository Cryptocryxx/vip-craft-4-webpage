// VIP Craft 4 — Inventar für den Kontrollraum: Items nehmen, geben, zurückgeben
//
// Registriert den Konsolenbefehl
//
//     vipinventar nehmen  <spieler-uuid> <ort> <item-id> <anzahl> <beleg-id>
//     vipinventar geben   <spieler-uuid> <item-id> <anzahl> <beleg-id>
//     vipinventar zurueck <spieler-uuid> <beleg-id>
//
// und schreibt jede Ausführung als Quittung nach kubejs/data/inventory.json.
// Die Website (lib/inventar-aktionen.ts) glaubt erst der Quittung – Crafty
// meldet nur, dass der Befehl in der Konsole ankam. Dasselbe Muster wie bei
// Kopfgeld (bounty.js) und Gehalt (salary.js).
//
// ORTE (gleich definiert wie ORT_RE in lib/inventar-types.ts):
//   inv:<0-40>            Inventar; 36–39 Rüstung (Füße…Kopf), 40 Nebenhand
//   ender:<0-26>          Endertruhe
//   curios:<slot>:<n>     Curios-Slot; curioskos:<slot>:<n> ist dessen kosmetischer Platz
//   kosmetik:<n>          Cosmetic Armor Reworked
//   rucksack:<uuid>:<n>   Platz in einem Rucksack, der dem Spieler direkt gehört
//                         (getragen, im Inventar, in der Endertruhe oder in einem
//                         dieser Rucksäcke)
//
// WARUM DIE ITEM-ID MITGEHT: Die Website zeigt den letzten Speicherstand, und
// der kann Minuten alt sein. Hat der Spieler inzwischen umgeräumt, läge im Slot
// etwas anderes – das würde ohne Prüfung einfach verschwinden. Entnommen wird
// deshalb nur, wenn dort noch genau dieses Item in ausreichender Menge liegt.
//
// NUR ONLINE: Wer offline ist, hat kein Inventar im Speicher des Servers. Die
// Datei bei laufendem Server zu ändern ginge beim nächsten Einloggen verloren.
//
// WARUM NUR EIN EXEMPLAR ALS SNBT: ItemStack.save() nimmt in 1.21 höchstens 99
// Stück an, im Rucksack mit Stack-Upgrade liegen aber auch 887 Pfeile auf einem
// Platz. Deshalb steht die Menge getrennt in der Quittung.
//
// GEPRÜFT gegen Quelltext UND die installierten Jars (15.09.2026):
//   KubeJS 2101 kubejs.classfilter.txt: "+ net.minecraft" (nur net.minecraft.Util
//     gesperrt), Mod-Klassen nicht gelistet und damit erlaubt
//   KubeJS 2101 Umbenennungen für Skripte (core/mixin, @RemapForJS/@HideFromJS):
//     Entity.getUUID heisst getUuid; ItemStack.enchant/getEnchantments/getTags
//     sind ausgeblendet (hier nicht benutzt). Vanilla-Namen also nicht blind
//     übernehmen – in Fassung 1 fehlte genau das.
//   Curios 9.5.1:
//     CuriosApi.getCuriosInventory(LivingEntity) : Optional<ICuriosItemHandler>
//     ICuriosItemHandler.getCurios() : Map<String, ICurioStacksHandler>
//     ICurioStacksHandler.getStacks() / getCosmeticStacks() : IDynamicStackHandler
//   Sophisticated Backpacks 3.25.78 / Core 1.4.90:
//     BackpackWrapper.fromStack(ItemStack).getInventoryHandler() : InventoryHandler
//     ModCoreDataComponents.STORAGE_UUID : Supplier<DataComponentType<UUID>>
//     fromStack legt einem Rucksack OHNE Kennung eine neue an – deshalb wird nur
//     angefasst, was schon eine hat.
//   Cosmetic Armor Reworked: CosArmorAPI.getCAStacks(UUID) : CAStacksBase (ItemStackHandler)
//
// RHINO: nur var und function (siehe insights-log.js), Java-Klassen einmal oben
// laden, alle globalen Namen mit Präfix INV_/inv (gemeinsames Scope, bounty.js).
//
// INSTALLATION
//   1. npm run kubejs:deploy -- inventory
//   2. Konsolenbefehl "reload" (wirft niemanden vom Server)
//   3. kubejs/data/inventory.json prüfen: "ready": true und "script": 2

var INV_FASSUNG = 2;
var INV_DATEI = "inventory.json"; // Quittungen, geschrieben von HIER
var INV_RUECKGABEN = "inventory-return.json"; // Stapel zum Zurückgeben, geschrieben von der WEBSITE
var INV_MAX_BELEGE = 200;
var INV_MAX_TIEFE = 4; // Rucksäcke in Rucksäcken
var INV_MAX_ANZAHL = 9999;

var INV_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
var INV_BELEG_RE = /^[a-z0-9]{10,40}$/;
var INV_ITEM_RE = /^[a-z0-9_.-]{1,32}:[a-z0-9_./-]{1,64}$/;

var InvPaths = null;
var InvJsonIO = null;
var InvUUID = null;
var InvRegistries = null;
var InvResourceLocation = null;
var InvItemStack = null;
var InvTagParser = null;
var InvCurios = null;
var InvRucksack = null;
var InvKomponenten = null;
var InvKosmetik = null;

var invBelege = [];
var invFehler = [];
var invBereit = false;
/*
 * Aufträge warten auf den nächsten Tick – im Befehl-Ereignis steht nicht sicher
 * ein Server-Objekt bereit, der Tick liefert eins (siehe bounty.js).
 */
var invAuftraege = [];

function invMerkeFehler(text) {
    invFehler.push({ at: new Date().toISOString(), error: String(text) });
    if (invFehler.length > 20) invFehler.shift();
    console.error("[inventar] " + text);
    invSchreibeDatei();
}

try {
    InvPaths = Java.loadClass("dev.latvian.mods.kubejs.KubeJSPaths");
    InvJsonIO = Java.loadClass("dev.latvian.mods.kubejs.util.JsonIO");
} catch (e) {
    console.error("[inventar] KubeJS-Klassen nicht ladbar: " + e);
}
try {
    InvUUID = Java.loadClass("java.util.UUID");
    InvRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
    InvResourceLocation = Java.loadClass("net.minecraft.resources.ResourceLocation");
    InvItemStack = Java.loadClass("net.minecraft.world.item.ItemStack");
    InvTagParser = Java.loadClass("net.minecraft.nbt.TagParser");
} catch (e) {
    invFehler.push({ at: new Date().toISOString(), error: "Minecraft-Klassen nicht ladbar: " + e });
}
// Die Mods einzeln: Fehlt einer, fallen nur dessen Orte weg.
try {
    InvCurios = Java.loadClass("top.theillusivec4.curios.api.CuriosApi");
} catch (e) {
    invFehler.push({ at: new Date().toISOString(), error: "Curios nicht ladbar: " + e });
}
try {
    InvRucksack = Java.loadClass("net.p3pp3rf1y.sophisticatedbackpacks.backpack.wrapper.BackpackWrapper");
    InvKomponenten = Java.loadClass("net.p3pp3rf1y.sophisticatedcore.init.ModCoreDataComponents");
} catch (e) {
    InvRucksack = null;
    InvKomponenten = null;
    invFehler.push({ at: new Date().toISOString(), error: "Sophisticated Backpacks nicht ladbar: " + e });
}
try {
    InvKosmetik = Java.loadClass("lain.mods.cos.api.CosArmorAPI");
} catch (e) {
    invFehler.push({ at: new Date().toISOString(), error: "Cosmetic Armor nicht ladbar: " + e });
}

function invSchreibeDatei() {
    try {
        if (InvPaths === null || InvJsonIO === null) return;
        var ziel = InvPaths.GAMEDIR.resolve("kubejs/data/" + INV_DATEI);
        var inhalt = {
            generatedAt: new Date().toISOString(),
            ready: invBereit,
            script: INV_FASSUNG,
            errors: invFehler,
            receipts: invBelege,
        };
        InvJsonIO.write(ziel, InvJsonIO.parseRaw(JSON.stringify(inhalt, null, 2)));
    } catch (e) {
        console.error("[inventar] Datei-Schreibfehler: " + e);
    }
}

function invFinde(belegId) {
    for (var i = 0; i < invBelege.length; i++) {
        if (invBelege[i].belegId === belegId) return invBelege[i];
    }
    return null;
}

function invQuittiere(beleg) {
    beleg.at = new Date().toISOString();
    invBelege.push(beleg);
    if (invBelege.length > INV_MAX_BELEGE) invBelege.shift();
    invSchreibeDatei();
}

function invAbgelehnt(auftrag, grund, detail) {
    invQuittiere({
        belegId: auftrag.belegId,
        art: auftrag.art,
        uuid: auftrag.uuid,
        ort: auftrag.ort || null,
        itemId: auftrag.itemId || null,
        anzahl: auftrag.anzahl || null,
        ok: false,
        grund: grund,
        detail: detail || null,
        snbt: null,
        gefallen: null,
    });
}

// ---------------------------------------------------------------------------
// Items und Plätze
// ---------------------------------------------------------------------------

function invItemId(stack) {
    return String(InvRegistries.ITEM.getKey(stack.getItem()));
}

function invBeschreibe(stack) {
    return stack.getCount() + "x " + invItemId(stack);
}

/** Kennung des Rucksack-Inhalts – null bei allem, was kein Rucksack mit Kennung ist. */
function invRucksackKennung(stack) {
    if (InvKomponenten === null || stack.isEmpty()) return null;
    var kennung = stack.get(InvKomponenten.STORAGE_UUID.get());
    return kennung === null || kennung === undefined ? null : String(kennung);
}

/** Ein Platz mit Lesen und Schreiben – egal, ob Container oder ItemHandler dahintersteckt. */
function invAusContainer(container, index) {
    if (container === null || index < 0 || index >= container.getContainerSize()) return null;
    return {
        lies: function () {
            return container.getItem(index);
        },
        schreibe: function (stack) {
            container.setItem(index, stack);
            container.setChanged();
        },
    };
}

function invAusHandler(handler, index) {
    if (handler === null || handler === undefined || index < 0 || index >= handler.getSlots()) return null;
    return {
        lies: function () {
            return handler.getStackInSlot(index);
        },
        schreibe: function (stack) {
            handler.setStackInSlot(index, stack);
        },
    };
}

function invCuriosHandler(spieler, kennung, kosmetisch) {
    if (InvCurios === null) return null;
    var inventar = InvCurios.getCuriosInventory(spieler).orElse(null);
    if (inventar === null) return null;
    var stacks = inventar.getCurios().get(kennung);
    if (stacks === null || stacks === undefined) return null;
    return kosmetisch ? stacks.getCosmeticStacks() : stacks.getStacks();
}

/**
 * getUuid, NICHT getUUID: KubeJS benennt Entity.getUUID() für Skripte um
 * (core/mixin/EntityMixin, @RemapForJS("getUuid")). Unter dem Vanilla-Namen
 * gibt es die Methode in Rhino nicht. Genau daran ist am 15.09.2026 jede
 * Entnahme aus einem Rucksack gescheitert – die Suche kommt auch hier vorbei.
 */
function invKosmetik(spieler) {
    if (InvKosmetik === null) return null;
    return InvKosmetik.getCAStacks(spieler.getUuid());
}

/** Alle Plätze, die dem Spieler direkt gehören – Ausgangspunkt der Rucksack-Suche. */
function invAllePlaetze(spieler) {
    var plaetze = [];
    var inventar = spieler.getInventory();
    for (var i = 0; i < inventar.getContainerSize(); i++) plaetze.push(invAusContainer(inventar, i));

    var ender = spieler.getEnderChestInventory();
    for (var j = 0; j < ender.getContainerSize(); j++) plaetze.push(invAusContainer(ender, j));

    if (InvCurios !== null) {
        var curios = InvCurios.getCuriosInventory(spieler).orElse(null);
        if (curios !== null) {
            curios.getCurios().values().forEach(function (stacks) {
                var normal = stacks.getStacks();
                var kosmetisch = stacks.getCosmeticStacks();
                for (var a = 0; a < normal.getSlots(); a++) plaetze.push(invAusHandler(normal, a));
                for (var b = 0; b < kosmetisch.getSlots(); b++) plaetze.push(invAusHandler(kosmetisch, b));
            });
        }
    }

    var kosmetik = invKosmetik(spieler);
    if (kosmetik !== null) {
        for (var k = 0; k < kosmetik.getSlots(); k++) plaetze.push(invAusHandler(kosmetik, k));
    }
    return plaetze;
}

/** Den Inventar-Handler des Rucksacks mit dieser Kennung finden – nur unter dem, was der Spieler hat. */
function invFindeRucksack(spieler, kennung) {
    if (InvRucksack === null || InvKomponenten === null) return null;

    var offen = [];
    var plaetze = invAllePlaetze(spieler);
    for (var i = 0; i < plaetze.length; i++) {
        if (plaetze[i] !== null) offen.push({ stack: plaetze[i].lies(), tiefe: 0 });
    }

    var gesehen = {};
    while (offen.length > 0) {
        var eintrag = offen.shift();
        var eigene = invRucksackKennung(eintrag.stack);
        if (eigene === null || gesehen[eigene] === true) continue;
        gesehen[eigene] = true;

        var handler = null;
        try {
            handler = InvRucksack.fromStack(eintrag.stack).getInventoryHandler();
        } catch (e) {
            // Verknüpfte Rucksäcke ohne Gegenstelle werfen – dann eben nicht.
            continue;
        }
        if (eigene === kennung) return handler;
        if (eintrag.tiefe >= INV_MAX_TIEFE) continue;
        for (var s = 0; s < handler.getSlots(); s++) {
            offen.push({ stack: handler.getStackInSlot(s), tiefe: eintrag.tiefe + 1 });
        }
    }
    return null;
}

/** Ort → Platz. Kommt kein Platz heraus, sagt `grund`, warum. */
function invOrt(spieler, ort) {
    var teile = String(ort).split(":");
    var art = teile[0];
    var index = parseInt(teile[teile.length - 1], 10);
    if (!isFinite(index)) return { platz: null, grund: "ort-ungueltig" };

    if (art === "inv" && teile.length === 2) {
        return { platz: invAusContainer(spieler.getInventory(), index), grund: "ort-ungueltig" };
    }
    if (art === "ender" && teile.length === 2) {
        return { platz: invAusContainer(spieler.getEnderChestInventory(), index), grund: "ort-ungueltig" };
    }
    if ((art === "curios" || art === "curioskos") && teile.length === 3) {
        return { platz: invAusHandler(invCuriosHandler(spieler, teile[1], art === "curioskos"), index), grund: "ort-ungueltig" };
    }
    if (art === "kosmetik" && teile.length === 2) {
        return { platz: invAusHandler(invKosmetik(spieler), index), grund: "ort-ungueltig" };
    }
    if (art === "rucksack" && teile.length === 3) {
        var handler = invFindeRucksack(spieler, teile[1]);
        if (handler === null) return { platz: null, grund: "rucksack-fehlt" };
        return { platz: invAusHandler(handler, index), grund: "ort-ungueltig" };
    }
    return { platz: null, grund: "ort-ungueltig" };
}

/**
 * Legt `anzahl` Exemplare der Vorlage ins Inventar – in Stapeln der erlaubten
 * Größe. Was nicht passt, fällt vor die Füße. Gibt zurück, wie viele gefallen sind.
 */
function invLegeAb(spieler, vorlage, anzahl) {
    var groesse = Math.max(1, vorlage.getMaxStackSize());
    var rest = anzahl;
    var gefallen = 0;
    while (rest > 0) {
        var menge = Math.min(rest, groesse);
        var teil = vorlage.copyWithCount(menge);
        spieler.getInventory().add(teil);
        if (!teil.isEmpty()) {
            gefallen += teil.getCount();
            spieler.drop(teil, false);
        }
        rest -= menge;
    }
    return gefallen;
}

// ---------------------------------------------------------------------------
// Aufträge
// ---------------------------------------------------------------------------

function invNimm(server, auftrag, spieler) {
    var gefunden = invOrt(spieler, auftrag.ort);
    if (gefunden.platz === null) return invAbgelehnt(auftrag, gefunden.grund, null);

    var stack = gefunden.platz.lies();
    if (stack.isEmpty()) return invAbgelehnt(auftrag, "leer", null);

    var id = invItemId(stack);
    if (id !== auftrag.itemId) return invAbgelehnt(auftrag, "anderes-item", invBeschreibe(stack));

    var vorhanden = stack.getCount();
    if (vorhanden < auftrag.anzahl) return invAbgelehnt(auftrag, "zu-wenig", vorhanden + "x " + id);

    // ERST sichern, dann entnehmen: Scheitert das Sichern, ist nichts weg.
    var snbt = String(stack.copyWithCount(1).save(server.registryAccess()));
    var soll = vorhanden - auftrag.anzahl;

    gefunden.platz.schreibe(soll === 0 ? InvItemStack.EMPTY : stack.copyWithCount(soll));

    // Gegenprobe: Hat der Platz das Schreiben angenommen? Ein Fehler hier darf
    // die Quittung nicht verhindern – das Item ist dann womöglich schon weg.
    var angekommen = true;
    var danach = "?";
    try {
        var jetzt = gefunden.platz.lies();
        var rest = jetzt.isEmpty() ? 0 : invItemId(jetzt) === id ? jetzt.getCount() : -1;
        danach = jetzt.isEmpty() ? "leer" : invBeschreibe(jetzt);
        angekommen = rest === soll;
    } catch (e) {
        danach = "Gegenprobe fehlgeschlagen: " + e;
    }

    if (!angekommen) {
        invMerkeFehler("Entnahme nicht wie erwartet (" + auftrag.ort + "): erwartet " + soll + ", danach " + danach);
        return invAbgelehnt(auftrag, "nicht-uebernommen", "Der Platz zeigt danach: " + danach + ". Bitte im Spiel prüfen.");
    }

    invQuittiere({
        belegId: auftrag.belegId,
        art: auftrag.art,
        uuid: auftrag.uuid,
        ort: auftrag.ort,
        itemId: id,
        anzahl: auftrag.anzahl,
        ok: true,
        grund: null,
        detail: null,
        snbt: snbt,
        gefallen: null,
    });
}

function invGib(server, auftrag, spieler) {
    var schluessel = InvResourceLocation.tryParse(auftrag.itemId);
    if (schluessel === null || !InvRegistries.ITEM.containsKey(schluessel)) {
        return invAbgelehnt(auftrag, "item-unbekannt", null);
    }
    var vorlage = InvRegistries.ITEM.get(schluessel).getDefaultInstance();
    if (vorlage.isEmpty()) return invAbgelehnt(auftrag, "item-unbekannt", null);

    var gefallen = invLegeAb(spieler, vorlage, auftrag.anzahl);
    invQuittiere({
        belegId: auftrag.belegId,
        art: auftrag.art,
        uuid: auftrag.uuid,
        ort: null,
        itemId: auftrag.itemId,
        anzahl: auftrag.anzahl,
        ok: true,
        grund: null,
        detail: null,
        snbt: null,
        gefallen: gefallen,
    });
}

/** Die Rückgabedatei der Website lesen – wie in bounty.js mit readString, nicht read(). */
function invLiesRueckgaben() {
    var quelle = InvPaths.GAMEDIR.resolve("kubejs/data/" + INV_RUECKGABEN);
    var text = String(InvJsonIO.readString(quelle));
    if (!text || text === "null" || text === "undefined") return null;
    return JSON.parse(text);
}

function invGibZurueck(server, auftrag, spieler) {
    var datei = null;
    try {
        datei = invLiesRueckgaben();
    } catch (e) {
        return invAbgelehnt(auftrag, "kein-auftrag", "Rückgabedatei nicht lesbar: " + e);
    }

    var eintrag = null;
    var liste = datei !== null && datei.entries ? datei.entries : [];
    for (var i = 0; i < liste.length; i++) {
        if (liste[i] && liste[i].belegId === auftrag.belegId && String(liste[i].uuid) === auftrag.uuid) eintrag = liste[i];
    }
    if (eintrag === null || !eintrag.snbt) return invAbgelehnt(auftrag, "kein-auftrag", null);

    var stack = InvItemStack.parseOptional(server.registryAccess(), InvTagParser.parseTag(String(eintrag.snbt)));
    if (stack.isEmpty()) return invAbgelehnt(auftrag, "item-unbekannt", null);

    var anzahl = parseInt(eintrag.anzahl, 10);
    if (!isFinite(anzahl) || anzahl < 1 || anzahl > INV_MAX_ANZAHL) anzahl = stack.getCount();

    var gefallen = invLegeAb(spieler, stack, anzahl);
    invQuittiere({
        belegId: auftrag.belegId,
        art: auftrag.art,
        uuid: auftrag.uuid,
        ort: null,
        itemId: invItemId(stack),
        anzahl: anzahl,
        ok: true,
        grund: null,
        detail: null,
        snbt: null,
        gefallen: gefallen,
    });
}

// ---------------------------------------------------------------------------
// Anmeldung
// ---------------------------------------------------------------------------

try {
    ServerEvents.basicCommand("vipinventar", function (event) {
        try {
            var eingabe = String(event.input || "").trim();
            if (eingabe.indexOf("vipinventar") === 0) eingabe = eingabe.substring(11).trim();
            var t = eingabe.split(/\s+/);
            var auftrag = null;

            if (t[0] === "nehmen" && t.length === 6) {
                auftrag = { art: "nehmen", uuid: t[1], ort: t[2], itemId: t[3], anzahl: parseInt(t[4], 10), belegId: t[5] };
            } else if (t[0] === "geben" && t.length === 5) {
                auftrag = { art: "geben", uuid: t[1], itemId: t[2], anzahl: parseInt(t[3], 10), belegId: t[4] };
            } else if (t[0] === "zurueck" && t.length === 3) {
                auftrag = { art: "zurueck", uuid: t[1], belegId: t[2] };
            }

            if (auftrag === null) {
                console.log("[inventar] Aufruf: vipinventar nehmen <uuid> <ort> <item-id> <anzahl> <beleg>");
                console.log("[inventar]     oder: vipinventar geben <uuid> <item-id> <anzahl> <beleg>");
                console.log("[inventar]     oder: vipinventar zurueck <uuid> <beleg>");
                return;
            }
            if (!INV_UUID_RE.test(auftrag.uuid) || !INV_BELEG_RE.test(auftrag.belegId)) {
                console.log("[inventar] UUID oder Beleg unplausibel");
                return;
            }
            if (auftrag.itemId !== undefined && !INV_ITEM_RE.test(auftrag.itemId)) {
                console.log("[inventar] Item-ID unplausibel: " + auftrag.itemId);
                return;
            }
            if (auftrag.anzahl !== undefined && (!isFinite(auftrag.anzahl) || auftrag.anzahl < 1 || auftrag.anzahl > INV_MAX_ANZAHL)) {
                console.log("[inventar] Anzahl unplausibel");
                return;
            }
            invAuftraege.push(auftrag);
        } catch (e) {
            invMerkeFehler("Befehl nicht verstanden: " + e);
        }
    });
    invBereit = InvRegistries !== null && InvItemStack !== null;
} catch (e) {
    invMerkeFehler("Befehl konnte nicht registriert werden: " + e);
}

try {
    ServerEvents.tick(function (event) {
        if (invAuftraege.length === 0) return;
        var server = event.server;

        while (invAuftraege.length > 0) {
            var auftrag = invAuftraege.shift();
            try {
                if (invFinde(auftrag.belegId) !== null) continue; // schon erledigt – nie doppelt ausführen
                var spieler = server.getPlayerList().getPlayer(InvUUID.fromString(auftrag.uuid));
                if (spieler === null || spieler === undefined) {
                    invAbgelehnt(auftrag, "offline", null);
                } else if (auftrag.art === "nehmen") {
                    invNimm(server, auftrag, spieler);
                } else if (auftrag.art === "geben") {
                    invGib(server, auftrag, spieler);
                } else {
                    invGibZurueck(server, auftrag, spieler);
                }
            } catch (e) {
                if (invFinde(auftrag.belegId) === null) invAbgelehnt(auftrag, "fehler", String(e));
                invMerkeFehler(auftrag.art + " fehlgeschlagen: " + e);
            }
        }
    });
} catch (e) {
    invMerkeFehler("ServerEvents.tick nicht registrierbar: " + e);
}

// Sofort beim Laden schreiben: Daran erkennt die Website, dass das Skript läuft.
invSchreibeDatei();

try {
    ServerEvents.loaded(function (event) {
        invSchreibeDatei();
    });
} catch (e) {
    invMerkeFehler("ServerEvents.loaded fehlgeschlagen: " + e);
}
