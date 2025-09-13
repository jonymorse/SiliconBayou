
// ──────────────────────────────────────────────────────────────────────────────
// B) InteractionAttach.js (generic, reusable)
//    Owns one InteractionComponent and lets you register any meshes for hits.
// ──────────────────────────────────────────────────────────────────────────────
//@input Component.Camera targetCamera
//@input float minTouchSize = 0.12 {"label":"Min Touch Size (0–1 screen width)"}

var _ic = null;
var _tapHandlersB = [];
var _registered = []; // store BaseMeshVisuals we added (for optional clearing)

function logB(m){ try{ Studio.log(m);}catch(_){ print(m);} }

function _ensureIC(){
    var host = script.getSceneObject();
    _ic = host.getComponent("Component.InteractionComponent");
    if(!_ic){ _ic = host.createComponent("Component.InteractionComponent"); }
    if(script.targetCamera){ _ic.setCamera(script.targetCamera); }
    if(script.minTouchSize > 0){ _ic.setMinimumTouchSize(script.minTouchSize); }
    _ic.onTap.add(function(){
        for(var i=0;i<_tapHandlersB.length;i++){
            try{ _tapHandlersB[i](_ic); }catch(e){ logB("[Interaction] tap handler error: "+e); }
        }
    });
}

function _forEachBaseMesh(root, fn){
    if(!root){ return; }
    var stack=[root];
    while(stack.length){
        var so = stack.pop();
        var mv = so.getComponents("Component.BaseMeshVisual");
        for(var i=0;i<mv.length;i++){ fn(mv[i]); }
        for(var c=0;c<so.getChildrenCount();c++){ stack.push(so.getChild(c)); }
    }
}

// Public API
script.api.getInteraction = function(){ return _ic; };
script.api.onTap = function(cb){ if(typeof cb==='function'){ _tapHandlersB.push(cb); } };
script.api.registerMeshes = function(root){
    _ensureIC();
    _forEachBaseMesh(root, function(mv){ _ic.addMeshVisual(mv); _registered.push(mv); });
};
script.api.clearMeshes = function(){
    // Note: InteractionComponent has no removeMeshVisual; if needed, recreate IC
    if(!_ic){ return; }
    var host = script.getSceneObject();
    try{ host.removeComponent(_ic); }catch(_){ /* ignore if not supported */ }
    _ic = null; _registered.length = 0; // will be recreated on next register
};

_ensureIC();


