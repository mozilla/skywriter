/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

var SC = require('sproutcore/runtime').SC;

/**
 * @namespace
 *
 * This mixin provides support for manual scrolling and positioning for canvas-
 * based elements. Getting these elements to play nicely with SproutCore is
 * tricky and error-prone, so all canvas-based views should consider deriving
 * from this mixin. Derived views should implement drawRect() in order to
 * perform the appropriate canvas drawing logic, and may want to override the
 * viewport property to determine where the canvas should be placed (for
 * example, to fill the container view).
 */
exports.Canvas = {
    _bespin_canvas_lastRedrawTime: null,
    _bespin_canvas_redrawTimer: null,

    _bespin_canvas_frameChanged: function() {
        this.set('layerNeedsUpdate', true);
    }.observes('frame'),

    _bespin_canvas_isVisibleInWindowChanged: function() {
        // Redraw when we become visible. We must do this because we don't draw
        // when the layer is invisible (as it's impossible: the frame property
        // is bogus until the layer is visible in the window, and without that
        // property there's no way to set the canvas width and height
        // properly).
        this.updateLayout();
        this.redraw();
    }.observes('isVisibleInWindow'),

    _bespin_canvas_layerFrameDidChange: function() {
        this.updateLayout();
    }.observes('layerFrame'),

    /**
     * @property{Rect}
     *
     * Specifies the size and position of the canvas element. By default, this
     * property is bound to the frame property, but canvas views that want to
     * fill the boundaries of their parent views should override this property.
     */
    layerFrame: function() {
        return this.get('frame');
    }.property('frame').cacheable(),

    layoutStyle: function() {
        var layerFrame = this.get('layerFrame');
        return {
            left:   "%@px".fmt(layerFrame.x),
            top:    "%@px".fmt(layerFrame.y)
        };
    }.property('layerFrame').cacheable(),

    /**
     * @property{Number}
     *
     * The minimum delay between canvas redraws in milliseconds, equal to 1000
     * divided by the desired number of frames per second.
     */
    minimumRedrawDelay: 1000.0 / 30.0,

    renderLayout: function(context, firstTime) {
        this.sc_super();

        var layerFrame = this.get('layerFrame');
        if (firstTime) {
            context.attr('width', layerFrame.width);
            context.attr('height', layerFrame.height);
            return;
        }

        var canvas = this.$("canvas")[0];
        if (canvas.width !== layerFrame.width) {
            canvas.width = layerFrame.width;
        }
        if (canvas.height !== layerFrame.height) {
            canvas.height = layerFrame.height;
        }
    },

    /**
     * Subclasses should override this method to perform any drawing that they
     * need to.
     *
     * @param context{CanvasRenderingContext2D} The 2D graphics context, taken
     *      from the canvas.
     * @param visibleFrame{Rect} The rectangle that is currently visible, which
     *      is always at least as large as the layer frame.
     */
    drawRect: function(context, visibleFrame) {
        // empty
    },

    /**
     * Computes the visible frame and calls drawRect() to redraw the canvas
     * contents. Generally, you should not need to call this function unless
     * you override the default implementations of didCreateLayer() or
     * render().
     *
     * @return True on a successful render, or false if the rendering wasn't
     *     done because the view wasn't visible.
     */
    redraw: function() {
        if (!this.get('isVisibleInWindow')) {
            return false;
        }

        var layerFrame = this.get('layerFrame');
        var visibleFrame = SC.cloneRect(this.get('clippingFrame'));
        visibleFrame.width = layerFrame.width;
        visibleFrame.height = layerFrame.height;

        var canvas = this.$("canvas")[0];
        var context = canvas.getContext('2d');

        context.save();
        var frame = this.get('frame');
        if (frame.x < 0) {
            this.computeFrameWithParentFrame(null);
        }
        context.translate(frame.x - layerFrame.x, frame.y - layerFrame.y);
        this.drawRect(context, visibleFrame);
        context.restore();

        this._bespin_canvas_lastRedrawTime = new Date().getTime();

        return true;
    },

    render: function(context, firstTime) {
        if (firstTime) {
            var layerFrame = this.get('layerFrame');
            var canvasContext = context.begin("canvas"); 
            canvasContext.attr("width", "" + layerFrame.width);
            canvasContext.attr("height", "" + layerFrame.height);
            canvasContext.push("canvas tag not supported by your browser");
            canvasContext.end();
            return;
        }

        this.tryRedraw();
    },

    tryRedraw: function(context, firstTime) {
        var now = new Date().getTime();
        var lastRedrawTime = this._bespin_canvas_lastRedrawTime;
        var minimumRedrawDelay = this.get('minimumRedrawDelay');

        if (lastRedrawTime === null ||
                now - lastRedrawTime >= minimumRedrawDelay) {
            this.redraw();
            return;
        }

        var redrawTimer = this._bespin_canvas_redrawTimer;
        if (redrawTimer !== null && redrawTimer.get('isValid')) {
            return; // already scheduled
        }

        this._bespin_canvas_redrawTimer = SC.Timer.schedule({
            target:     this,
            action:     this.redraw,
            interval:   minimumRedrawDelay,
            repeats:    false
        });
    }
};

