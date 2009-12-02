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
    tagName: "canvas",

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

    renderLayout: function(context, firstTime) {
        sc_super();

        var layerFrame = this.get('layerFrame');
        if (firstTime) {
            context.attr('width', layerFrame.width);
            context.attr('height', layerFrame.height);
            return;
        }

        var canvas = this.$()[0];
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

    render: function(context, firstTime) {
        var layerFrame = this.get('layerFrame');

        if (firstTime) {
            // TODO: is this right?
            context.attr("width", "" + layerFrame.width);
            context.attr("height", "" + layerFrame.height);
            context.push("canvas tag not supported by your browser");
            return;
        }

        var visibleFrame = SC.cloneRect(this.get('clippingFrame'));
        visibleFrame.width = layerFrame.width;
        visibleFrame.height = layerFrame.height;

        var canvas = this.$()[0];
        var drawingContext = canvas.getContext('2d');

        drawingContext.save();

        var frame = this.get('frame');
        drawingContext.translate(frame.x - layerFrame.x,
            frame.y - layerFrame.y);

        this.drawRect(drawingContext, visibleFrame);

        drawingContext.restore();
    },

    /**
     * Returns the width of the character 'M' in the given font, or null if the
     * canvas hasn't been created yet. (It's unfortunate that you actually need
     * a canvas to measure text...)
     */
    getCharacterWidth: function(font) {
        var canvas = this.$()[0];
        if (SC.none(canvas)) {
            return null;
        }

        var context = canvas.getContext('2d');
        context.save();
        context.font = font;
        var width = context.measureText("M").width;
        context.restore();
        return width;
    },

    /**
     * Attempts to determine a reasonable line height for the given font and
     * returns it.
     */
    guessLineHeight: function(font) {
        var canvas = this.$()[0];
        if (SC.none(canvas)) {
            return null;    // don't even try
        }

        var context = canvas.getContext('2d');
        context.save();
        context.font = font;
        var height = Math.floor(context.measureText("m").width * 2.8);
        context.restore();
        return height;
    },

    _bespin_canvas_layerFrameDidChange: function() {
        this.updateLayout();
    }.observes('layerFrame')
};

