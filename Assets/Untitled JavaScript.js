//@input float speed = 0.06 {"label":"Speed (m/s)", "min":0, "max":0.5, "step":0.01}
//@input vec3 localDirection = {"x":0,"y":0,"z":1} {"label":"Local Dir (Z forward)"}

var tr = script.getTransform();
var dir;

function worldDirFromLocal(v){ return tr.getWorldRotation().multiplyVec3(v).normalize(); }

script.createEvent("OnStartEvent").bind(function () {
    dir = worldDirFromLocal(new vec3(script.localDirection.x, script.localDirection.y, script.localDirection.z));
});

script.createEvent("UpdateEvent").bind(function () {
    var dt = getDeltaTime();
    tr.setWorldPosition(tr.getWorldPosition().add(dir.uniformScale(script.speed * dt)));
});
