// VIP Craft 4 — Numismatics-Kontostände als JSON exportieren
//
// Schreibt kubejs/data/numismatics.json mit allen Bankkonten aus Create: Numismatics.
// Die Website liest diese Datei über den Crafty-Dateizugriff (dieselbe Anbindung wie für
// die Vanilla-Spielerstatistiken) und zeigt sie auf der Leaderboards-Seite unter
// "Wirtschaft" an, statt der aktuellen Beispieldaten.
//
// WARUM DIREKTER JAVA-ZUGRIFF: Numismatics hat weder KubeJS-Bindings noch einen
// Befehl, der Kontostände ausgibt. Die Kontodaten liegen zwar in world/data/numismatics_bank.dat,
// aber das ist eine gzip-komprimierte NBT-Datei — Craftys Dateizugriff kann nur Text lesen
// und bricht daran mit einem Dekodierfehler ab. Deshalb liest dieses Skript die Konten direkt
// aus dem laufenden Server-Prozess (Numismatics.BANK) und schreibt sie als Klartext-JSON weg.
//
// WARUM KubeJSPaths/JsonIO STATT java.io.File: KubeJS filtert seit Version 7.0 (mc1.21) den
// Java-Zugriff aus Skripten heraus über kubejs.classfilter.txt. Dort ist das komplette Paket
// java.io gesperrt (bis auf zwei Ausnahmen) und ebenso java.nio — new java.io.File(...) oder
// java.nio.file.Paths.get(...) scheitern deshalb IMMER. KubeJS liefert dafür seinen eigenen,
// nicht gesperrten Weg: dev.latvian.mods.kubejs.KubeJSPaths.GAMEDIR ist ein bereits vorhandenes
// Path-Objekt (zeigt auf das Serververzeichnis), und dev.latvian.mods.kubejs.util.JsonIO kann
// darauf lesen/schreiben. Weil dabei nie ein Java-Dateisystem-Typ per Namen neu aufgelöst werden
// muss, greift der Filter nicht.
//
// WARUM GAMEDIR + EIN EINZELNER resolve()-Aufruf STATT KubeJSPaths.DATA: Live gegen den Server
// getestet (Diagnose-Logs vom 03.09.2026) liefert KubeJSPaths.DATA über Rhino/Java.loadClass
// fälschlich denselben Wert wie GAMEDIR selbst zurück, statt GAMEDIR/kubejs/data — das Skript
// schrieb dadurch fehlerfrei, aber nach <Serverwurzel>/numismatics.json statt in kubejs/data/.
// GAMEDIR selbst ist nachweislich korrekt (stimmt exakt mit dem von Crafty gemeldeten Serverpfad
// überein). Der naheliegende Fix — GAMEDIR.resolve("kubejs").resolve("data").resolve(name) in
// EINER verketteten Aufrufkette — schlug in einem weiteren Live-Test ERNEUT fehl: nur der LETZTE
// resolve()-Aufruf der Kette kam an, alle mittleren wurden ignoriert (Ergebnis wieder nur
// GAMEDIR/numismatics.json). Sehr wahrscheinlich dieselbe Art Rhino-Eigenheit wie der bereits
// bekannte "redeclaration of var"-Bug bei mehrfach aufgerufenen gleichnamigen Methoden. Die
// Umgehung: EIN EINZIGER resolve()-Aufruf mit dem kompletten Unterpfad als String
// ("kubejs/data/" + Dateiname) statt mehrerer verketteter Aufrufe. Java/NIO akzeptiert "/" als
// Trenner in einem resolve()-String-Argument auch unter Linux problemlos in einem Rutsch.
//
// WARUM var STATT const/let IN MEHRFACH AUFGERUFENEN FUNKTIONEN: Dieses Rhino (KubeJS' Fork)
// wirft bei manchen Deployments "redeclaration of var X" (InternalError/TypeError), wenn eine
// Funktion mit lokalen const/let-Deklarationen mehrfach aufgerufen wird — hier bestätigt für
// writeJson(), das beim Laden, beim Serverstart-Event und alle 5 Minuten läuft. var ist daher
// bewusst gewählt, nicht aus altem Gewohnheitsrecht. Die Java.loadClass-Aufrufe stehen deshalb
// auch nur EINMAL ganz oben im Skript, nicht in den wiederholt aufgerufenen Funktionen.
//
// Geprüft gegen den Quellcode von Create: Numismatics 1.1.0 (neoforge, mc1.21.1):
// github.com/Layers-of-Railways/CreateNumismatics, Branch 1.21.1/dev.
// Geprüft gegen den Quellcode von KubeJS (kubejs.classfilter.txt, KubeJSPaths.java, JsonIO.java,
// ServerEvents.java, ServerKubeEvent.java): github.com/kube-mods/kubejs, Branch 2101
// (passend zu kubejs-neoforge-2101.7.2, wie auf diesem Server installiert).
// Alles interne Implementierungsdetails, keine öffentliche API — ändert ein Update Paket- oder
// Feldnamen, meldet sich das über den "stage"-Wert unten in der JSON-Datei.
//
// SELBSTDIAGNOSE: Schreibt IMMER eine gültige JSON-Datei — bei Erfolg mit den Konten, bei
// einem Fehler mit "stage" und "error" statt "accounts". So lässt sich jeder Fehler allein
// über die Datei diagnostizieren, auch ohne Logzugriff.
//
// INSTALLATION
//   1. Diese Datei nach kubejs/server_scripts/numismatics-export.js auf dem Server kopieren.
//   2. Server neu starten (server_scripts werden dabei automatisch geladen) — der Konsolenbefehl
//      "kubejs reload server_scripts" schlägt auf diesem Server mit einem Parse-Fehler fehl,
//      also bitte immer per Neustart neu laden.
//   3. kubejs/data/numismatics.json prüfen. Die Datei erscheint SOFORT beim Laden des
//      Skripts, noch bevor die Welt fertig geladen ist ("stage": "script_loaded").
//
// Der eigentliche Export läuft einmal beim Serverstart und danach alle 5 Minuten von selbst.
//
// Hinweis: Durch den DATA-Bug lag vor diesem Fix eine numismatics.json direkt im Serverwurzel-
// verzeichnis (neben server.properties). Die ist jetzt verwaist und kann manuell gelöscht werden.

var OUTPUT_FILE_NAME = "numismatics.json";
var INTERVAL_TICKS = 20 * 60 * 5; // alle 5 Minuten (20 Ticks/s) — im selben Takt wie der Website-Cache

// Java-Klassen genau EINMAL laden (siehe Kommentar oben zum var/const-Problem) und außerdem
// effizienter, als bei jedem Schreibvorgang erneut per Reflection nachzuschlagen.
var KubeJSPathsClass = null;
var JsonIOClass = null;
var NumismaticsClass = null;
try {
    KubeJSPathsClass = Java.loadClass("dev.latvian.mods.kubejs.KubeJSPaths");
    JsonIOClass = Java.loadClass("dev.latvian.mods.kubejs.util.JsonIO");
} catch (e) {
    console.error("[numismatics-export] KubeJS-Klassen konnten nicht geladen werden: " + e);
}
try {
    NumismaticsClass = Java.loadClass("dev.ithundxr.createnumismatics.Numismatics");
} catch (e) {
    console.error("[numismatics-export] Numismatics-Klasse konnte nicht geladen werden: " + e);
}

function writeJson(obj) {
    // Wirft absichtlich NICHT weiter: Ein Fehler beim Schreiben darf den Server nicht stören.
    try {
        if (KubeJSPathsClass === null || JsonIOClass === null) {
            console.error("[numismatics-export] Kann nicht schreiben, KubeJSPaths/JsonIO fehlen.");
            return;
        }
        // Bewusst EIN EINZIGER resolve()-Aufruf statt einer Kette (siehe Kommentar oben).
        var targetPath = KubeJSPathsClass.GAMEDIR.resolve("kubejs/data/" + OUTPUT_FILE_NAME);
        var jsonElement = JsonIOClass.parseRaw(JSON.stringify(obj, null, 2));
        JsonIOClass.write(targetPath, jsonElement);
        console.log("[numismatics-export] geschrieben: stage=" + obj.stage + " path=" + targetPath.toAbsolutePath().toString());
    } catch (e) {
        console.error("[numismatics-export] Datei-Schreibfehler: " + e);
    }
}

// Läuft sofort beim Laden des Skripts, synchron, ohne auf ein Event zu warten — das ist der
// früheste mögliche Diagnosepunkt und beweist, dass die Datei überhaupt ausgeführt wird.
writeJson({ generatedAt: new Date().toISOString(), stage: "script_loaded", accounts: [] });

function exportNumismaticsData() {
    try {
        if (NumismaticsClass === null) {
            writeJson({ generatedAt: new Date().toISOString(), stage: "numismatics_class_missing", accounts: [] });
            return;
        }

        // Öffentliches statisches Feld, GlobalBankManager, hält alle Konten im Arbeitsspeicher,
        // sobald die Welt geladen ist.
        var bank = NumismaticsClass.BANK;

        var accounts = [];
        bank.accounts.entrySet().forEach(function (entry) {
            var account = entry.getValue();
            accounts.push({
                id: entry.getKey().toString(), // Spieler-UUID (oder Block-UUID bei Bankautomaten)
                type: account.type.toString(), // "PLAYER" oder "BLAZE_BANKER"
                balanceSpurs: account.getBalance(), // Guthaben in Spurs, der kleinsten Münzeinheit
                label: account.getLabel() || null, // nur bei BLAZE_BANKER-Konten gesetzt, sonst null
            });
        });

        writeJson({ generatedAt: new Date().toISOString(), stage: "ok", accounts: accounts });
    } catch (e) {
        // Absichtlich nicht weiterwerfen: Ein fehlgeschlagener Export darf weder den Reload
        // noch den Server crashen. Der Fehler landet stattdessen sichtbar in der Datei.
        writeJson({ generatedAt: new Date().toISOString(), stage: "bank_access_failed", error: String(e), accounts: [] });
    }
}

try {
    ServerEvents.loaded(function (event) {
        writeJson({ generatedAt: new Date().toISOString(), stage: "server_loaded_event_fired", accounts: [] });
        exportNumismaticsData();
    });

    ServerEvents.tick(function (event) {
        if (event.server.getTickCount() % INTERVAL_TICKS === 0) {
            exportNumismaticsData();
        }
    });
} catch (e) {
    writeJson({ generatedAt: new Date().toISOString(), stage: "event_registration_failed", error: String(e), accounts: [] });
}
