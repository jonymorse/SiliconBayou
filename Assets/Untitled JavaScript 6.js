// CollectibleTap.js  (metadata-enabled)
// @input Component.InteractionComponent interaction
// @input Component.RenderMeshVisual rmv
// @input vec4 tappedColor = {0.95, 0.7, 0.2, 1.0}
// @input float pulseScale = 1.18
// @input float pulseDuration = 0.18
// @input bool hideAfter = true
// @input float shrinkDuration = 0.22 {"showIf":"hideAfter"}
// @input int value = 1 {"label":"Score Value"}
// --- NEW metadata inputs ---
/** Give each prefab a friendly label + type. If left blank, we'll use the SceneObject's name. */
/// @input string itemId      {"hint":"Unique id (optional, helps de-dupe)"}
/// @input string itemName    {"hint":"Display name (defaults to object name)"}
/// @input string itemType    {"hint":"e.g., frog, gator, coin"}
/// @input SceneObject nameFrom {"hint":"If set, take name from this object instead"}

 // (keep your WOC input if you had one)
// @input Component.ScriptComponent wocScript {"label":"(Optional) WOC script to disable"}

var node = script.getSceneObject();
var tr = node.getTransform();
var base = tr.getLocalScale();
var collected = false;

// ----- color cache (unchanged) -----
function clone4(v){ return v ? new vec4(v.x,v.y,v.z,v.w) : null; }
var matCount = script.rmv.getMaterialsCount();
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

// ----- helpers -----
function pulse(done){
  var t0 = getTime(), dur = Math.max(0.06, script.pulseDuration);
  var up = script.createEvent("UpdateEvent");
  up.bind(function(){
    var t = Math.min(1, (getTime()-t0)/dur);
    var s = (t<0.5) ? 1 + (script.pulseScale-1)*(t/0.5)
                    : script.pulseScale - (script.pulseScale-1)*((t-0.5)/0.5);
    tr.setLocalScale(new vec3(base.x*s, base.y*s, base.z*s));
    if (t>=1){ tr.setLocalScale(base); up.enabled=false; if (done) done(); }
  });
}
function shrinkAway(done){
  var t0=getTime(), dur=Math.max(0.05, script.shrinkDuration);
  var up = script.createEvent("UpdateEvent");
  up.bind(function(){
    var t = Math.min(1, (getTime()-t0)/dur);
    var k = 1 + (0.01-1)*t;
    tr.setLocalScale(new vec3(base.x*k, base.y*k, base.z*k));
    if (t>=1){ node.enabled=false; up.enabled=false; if (done) done(); }
  });
}

// ----- build the metadata payload -----
function buildItemInfo(){
  var nameSource = script.nameFrom || node;
  var finalName = (script.itemName && script.itemName.length) ? script.itemName : (nameSource && nameSource.name) || "Item";
  var finalType = (script.itemType && script.itemType.length) ? script.itemType : "item";
  var id = script.itemId && script.itemId.length ? script.itemId : (finalName + "_" + Math.floor(getTime()*1000));
  return { id: id, name: finalName, type: finalType, value: script.value };
}

function onTap(){
  if (collected) return;
  collected = true;

  if (script.wocScript && script.wocScript.enabled) script.wocScript.enabled = false;

  setColorAll(script.tappedColor);
  pulse(function(){ if (script.hideAfter) shrinkAway(); });

  if (global.collectManager && global.collectManager.addItem) {
    global.collectManager.addItem(buildItemInfo());
  }
}

// wire up
if (script.interaction) {
  script.interaction.onTap.add(onTap);
} else {
  print("CollectibleTap: drag the Interaction into 'interaction'.");
}
