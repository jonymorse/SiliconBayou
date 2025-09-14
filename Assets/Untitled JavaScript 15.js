// UIToggleSameNode.js
//@input Component.Image uiImage
//@input bool visible = true

function img() {
    if (script.uiImage) return script.uiImage;
    var so = script.getSceneObject();
    return so.getFirstComponent("Component.Image"); // SAME NODE ONLY
}

function setVisible(v){
    var i = img();
    if (i) i.enabled = !!v;
}

script.setVisible = setVisible; // so the bridge can call it
script.show   = function(){ setVisible(true);  };
script.hide   = function(){ setVisible(false); };
script.toggle = function(){ var i = img(); if (i) i.enabled = !i.enabled; };

script.createEvent("OnStartEvent").bind(function(){
    setVisible(script.visible);
});
