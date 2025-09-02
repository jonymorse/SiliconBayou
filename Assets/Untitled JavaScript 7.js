// CollectibleTap.js
// @input Component.InteractionComponent interaction
// @input Component.RenderMeshVisual rmv
// @input vec4 tappedColor = {0.95, 0.7, 0.2, 1.0} {"label":"Tint On Tap"}
// @input float pulseScale = 1.18
// @input float pulseDuration = 0.18
// @input bool hideAfter = true
// @input float shrinkDuration = 0.22 {"showIf":"hideAfter"}
// @input int value = 1 {"label":"Score Value"}
// @input Component.ScriptComponent wocScript {"label":"(Optional) WOC script to disable on first tap"}

var node = script.getSceneObject();
var tr = node.getTransform();
var base = tr.getLocalScale();
var collected = false;
var matCount = script.rmv.getMaterialsCount();

// --- cache original colors (PBR/Unlit friendly) ---
function clone4(v){ return v ? new vec4(v.x,v.y,v.z,v.w) : null; }
var originalColors = [];
for (var i=0;i<matCount;i++){
  var m = script.rmv.getMaterial(i), p = m && m.mainPass, c=null;
  if (p){
    if (p.baseColor !== undefined) c = p.baseColor;
    else if (p.color !== undefined) c = p.color;
    else if (p.baseColorFactor !== undefined) c = p.baseColorFactor;
  }
  originalColors[i] = clone4(c);
}
function setColorAll(col){
  for (var i=0;i<matCount;i++){
    var m = script.rmv.getMaterial(i), p = m && m.mainPass;
    if (!p) continue;
    if (p.baseColor !== undefined) p.baseColor = col;
    else if (p.color !== undefined) p.color = col;
    else if (p.baseColorFactor !== undefined) p.baseColorFactor = col;
  }
}

// --- little pulse tween ---
function pulse(done){
  var t0 = getTime(), dur = Math.max(0.06, script.pulseDuration);
  var up = script.createEvent("UpdateEvent");
  up.bind(function(){
    var t = Math.min(1, (getTime()-t0)/dur);
    var s = (t<0.5)
      ? 1 + (script.pulseScale-1)*(t/0.5)
      : script.pulseScale - (script.pulseScale-1)*((t-0.5)/0.5);
    tr.setLocalScale(new vec3(base.x*s, base.y*s, base.z*s));
    if (t>=1){ tr.setLocalScale(base); up.enabled=false; if (done) done(); }
  });
}

// --- shrink away, then disable ---
function shrinkAway(done){
  var t0=getTime(), dur=Math.max(0.05, script.shrinkDuration);
  var up = script.createEvent("UpdateEvent");
  up.bind(function(){
    var t = Math.min(1, (getTime()-t0)/dur);
    var k = 1 + (0.01-1)*t; // 1 → 0.01
    tr.setLocalScale(new vec3(base.x*k, base.y*k, base.z*k));
    if (t>=1){ node.enabled=false; up.enabled=false; if (done) done(); }
  });
}

function onTap(){
  if (collected) return;
  collected = true;

  // If you used WOC for placement, stop it from eating more gestures
  if (script.wocScript && script.wocScript.enabled) script.wocScript.enabled = false;

  // visual feedback
  setColorAll(script.tappedColor);
  pulse(function(){
    if (script.hideAfter) shrinkAway();
  });

  // score + sound (handled by manager)
  if (global.collectManager) global.collectManager.add(script.value);
}

// wire events
if (script.interaction) {
  // add your Render Mesh Visual to Interaction → Mesh Visuals in the Inspector!
  script.interaction.onTap.add(onTap);
} else {
  print("CollectibleTap: drag the Interaction component into 'interaction'.");
}
