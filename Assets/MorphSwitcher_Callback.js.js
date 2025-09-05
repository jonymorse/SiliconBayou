// MorphSwitcher_Callback.js
//@input SceneObject[] morphs
//@input int defaultIndex = 0

function setActive(i){
    if (!script.morphs || i < 0 || i >= script.morphs.length) { return; }
    for (var k = 0; k < script.morphs.length; k++){
        if (script.morphs[k]) { script.morphs[k].enabled = (k === i); }
    }
}

// Initialize one active morph
setActive(script.defaultIndex);

// This name is what you'll point the carousel to
script.onCarouselSelection = function(index /*, texture */){
    setActive(index);
};
