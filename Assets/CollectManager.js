// CollectManager.js (dedupe & normalized keys)
//@input Component.Text text
//@input string[] toggleKeys
//@input SceneObject[] toggleTargets
//@input bool defaultHidden = true
//@input Asset.RemoteServiceModule remoteServiceModule {"label":"Remote API (optional)"}
//@input bool pushOnChange = false {"label":"Push set_state when items change"}
//@input bool caseInsensitiveKeys = true {"label":"Case-insensitive keys"}

// --- Remote API (optional) ---
var api = null;
try {
    if (script.remoteServiceModule) {
        const Module = require("Test API Module"); // match your module name
        api = new Module.ApiModule(script.remoteServiceModule);
    }
} catch (e) {
    print("[CollectManager] Remote API not available: " + e);
}

// --- Local state ---
var names = [];                 // display names (unique, ordered)
var nameIndexByKey = {};        // normalizedKey -> index in names
var collected = {};             // normalizedKey -> boolean
var started = false;

// --- Key normalization & helpers ---
function normKey(s) {
    var k = (s == null) ? "" : ("" + s).trim();
    if (script.caseInsensitiveKeys) { k = k.toLowerCase(); }
    return k;
}
function addDisplayNameUnique(displayName) {
    var k = normKey(displayName);
    if (!k) { return false; }
    if (nameIndexByKey.hasOwnProperty(k)) { return false; }
    nameIndexByKey[k] = names.length;
    names.push(displayName);
    return true;
}
function collectedSnapshotByNames() {
    var out = {};
    for (var i = 0; i < names.length; i++) {
        var nm = names[i];
        out[nm] = !!collected[normKey(nm)];
    }
    return out;
}

// --- UI / toggles ---
function renderText() {
    if (!script.text) { return; }
    script.text.text = names.length ? ("Collected: " + names.join(", ")) : "Collected: -";
}
function syncToggles() {
    if (!script.toggleKeys || !script.toggleTargets) return;
    var n = Math.min(script.toggleKeys.length, script.toggleTargets.length);
    for (var i = 0; i < n; i++) {
        var key = normKey(script.toggleKeys[i] || "");
        var so  = script.toggleTargets[i];
        if (!so) continue;
        so.enabled = !!collected[key]; // show only if collected
    }
}

// --- Remote push (guarded) ---
function maybePushState() {
    if (!api || !script.pushOnChange) return;
    try {
        var payload = { names: names.slice(), collected: collectedSnapshotByNames(), t: Date.now() };
        api.set_state({ parameters: { payload: JSON.stringify(payload) } })
            .catch(function(err){ print("[CollectManager] set_state ERR " + err); });
    } catch (e) {
        print("[CollectManager] set_state threw: " + e);
    }
}

// --- Mutators ---
function addItem(item) {
    var raw = (item && item.name) ? ("" + item.name) : "Item";
    var k = normKey(raw);
    if (!k) { return; }

    // If already collected, ensure display list contains one (not duplicate)
    if (collected[k]) {
        addDisplayNameUnique(raw); // will no-op if already present
        if (started) { renderText(); syncToggles(); }
        return;
    }

    // New collection: mark collected and add display name (unique)
    collected[k] = true;
    addDisplayNameUnique(raw);

    if (started) {
        renderText();
        syncToggles();
        maybePushState();
    }
}

// --- Startup: pull state from Remote API if available ---
function initFromRemote() {
    if (!api) return Promise.resolve(false);

    return api.get_state()
        .then(function(res) {
            var s;
            try {
                s = res.bodyAsJson();
            } catch (e) {
                print("[CollectManager] get_state parse error: " + e);
                return false;
            }

            var nextNames = Array.isArray(s.names) ? s.names : [];
            var nextCollected = (s.collected && typeof s.collected === "object") ? s.collected : {};

            // Clear & rebuild normalized maps
            names = [];
            nameIndexByKey = {};
            collected = {};

            // 1) Seed from names array (derive collected=true if unspecified)
            for (var i = 0; i < nextNames.length; i++) {
                var disp = "" + nextNames[i];
                var k = normKey(disp);
                if (!k) continue;

                // flag: prefer explicit mapping by exact key; fall back to normalized; else default true
                var flag = (nextCollected.hasOwnProperty(disp) ? !!nextCollected[disp]
                           : nextCollected.hasOwnProperty(k) ? !!nextCollected[k]
                           : true);

                collected[k] = flag;
                addDisplayNameUnique(disp); // unique display
            }

            // 2) Add any extra collected keys not present in names[]
            for (var rawKey in nextCollected) {
                if (!nextCollected.hasOwnProperty(rawKey)) continue;
                if (!nextCollected[rawKey]) continue; // only true flags
                var nk = normKey(rawKey);
                if (!nk) continue;
                collected[nk] = true;
                // If display missing for this key, add the rawKey as display
                if (!nameIndexByKey.hasOwnProperty(nk)) {
                    addDisplayNameUnique(rawKey);
                }
            }

            print("[CollectManager] get_state ok; items=" + names.length);
            return true;
        })
        .catch(function(err) {
            print("[CollectManager] get_state ERR " + err);
            return false;
        });
}

var onStart = script.createEvent("OnStartEvent");
onStart.bind(function () {
    // Hide all by default if requested
    if (script.defaultHidden && script.toggleTargets) {
        for (var i = 0; i < script.toggleTargets.length; i++) {
            if (script.toggleTargets[i]) script.toggleTargets[i].enabled = false;
        }
    }

    // Try remote init, then render/sync either way
    initFromRemote().finally(function () {
        started = true;
        renderText();
        syncToggles();
    });
});

// --- Safe getters & manual push ---
function getState() {
    return { names: names.slice(), collected: collectedSnapshotByNames() };
}
function pushStateNow(tag) {
    if (!api) return;
    try {
        var payload = { names: names.slice(), collected: collectedSnapshotByNames(), t: Date.now(), tag: tag || "" };
        api.set_state({ parameters: { payload: JSON.stringify(payload) } })
            .catch(function(err){ print("[CollectManager] pushStateNow ERR " + err); });
    } catch (e) {
        print("[CollectManager] pushStateNow threw: " + e);
    }
}

// --- Public API ---
global.collectManager = {
    addItem: addItem,
    addName: function (n) { addItem({ name: n }); },
    reset: function () {
        names = [];
        nameIndexByKey = {};
        collected = {};
        if (started) { renderText(); syncToggles(); maybePushState(); }
    },
    list: function () { return names.slice(); },
    has:  function (k) { return !!collected[normKey(k)]; },

    // getters + manual push
    getNames: function(){ return names.slice(); },
    getCollected: function(){ return collectedSnapshotByNames(); },
    getState: getState,
    pushStateNow: pushStateNow
};
