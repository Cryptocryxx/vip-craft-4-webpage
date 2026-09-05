// VIP Craft 4 — Chat, Befehle, Kommen und Gehen als JSON mitschreiben
//
// Schreibt kubejs/data/insights.json. Die Website liest die Datei über den
// Crafty-Dateizugriff (dieselbe Anbindung wie numismatics.json) und übernimmt
// alles Neue in ihre Datenbank; sichtbar wird es im Kontrollraum unter
// „Spieler" und „Chat & Befehle".
//
// WARUM NICHT DAS SERVER-LOG: Crafty liefert entweder die letzten ~70
// Konsolenzeilen (bei Betrieb schnell zu wenig) oder latest.log komplett —
// eine Datei, die über einen Abend auf viele Megabyte wächst und die man nicht
// im Minutentakt komplett neu ziehen kann. Ausserdem loggt Minecraft seit 1.13
// längst nicht mehr jeden Spielerbefehl. Über die KubeJS-Ereignisse gibt es
// beides sauber, strukturiert und mit UUID.
//
// RINGPUFFER STATT ANHÄNGEN: KubeJS kann JSON nur ganz schreiben, nicht
// anhängen (JsonIO.write). Deshalb stehen immer nur die letzten MAX_EINTRAEGE
// Ereignisse in der Datei, jedes mit einer fortlaufenden Nummer. Die Website
// merkt sich die zuletzt gelesene Nummer und erkennt an einer Lücke, wenn sie
// zu lange nicht nachgesehen hat. Bei einem Abruf pro Minute reicht der Puffer
// für sehr viel mehr Gespräch, als auf diesem Server je stattfindet.
//
// RHINO-EIGENHEITEN (bitte vor dem Ändern lesen, siehe auch
// numismatics-export.js):
//   ▸ In mehrfach aufgerufenen Funktionen NUR var — const/let lösen in diesem
//     Rhino "redeclaration of var" aus.
//   ▸ Java-Klassen genau einmal ganz oben laden, nicht in Funktionen.
//   ▸ Bei KubeJSPaths.GAMEDIR EIN einziger resolve()-Aufruf mit dem kompletten
//     Unterpfad; verkettete resolve()-Aufrufe verschlucken die mittleren Teile.
//   ▸ KubeJSPaths.DATA liefert hier fälschlich GAMEDIR — deshalb GAMEDIR.
//
// SELBSTDIAGNOSE: Die Datei wird sofort beim Laden des Skripts geschrieben, mit
// "stage": "script_loaded". Fehlt sie ganz, wurde das Skript nicht geladen
// (Server neu starten — "kubejs reload server_scripts" scheitert auf diesem
// Server). Steht in "fehler" etwas, hat sich ein Ereignis nicht registrieren
// lassen; alle anderen laufen dann trotzdem weiter.
//
// INSTALLATION
//   npm run kubejs:deploy   (legt die Datei über die Crafty-API ab)
//   danach den Server neu starten.

var DATEI = "insights.json";
var MAX_EINTRAEGE = 1000;
var FLUSH_TICKS = 20 * 5; // alle 5 Sekunden, wenn es etwas Neues gibt
var MAX_TEXT = 500; // längere Nachrichten schneiden wir ab

var KubeJSPathsClass = null;
var JsonIOClass = null;
try {
    KubeJSPathsClass = Java.loadClass("dev.latvian.mods.kubejs.KubeJSPaths");
    JsonIOClass = Java.loadClass("dev.latvian.mods.kubejs.util.JsonIO");
} catch (e) {
    console.error("[insights] KubeJS-Klassen nicht ladbar: " + e);
}

// Kennung dieses Serverlaufs. Nach einem Neustart beginnt die Nummerierung
// wieder bei 1 — die Website erkennt am Wechsel, dass es ein neuer Lauf ist,
// und verwechselt die Nummern nicht mit denen davor.
var laufId = new Date().toISOString() + "-" + Math.floor(Math.random() * 100000);
var naechsteNummer = 1;
var eintraege = [];
var verloren = 0; // vom Ringpuffer verworfen, bevor jemand sie abgeholt hat
var schmutzig = false;
var fehler = [];

function schreibe(obj) {
    // Wirft absichtlich nicht weiter: Ein Schreibfehler darf den Server nicht stören.
    try {
        if (KubeJSPathsClass === null || JsonIOClass === null) return;
        var ziel = KubeJSPathsClass.GAMEDIR.resolve("kubejs/data/" + DATEI);
        JsonIOClass.write(ziel, JsonIOClass.parseRaw(JSON.stringify(obj)));
    } catch (e) {
        console.error("[insights] Schreibfehler: " + e);
    }
}

function schreibeStand(stage) {
    schreibe({
        generatedAt: new Date().toISOString(),
        stage: stage,
        runId: laufId,
        naechsteNummer: naechsteNummer,
        verloren: verloren,
        fehler: fehler,
        eintraege: eintraege,
    });
}

function kuerze(text) {
    var s = String(text === null || text === undefined ? "" : text);
    return s.length > MAX_TEXT ? s.substring(0, MAX_TEXT) + "…" : s;
}

function uuidVon(entity) {
    // getUUID() ist der Vanilla-Name und trifft fast immer; erst danach die
    // KubeJS-Schreibweise. Jeder Fehlversuch kostet in Rhino eine Ausnahme.
    try {
        return String(entity.getUUID());
    } catch (e) {
        try {
            return String(entity.getUuid());
        } catch (e2) {
            return null;
        }
    }
}

/** Das Spielerobjekt eines Ereignisses – je nach Ereignis heisst es anders. */
function spielerAus(event) {
    try {
        if (event.player !== null && event.player !== undefined) return event.player;
    } catch (e) {
        // Manche Ereignisse haben kein player-Feld.
    }
    try {
        if (event.entity !== null && event.entity !== undefined) return event.entity;
    } catch (e2) {
        // Dann eben nicht.
    }
    return null;
}

function nameVon(entity) {
    // getName() gibt es an jedem Entity, getUsername() nur an manchen.
    try {
        return String(entity.getName().getString());
    } catch (e) {
        try {
            return String(entity.getUsername());
        } catch (e2) {
            return null;
        }
    }
}

/**
 * Umschlag um einen Rueckruf.
 *
 * Dass sich ein Ereignis anmelden liess, heisst noch nicht, dass der Rueckruf
 * spaeter auch durchlaeuft – ein falscher Methodenname faellt erst auf, wenn
 * zum ersten Mal jemand etwas sagt. Ohne diesen Umschlag verschwaende der
 * Fehler im Serverlog; so steht er in der Datei und die Website zeigt ihn an.
 */
function sicher(name, fn) {
    return function (event) {
        try {
            fn(event);
        } catch (e) {
            var text = name + ": " + e;
            if (fehler.indexOf(text) === -1) {
                fehler.push(text);
                schmutzig = true;
                console.error("[insights] " + text);
            }
        }
    };
}

/** Ein Ereignis in den Ringpuffer legen. */
function merke(art, name, uuid, text) {
    try {
        eintraege.push({
            nr: naechsteNummer,
            at: new Date().toISOString(),
            art: art,
            name: name === null || name === undefined ? "?" : String(name),
            uuid: uuid === null || uuid === undefined ? null : String(uuid),
            text: kuerze(text),
        });
        naechsteNummer = naechsteNummer + 1;

        while (eintraege.length > MAX_EINTRAEGE) {
            eintraege.shift();
            verloren = verloren + 1;
        }
        schmutzig = true;
    } catch (e) {
        console.error("[insights] Eintrag fehlgeschlagen: " + e);
    }
}

/**
 * Wer hat den Befehl abgesetzt?
 *
 * Nur Spieler und die Konsole werden mitgeschrieben. Befehlsblöcke, Funktionen
 * und andere Wesen würden das Protokoll fluten, ohne etwas zu erzählen, was
 * jemanden interessiert.
 */
function absenderVon(quelle) {
    try {
        var wesen = quelle.getEntity();
        // getGameProfile() gibt es nur an Spielern – bei allem anderen wirft
        // Rhino, und das ist hier die Antwort "kein Spieler".
        if (wesen !== null && wesen.getGameProfile() !== null) {
            return { name: nameVon(wesen), uuid: uuidVon(wesen), art: "COMMAND" };
        }
        if (wesen === null && String(quelle.getTextName()) === "Server") {
            return { name: "Konsole", uuid: null, art: "COMMAND_CONSOLE" };
        }
    } catch (e) {
        // Unbekannte Quelle – dann eben nicht.
    }
    return null;
}

// Erster Beweis, dass das Skript überhaupt läuft: sofort, ohne auf ein
// Ereignis zu warten.
schreibeStand("script_loaded");

// ---------------------------------------------------------------------------
// Ereignisse. Jedes einzeln registriert: Fällt eines aus, laufen die anderen
// weiter, und in der Datei steht, welches es war.
// ---------------------------------------------------------------------------

try {
    PlayerEvents.chat(sicher("chat", function (event) {
        merke("CHAT", event.username, uuidVon(spielerAus(event)), event.message);
    }));
} catch (e) {
    fehler.push("chat: " + e);
    console.error("[insights] PlayerEvents.chat nicht registrierbar: " + e);
}

try {
    ServerEvents.command(sicher("command", function (event) {
        var absender = absenderVon(event.getParseResults().getContext().getSource());
        if (absender === null) return;

        var eingabe = String(event.getInput());
        merke(absender.art, absender.name, absender.uuid, eingabe.charAt(0) === "/" ? eingabe : "/" + eingabe);
    }));
} catch (e) {
    fehler.push("command: " + e);
    console.error("[insights] ServerEvents.command nicht registrierbar: " + e);
}

try {
    PlayerEvents.loggedIn(sicher("loggedIn", function (event) {
        var wer = spielerAus(event);
        merke("JOIN", nameVon(wer), uuidVon(wer), "hat den Server betreten");
    }));
    PlayerEvents.loggedOut(sicher("loggedOut", function (event) {
        var wer = spielerAus(event);
        merke("QUIT", nameVon(wer), uuidVon(wer), "hat den Server verlassen");
    }));
} catch (e) {
    fehler.push("login: " + e);
    console.error("[insights] Login-Ereignisse nicht registrierbar: " + e);
}

try {
    // Mit Entity-Typ als erstem Argument: KubeJS ruft uns dann nur noch bei
    // Spielern auf. Ohne diese Angabe liefe der Rueckruf bei JEDEM Todesfall
    // auf dem Server – bei einer Mob-Farm tausendfach pro Minute.
    EntityEvents.death("minecraft:player", sicher("death", function (event) {
        var wesen = spielerAus(event);
        if (wesen === null) return;

        var text = "ist gestorben";
        try {
            text = String(wesen.getCombatTracker().getDeathMessage().getString());
        } catch (e2) {
            // Ohne Todesmeldung bleibt der allgemeine Satz stehen.
        }
        merke("DEATH", nameVon(wesen), uuidVon(wesen), text);
    }));
} catch (e) {
    fehler.push("death: " + e);
    console.error("[insights] EntityEvents.death nicht registrierbar: " + e);
}

// ---------------------------------------------------------------------------
// Schreiben
// ---------------------------------------------------------------------------

try {
    ServerEvents.loaded(function (event) {
        schreibeStand("ok");
    });

    ServerEvents.tick(function (event) {
        if (!schmutzig) return;
        if (event.server.getTickCount() % FLUSH_TICKS !== 0) return;
        schmutzig = false;
        schreibeStand("ok");
    });

    // Beim Herunterfahren noch einmal, sonst fehlt das letzte Stück.
    ServerEvents.unloaded(function (event) {
        schreibeStand("ok");
    });
} catch (e) {
    fehler.push("schreiben: " + e);
    schreibeStand("event_registration_failed");
}
