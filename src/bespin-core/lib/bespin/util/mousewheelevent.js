/*
 * Orginal: http://adomas.org/javascript-mouse-wheel/
 *
 * Tweaked to map everything to Mozilla's event.detail result
 */

SC.mixin(exports, {
    wheel: function(event) {
        var delta = 0;
        if (!event) {
            event = window.event;
        }
        if (event.wheelDelta) {
            delta = -event.wheelDelta / 40;
            if (window.opera && window.opera.version() < 9.2) {
                delta = -delta;
            }
        } else if (event.detail) {
            delta = event.detail;
        }

        return delta;
    },

    axis: function(event) {
        var returnType = "vertical";
        if (event.axis) { // Firefox 3.1 world
            if (event.axis == event.HORIZONTAL_AXIS) {
                returnType = "horizontal";
            }
        } else if (event.wheelDeltaY || event.wheelDeltaX) {
            if (event.wheelDeltaX == event.wheelDelta) {
                returnType = "horizontal";
            }
        } else if (event.shiftKey) {
            returnType = "horizontal";
        }
        return returnType;
    }
});
