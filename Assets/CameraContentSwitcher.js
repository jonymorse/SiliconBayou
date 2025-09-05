// Version: 1.0.0
// Event: Lens Initialized
// Description: Toggles the visibility of face, world, and ocean content based on the active camera.

// @input SceneObject[] faceContent
// @input SceneObject[] worldContent
// @input Component.ScriptComponent oceanTool {"label":"Ocean Tool"}

function setArrayEnabled(arr, on){
    if (!arr) return;
    for (var i = 0; i < arr.length; i++){
        var so = arr[i];
        if (so) so.enabled = !!on;
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
}
var cameraBackEvent = script.createEvent("CameraBackEvent");
cameraBackEvent.bind(onBackCamEvent);
