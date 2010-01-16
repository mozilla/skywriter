/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is
 * Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var SC = require('sproutcore/runtime').SC;
var Rect = require('utils/rect');

/**
 * @class
 *
 * This class provides support for manual scrolling and positioning for canvas-
 * based elements. Getting these elements to play nicely with SproutCore is
 * tricky and error-prone, so all canvas-based views should consider deriving
 * from this class. Derived views should implement drawRect() in order to
 * perform the appropriate canvas drawing logic.
 *
 * The actual size of the canvas is always the size of the container the canvas
 * view is placed in.
 */
exports.CanvasView = SC.View.extend({
    _canvasDom: null,
    _canvasId: null,
    _invalidRects: null,
    _lastRedrawTime: null,
    _previousClippingFrame: null,
    _redrawTimer: null,

    _clippingFrameChanged: function() {
        // False positives here are very common, so check to make sure before
        // we take the slow path.
        var previousClippingFrame = this._previousClippingFrame;
        var clippingFrame = this.get('clippingFrame');
        if (previousClippingFrame === null ||
                !SC.rectsEqual(clippingFrame, previousClippingFrame)) {
            this._previousClippingFrame = clippingFrame;
            this.setNeedsDisplay();
        }
    }.observes('clippingFrame'),

    _isVisibleInWindowChanged: function() {
        if (this.get('isVisibleInWindow')) {
            this.redraw();
        }
    }.observes('isVisibleInWindow'),

    _layoutChanged: function() {
        this._resizeToFit();
    }.observes('layout'),

    _parentViewFrameChanged: function() {
        this._resizeToFit();
    },

    _resizeToFit: function() {
        var parentFrame = this.getPath('parentView.frame');
        var frame = this.get('frame');
        var frameWidth = frame.width, frameHeight = frame.height;
        var parentWidth = parentFrame.width, parentHeight = parentFrame.height;
        if (frameWidth >= parentWidth && frameHeight >= parentHeight) {
            return;
        }

        this.set('layout', {
            left:   frame.x,
            top:    frame.y,
            width:  Math.max(frameWidth, parentWidth),
            height: Math.max(frameHeight, parentHeight)
        });
    },

    /**
     * @property{2DContext}
     *
     * Cache for the canvas' 2d context.
     */
    canvasContext2D: function() {
        return this.get('_canvasDom').getContext('2d')
    }.property('_canvasDom').cacheable(),

    layoutStyle: { left: "0px", top: "0px" },

    /**
     * @property{Number}
     *
     * The minimum delay between canvas redraws in milliseconds, equal to 1000
     * divided by the desired number of frames per second.
     */
    minimumRedrawDelay: 1000.0 / 30.0,

    init: function() {
        arguments.callee.base.apply(this, arguments);
        this._invalidRects = [];
        this.get('parentView').addObserver('frame', this,
            this._parentViewFrameChanged);
    },

    /**
     * Calls drawRect() on all the invalid rects to redraw the canvas contents.
     * Generally, you should not need to call this function unless you override
     * the default implementations of didCreateLayer() or render().
     *
     * @return True on a successful render, or false if the rendering wasn't
     *   done because the view wasn't visible.
     */
    redraw: function() {
        if (!this.get('isVisibleInWindow')) {
            return false;
        }

        var frame = this.get('frame');
        if (frame.x < 0) {
            this.computeFrameWithParentFrame(null);
        }

        var context = this.get('canvasContext2D');
        context.save();
        context.translate(frame.x, frame.y);

        var clippingFrame = this.get('clippingFrame');
        this._invalidRects.forEach(function(rect) {
            context.save();

            rect = SC.intersectRects(rect, clippingFrame);
            if (rect.width !== 0 && rect.height !== 0) {
                var x = rect.x, y = rect.y;
                var width = rect.width, height = rect.height;
                context.beginPath();
                context.moveTo(x, y);
                context.lineTo(x + width, y);
                context.lineTo(x + width, y + height);
                context.lineTo(x, y + height);
                context.closePath();
                context.clip();

                this.drawRect(rect, context);
            }

            context.restore();
        }, this);

        context.restore();

        this._invalidRects = [];
        this._lastRedrawTime = new Date().getTime();
        return true;
    },

    renderLayout: function(context, firstTime) {
        arguments.callee.base.apply(this, arguments);

        var parentFrame = this.getPath('parentView.frame');
        if (firstTime) {
            context.attr('width', parentFrame.width);
            context.attr('height', parentFrame.height);
            return;
        }

        var canvas = this._canvasDom;
        var widthChanged = canvas.width !== parentFrame.width;
        var heightChanged = canvas.height !== parentFrame.height;
        if (widthChanged) {
            canvas.width = parentFrame.width;
        }
        if (heightChanged) {
            canvas.height = parentFrame.height;
        }
        if (widthChanged || heightChanged) {
            this.setNeedsDisplay();
        }
    },

    /**
     * Subclasses should override this method to perform any drawing that they
     * need to.
     *
     * @param rect{Rect} The rectangle to draw in.
     * @param context{CanvasRenderingContext2D} The 2D graphics context, taken
     *   from the canvas.
     */
    drawRect: function(rect, context) {
        // empty
    },

    didCreateLayer: function() {
        arguments.callee.base.apply(this, arguments);
        this.set('_canvasDom', this.$("#" + this._canvasId)[0]);
    },

    render: function(context, firstTime) {
        arguments.callee.base.apply(this, arguments);

        if (firstTime) {
            var parentFrame = this.getPath('parentView.frame');
            var canvasContext = context.begin("canvas");
            this._canvasId = SC.guidFor(canvasContext);
            canvasContext.id(this._canvasId);
            canvasContext.attr("width", "" + parentFrame.width);
            canvasContext.attr("height", "" + parentFrame.height);
            canvasContext.push("canvas tag not supported by your browser");
            canvasContext.end();
            return;
        }

        // The render() method can actually get called multiple times during a
        // run loop, because other calls to render() can be queued after the
        // first render() runs. This workaround forces tryRedraw() to be called
        // only once per run loop.
        SC.RunLoop.currentRunLoop.invokeLast(this, this.tryRedraw);
    },

    /**
     * Invalidates the entire visible region of the canvas.
     */
    setNeedsDisplay: function(rect) {
        var frame = this.get('frame');
        this._invalidRects = [
            {
                x:      0,
                y:      0,
                width:  frame.width,
                height: frame.height
            }
        ];
        this.set('layerNeedsUpdate', true);
    },

    /**
     * Invalidates the given rect of the canvas, and schedules that portion of
     * the canvas to be redrawn at the end of the run loop.
     */
    setNeedsDisplayInRect: function(rect) {
        this._invalidRects = Rect.addRectToSet(this._invalidRects, rect);
        this.set('layerNeedsUpdate', true);
    },

    tryRedraw: function(context, firstTime) {
        var now = new Date().getTime();
        var lastRedrawTime = this._lastRedrawTime;
        var minimumRedrawDelay = this.get('minimumRedrawDelay');

        if (lastRedrawTime === null ||
                now - lastRedrawTime >= minimumRedrawDelay) {
            this.redraw();
            return;
        }

        var redrawTimer = this._redrawTimer;
        if (redrawTimer !== null && redrawTimer.get('isValid')) {
            return; // already scheduled
        }

        this._redrawTimer = SC.Timer.schedule({
            target:     this,
            action:     this.redraw,
            interval:   minimumRedrawDelay,
            repeats:    false
        });
    }
});

