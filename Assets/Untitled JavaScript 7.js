// CollectibleTap.js
//@input Component.InteractionComponent interaction
//@input Component.RenderMeshVisual rmv
//@input vec4 tappedColor = {0.95, 0.7, 0.2, 1.0}
//@input float pulseScale = 1.18
//@input float pulseDuration = 0.18
//@input bool hideAfter = true
//@input float shrinkDuration = 0.22
//@input string itemName        // Optional override
//@input Component.ScriptComponent wocScript

var node = script.getSceneObject();
var tr = node.getTransform();
var base = tr.getLocalScale();
var collected = false;

// Guard for rmv
if (!script.rmv) { print("CollectibleTap: 'rmv' (RenderMeshVisual) is not assigned."); }
var matCount = script.rmv ? script.rmv.getMaterialsCount() : 0;

// --- cache original colors (PBR/Unlit friendly) ---
function clone4(v){ return v ? new vec4(v.x, v.y, v.z, v.w) : null; }
var originalColors = [];
for (var i = 0; i < matCount; i++) {
    var m = script.rmv.getMaterial(i), p = m && m.mainPass, c = null;
    if (p) {
        if (p.baseColor !== undefined) c = p.baseColor;
        else if (p.color !== undefined) c = p.color;
        else if (p.baseColorFactor !== undefined) c = p.baseColorFactor;
    }
    originalColors[i] = clone4(c);
}
function setColorAll(col){
    for (var i = 0; i < matCount; i++) {
        var m = script.rmv.getMaterial(i), p = m && m.mainPass;
        if (!p) continue;
        if (p.baseColor !== undefined) p.baseColor = col;
        else if (p.color !== undefined) p.color = col;
        else if (p.baseColorFactor !== undefined) p.baseColorFactor = col;
    }
}

// --- little pulse tween (captures current scale at tap) ---
function pulse(done){
    var startScale = tr.getLocalScale();
    var t0 = getTime(), dur = Math.max(0.06, script.pulseDuration);
    var up = script.createEvent("UpdateEvent");
    up.bind(function(){
        var t = Math.min(1, (getTime() - t0) / dur);
        var s = (t < 0.5)
            ? 1 + (script.pulseScale - 1) * (t / 0.5)
            : script.pulseScale - (script.pulseScale - 1) * ((t - 0.5) / 0.5);
        tr.setLocalScale(new vec3(startScale.x * s, startScale.y * s, startScale.z * s));
        if (t >= 1) {
            tr.setLocalScale(startScale);
            up.enabled = false;
            if (done) done();
        }
    });
}

// --- shrink away, then disable ---
function shrinkAway(done){
    var t0 = getTime(), dur = Math.max(0.05, script.shrinkDuration);
    var up = script.createEvent("UpdateEvent");
    up.bind(function(){
        var t = Math.min(1, (getTime() - t0) / dur);
        var k = 1 + (0.01 - 1) * t; // 1 -> 0.01
        tr.setLocalScale(new vec3(base.x * k, base.y * k, base.z * k));
        if (t >= 1) {
            node.enabled = false;
            up.enabled = false;
            if (done) done();
        }
    });
}

function onTap(){
    if (collected) return;
    collected = true;

    // If you used WOC for placement, stop it from eating more gestures
    if (script.wocScript && script.wocScript.enabled) {
        script.wocScript.enabled = false;
    }

    // visual feedback
    if (matCount > 0) setColorAll(script.tappedColor);
    pulse(function(){ if (script.hideAfter) shrinkAway(); });

    // --- NAME-ONLY collection ---
    var nameToSend = (script.itemName && script.itemName.length)
        ? script.itemName
        : (node && node.name) ? node.name : "Item";

    if (global.collectManager) {
        var mgr = global.collectManager;
        if (typeof mgr.addItem === "function") {
            mgr.addItem({ name: nameToSend });
        } else if (typeof mgr.addName === "function") {
            mgr.addName(nameToSend);
        } else {
            print("CollectibleTap: collectManager lacks addItem/addName; nothing sent.");
        }
    }
}

// wire events
if (script.interaction) {
    // add your Render Mesh Visual to Interaction → Mesh Visuals in the Inspector!
    script.interaction.onTap.add(onTap);
} else {
    print("CollectibleTap: drag the Interaction component into 'interaction'.");
}
