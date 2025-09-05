// LookCarouselBinder.js
//@input Component.ScriptComponent carousel {"label":"Image Carousel Script"}
//@input SceneObject[] lookGroups
//@input Component.Text labelText {"label":"(optional) Label"}
//@input string[] lookNames       {"label":"(optional) Names (order matches lookGroups)"}
//@input int startIndex = 0
//@input bool rememberChoice = true
//@input bool hideIfSingle = true

var idx = Math.max(0, Math.min(script.startIndex, Math.max(0, script.lookGroups.length-1)));

function setActive(i, animate){
    if (!script.lookGroups || script.lookGroups.length === 0) { return; }
    i = (i + script.lookGroups.length) % script.lookGroups.length;

    for (var k = 0; k < script.lookGroups.length; k++){
        var so = script.lookGroups[k];
        if (so) so.enabled = (k === i);
    }

    if (script.labelText && script.lookNames && script.lookNames[i]){
        script.labelText.text = script.lookNames[i];
    }

    // persist
    if (script.rememberChoice && global.persistentStorageSystem){
        global.persistentStorageSystem.storeInt("faceLookIdx", i);
    }

    // sync the visual selector if API exists
    if (script.carousel && script.carousel.api && script.carousel.api.setSelected){
        script.carousel.api.setSelected(i, !!animate);
    }
    idx = i;
}

function init(){
    if (script.hideIfSingle && script.lookGroups.length <= 1){
        // Hide the carousel if there’s nothing to choose
        script.getSceneObject().enabled = false;
        return;
    }

    if (script.rememberChoice && global.persistentStorageSystem){
        var saved = global.persistentStorageSystem.getInt("faceLookIdx", idx);
        if (saved >= 0 && saved < script.lookGroups.length){ idx = saved; }
    }
    setActive(idx, false);

    // Hook whichever event the prefab exposes
    if (script.carousel && script.carousel.api){
        var evt = script.carousel.api.onSelectionChanged || script.carousel.api.onSelectionUpdate;
        if (evt && evt.add){
            evt.add(function(i /*, tex */){ setActive(i, true); });
        }
    }
}
init();
