// CarouselBridgeGate_MERGED.js (overlay-free) // Bridge + Gate merged. If selection is locked, disable Headmorph SO (clears prior look).
print("=== CarouselBridgeGate_MERGED (no overlays) loaded ===");

//@input Component.ScriptComponent headmorph {"hint":"Headmorph.js ScriptComponent"}
//@input Asset.RemoteReferenceAsset[] remoteModels {"hint":"One per carousel item (preferred)"}
//@input Asset.ObjectPrefab[] localModels {"hint":"Optional fallbacks per item"}
//@input string[] lookKeys {"hint":"Unlock/label key per item index (e.g., 'Frog Statue', 'Baby Gator'). Align with models."}
//@input int defaultIndex = 0

// Gating
//@input bool gateByCollection = true {"label":"Lock until collected"}
//@input bool emptyKeyIsUnlocked = false {"label":"Empty key = unlocked?"}
//@input float pollInterval = 0.25 {"label":"Poll interval (sec)"}

// Clear method (simple & robust)
//@input bool clearByDisable = true {"label":"Clear by disabling headmorph SO when locked"}

// ------------------------------------------------------------------------------------
var lastNamesHash = "";
var currentIndex = -1;
var useEvents = false;

function log(m){
 try{ Studio.log(m); } catch(_){ print(m); } 
}

function itemCount(){
 return Math.max(
   script.remoteModels ? script.remoteModels.length : 0,
   script.localModels ? script.localModels.length : 0,
   script.lookKeys ? script.lookKeys.length : 0 );
}

function normalizeIndex(i){
 var n = itemCount();
 if (n <= 0) return 0;
 i = (i|0);
 return ((i % n) + n) % n; // wrap
}

function getLookKey(i){
 if (!script.lookKeys || i < 0 || i >= script.lookKeys.length) return "";
 return script.lookKeys[i] || "";
}

function getCollectedNames(){
 var cm = global.collectManager;
 if (!cm || typeof cm.list !== "function") return [];
 var arr = cm.list();
 return Array.isArray(arr) ? arr : [];
}

function hashNames(arr){
 return arr.join("|");
}

function isUnlocked(i){
 if (!script.gateByCollection) return true;
 var key = getLookKey(i);
 if (!key || key.length === 0) return !!script.emptyKeyIsUnlocked;
 var names = getCollectedNames();
 for (var k=0;k<names.length;k++) if (names[k] === key) return true;
 return false;
}

function headmorphSO(){
 return script.headmorph && script.headmorph.getSceneObject ? script.headmorph.getSceneObject() : null;
}

function setHeadmorphEnabled(enabled){
 if (!script.clearByDisable) return; // respect toggle
 var so = headmorphSO();
 if (so) so.enabled = !!enabled;
}

function applyModel(i){
 if (!script.headmorph || !script.headmorph.script){
   log("[BridgeGate] Missing headmorph script");
   return;
 }
 var remoteRef = script.remoteModels && script.remoteModels[i] ? script.remoteModels[i] : null;
 var localRef = script.localModels && script.localModels[i] ? script.localModels[i] : null;
 if (remoteRef){
   script.headmorph.script.preferRemote = true;
   script.headmorph.script.remoteModel = remoteRef;
 } else if (localRef){
   script.headmorph.script.preferRemote = false;
   script.headmorph.script.model = localRef;
 } else {
   log("[BridgeGate] No model at index " + i);
 }
}

function selectIndex(i){
 print("[BRIDGE] selectIndex raw=" + i + " norm=" + normalizeIndex(i));
 i = normalizeIndex(i);
 var unlocked = isUnlocked(i);
 print("[BRIDGE] isUnlocked(" + i + ")=" + unlocked + " key='" + getLookKey(i) + "'");

 // If the *same* index becomes unlocked, always ensure it's applied.
 if (i === currentIndex && unlocked) {
   print("[BRIDGE] same index flipped to unlocked → enabling & applying");
   setHeadmorphEnabled(true);
   applyModel(i);
   return;
 }

 if (!unlocked){
   print("[BRIDGE] locked → clear + disable Headmorph");
   if (script.headmorph && script.headmorph.script && typeof script.headmorph.script.clear === "function") {
     script.headmorph.script.clear(); // destroy current look immediately
   }
   setHeadmorphEnabled(false); // hide the subtree (if clearByDisable=true)
   currentIndex = i;
   return;
 }

 if (script.headmorph && script.headmorph.script && typeof script.headmorph.script.clear === "function") {
   script.headmorph.script.clear();
 }

 print("[BRIDGE] unlocked → enabling & applying model for index " + i);
 setHeadmorphEnabled(true);
 applyModel(i);
 currentIndex = i;
}

// Public API kept for Carousel binding
script.onCarouselSelection = function(a,b){
 print("[BRIDGE] onCarouselSelection a=" + a + " b=" + b);
 var idx = (typeof a === "number") ? a : (typeof b === "number" ? b : 0);
 selectIndex(idx);
};

function poll(){
 if (useEvents) return; // event-driven; no polling needed
 var h = hashNames(getCollectedNames());
 if (h !== lastNamesHash){
   lastNamesHash = h;
   // If current selection just became unlocked, re-apply it
   if (currentIndex >= 0 && isUnlocked(currentIndex)) selectIndex(currentIndex);
 }
 var t = script.createEvent("DelayedCallbackEvent");
 t.bind(poll);
 t.reset(Math.max(0.05, script.pollInterval || 0.25));
}

function hookCollectEventsIfAvailable(){
 var cm = global.collectManager;
 if (!cm || typeof cm.onAdd !== "function") return false;
 try {
   cm.onAdd(function(){
     if (currentIndex >= 0 && isUnlocked(currentIndex)) selectIndex(currentIndex);
   });
   return true;
 } catch(e){
   return false;
 }
}

script.createEvent("OnStartEvent").bind(function(){
 print("[BridgeGate] OnStart fired");
 setHeadmorphEnabled(false); // start cleared
 lastNamesHash = hashNames(getCollectedNames());
 useEvents = hookCollectEventsIfAvailable();
 if (!useEvents) poll();
});

// Optional convenience exports
script.selectIndex = selectIndex; // allows other scripts to drive selection
script.isUnlocked = isUnlocked; // status query per index
