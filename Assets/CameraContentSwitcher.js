// Version: 1.1.0
// Event: Lens Initialized
// Description: Toggles face/world/ocean content based on active camera,
// and (only) on BACK -> FRONT switch pushes current state via CollectManager.

// @input SceneObject[] faceContent
// @input SceneObject[] worldContent
// @input Component.ScriptComponent oceanTool {"label":"Ocean Tool"}

function setArrayEnabled(arr, on){
    if (!arr) { return; }
    for (var i = 0; i < arr.length; i++){
        var so = arr[i];
        if (so) { so.enabled = !!on; }
    }
}

// Track last camera we saw so we only push on a true back->front transition
var lastCam = null; // "front" | "back" | null

function pushStateIfAvailable(tag){
    // Avoid deprecated script.api; rely on CollectManager's global API
    if (global.collectManager && typeof global.collectManager.pushStateNow === "function") {
        global.collectManager.pushStateNow(tag || "");
    }
}

// Front camera active
function onFrontCamEvent(){
    setArrayEnabled(script.faceContent, true);
    setArrayEnabled(script.worldContent, false);

    // Turn OFF ocean via property (no .api)
    if (script.oceanTool && script.oceanTool.script){
        script.oceanTool.script.oceanEnabled = false;
    }

    // Only push when transitioning from BACK -> FRONT (not on first init)
    if (lastCam === "back") {
        pushStateIfAvailable("back->front");
    }
    lastCam = "front";
}
var cameraFrontEvent = script.createEvent("CameraFrontEvent");
cameraFrontEvent.bind(onFrontCamEvent);

// Back camera active
function onBackCamEvent(){
    setArrayEnabled(script.faceContent, false);
    setArrayEnabled(script.worldContent, true);

    // Turn ON ocean via property (no .api)
    if (script.oceanTool && script.oceanTool.script){
        script.oceanTool.script.oceanEnabled = true;
    }

    lastCam = "back";
}
var cameraBackEvent = script.createEvent("CameraBackEvent");
cameraBackEvent.bind(onBackCamEvent);

// Optional: if your preview always starts on the front camera and you want to
// suppress an initial push when the first Front event fires, you can uncomment:
//
// script.createEvent("OnStartEvent").bind(function () {
//     lastCam = "front";
// });
