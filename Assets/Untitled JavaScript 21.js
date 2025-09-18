// RemoteTestSender.js
// @input Asset.RemoteServiceModule remote
// (optional) hook your real arrays later:
// @input SceneObject[] faceContent
// @input SceneObject[] worldContent

var SPEC_ID = "YOUR_API_SPEC_ID"; // paste from portal

function toHost(payloadObj) {
  var req = global.RemoteApiRequest.create();
  req.apiSpecId  = SPEC_ID;
  req.endpointId = "objects";       // the endpoint you created
  req.parameters = { payload: JSON.stringify(payloadObj) }; // strings only
  script.remote.performApiRequest(req, function (res) {
    print("Remote API status: " + res.statusCode); // expect 1
  });
}

// Minimal payload for smoke test
function buildTestPayload() {
  return {
    hello: "from lens",
    ts: Date.now(),
    face: (script.faceContent || []).map(function(so){ return so && so.name || ""; }),
    world: (script.worldContent|| []).map(function(so){ return so && so.name || ""; })
  };
}

// Send once when lens starts
var onStart = script.createEvent("OnStartEvent");
onStart.bind(function(){
  toHost(buildTestPayload());
});

// (optional) tap to send again
var tap = script.createEvent("TapEvent");
tap.bind(function(){
  toHost({ hello: "tap", ts: Date.now() });
});
