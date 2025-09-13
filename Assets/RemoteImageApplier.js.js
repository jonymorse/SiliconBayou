// RemoteImageApplier.js
//@input Asset.RemoteReferenceAsset remoteImage
//@input Component.Image[] targets {"label":"UI Image Targets"}
//@input Asset.Texture fallbackTexture {"label":"(Optional) Fallback Texture"}
//@input bool requireRemote = false {"label":"Hide object if download fails"}
//@input int timeoutMs = 7000 {"label":"Fail fast timeout (ms)"}

var applied = false;

// Optional: apply a texture to all targets
function applyToTargets(tex) {
    if (!script.targets) return;
    for (var i = 0; i < script.targets.length; i++) {
        var img = script.targets[i];
        if (!img) continue;
        // Component.Image uses mainPass.baseTex
        img.mainPass.baseTex = tex;
    }
    applied = true;
}

function fail() {
    if (script.requireRemote) {
        // Hide the object if you require remote success
        script.getSceneObject().enabled = false;
    } else if (script.fallbackTexture) {
        applyToTargets(script.fallbackTexture);
    }
}

// Simple timeout so we don't hang forever
var timer = script.createEvent("DelayedCallbackEvent");
timer.bind(function () {
    if (!applied) {
        print("Remote image timed out");
        fail();
    }
});

function start() {
    try {
        if (!script.remoteImage) {
            print("RemoteImageApplier: no RemoteReferenceAsset assigned");
            if (script.fallbackTexture) applyToTargets(script.fallbackTexture);
            return;
        }
        // Start timeout
        var secs = Math.max(0.1, (script.timeoutMs | 0) / 1000.0);
        timer.reset(secs);

        script.remoteImage.downloadAsset(function (asset) {
            try {
                // Expecting a Texture-like asset
                var tn = asset && asset.getTypeName ? asset.getTypeName() : "";
                if (!tn || tn.indexOf("Texture") === -1) {
                    print("RemoteImageApplier: downloaded asset is not a Texture (" + tn + ")");
                    fail();
                    return;
                }

                applyToTargets(asset);
            } catch (e) {
                print("RemoteImageApplier onDownloaded exception: " + e);
                fail();
            }
        }, function () {
            print("Remote image download failed");
            fail();
        });
    } catch (e) {
        print("RemoteImageApplier start() exception: " + e);
        fail();
    }
}

// If you want a placeholder immediately in editor, apply fallback now
if (script.fallbackTexture) {
    applyToTargets(script.fallbackTexture);
    applied = false; // allow remote to overwrite when it arrives
}

var onStart = script.createEvent("OnStartEvent");
onStart.bind(start);
