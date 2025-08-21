//@input SceneObject gator               {"label":"(Optional) Gator (else use this object)"}
//@input Component.DeviceTracking deviceTracking {"label":"(Optional) DeviceTracking (for world mesh)"}
//@input float moveSpeed = 0.08          {"label":"Speed (m/s)", "min":0, "max":2, "step":0.01}
//@input float lookAhead = 0.6           {"label":"Look Ahead (m)", "min":0.1, "max":3, "step":0.05}
//@input float turnMin = 60              {"label":"Turn Min (deg)", "min":10, "max":180}
//@input float turnMax = 120             {"label":"Turn Max (deg)", "min":10, "max":180}
//@input float turnTime = 0.25           {"label":"Turn Duration (s)", "min":0, "max":1, "step":0.01}
//@input bool  lockY = true              {"label":"Lock Height"}
//@input bool  enableLogging = false     {"label":"Log Hits"}

// --- Internals
var tr = (script.gator ? script.gator : script.getSceneObject()).getTransform();
var startY, turning=false, tElapsed=0, startRot, targetRot;

// Physics probe for virtual objects (colliders)
var rootProbe = Physics.createRootProbe(); // rayCast/sphereCast through scene worlds. :contentReference[oaicite:1]{index=1}

function worldForward() {
    return tr.getWorldRotation().multiplyVec3(new vec3(0,0,1)).normalize();
}

function beginYawTurn(deg) {
    turning = true; tElapsed = 0;
    startRot = tr.getLocalRotation();
    var yaw = quat.angleAxis(deg, vec3.up());
    targetRot = yaw.multiply(startRot);
    if (script.enableLogging) print("Turning " + deg.toFixed(0) + "°");
}

function updateTurn(dt) {
    if (!turning) return false;
    if (script.turnTime <= 0) { tr.setLocalRotation(targetRot); turning=false; return false; }
    tElapsed += dt;
    var k = Math.min(tElapsed / script.turnTime, 1.0);
    tr.setLocalRotation(quat.slerp(startRot, targetRot, k));
    if (k >= 1.0) turning = false;
    return turning;
}

function randomTurnAngle() {
    var a = script.turnMin + Math.random() * (script.turnMax - script.turnMin);
    return (Math.random() < 0.5 ? -a : a);
}

function checkWorldMeshHit(pos, ahead) {
    // Requires scene reconstruction / world mesh support. :contentReference[oaicite:2]{index=2}
    if (!script.deviceTracking) return false;
    var caps = script.deviceTracking.worldTrackingCapabilities;
    if (!caps || !caps.sceneReconstructionSupported) return false;

    var hits = script.deviceTracking.raycastWorldMesh(pos, ahead); // returns TrackedMeshHitTestResult[] :contentReference[oaicite:3]{index=3}
    if (hits && hits.length > 0) {
        if (script.enableLogging) print("WorldMesh hit @ " + hits[0].position.toString());
        return true;
    }
    return false;
}

function checkSceneColliderHit(pos, ahead) {
    var hitFound = false;
    rootProbe.rayCast(pos, ahead, function(hit) {
        if (hit && hit.collider) {
            // Ignore self
            var so = hit.collider.getSceneObject();
            if (!so.isSame(tr.getSceneObject())) {
                hitFound = true;
                if (script.enableLogging) print("Collider hit: " + so.name);
            }
        }
    });
    return hitFound;
}

script.createEvent("OnStartEvent").bind(function () {
    startY = tr.getWorldPosition().y;
});

script.createEvent("UpdateEvent").bind(function () {
    var dt  = getDeltaTime();
    var pos = tr.getWorldPosition();

    // 1) Turn interpolation if in progress
    var stillTurning = updateTurn(dt);

    // 2) Predictive raycast ahead (only if not currently turning)
    if (!stillTurning) {
        var fwd   = worldForward();
        var ahead = pos.add(fwd.uniformScale(script.lookAhead));

        var hit = false;
        // Prefer real-world mesh when available; else check virtual colliders
        if (checkWorldMeshHit(pos, ahead)) {
            hit = true;
        } else if (checkSceneColliderHit(pos, ahead)) {
            hit = true;
        }

        if (hit) {
            // Pick a random yaw within [turnMin, turnMax] and start turning
            beginYawTurn(randomTurnAngle());
        }
    }

    // 3) Move forward (glide)
    var moveDir = worldForward();
    pos = pos.add(moveDir.uniformScale(script.moveSpeed * dt));
    if (script.lockY) pos.y = startY;
    tr.setWorldPosition(pos);
});
