// CarouselRemoteHeadBridge.js (no-API, loop-safe)
//@input Component.ScriptComponent headmorph   {"hint":"Headmorph.js ScriptComponent"}
//@input Asset.RemoteReferenceAsset[] remoteModels {"hint":"One per carousel item (preferred)"}
//@input Asset.ObjectPrefab[]       localModels  {"hint":"Optional fallbacks per item"}
//@input int  defaultIndex = 0

function itemCount(){
    return Math.max(
        script.remoteModels ? script.remoteModels.length : 0,
        script.localModels  ? script.localModels.length  : 0
    );
}

function normalizeIndex(i){
    var n = itemCount();
    if (n <= 0) return 0;
    i = (i|0);
    return ((i % n) + n) % n; // wrap: ...,-1 -> n-1, n -> 0,...
}

function select(i){
    i = normalizeIndex(i);
    if (!script.headmorph){ print("Bridge: no headmorph ref"); return; }

    var remoteRef = script.remoteModels && script.remoteModels[i] ? script.remoteModels[i] : null;
    var localRef  = script.localModels  && script.localModels[i]  ? script.localModels[i]  : null;

    if (remoteRef){
        // Set properties; Headmorph setters handle the download/swap
        script.headmorph.script.preferRemote = true;
        script.headmorph.script.remoteModel  = remoteRef;
    } else if (localRef){
        script.headmorph.script.preferRemote = false;
        script.headmorph.script.model        = localRef;
    } else {
        print("Bridge: no model at index " + i);
    }
}

// Custom Function callback (set in Carousel inspector)
script.onCarouselSelection = function(a, b){
    // supports (index, texture) and (texture, index)
    var idx = (typeof a === "number") ? a : (typeof b === "number" ? b : 0);
    select(idx);
};

// Default selection after components wake
script.createEvent("OnStartEvent").bind(function(){
    var d = script.createEvent("DelayedCallbackEvent");
    d.bind(function(){ select(script.defaultIndex|0); });
    d.reset(0);
});
