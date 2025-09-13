// RemotePrefabLoader.js
// Version: 1.1.0
// Responsibility: ONLY download/instantiate the remote ObjectPrefab and expose APIs/events.

// ------------------------------- Inputs: Loader -------------------------------
/** Remote prefab to download (must be an ObjectPrefab) */
//@input Asset.RemoteReferenceAsset remoteRef

//@input SceneObject parent {"label":"(Optional) Parent for spawned prefab"}
//@input bool spawnAtLoader = true
//@input vec3 spawnOffset = {"x":0,"y":0,"z":0}
//@input float spawnScale = 1.0
//@input bool followLoader = false
//@input bool requireRemote = false {"label":"Hide this object if download fails"}
//@input int timeoutMs = 7000 {"label":"Fail fast timeout (ms)"}

var spawned = null;
var onSpawnedCbs = [];
var onFailedCbs = [];
var onTimeoutCbs = [];

function log(m){ try{Studio.log(m);}catch(_){print(m);} }

// ------------------------------- API -----------------------------------------
script.api.getSpawned = function(){ return spawned; };
script.api.isLoaded = function(){ return !!(spawned && spawned.isValid && spawned.isValid()); };
script.api.forceDownload = function(){ start(); };
script.api.despawn = function(){ try { if (spawned && spawned.isValid()) spawned.destroy(); spawned = null; } catch(_){} };
script.api.onSpawned = function(cb){
    if (typeof cb === "function") {
        if (script.api.isLoaded()) cb(spawned);
        else onSpawnedCbs.push(cb);
    }
};
script.api.onFailed = function(cb){ if (typeof cb === "function") onFailedCbs.push(cb); };
script.api.onTimeout = function(cb){ if (typeof cb === "function") onTimeoutCbs.push(cb); };

// ------------------------------ Internals ------------------------------------
function fire(list, arg){
    for (var i=0;i<list.length;i++){ try { list[i](arg); } catch(e){ log("Listener error: " + e); } }
}

var timeoutEvt = script.createEvent("DelayedCallbackEvent");
timeoutEvt.bind(function(){
    if (!spawned) {
        log("[Loader] Remote asset timed out.");
        fire(onTimeoutCbs, null);
        if (script.requireRemote) script.getSceneObject().enabled = false;
    }
});

function start(){
    try{
        if (!script.remoteRef){ log("[Loader] No RemoteReferenceAsset assigned."); return; }
        timeoutEvt.reset(Math.max(0, (script.timeoutMs|0))/1000.0);
        script.remoteRef.downloadAsset(onDownloaded, onFailed);
    }catch(e){ log("[Loader] start() exception: " + e); }
}

function onDownloaded(asset){
    try{
        if (!asset || !asset.getTypeName || asset.getTypeName().indexOf("ObjectPrefab") === -1 || !asset.instantiate){
            log("[Loader] Downloaded asset is not an ObjectPrefab."); onFailed(); return;
        }
        if (spawned && spawned.isValid()) spawned.destroy();

        var parent = script.parent ? script.parent : script.getSceneObject();
        spawned = asset.instantiate(parent);
        spawned.enabled = true;

        // Initial placement (optional)
        if (script.spawnAtLoader) {
            var a = script.getSceneObject().getTransform();
            var s = spawned.getTransform();
            var p = a.getWorldPosition();
            s.setWorldPosition(new vec3(p.x + script.spawnOffset.x, p.y + script.spawnOffset.y, p.z + script.spawnOffset.z));
            s.setWorldRotation(a.getWorldRotation());
            s.setWorldScale(new vec3(script.spawnScale, script.spawnScale, script.spawnScale));
        }

        log("[Loader] Spawned: " + (spawned && spawned.name));
        fire(onSpawnedCbs, spawned);
        onSpawnedCbs = []; // one-shot by default
    }catch(e){ log("[Loader] onDownloaded exception: " + e); }
}

function onFailed(){
    log("[Loader] Remote asset failed to download.");
    fire(onFailedCbs, null);
    if (script.requireRemote) script.getSceneObject().enabled = false;
}

// Optional follow behavior
var upd = script.createEvent("UpdateEvent");
upd.bind(function(){
    if (!script.followLoader || !spawned) return;
    try{
        var a = script.getSceneObject().getTransform();
        var s = spawned.getTransform();
        s.setWorldPosition(a.getWorldPosition());
        s.setWorldRotation(a.getWorldRotation());
        s.setWorldScale(a.getWorldScale());
    }catch(e){ log("[Loader] Update exception: " + e); }
});

// Kick off
start();
