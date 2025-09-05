// AddInteractionToSpawned.js
// @input Component.Camera targetCamera
// @input float minTouchSize = 0.12 {"label":"Min Touch Size (0-1 screen width)"}

function addInteraction(rootSO, onTap) {
    if (!rootSO) return;

    // 1) Create (or reuse) an Interaction Component on the root
    var ic = rootSO.getComponent("Component.InteractionComponent");
    if (!ic) ic = rootSO.createComponent("Component.InteractionComponent");
    if (script.targetCamera) ic.setCamera(script.targetCamera);
    if (script.minTouchSize > 0) ic.setMinimumTouchSize(script.minTouchSize);

    // 2) Find ALL mesh visuals under the spawned prefab and register them
    function addMeshesRecursive(so) {
        var mv = so.getComponents("Component.BaseMeshVisual");
        for (var i = 0; i < mv.length; i++) ic.addMeshVisual(mv[i]);
        for (var c = 0; c < so.getChildrenCount(); c++) addMeshesRecursive(so.getChild(c));
    }
    addMeshesRecursive(rootSO);

    // 3) Hook events (change to whatever you need)
    if (onTap) {
        ic.onTap.add(function () { onTap(rootSO, ic); });
    } else {
        ic.onTap.add(function () { print("[Interaction] tapped: " + rootSO.name); });
    }
}

// EXPORT for other scripts (optional)
script.api = script.api || {};
script.api.addInteraction = addInteraction;
