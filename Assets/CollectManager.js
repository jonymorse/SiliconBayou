// CollectManager.js (show/hide targets by collected keys)
//@input Component.Text text
//@input string[] toggleKeys
//@input SceneObject[] toggleTargets
//@input bool defaultHidden = true

var names = [];
var started = false;
var collected = {};

function renderText() {
    if (!script.text) { return; }
    script.text.text = names.length ? ("Collected: " + names.join(", ")) : "Collected: -";
}

function syncToggles() {
    if (!script.toggleKeys || !script.toggleTargets) return;
    var n = Math.min(script.toggleKeys.length, script.toggleTargets.length);
    for (var i = 0; i < n; i++) {
        var key = (script.toggleKeys[i] || "").trim();
        var so  = script.toggleTargets[i];
        if (!so) continue;
        so.enabled = !!collected[key]; // show only if collected
    }
}

function addItem(item) {
    var n = (item && item.name) ? (""+item.name).trim() : "Item";
    names.push(n);
    collected[n] = true;
    if (started) { renderText(); syncToggles(); }
}

var onStart = script.createEvent("OnStartEvent");
onStart.bind(function () {
    if (script.defaultHidden && script.toggleTargets) {
        for (var i = 0; i < script.toggleTargets.length; i++) {
            if (script.toggleTargets[i]) script.toggleTargets[i].enabled = false;
        }
    }
    started = true;
    renderText();
    syncToggles();
});

// Public API
global.collectManager = {
    addItem: addItem,
    addName: function (n) { addItem({ name: n }); },
    reset: function () { names = []; collected = {}; if (started) { renderText(); syncToggles(); } },
    list: function () { return names.slice(); },
    has:  function (k) { return !!collected[(k||"").trim()]; }
};
