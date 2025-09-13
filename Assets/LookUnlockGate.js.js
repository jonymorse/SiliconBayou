/**
 * LookUnlockGate.js (names-only, minimal)
 * Purpose: Gate Carousel selections until the required collectible name has been collected.
 * Works with a simple CollectManager that exposes: global.collectManager.list()
 *
 * Features:
 *  - Provide `requiredNames` aligned to the carousel indices (empty => unlocked).
 *  - Wraps `bridge.script.onCarouselSelection` and blocks if locked.
 *  - Updates optional per-index lock overlays.
 *  - Auto-selects the first unlocked look if desired.
 *  - Uses CollectManager.onAdd() if available; otherwise falls back to lightweight polling.
 */

//@input Component.ScriptComponent bridge {"hint":"CarouselRemoteHeadBridge.js ScriptComponent"}
//@input string[] requiredNames {"hint":"Required collectible name per look index (empty = unlocked)"}
//@input float pollInterval = 0.25 {"label":"Poll Interval (seconds)"}
//@input bool autoSelectFirstUnlocked = false
//@input SceneObject[] lockOverlays {"hint":"Optional lock icons per index (enabled when LOCKED)"}
//@input bool showToast = false
//@input Component.Text toastText {"showIf":"showToast"}
//@input float toastSeconds = 1.2 {"showIf":"showToast"}

var unlocked = {};           // map: index -> true
var lastSnapshot = "";       // change detection for names list
var origSelectFn = null;      // original bridge callback
var useEvents = false;        // prefer events when CollectManager.onAdd exists

function log(m){
    try { Studio.log(m); } catch(_){ print(m); }
}

function getCollectedNames(){
    var cm = global.collectManager;
    if (!cm) return [];
    try {
        var a = cm.list && cm.list();
        return Array.isArray(a) ? a : [];
    } catch (e){
        return [];
    }
}

function namesHash(arr){
    // simple hash for change detection
    return arr.join("|");
}

function itemCountFromBridge(){
    if (!script.bridge || !script.bridge.script) {
        return (script.requiredNames && script.requiredNames.length)
            ? script.requiredNames.length
            : 0;
    }
    var s = script.bridge.script;
    var nRemote = (s.remoteModels && s.remoteModels.length) ? s.remoteModels.length : 0;
    var nLocal  = (s.localModels  && s.localModels.length)  ? s.localModels.length  : 0;
    var nReq    = (script.requiredNames && script.requiredNames.length) ? script.requiredNames.length : 0;
    return Math.max(nRemote, nLocal, nReq);
}

function requirementForIndex(i){
    if (!script.requiredNames || i < 0 || i >= script.requiredNames.length) return "";
    return script.requiredNames[i] || "";
}

function isUnlockedIndex(i, collected){
    var req = requirementForIndex(i);
    if (!req || req.length === 0) return true; // no requirement => unlocked
    for (var k = 0; k < collected.length; k++){
        if (collected[k] === req) return true; // exact name match
    }
    return false;
}

function recomputeUnlocked(){
    var collected = getCollectedNames();
    var n = itemCountFromBridge();
    unlocked = {};
    for (var i = 0; i < n; i++){
        if (isUnlockedIndex(i, collected)) unlocked[i] = true;
    }
    updateLockOverlays(n);
}

function updateLockOverlays(n){
    if (!script.lockOverlays || script.lockOverlays.length === 0) return;
    for (var i = 0; i < n; i++){
        var overlay = script.lockOverlays[i];
        if (!overlay) continue;
        overlay.enabled = !unlocked[i]; // show overlay when LOCKED
    }
}

function extractIndex(a, b){
    return (typeof a === "number") ? (a|0) : ((typeof b === "number") ? (b|0) : 0);
}

function showLockedHintFor(idx){
    if (!script.showToast) return;
    var req = requirementForIndex(idx);
    if (script.toastText){
        script.toastText.text = req ? ("Collect '" + req + "' to unlock") : "Locked";
        script.toastText.getSceneObject().enabled = true;
        var d = script.createEvent("DelayedCallbackEvent");
        d.bind(function(){
            if (script.toastText) script.toastText.getSceneObject().enabled = false;
        });
        d.reset(Math.max(0.2, script.toastSeconds || 1.2));
    } else {
        log("[LookUnlockGate] Locked index " + idx + (req ? (" — collect '" + req + "'") : ""));
    }
}

function wrapBridge(){
    if (!script.bridge || !script.bridge.script){
        log("[LookUnlockGate] Missing bridge reference.");
        return;
    }
    var s = script.bridge.script;
    if (!origSelectFn){
        origSelectFn = (typeof s.onCarouselSelection === "function") ? s.onCarouselSelection : null;
    }
    if (!origSelectFn){
        log("[LookUnlockGate] Bridge.onCarouselSelection is not a function; cannot wrap.");
        return;
    }
    s.onCarouselSelection = function(a, b){
        var idx = extractIndex(a, b);
        if (unlocked[idx]){
            try { origSelectFn(a, b); }
            catch(e){ log("[LookUnlockGate] pass-through error: " + e); }
        } else {
            showLockedHintFor(idx);
        }
    };
}

function tryAutoSelect(){
    if (!script.autoSelectFirstUnlocked || !script.bridge || !script.bridge.script || !origSelectFn) return;
    // Only consider index 0
    var n = itemCountFromBridge();
    if (n <= 0) return;
    if (unlocked[0]) {
        try { origSelectFn(0, null); } catch(e){}
    }
}

function pollOnce(){
    if (useEvents) return; // event-driven; no polling needed
    var collected = getCollectedNames();
    var h = namesHash(collected);
    if (h !== lastSnapshot){
        lastSnapshot = h;
        recomputeUnlocked();
        tryAutoSelect();
    }
    var d = script.createEvent("DelayedCallbackEvent");
    d.bind(pollOnce);
    d.reset(Math.max(0.05, script.pollInterval || 0.25));
}

function hookCollectEventsIfAvailable(){
    var cm = global.collectManager;
    if (!cm || typeof cm.onAdd !== "function") return false;
    try {
        cm.onAdd(function(){
            recomputeUnlocked();
            tryAutoSelect();
        });
        return true;
    } catch(e){
        return false;
    }
}

script.createEvent("OnStartEvent").bind(function(){
    wrapBridge();
    recomputeUnlocked();
    tryAutoSelect();
    useEvents = hookCollectEventsIfAvailable();
    if (!useEvents){
        // start polling as a fallback
        lastSnapshot = namesHash(getCollectedNames());
        pollOnce();
    }
});
