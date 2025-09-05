// RemoteCollectibleLoader.js
// Version: 1.0.0
// Purpose: Load a remote 3D prefab, attach Interaction, and run CollectibleTap-like behavior on tap.

// ------------------------------- Inputs: Loader -------------------------------
/** Remote prefab to download (must be an ObjectPrefab) */
//@input Asset.RemoteReferenceAsset remoteRef

//@input SceneObject parent {"label":"(Optional) Parent for spawned prefab"}
//@input bool spawnAtLoader = true
//@input vec3 spawnOffset = {"x":0,"y":0,"z":0}
//@input float spawnScale = 1.0
//@input bool followLoader = false
//@input bool requireRemote = false {"label":"Hide this feature if download fails"}
//@input int timeoutMs = 7000 {"label":"Fail fast timeout (ms)"}

// ------------------------------ Inputs: Interaction ---------------------------
/** Camera that renders the spawned prefab (recommended) */
//@input Component.Camera targetCamera
//@input float minTouchSize = 0.12 {"label":"Min Touch Size (0–1 screen width)"}

// ------------------------------ Inputs: Collectible ---------------------------
/** Primary color pulse + shrink animation on tap */
//@input vec4 tappedColor = {0.95, 0.7, 0.2, 1.0}
//@input float pulseScale = 1.18
//@input float pulseDuration = 0.18
//@input bool hideAfter = true
//@input float shrinkDuration = 0.22 {"showIf":"hideAfter"}

/** Score value + metadata (optional) */
//@input int value = 1 {"label":"Score Value"}
//@input string itemId {"hint":"Unique id (optional, helps de-dupe)"}
//@input string itemName {"hint":"Display name (defaults to object name)"}
//@input string itemType {"hint":"e.g., frog, gator, coin"}
//@input SceneObject nameFrom {"hint":"If set, take name from this object instead"}

/** Optional: disable another script on tap (like WOC) */
//@input Component.ScriptComponent wocScript {"label":"(Optional) WOC script to disable"}

// -----------------------------------------------------------------------------
// State
// -----------------------------------------------------------------------------
var spawned = null;
var baseScale = null;
var matSets = []; // [{ rmv, originalColors:[vec4|null], count:int }, ...]
var collected = false;

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------
function log(m) {
    try {
        Studio.log(m);
    } catch (_) {
        print(m);
    }
}

function clone4(v) {
    return v ? new vec4(v.x, v.y, v.z, v.w) : null;
}

function forEachRenderMesh(root, fn) {
    if (!root) return;
    var list = [];
    (function gather(so) {
        var comps = so.getComponents("Component.RenderMeshVisual");
        for (var i = 0; i < comps.length; i++) {
            list.push(comps[i]);
        }
        for (var c = 0; c < so.getChildrenCount(); c++) {
            gather(so.getChild(c));
        }
    })(root);
    for (var j = 0; j < list.length; j++) {
        fn(list[j]);
    }
}

function cacheMaterialColors(root) {
    matSets = [];
    forEachRenderMesh(root, function(rmv) {
        var count = rmv.getMaterialsCount();
        var originals = [];
        for (var i = 0; i < count; i++) {
            var m = rmv.getMaterial(i),
                p = m && m.mainPass,
                c = null;
            if (p) {
                if (p.baseColor !== undefined) c = p.baseColor;
                else if (p.color !== undefined) c = p.color;
                else if (p.baseColorFactor !== undefined) c = p.baseColorFactor;
            }
            originals[i] = clone4(c);
        }
        matSets.push({
            rmv: rmv,
            originalColors: originals,
            count: count
        });
    });
}

function setColorAll(col) {
    for (var k = 0; k < matSets.length; k++) {
        var set = matSets[k];
        for (var i = 0; i < set.count; i++) {
            var m = set.rmv.getMaterial(i),
                p = m && m.mainPass;
            if (!p) continue;
            if (p.baseColor !== undefined) p.baseColor = col;
            else if (p.color !== undefined) p.color = col;
            else if (p.baseColorFactor !== undefined) p.baseColorFactor = col;
        }
    }
}

function buildItemInfo(node) {
    var nameSource = script.nameFrom || node;
    var finalName = (script.itemName && script.itemName.length) ? script.itemName : (nameSource && nameSource.name) || "Item";
    var finalType = (script.itemType && script.itemType.length) ? script.itemType : "item";
    var id = (script.itemId && script.itemId.length) ? script.itemId : (finalName + "_" + Math.floor(getTime() * 1000));
    return {
        id: id,
        name: finalName,
        type: finalType,
        value: script.value
    };
}

// -----------------------------------------------------------------------------
// Interaction
// -----------------------------------------------------------------------------
function addInteraction(rootSO, onTap) {
    if (!rootSO) return null;
    var ic = rootSO.getComponent("Component.InteractionComponent");
    if (!ic) ic = rootSO.createComponent("Component.InteractionComponent");

    // Camera is critical for hits; set if provided.
    if (script.targetCamera) ic.setCamera(script.targetCamera);
    if (script.minTouchSize > 0) ic.setMinimumTouchSize(script.minTouchSize);

    // Register ALL BaseMeshVisuals as hit targets.
    (function addMeshesRecursive(so) {
        var mv = so.getComponents("Component.BaseMeshVisual");
        for (var i = 0; i < mv.length; i++) ic.addMeshVisual(mv[i]);
        for (var c = 0; c < so.getChildrenCount(); c++) addMeshesRecursive(so.getChild(c));
    })(rootSO);

    // Tap handler
    ic.onTap.add(function() {
        if (onTap) onTap(rootSO, ic);
    });

    return ic;
}

// -----------------------------------------------------------------------------
// Collectible tap animation
// -----------------------------------------------------------------------------
function pulse(node, done) {
    var tr = node.getTransform();
    var t0 = getTime(),
        dur = Math.max(0.06, script.pulseDuration);
    var up = script.createEvent("UpdateEvent");
    up.bind(function() {
        var t = Math.min(1, (getTime() - t0) / dur);
        var s = (t < 0.5) ? 1 + (script.pulseScale - 1) * (t / 0.5) : script.pulseScale - (script.pulseScale - 1) * ((t - 0.5) / 0.5);
        tr.setLocalScale(new vec3(baseScale.x * s, baseScale.y * s, baseScale.z * s));
        if (t >= 1) {
            tr.setLocalScale(baseScale);
            up.enabled = false;
            if (done) done();
        }
    });
}

function shrinkAway(node, done) {
    var tr = node.getTransform();
    var t0 = getTime(),
        dur = Math.max(0.05, script.shrinkDuration);
    var up = script.createEvent("UpdateEvent");
    up.bind(function() {
        var t = Math.min(1, (getTime() - t0) / dur);
        var k = 1 + (0.01 - 1) * t;
        tr.setLocalScale(new vec3(baseScale.x * k, baseScale.y * k, baseScale.z * k));
        if (t >= 1) {
            node.enabled = false;
            up.enabled = false;
            if (done) done();
        }
    });
}

// -----------------------------------------------------------------------------
// Loader
// -----------------------------------------------------------------------------
var timeout = script.createEvent("DelayedCallbackEvent");
timeout.bind(function() {
    if (!spawned) {
        log("Remote asset timed out");
        if (script.requireRemote) script.getSceneObject().enabled = false;
    }
});

function start() {
    try {
        if (!script.remoteRef) {
            log("No RemoteReferenceAsset assigned.");
            return;
        }
        timeout.reset((script.timeoutMs | 0) / 1000.0);
        script.remoteRef.downloadAsset(onDownloaded, onFailed);
    } catch (e) {
        log("start() exception: " + e);
    }
}

function onDownloaded(asset) {
    try {
        if (!asset || !asset.getTypeName || asset.getTypeName().indexOf("ObjectPrefab") === -1 || !asset.instantiate) {
            log("Downloaded asset is not an ObjectPrefab.");
            return;
        }
        if (spawned && spawned.isValid()) spawned.destroy();
        var parent = script.parent ? script.parent : script.getSceneObject();
        spawned = asset.instantiate(parent);
        spawned.enabled = true;

        // Initial placement
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

        // Prepare collectible behavior
        baseScale = spawned.getTransform().getLocalScale();
        cacheMaterialColors(spawned);

        // Attach interaction + handler
        addInteraction(spawned, function(root) {
            if (collected) return;
            collected = true;
            if (script.wocScript && script.wocScript.enabled) script.wocScript.enabled = false;
            setColorAll(script.tappedColor);
            pulse(root, function() {
                if (script.hideAfter) shrinkAway(root);
            });
            if (global.collectManager && typeof global.collectManager.addItem === "function") {
                global.collectManager.addItem(buildItemInfo(root));
            }
        });

        // Sanity log
        log("[RemoteCollectibleLoader] Spawned '" + (spawned && spawned.name) + "' and registered interaction.");
    } catch (e) {
        log("onDownloaded exception: " + e);
    }
}

function onFailed() {
    log("Remote asset failed to download");
    if (script.requireRemote) script.getSceneObject().enabled = false;
}

// Follow behavior (optional)
var upd = script.createEvent("UpdateEvent");
upd.bind(function() {
    if (!script.followLoader || !spawned) return;
    try {
        var a = script.getSceneObject().getTransform();
        var s = spawned.getTransform();
        s.setWorldPosition(a.getWorldPosition());
        s.setWorldRotation(a.getWorldRotation());
        s.setWorldScale(a.getWorldScale());
    } catch (e) {
        log("Update exception: " + e);
    }
});

start();