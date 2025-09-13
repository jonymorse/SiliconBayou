// InteractionCollectible.js
// Version: 1.1.0
// Responsibility: Add tap interaction & collectible animation to a target SceneObject.
// Can get its target either directly or by subscribing to a RemotePrefabLoader's onSpawned.

// ------------------------------ Inputs: Target -------------------------------
//@input SceneObject target {"hint":"If set, attach interaction to this object"}
//@input Component.ScriptComponent loaderScript {"hint":"Alternative: reference RemotePrefabLoader.js component"}

// ------------------------------ Inputs: Interaction --------------------------
/** Camera that renders the target (recommended) */
//@input Component.Camera targetCamera
//@input float minTouchSize = 0.12 {"label":"Min Touch Size (0–1 screen width)"}

// ------------------------------ Inputs: Collectible --------------------------
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

var target = null;
var baseScale = null;
var matSets = []; // [{ rmv, originals:[vec4|null], count:int }, ...]
var collected = false;

function log(m){ try{Studio.log(m);}catch(_){print(m);} }

// ------------------------------ Wire-up --------------------------------------
function tryAttachTo(so){
    if (!so){ log("[Collectible] No target to attach."); return; }
    target = so;

    // Prepare visuals
    baseScale = target.getTransform().getLocalScale();
    cacheMaterialColors(target);

    // Add interaction
    var ic = ensureInteraction(target);
    ic.onTap.add(function(){
        if (collected) return;
        collected = true;

        if (script.wocScript && script.wocScript.enabled) script.wocScript.enabled = false;

        setColorAll(script.tappedColor);
        pulse(target, function(){ if (script.hideAfter) shrinkAway(target); });

        if (global.collectManager && typeof global.collectManager.addItem === "function") {
            global.collectManager.addItem(buildItemInfo(target));
        }
    });

    log("[Collectible] Attached to: " + target.name);
}

function init(){
    if (script.target) {
        tryAttachTo(script.target);
        return;
    }
    if (script.loaderScript && script.loaderScript.api && typeof script.loaderScript.api.onSpawned === "function") {
        script.loaderScript.api.onSpawned(function(spawnedSO){ tryAttachTo(spawnedSO); });
        return;
    }
    log("[Collectible] No target or loaderScript provided.");
}
init();

// ------------------------------ Helpers --------------------------------------
function ensureInteraction(rootSO){
    var ic = rootSO.getComponent("Component.InteractionComponent");
    if (!ic) ic = rootSO.createComponent("Component.InteractionComponent");

    // Camera is critical for picking correctness when multiple cameras exist.
    if (script.targetCamera) ic.setCamera(script.targetCamera);

    // For debugging, set to 0.0 first; raise later for UX.
    if (script.minTouchSize >= 0) ic.setMinimumTouchSize(script.minTouchSize);

    // Gather every possible visual that can receive hits.
    var types = [
        "Component.BaseMeshVisual",
        "Component.RenderMeshVisual",
        "Component.SkinnedMeshVisual",
        "Component.TextMeshVisual"
    ];

    var added = 0;
    (function addMeshes(so){
        for (var t = 0; t < types.length; t++){
            var comps = so.getComponents(types[t]);
            for (var i = 0; i < comps.length; i++){
                // Avoid duplicates: InteractionComponent ignores dups, but we can be explicit.
                ic.addMeshVisual(comps[i]);
                added++;
            }
        }
        for (var c = 0; c < so.getChildrenCount(); c++) addMeshes(so.getChild(c));
    })(rootSO);

    try { Studio.log("[Collectible] Registered visuals: " + added + " on " + rootSO.name); } catch(_){ print("[Collectible] Registered visuals: " + added); }
    return ic;
}


function forEachRenderMesh(root, fn){
    if (!root) return;
    (function walk(so){
        var comps = so.getComponents("Component.RenderMeshVisual");
        for (var i=0;i<comps.length;i++) fn(comps[i]);
        for (var c=0;c<so.getChildrenCount();c++) walk(so.getChild(c));
    })(root);
}

function clone4(v){ return v ? new vec4(v.x,v.y,v.z,v.w) : null; }

function cacheMaterialColors(root){
    matSets = [];
    forEachRenderMesh(root, function(rmv){
        var count = rmv.getMaterialsCount();
        var originals = [];
        for (var i=0;i<count;i++){
            var m = rmv.getMaterial(i), p = m && m.mainPass, c = null;
            if (p){
                if (p.baseColor !== undefined) c = p.baseColor;
                else if (p.color !== undefined) c = p.color;
                else if (p.baseColorFactor !== undefined) c = p.baseColorFactor;
            }
            originals[i] = clone4(c);
        }
        matSets.push({ rmv: rmv, originalColors: originals, count: count });
    });
}

function setColorAll(col){
    for (var k=0;k<matSets.length;k++){
        var set = matSets[k];
        for (var i=0;i<set.count;i++){
            var m = set.rmv.getMaterial(i), p = m && m.mainPass;
            if (!p) continue;
            if (p.baseColor !== undefined) p.baseColor = col;
            else if (p.color !== undefined) p.color = col;
            else if (p.baseColorFactor !== undefined) p.baseColorFactor = col;
        }
    }
}

function buildItemInfo(node){
    var nameSource = script.nameFrom || node;
    var finalName = (script.itemName && script.itemName.length) ? script.itemName : (nameSource && nameSource.name) || "Item";
    var finalType = (script.itemType && script.itemType.length) ? script.itemType : "item";
    var id = (script.itemId && script.itemId.length) ? script.itemId : (finalName + "_" + Math.floor(getTime()*1000));
    return { id:id, name:finalName, type:finalType, value:script.value };
}

// ------------------------------ Animations -----------------------------------
function pulse(node, done){
    var tr = node.getTransform();
    var t0 = getTime(), dur = Math.max(0.06, script.pulseDuration);
    var up = script.createEvent("UpdateEvent");
    var startScale = tr.getLocalScale(); // respect current scale if WOC changed it
    up.bind(function(){
        var t = Math.min(1, (getTime()-t0)/dur);
        var s = (t<0.5) ? 1 + (script.pulseScale-1)*(t/0.5) : script.pulseScale - (script.pulseScale-1)*((t-0.5)/0.5);
        tr.setLocalScale(new vec3(startScale.x*s, startScale.y*s, startScale.z*s));
        if (t>=1){ tr.setLocalScale(startScale); up.enabled=false; if (done) done(); }
    });
}

function shrinkAway(node, done){
    var tr = node.getTransform();
    var t0 = getTime(), dur = Math.max(0.05, script.shrinkDuration);
    var up = script.createEvent("UpdateEvent");
    var startScale = tr.getLocalScale();
    up.bind(function(){
        var t = Math.min(1, (getTime()-t0)/dur);
        var k = 1 + (0.01 - 1)*t;
        tr.setLocalScale(new vec3(startScale.x*k, startScale.y*k, startScale.z*k));
        if (t>=1){ node.enabled=false; up.enabled=false; if (done) done(); }
    });
}
