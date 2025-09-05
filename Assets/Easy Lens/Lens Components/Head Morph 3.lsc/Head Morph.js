// Headmorph.js (remote support, stack-overflow fix)
// Minimal changes to your original file:
//  - Adds optional RemoteReferenceAsset support (ObjectPrefab or RenderMesh)
//  - Defers init to OnStart to avoid "Component is not yet awake"
//  - Replaces invalid .uniformScale(...) with explicit scale
//  - Uses identity quaternion correctly
//  - Robust material swap (handles nested RMV/SMV)
//  - NO custom getter for remoteModel (prevents recursive getter stack overflow)

//@input Asset.ObjectPrefab model
//@input float scale = 1 {"widget":"slider","default":1.0,"min":0.1, "max":2.0, "step":0.01}
//@input Asset.ObjectPrefab bindingPrefab
//@input vec3 offsets
//@input Asset.Material unlitMat

// NEW: remote-prefab support
//@input Asset.RemoteReferenceAsset remoteModel {"hint":"Remote Object Prefab or RenderMesh"}
//@input bool preferRemote = true
//@input bool loadOnStart = true

// --- Optional corrective rotation for mismatched asset axes ---
//@input vec3 correctiveEulerDeg = {0,0,0} {"label":"Corrective Rot (deg)"}
//@input bool applyCorrectionOnRoot = false

const headmorphRootName = "Headmorph Root";
const baseOffset = new vec3(0,0,0);
const baseScale = 1.1;
let inputVals = {
    model: script.model,
    scale: script.scale
};
let instance = null;
let bindingSo = null;
let modelRoot = null;
var _requestId = 0;

// Defer so components are awake
script.createEvent("OnStartEvent").bind(init);

function init() {
    const so = script.getSceneObject();

    if (script.bindingPrefab) {
        bindingSo = script.bindingPrefab.instantiate(so);
        const bt = bindingSo.getTransform();
        bt.setLocalPosition(new vec3(0,0,0));
        bt.setLocalRotation( new quat(90,0,0,1) ); // OG fix
        bt.setLocalScale(new vec3(1,1,1));
    }

    fixRenderLayers(so);

    // Ensure the models root lives UNDER the Head Binding so it tracks the head
modelRoot = bindingSo ? findChild(bindingSo, headmorphRootName) : null;
if (!modelRoot) {
    modelRoot = (bindingSo || so).createChild(headmorphRootName);
}

    const offs = script.offsets ? script.offsets : baseOffset;
    const rt = modelRoot.getTransform();
    rt.setLocalPosition(offs);
    // Preserve existing rotation on Headmorph Root (do not force identity)
// rt.setLocalRotation(new quat(0,0,0,1));
    applyScale(inputVals.scale);

    setupProperties();

    // Choose source
    if (script.loadOnStart && script.preferRemote && script.remoteModel) {
        downloadAndInstantiate(script.remoteModel, function(success){
            if (!success) instantiateModel(inputVals.model);
        });
    } else {
        instantiateModel(inputVals.model);
    }
}

function applyScale(val){
    const s = baseScale * (val || 1.0);
    modelRoot.getTransform().setLocalScale(new vec3(s,s,s));
}

function destroyInstance(){
    if (instance) { instance.destroy(); instance = null; }
}

function instantiateModel(model) {
    destroyInstance();
    if (!model) return;
    instance = model.instantiate(modelRoot);
    postInstantiate(instance);
}

function instantiateFromAsset(asset){
    destroyInstance();
    if (!asset) return false;

    if (asset.getTypeName && asset.getTypeName() === "Asset.ObjectPrefab") {
        instance = asset.instantiate(modelRoot);
        postInstantiate(instance);
        return true;
    }
    if (asset.getTypeName && asset.getTypeName() === "Asset.RenderMesh") {
        const so = modelRoot.createChild("Headmorph_RemoteMesh");
        const rmv = so.createComponent("Component.RenderMeshVisual");
        rmv.mesh = asset;
        instance = so;
        postInstantiate(instance);
        return true;
    }
    print("Headmorph: unsupported remote asset type: " + asset.getTypeName());
    return false;
}

function postInstantiate(root){
    zeroLocal(root);
    // Optional corrective rotation: apply to instance or to the Headmorph Root
    if (script.applyCorrectionOnRoot) { applyCorrectiveRotation(modelRoot); }
    else { applyCorrectiveRotation(root); }

    if (script.unlitMat) swapMaterialsDeep(root);
    fixRenderLayers(root);
}

function downloadAndInstantiate(remoteRef, cb){
    if (!remoteRef){ cb && cb(false); return; }
    var myId = ++_requestId; // snapshot the “selection”
    remoteRef.downloadAsset(function(a){
        // If user swiped again while this was downloading, bail
        if (myId !== _requestId) { cb && cb(false); return; }
        var ok = instantiateFromAsset(a);
        cb && cb(ok);
    }, function(){
        if (myId === _requestId) { cb && cb(false); }
    });
}


function swapMaterialsDeep(root){
    const stack = [root];
    while (stack.length){
        const n = stack.pop();
        const rmv = n.getComponent("Component.RenderMeshVisual");
        if (rmv) swapMaterialOn(rmv);
        const smv = n.getComponent("Component.SkinnedMeshVisual");
        if (smv) swapMaterialOn(smv);
        for (let i=0;i<n.getChildrenCount();i++) stack.push(n.getChild(i));
    }
}

function swapMaterialOn(vis){
    try {
        const mat0 = vis.getMaterial(0);
        const tex = (mat0 && mat0.mainPass && mat0.mainPass.baseTex) ? mat0.mainPass.baseTex : null;
        const unlit = script.unlitMat.clone();
        if (tex) unlit.mainPass.baseTex = tex;
        vis.clearMaterials();
        vis.addMaterial(unlit);
    } catch (e) { /* ignore nonstandard materials */ }
}
function setupProperties() {
    script.createEvent("OnDisableEvent").bind(function(){ if (bindingSo) bindingSo.enabled = false; });
    script.createEvent("OnEnableEvent").bind(function(){ if (bindingSo) bindingSo.enabled = true; });

    var _remoteModelRef = script.remoteModel;   // backing vars (no recursion)
    var _preferRemote   = !!script.preferRemote;

    Object.defineProperties(script, {
        model: {
            set: function(v){
                inputVals.model = v;
                if (!_preferRemote && inputVals.model) {
                    instantiateModel(inputVals.model);
                }
            },
            get: function(){ return inputVals.model; }
        },
        scale: {
            set: function(v){ inputVals.scale = v; applyScale(inputVals.scale); },
            get: function(){ return inputVals.scale; }
        },
        remoteModel: {
            set: function(v){
                _remoteModelRef = v;
                // ONLY load here, and only when in remote mode
                if (_preferRemote && _remoteModelRef){
                    downloadAndInstantiate(_remoteModelRef, null);
                }
            },
            get: function(){ return _remoteModelRef; }
        },
        preferRemote: {
            set: function(v){
                var next = !!v;
                var prev = _preferRemote;
                _preferRemote = next;

                if (!next) {
                    // switching to LOCAL: instantiate immediately
                    if (inputVals.model) { instantiateModel(inputVals.model); }
                }
                // switching to REMOTE: do NOT auto-download here
                // (remoteModel setter will kick off the download)
            },
            get: function(){ return _preferRemote; }
        }
    });
}



function findChild(root, name) {
    if (root.name == name) return root;
    for (let i=0; i<root.getChildrenCount(); i++) {
        const child = root.getChild(i);
        const found = findChild(child, name);
        if (found) return found;
    }
    return null;
}

function fixRenderLayers(so) {
    const layer = getCameraRenderLayer(so);
    if (!layer) { print("cannot find render layer for camera above so: "+so); return; }
    assignRenderLayer(so, layer);
}

function assignRenderLayer(root, layer) {
    forEachChild(root, function(so) { so.layer = layer; });
}

function getCameraRenderLayer(so) {
    const cam = getParentCamera(so);
    if (!cam) { print("could not find parent camera for object: "+so.name); return null; }
    return cam.renderLayer;
}

function getParentCamera(so) {
    if (!so) return null;
    const cam = so.getComponent("Component.Camera");
    if (cam) return cam;
    return getParentCamera(so.getParent());
}

function forEachChild(so, func) {
    func(so);
    for (let i=0; i<so.getChildrenCount(); i++) {
        forEachChild(so.getChild(i), func);
    }
}

function zeroLocal(so){
    if (!so) return;
    const t = so.getTransform();
    t.setLocalPosition(new vec3(0,0,0));
    // Keep the prefab's own rotation (do NOT force identity here)
    t.setLocalScale(new vec3(1,1,1));
}

function applyCorrectiveRotation(so){
    if (!so) return;
    var e = script.correctiveEulerDeg ? script.correctiveEulerDeg : new vec3(0,0,0);
    if (Math.abs(e.x) + Math.abs(e.y) + Math.abs(e.z) === 0) return; // nothing to do
    var rx = e.x * Math.PI / 180.0;
    var ry = e.y * Math.PI / 180.0;
    var rz = e.z * Math.PI / 180.0;
    var q = quat.fromEulerAngles(rx, ry, rz);
    var t = so.getTransform();
    // Pre-multiply so correction happens in parent space
    t.setLocalRotation(q.multiply(t.getLocalRotation()));
}
