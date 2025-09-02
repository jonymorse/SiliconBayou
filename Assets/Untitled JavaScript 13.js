//// HeadMorphPlaceholderAndRemote.js
//// Purpose: Assign a local EMPTY prefab to the HeadMorph "Model" slot as a placeholder,
////          then optionally swap to a remote prefab when it finishes downloading.
//// Notes:   This does NOT create a prefab at runtime (Lens Studio can't generate assets at runtime).
////          You make a tiny/empty prefab in the editor and assign it here.
//
////@input Component.ScriptComponent headMorphScript {"label":"HeadMorph Script Component"}
////@input string modelFieldName = "model" {"label":"Model Field Name"}
//
////@ui {"widget":"group_start","label":"Placeholder"}
////@input Asset.ObjectPrefab placeholderPrefab {"label":"Empty/Placeholder Prefab"}
////@ui {"widget":"group_end"}
//
////@ui {"widget":"group_start","label":"Optional Remote Swap"}
////@input Asset.RemoteReferenceAsset remoteRef {"label":"Remote Prefab (Optional)"}
////@input bool keepPlaceholderOnFail = true {"label":"Keep Placeholder If Remote Fails"}
////@input bool swapBackOnDisable = false {"label":"Swap Back To Placeholder On Disable"}
////@ui {"widget":"group_end"}
//
//function log(m){ print("[HeadMorphPlaceholder] " + m); }
//
//function assignToModelSlot(asset){
//    if (!script.headMorphScript) { log("No HeadMorph ScriptComponent assigned."); return; }
//    var field = script.modelFieldName || "model";
//    try {
//        script.headMorphScript[field] = asset;
//        log("Assigned to '" + field + "'.");
//    } catch(e) {
//        log("Failed to assign into '" + field + "': " + e);
//    }
//}
//
//function onStart(){
//    // 1) Always set the placeholder first (if provided)
//    if (script.placeholderPrefab) {
//        assignToModelSlot(script.placeholderPrefab);
//    } else {
//        log("No placeholderPrefab provided — green Model slot will remain unchanged until remote loads.");
//    }
//
//    // 2) Optionally kick a remote download to replace the placeholder
//    if (script.remoteRef) {
//        try {
//            script.remoteRef.downloadAsset(function(asset){
//                if (!asset || !asset.getTypeName || asset.getTypeName().indexOf("ObjectPrefab") === -1) {
//                    log("Remote asset is not an ObjectPrefab — keeping placeholder.");
//                    return;
//                }
//                assignToModelSlot(asset);
//            }, function(){
//                log("Remote download failed.");
//                if (!script.keepPlaceholderOnFail && script.placeholderPrefab) {
//                    // If you wanted to clear the slot on failure, set null here instead
//                    assignToModelSlot(script.placeholderPrefab);
//                }
//            });
//        } catch(e){ log("downloadAsset exception: " + e); }
//    }
//}
//
//script.createEvent("OnStartEvent").bind(onStart);
//
//// Optional: if the object is disabled at runtime, revert to placeholder
//script.createEvent("OnDisableEvent").bind(function(){
//    if (script.swapBackOnDisable && script.placeholderPrefab) {
//        assignToModelSlot(script.placeholderPrefab);
//    }
//});
//
///*
//How to make an EMPTY prefab in the editor (once, no code):
//1) In Objects, add an **Empty** SceneObject (right-click → Add Empty) and name it "HeadModel_Placeholder".
//   - (Optional) Add a single child so there is a transform to scale later; leave it empty.
//2) Right‑click that object → **Create Prefab**.
//3) In Assets, rename it to **EmptyHeadModel.prefab**.
//4) Drag this prefab into the **Empty/Placeholder Prefab** slot above.
//5) Drag your HeadMorph **ScriptComponent** into **HeadMorph Script Component**.
//6) Press play — the Model slot gets the placeholder immediately; if a Remote is set, it will swap in.
//*/