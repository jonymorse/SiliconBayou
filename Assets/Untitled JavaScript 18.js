// FaceLookToggle.js
//@input SceneObject[] looks           {"label":"Face Looks (one enabled at a time)"}
//@input Component.ScriptComponent carousel {"label":"Image Carousel Script (from prefab)"}
//@input Component.InteractionComponent nextBtn {"label":"(optional) Next Button"}
//@input Component.Text labelText {"label":"(optional) Label"}
//@input string[] lookNames {"label":"(optional) Names (match looks)"}
//@input int startIndex = 0
//@input bool rememberChoice = true
//@input bool hideCarouselIfSingle = true

var idx = Math.max(0, Math.min(script.startIndex, Math.max(0, script.looks.length-1)));

function show(i, animate){
    i = (i + script.looks.length) % script.looks.length;
    for (var k=0; k<script.looks.length; k++){
        if (script.looks[k]) script.looks[k].enabled = (k === i);
    }
    if (script.labelText && script.lookNames && script.lookNames[i]){
        script.labelText.text = script.lookNames[i];
    }
    if (script.rememberChoice && global.persistentStorageSystem){
        global.persistentStorageSystem.storeInt("faceLookIdx", i);
    }
    if (script.carousel && script.carousel.api && script.carousel.api.setSelected){
        script.carousel.api.setSelected(i, !!animate);
    }
    idx = i;
}

function next(){ show(idx+1, true); }
function bindCarousel(){
    if (!script.carousel || !script.carousel.api) return;
    var evt = script.carousel.api.onSelectionChanged || script.carousel.api.onSelectionUpdate;
    if (evt && evt.add){ evt.add(function(i /*, tex */){ show(i, true); }); }
}

(function init(){
    if (script.hideCarouselIfSingle && script.looks.length <= 1){
        if (script.carousel) script.carousel.getSceneObject().enabled = false;
    }
    if (script.rememberChoice && global.persistentStorageSystem){
        var saved = global.persistentStorageSystem.getInt("faceLookIdx", idx);
        if (saved >= 0 && saved < script.looks.length){ idx = saved; }
    }
    show(idx, false);
    bindCarousel();
    if (script.nextBtn){ script.nextBtn.onTouchStart.add(next); }
})();
