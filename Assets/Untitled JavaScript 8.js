/*
No-`api` 3-part architecture using a tiny global event bus.
Nothing here uses script.api (which Lens Studio warns is deprecated).

Parts (each is a separate Script Component):
A) RemotePrefabLoader.bus.js → downloads/instantiates prefab, emits `${channel}:spawned`
B) InteractionAttach.bus.js → ensures InteractionComponent, registers meshes, emits `${channel}:tap`
C) CollectibleTapBehavior.bus.js → listens for `${channel}:spawned` & `${channel}:tap`, runs visual/metadata logic

Wire-up:
1) Put (A) and (B) on the same host object (set B.targetCamera). Give both the SAME `channel` string.
2) Put (C) anywhere. Set its `channel` to the same string. (Optionally link wocScript.)
3) If B.autoRegisterFromSpawn is true, it will auto-register meshes of each spawned prefab.
(C also emits `${channel}:registerMeshes` on spawn for compatibility.)

Optional control: (A) registers `global.remoteLoader[channel]` with getSpawned/forceDownload/despawn/setFollowEnabled.
*/

// ──────────────────────────────────────────────────────────────────────────────
// Shared: tiny global event bus (include in each file safely)
// ──────────────────────────────────────────────────────────────────────────────
if (!global.__bus) {
global.__bus = {
_map:{}
};
global.__bus.on = function(evt, cb){
if(!this._map[evt]){ this._map[evt] = []; }
this._map[evt].push(cb);
};
global.__bus.emit = function(evt){
var arr = this._map[evt]; if(!arr) return;
var args = Array.prototype.slice.call(arguments,1);
for(var i=0;i<arr.length;i++){
try{ arr[i].apply(null,args); }catch(e){ try{Studio.log(e+"");}catch(_){print(e+"");} }
}
};
}


// ──────────────────────────────────────────────────────────────────────────────
// A) RemotePrefabLoader.bus.js (pure loader, no `api`)
// ──────────────────────────────────────────────────────────────────────────────
//@input Asset.RemoteReferenceAsset remoteRef
//@input SceneObject parent {"label":"(Optional) Parent for spawned prefab"}
//@input bool spawnAtLoader = true
//@input vec3 spawnOffset = {"x":0,"y":0,"z":0}
//@input float spawnScale = 1.0
//@input bool followLoader = false
//@input bool followKeepOffset = false {"showIf":"followLoader"}
//@input bool requireRemote = false {"label":"Hide this on failure"}
//@input int timeoutMs = 7000 {"label":"Fail fast timeout (ms)"}
//@input string channel = "default"

var RL_spawned = null;
var RL_offset = null; // world-space offset if keeping offset while following

function RL_log(m){ try{Studio.log(m);}catch(_){print(m);} }

var RL_timeout = script.createEvent("DelayedCallbackEvent");
RL_timeout.bind(function(){
if(!RL_spawned){
RL_log("[Loader] timed out");
if(script.requireRemote){ script.getSceneObject().enabled = false; }
}
});

RL_download();