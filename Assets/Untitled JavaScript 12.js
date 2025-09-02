// @input SceneObject parentObject
// @input bool shouldBeVisible = true

// Description:
// This script controls the visibility of a parent object in Lens Studio.
// It exposes two variables in the Inspector panel:
// - `parentObject`: A SceneObject that you can link to the object you want to control.
// - `shouldBeVisible`: A boolean checkbox to enable or disable the object's visibility.

// Instructions:
// 1. Add this script to any object in your scene (or create a new empty object for it).
// 2. In the Inspector panel, drag and drop the parent object you want to control from the Scene Hierarchy into the `Parent Object` field of this script.
// 3. Use the `Should Be Visible` checkbox to turn the object on or off.

// This function is called every frame to check and apply the desired visibility state.
function onUpdate() {
    // Check if the parentObject variable has been linked.
    if (script.parentObject) {
        // Set the 'enabled' property of the parent object.
        // This will also affect all of its child objects.
        script.parentObject.enabled = script.shouldBeVisible;
    }
}

// Bind the onUpdate function to the Update Event, which runs every frame.
var updateEvent = script.createEvent("UpdateEvent");
updateEvent.bind(onUpdate);
