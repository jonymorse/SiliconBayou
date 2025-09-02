// CombineFaceWorldContent.js
// Version: 0.0.1
// Event: Lens Initialized
// Description: Hides the face content on rear camera and world content on front camera
// @input SceneObject[] faceContent
// @input SceneObject[] worldContent
function onFrontCamEvent(eventData) {
  for (var i = 0; i < script.faceContent.length; i++) {
    var faceObject = script.faceContent[i];
    if (faceObject) {
      faceObject.enabled = true;
    }
  }

  for (var i = 0; i < script.worldContent.length; i++) {
    var worldObject = script.worldContent[i];
    if (worldObject) {
      worldObject.enabled = false;
    }
  }
}
var cameraFrontEvent = script.createEvent('CameraFrontEvent');
cameraFrontEvent.bind(onFrontCamEvent);
function onBackCamEvent(eventData) {
  for (var i = 0; i < script.faceContent.length; i++) {
    var faceObject = script.faceContent[i];
    if (faceObject) {
      faceObject.enabled = false;
    }
  }

  for (var i = 0; i < script.worldContent.length; i++) {
    var worldObject = script.worldContent[i];
    if (worldObject) {
      worldObject.enabled = true;
    }
  }
}
var cameraBackEvent = script.createEvent('CameraBackEvent');
cameraBackEvent.bind(onBackCamEvent);