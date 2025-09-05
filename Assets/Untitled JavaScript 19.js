// RemoteRmvLoader.js
//@input Component.RenderMeshVisual occluderRMV
//@input Asset.RemoteReferenceAsset remoteMesh
//@input Asset.RemoteReferenceAsset remoteMat
//@input bool loadOnStart = true
//@input int renderOrder = 0

var meshAsset = null;
var matAsset  = null;

function applyToRMV() {
    if (!script.occluderRMV) return;

    if (meshAsset) {
        script.occluderRMV.mesh = meshAsset;
    }
    if (matAsset) {
        script.occluderRMV.clearMaterials();
        script.occluderRMV.addMaterial(matAsset);
    }
    script.occluderRMV.setRenderOrder(script.renderOrder);
}

function downloadOne(ref, expectedType, onDone) {
    if (!ref) { onDone(null); return; }
    ref.downloadAsset(function (a) {
        if (a && a.getTypeName && a.getTypeName() === expectedType) {
            onDone(a);
        } else {
            print("RemoteRmvLoader: expected " + expectedType + " got " + (a ? a.getTypeName() : "null"));
            onDone(null);
        }
    }, function () {
        print("RemoteRmvLoader: download failed for " + expectedType);
        onDone(null);
    });
}

function loadNow() {
    var pending = 0;
    function done() {
        pending--;
        if (pending <= 0) applyToRMV();
    }

    if (script.remoteMesh) {
        pending++;
        downloadOne(script.remoteMesh, "Asset.RenderMesh", function (a) { meshAsset = a; done(); });
    }
    if (script.remoteMat) {
        pending++;
        downloadOne(script.remoteMat, "Asset.Material", function (a) { matAsset = a; done(); });
    }
    if (pending === 0) applyToRMV();
}

script.api.loadNow  = loadNow;
script.api.setRefs  = function (meshRef, matRef) { script.remoteMesh = meshRef || script.remoteMesh; script.remoteMat = matRef || script.remoteMat; };

if (script.loadOnStart) loadNow();
