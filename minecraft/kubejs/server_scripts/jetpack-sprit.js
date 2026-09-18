// VIP Craft 4 — Jetpacks verbrauchen mehr Sprit
//
// Die Jetpacks aus Create: Stuff & Additions sind zu sparsam: Ein voller Tank
// trägt ewig. Dieses Skript vervielfacht den Verbrauch, ohne die Mod anzufassen.
// Eingestellt steht er auf dem Zehnfachen (SPRIT_FAKTOR), aus 10 mB werden also
// 100 — eine volle Füllung von 16.000 mB reicht dann noch etwa 40 Sekunden
// Dauerflug statt fast sieben Minuten.
//
// WIE DIE MOD ES MACHT (Bytecode von create-stuff-additions1.21.1_v2.1.4b.jar,
// Klassen AndesitePropelerBodyTickEventProcedure, CopperPropelerBodyTickEventProcedure,
// BrassEncasedPropelerBodyTickEventProcedure, NetheriteJetpackChestplateTickEventProcedure):
//   - Jedes Jetpack zählt im Item einen Zähler "tagCooldown" hoch. Erreicht er 5
//     (in der Luft) bzw. 10 (im Wasser), zieht die Mod GENAU 10 mB ab und setzt
//     den Zähler zurück. Brass und Netherite ziehen je 10 mB Wasser UND 10 mB Lava.
//   - Abgezogen wird über CustomFluidHandlerItemStack.drainTank, und das schreibt
//     am Ende schlicht in die Item-Komponente minecraft:custom_data:
//         Fluid0 = "minecraft:lava"   Amount0 = <mB als int>
//         Fluid1 = "minecraft:water"  Amount1 = <mB als int>
//     Ist ein Tank leer, werden BEIDE Schlüssel entfernt (setStoredFluid).
//
// WIE DIESES SKRIPT ES MACHT: Es schaut jedem Spieler auf die Brustplatte und
// merkt sich die Füllstände. Sinkt ein Tank, zieht es das (SPRIT_FAKTOR − 1)-fache
// noch einmal ab — aus 10 mB werden 100. Es rechnet also nicht selbst aus, wann
// verbraucht wird, sondern vervielfacht, was die Mod verbraucht. Das bleibt
// richtig, wenn ein Update die Zeiten oder Mengen ändert, und es trifft Wasser
// und Lava gleichermaßen.
//
// WAS DAS KOSTET: Nachgesehen wird nur alle SPRIT_TAKT Ticks, nicht in jedem.
// Häufiger brächte nichts, weil die Mod ohnehin nur alle 5 Ticks etwas abzieht;
// verglichen wird der Füllstand, nicht die Zeit, also geht durch den größeren
// Abstand kein Verbrauch verloren — er wird nur einen Sekundenbruchteil später
// vervielfacht. Pro Durchgang sind es je Spieler eine Handvoll Aufrufe (vier
// Rüstungsteile ansehen, bei einem Jetpack zusätzlich die Komponente lesen).
// Bei fünf Spielern also grob 50 Aufrufe je Sekunde gegenüber einem Tickbudget
// von 50 Millisekunden: Das fällt nicht ins Gewicht. Wer ohne Jetpack herumläuft,
// kostet nur den Blick auf die vier Rüstungsteile.
//
// WARUM NICHT DIE TANKGRÖSSE HALBIEREN (gadgetCapacity in
// config/create-stuff-additions.toml): Das wäre nur halb so viel Sprit PRO
// FÜLLUNG — geflogen würde dieselbe Strecke, man müsste bloß doppelt so oft
// nachtanken. Der Verbrauch je Flugminute bliebe gleich.
//
// WARUM NICHT DEN ZÄHLER "tagCooldown" HOCHDREHEN: Ginge auch, würde aber
// Geräusch und Partikel im selben Takt verdoppeln. Über die Füllstände bleibt
// alles andere so, wie die Mod es meint.
//
// GRENZE GEGEN FEHLALARM: Nur Rückgänge bis SPRIT_MAX_SCHLUCK gelten als
// Verbrauch. Wer mitten im Flug ein volles gegen ein fast leeres Jetpack
// tauscht, sähe sonst wie ein riesiger Verbrauch aus — und das frische Jetpack
// wäre sofort leer.
//
// Zu den Rhino-Eigenheiten (var statt const/let, Java.loadClass nur einmal ganz
// oben) steht die Begründung ausführlich in numismatics-export.js.
//
// ALLE Namen tragen das Präfix SPRIT_/sprit: KubeJS lädt alle server_scripts in
// EIN gemeinsames globales Rhino-Scope.
//
// INSTALLATION
//   1. Datei nach kubejs/server_scripts/jetpack-sprit.js (npm run kubejs:deploy)
//   2. Konsolenbefehl "reload"
//   3. kubejs/data/jetpack-fuel.json prüfen: Dort muss "ready": true stehen.

var SPRIT_FASSUNG = 2;
var SPRIT_DATEI = "jetpack-fuel.json";

/**
 * Der Gesamtverbrauch, gemessen am Wert der Mod: 10 heißt zehnmal so viel.
 * Nur diese eine Zahl ändern, wenn es mehr oder weniger sein soll.
 *
 * Was das in Flugzeit bedeutet: Die Mod zieht 10 mB je Zyklus (5 Ticks), das
 * sind 40 mB in der Sekunde. Mit Faktor 10 werden daraus 400 mB — ein voller
 * 16.000er Tank trägt damit rund 40 Sekunden statt knapp sieben Minuten.
 */
var SPRIT_FAKTOR = 10;

/**
 * Abstand zwischen zwei Kontrollen in Ticks. 5 ist der Takt, in dem die Mod
 * selbst abzieht - öfter nachzusehen brächte nichts.
 */
var SPRIT_TAKT = 5;

/**
 * Größere Rückgänge zwischen zwei Kontrollen sind kein Verbrauch, sondern ein
 * Gerätetausch oder ein fremder Zugriff. Die Mod zieht 10 mB je Zyklus ab, bei
 * Serverruckeln können in einem Abstand auch zwei Zyklen liegen - 50 lässt
 * dafür reichlich Luft.
 */
var SPRIT_MAX_SCHLUCK = 50;

/** Nur diese Items. Exoskelette und Werkzeuge bleiben, wie sie sind. */
var SPRIT_JETPACKS = [
    "create_sa:copper_jetpack_chestplate",
    "create_sa:andesite_jetpack_chestplate",
    "create_sa:brass_jetpack_chestplate",
    "create_sa:netherite_jetpack_chestplate",
];

/** Die beiden Tanks eines Gadgets, so wie die Mod sie in der Komponente ablegt. */
var SPRIT_TANKS = [
    { menge: "Amount0", fluid: "Fluid0" },
    { menge: "Amount1", fluid: "Fluid1" },
];

/** Alle 5 Minuten die Diagnosedatei auffrischen - nicht bei jedem Schluck. */
var SPRIT_SCHREIB_TAKT = 20 * 60 * 5;

var spritStand = {}; // uuid -> { id: "...", mengen: [a0, a1] }
var spritGezogen = 0; // mB, die dieses Skript zusätzlich abgezogen hat
var spritFehler = [];
var spritBereit = false;
var spritLetzterSchreib = -1;

var SpritPaths = null;
var SpritJsonIO = null;
var SpritRegistries = null;
var SpritDataComponents = null;
var SpritCustomData = null;

try {
    SpritPaths = Java.loadClass("dev.latvian.mods.kubejs.KubeJSPaths");
    SpritJsonIO = Java.loadClass("dev.latvian.mods.kubejs.util.JsonIO");
} catch (e) {
    console.error("[jetpack-sprit] KubeJS-Klassen konnten nicht geladen werden: " + e);
}
try {
    // Alles aus net.minecraft - vom KubeJS-Klassenfilter erlaubt (Ausnahme ist nur net.minecraft.Util).
    SpritRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
    SpritDataComponents = Java.loadClass("net.minecraft.core.component.DataComponents");
    SpritCustomData = Java.loadClass("net.minecraft.world.item.component.CustomData");
} catch (e) {
    console.error("[jetpack-sprit] Minecraft-Klassen konnten nicht geladen werden: " + e);
}

function spritSchreibeDatei() {
    try {
        if (SpritPaths === null || SpritJsonIO === null) return;
        var ziel = SpritPaths.GAMEDIR.resolve("kubejs/data/" + SPRIT_DATEI);
        var inhalt = {
            generatedAt: new Date().toISOString(),
            ready: spritBereit,
            script: SPRIT_FASSUNG,
            factor: SPRIT_FAKTOR,
            extraDrainedMb: spritGezogen,
            errors: spritFehler,
        };
        SpritJsonIO.write(ziel, SpritJsonIO.parseRaw(JSON.stringify(inhalt, null, 2)));
    } catch (e) {
        console.error("[jetpack-sprit] Datei-Schreibfehler: " + e);
    }
}

function spritMerkeFehler(text) {
    spritFehler.push({ at: new Date().toISOString(), error: String(text) });
    if (spritFehler.length > 20) spritFehler.shift();
    console.error("[jetpack-sprit] " + text);
    spritSchreibeDatei();
}

/** Item-Kennung ohne KubeJS-Eigenheiten: direkt aus der Registry. */
function spritItemId(stapel) {
    return String(SpritRegistries.ITEM.getKey(stapel.getItem()));
}

function spritIstJetpack(id) {
    for (var i = 0; i < SPRIT_JETPACKS.length; i++) {
        if (SPRIT_JETPACKS[i] === id) return true;
    }
    return false;
}

/** Füllstand eines Tanks, oder -1, wenn es den Tank nicht gibt. */
function spritMenge(tag, name) {
    return tag.contains(name) ? tag.getInt(name) : -1;
}

/**
 * Sucht die getragene Brustplatte.
 *
 * getArmorSlots() ist derselbe Weg, den die Mod selbst geht - vier Einträge,
 * billiger als jede Sonderbehandlung.
 */
function spritFindeJetpack(spieler) {
    var fund = null;
    spieler.getArmorSlots().forEach(function (stapel) {
        if (fund !== null || stapel === null || stapel.isEmpty()) return;
        var id = spritItemId(stapel);
        if (spritIstJetpack(id)) fund = { stapel: stapel, id: id };
    });
    return fund;
}

function spritPruefeSpieler(spieler) {
    var schluessel = String(spieler.getUuid());
    var jetpack = spritFindeJetpack(spieler);
    if (jetpack === null) {
        // Kein Jetpack an: Der gemerkte Stand gehört nicht mehr zu diesem Spieler.
        delete spritStand[schluessel];
        return;
    }

    var tag = jetpack.stapel.getOrDefault(SpritDataComponents.CUSTOM_DATA, SpritCustomData.EMPTY).copyTag();
    var jetzt = [spritMenge(tag, SPRIT_TANKS[0].menge), spritMenge(tag, SPRIT_TANKS[1].menge)];
    var vorher = spritStand[schluessel];

    if (vorher && vorher.id === jetpack.id) {
        var abzug = [0, 0];
        var etwas = false;
        for (var i = 0; i < SPRIT_TANKS.length; i++) {
            if (vorher.mengen[i] < 0 || jetzt[i] < 0) continue;
            var weg = vorher.mengen[i] - jetzt[i];
            if (weg <= 0 || weg > SPRIT_MAX_SCHLUCK) continue; // Nachtanken oder Tausch
            var zusatz = Math.round(weg * (SPRIT_FAKTOR - 1));
            if (zusatz > jetzt[i]) zusatz = jetzt[i];
            if (zusatz <= 0) continue;
            abzug[i] = zusatz;
            etwas = true;
        }

        if (etwas) {
            // Genau wie die Mod: schreiben über CustomData.update, und einen
            // leeren Tank samt Fluid-Eintrag entfernen statt auf 0 zu setzen.
            SpritCustomData.update(SpritDataComponents.CUSTOM_DATA, jetpack.stapel, function (neuerTag) {
                for (var k = 0; k < SPRIT_TANKS.length; k++) {
                    if (abzug[k] <= 0) continue;
                    var rest = neuerTag.getInt(SPRIT_TANKS[k].menge) - abzug[k];
                    if (rest > 0) {
                        neuerTag.putInt(SPRIT_TANKS[k].menge, rest);
                    } else {
                        neuerTag.remove(SPRIT_TANKS[k].menge);
                        neuerTag.remove(SPRIT_TANKS[k].fluid);
                    }
                }
            });

            for (var m = 0; m < SPRIT_TANKS.length; m++) {
                if (abzug[m] <= 0) continue;
                jetzt[m] = jetzt[m] - abzug[m];
                spritGezogen += abzug[m];
            }
        }
    }

    spritStand[schluessel] = { id: jetpack.id, mengen: jetzt };
}

try {
    ServerEvents.tick(function (event) {
        if (SpritRegistries === null || SpritDataComponents === null || SpritCustomData === null) return;
        try {
            var jetzt = event.server.getTickCount();
            if (jetzt % SPRIT_TAKT !== 0) return;

            event.server.getPlayers().forEach(function (spieler) {
                spritPruefeSpieler(spieler);
            });

            if (spritLetzterSchreib < 0 || jetzt - spritLetzterSchreib >= SPRIT_SCHREIB_TAKT) {
                spritLetzterSchreib = jetzt;
                spritSchreibeDatei();
            }
        } catch (e) {
            // Nicht weiterwerfen: Ein Fehler hier darf den Servertick nicht stören.
            spritMerkeFehler("Tick fehlgeschlagen: " + e);
        }
    });

    spritBereit = SpritRegistries !== null && SpritDataComponents !== null && SpritCustomData !== null;
} catch (e) {
    spritMerkeFehler("ServerEvents.tick nicht registrierbar: " + e);
}

try {
    PlayerEvents.loggedOut(function (event) {
        try {
            var spieler = event.player || event.getPlayer();
            delete spritStand[String(spieler.getUuid())];
        } catch (e) {
            spritMerkeFehler("Abmeldung nicht vermerkt: " + e);
        }
    });
} catch (e) {
    spritMerkeFehler("PlayerEvents.loggedOut nicht registrierbar: " + e);
}

spritSchreibeDatei();

try {
    ServerEvents.loaded(function (event) {
        spritSchreibeDatei();
    });
} catch (e) {
    spritMerkeFehler("ServerEvents.loaded fehlgeschlagen: " + e);
}
