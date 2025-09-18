// CarouselTapLogger.js
// Prints a message whenever the user taps the assigned tap area.

//@input Component.TouchComponent tapArea {"label":"Tap Area (on the carousel root)"}
//@input Component.ScriptComponent imageCarousel {"label":"(Optional) Image Carousel ScriptComponent"}

function onTap(/*event*/) {
    var idx = -1;

    // If you wired the carousel, try to read the current index; otherwise just print a generic message
    try {
        if (script.imageCarousel && script.imageCarousel.api && script.imageCarousel.api.getSelectedIndex) {
            idx = script.imageCarousel.api.getSelectedIndex();
        }
    } catch (e) {}

    if (idx >= 0) {
        print("[CarouselTapLogger] Tap detected. Current index: " + idx);
    } else {
        print("[CarouselTapLogger] Tap detected.");
    }
}

// Preferred: TouchComponent callback (scoped to the tapArea)
if (script.tapArea && script.tapArea.addTapCallback) {
    script.tapArea.addTapCallback(onTap);
    print("[CarouselTapLogger] Ready (TouchComponent bound).");
} else {
    // Fallback: global TapEvent (fires anywhere; you may want to add a TouchComponent to scope it)
    var tapEvt = script.createEvent("TapEvent");
    tapEvt.bind(onTap);
    print("[CarouselTapLogger] Ready (global TapEvent fallback).");
}
