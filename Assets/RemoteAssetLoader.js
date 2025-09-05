//@input Asset.RemoteReferenceAsset remoteRef
//@input SceneObject parent {"label":"(Optional) Parent for spawned prefab"}
//@input bool spawnAtLoader = true
//@input vec3 spawnOffset = {"x":0,"y":0,"z":0}
//@input float spawnScale = 1.0
//@input bool followLoader = false
//@input bool requireRemote = false {"label":"Hide this feature if download fails"}
//@input int timeoutMs = 7000 {"label":"Fail fast timeout (ms)"}

var spawned = null;

// Simple fail-fast timer
var t = script.createEvent("DelayedCallbackEvent");
t.bind(function () {
    if (!spawned) {
        Studio.log("Remote asset timed out");
        if (script.requireRemote) script.getSceneObject().enabled = false;
    }
});

function start() {
    try {
        if (!script.remoteRef) {
            Studio.log("No RemoteReferenceAsset assigned.");
            return;
        }
        t.reset((script.timeoutMs | 0) / 1000.0);
        script.remoteRef.downloadAsset(onDownloaded, onFailed);
    } catch (e) {
        Studio.log("start() exception: " + e);
    }
}

function onDownloaded(asset) {
    try {
        if (!asset || !asset.getTypeName || asset.getTypeName().indexOf("ObjectPrefab") === -1 || !asset.instantiate) {
            Studio.log("Downloaded asset is not an ObjectPrefab.");
            return;
        }
        if (spawned && spawned.isValid()) spawned.destroy();

        var parent = script.parent ? script.parent : script.getSceneObject();
        spawned = asset.instantiate(parent);
        spawned.enabled = true;

        if (script.spawnAtLoader) {
            var a = script.getSceneObject().getTransform();
            var s = spawned.getTransform();
            var p = a.getWorldPosition();
            s.setWorldPosition(new vec3(
                p.x + script.spawnOffset.x,
                p.y + script.spawnOffset.y,
                p.z + script.spawnOffset.z
            ));
            s.setWorldRotation(a.getWorldRotation());
            s.setWorldScale(new vec3(script.spawnScale, script.spawnScale, script.spawnScale));
        }
    } catch (e) {
        Studio.log("onDownloaded exception: " + e);
    }
}

function onFailed() {
    Studio.log("Remote asset failed to download");
    if (script.requireRemote) script.getSceneObject().enabled = false;
}

var upd = script.createEvent("UpdateEvent");
upd.bind(function () {
    if (!script.followLoader || !spawned) return;
    try {
        var a = script.getSceneObject().getTransform();
        var s = spawned.getTransform();
        s.setWorldPosition(a.getWorldPosition());
        s.setWorldRotation(a.getWorldRotation());
        s.setWorldScale(a.getWorldScale());
    } catch (e) {
        Studio.log("Update exception: " + e);
    }
});

start();
