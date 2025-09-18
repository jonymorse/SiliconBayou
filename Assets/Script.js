// DebugResponse.js
//@input bool useDebug = true

// fake state
global.mockState = {
  names: ["Pelican"],
  collected: { Pelican: true }
};

// Example debug "get_state"
global.debugGetState = function (cb) {
  if (script.useDebug) {
    cb(false, JSON.stringify(global.mockState));
  } else {
    // fall back to actual Remote API call
    var req = global.RemoteApiRequest.create();
    req.endpoint = "get_state";
    script.api.remoteService.performApiRequest(req, function(res) {
      cb(res.status !== 0, res.body);
    });
  }
};
