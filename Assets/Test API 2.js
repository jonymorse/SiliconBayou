// @input Asset.RemoteServiceModule remoteServiceModule
// @input float pollSeconds = 5.0 {"label":"Poll Interval (sec)"}
// @input Component.Text outputText {"hint":"Screen Text component to display ping output"}

// Import the generated wrapper (do NOT edit the module file)
const Module = require("./Test API Module");
const api = new Module.ApiModule(script.remoteServiceModule);

function setText(s) {
    if (script.outputText && script.outputText.text !== undefined) {
        script.outputText.text = s;
    }
    print(s);
}

function callPing(tag) {
    const prefix = tag ? "[" + tag + "] " : "";
    setText(prefix + "ping…");
    return api.ping()
        .then((res) => {
            const bodyStr = res.bodyAsString();
            let msg = prefix + "OK (status=" + res.statusCode + ")\n" + bodyStr;
            // Try pretty JSON (optional)
            try { msg = prefix + "OK\n" + JSON.stringify(res.bodyAsJson(), null, 2); } catch (e) {}
            setText(msg);
        })
        .catch((e) => {
            setText(prefix + "ERR: " + e);
        });
}

script.createEvent("OnStartEvent").bind(function () {
    setText("Test API started.\nSpec set: " + !!script.remoteServiceModule);
    if (script.remoteServiceModule) {
        setText("API Spec ID:\n" + script.remoteServiceModule.apiSpecId);
    }

    // immediate ping
    callPing("startup");

    // poll every N seconds
    var alive = true;
    const timer = script.createEvent("DelayedCallbackEvent");
    timer.bind(function () {
        if (!alive) return;
        callPing("poll");
        timer.reset(script.pollSeconds);
    });
    timer.reset(script.pollSeconds);

    script.createEvent("OnDestroyEvent").bind(function () { alive = false; });
});
