// Version: 1.0.0
// Event: Lens Initialized
// Description: Toggles the visibility of face, world, and ocean content based on the active camera.

// @input SceneObject[] faceContent
// @input SceneObject[] worldContent
// @input Component.ScriptComponent oceanTool {"label":"Ocean Tool"}

// This function is triggered when the front camera is active.
function onFrontCamEvent(eventData) {
    // Enable face content.
    for (var i = 0; i < script.faceContent.length; i++) {
        var faceObject = script.faceContent[i];
        if (faceObject) {
            faceObject.enabled = true;
        }
    }

    // Disable world content.
    for (var i = 0; i < script.worldContent.length; i++) {
        var worldObject = script.worldContent[i];
        if (worldObject) {
            worldObject.enabled = false;
        }
    }

    // Disable the Ocean Tool using its API.
    if (script.oceanTool && script.oceanTool.api && script.oceanTool.api.setOceanEnabled) {
        script.oceanTool.api.setOceanEnabled(false);
    }
}

// Bind the function to the CameraFrontEvent.
var cameraFrontEvent = script.createEvent('CameraFrontEvent');
cameraFrontEvent.bind(onFrontCamEvent);

// This function is triggered when the back camera is active.
function onBackCamEvent(eventData) {
    // Disable face content.
    for (var i = 0; i < script.faceContent.length; i++) {
        var faceObject = script.faceContent[i];
        if (faceObject) {
            faceObject.enabled = false;
        }
    }

    // Enable world content.
    for (var i = 0; i < script.worldContent.length; i++) {
        var worldObject = script.worldContent[i];
        if (worldObject) {
            worldObject.enabled = true;
        }
    }

    // Enable the Ocean Tool using its API.
    if (script.oceanTool && script.oceanTool.api && script.oceanTool.api.setOceanEnabled) {
        script.oceanTool.api.setOceanEnabled(true);
    }
}

// Bind the function to the CameraBackEvent.
var cameraBackEvent = script.createEvent('CameraBackEvent');
cameraBackEvent.bind(onBackCamEvent);
