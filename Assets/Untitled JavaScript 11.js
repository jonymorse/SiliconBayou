// ExactGroupToggle.js
//@input SceneObject group {"label":"Target Group (parent)"}
//@input bool enabled = true {"label":"Group Enabled (live toggle)"}

var target = script.group;
var last = null;

function apply(v){
    if (!target) { print("ExactGroupToggle: no target assigned"); return; }
    try { target.enabled = v; } 
    catch(e) { print("ExactGroupToggle: cannot toggle this object (root/system?)"); }
    last = v;
}

script.createEvent("OnStartEvent").bind(function(){ apply(script.enabled); });

// Respond when you flip the checkbox in the Inspector
script.createEvent("UpdateEvent").bind(function(){
    if (last !== script.enabled) apply(script.enabled);
});
