/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an 'AS IS' basis,
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


var util = require('bespin:util/util');
var ViewClass = require('views/view').View;

exports.CanvasView = function(node) {
    console.log('construct me!');

    // Call the ViewClass constructor to init it.
    ViewClass.call(this, node);

    this._cvInvalidRects = [];
    this.dimensionEvent.add(this.viewDimensionChanged);
};
exports.CanvasView.prototype = new ViewClass();

util.mixin(exports.CanvasView.prototype, {

    _scrollView: null,

    _canvasDOM: null,
    _canvasContext: null,
    _invalidRects: null,
    _lastRedrawTime: null,
    _previousClippingFrame: null,
    _redrawTimer: null,
    _renderTimer: null,

    _getContext: function() {
        if (this._canvasContext === null) {
            this._canvasContext = this._canvasDOM.getContext('2d');
        }
        return this._canvasContext;
    },

    /**
     * Returns the clipping frame to use. This can be either the clipping frame
     * of ths ScrollView, *if* the canvas is inside of one, or just the dimension
     * of the CanvasView itself.
     */
    _getClippingFrame: function() {
        if (this._scrollView) {
            return this.scrollView.clippingFrame;
        } else {
            var dim = this.dimension;

            return {
                x: 0,
                y: 0,
                width: dim.width,
                height: dim.height
            }
        }
    },

    _clippingFrameChanged: function() {
        var canvas = this.canvasDom;
        if (util.none(canvas)) {
            return;
        }

        var clippingFrame = this._getClippingFrame();

        // Do we need this anymore? JV 05052010
        // this.notifyDelegates('canvasViewClippingFrameChanged');

        var widthChanged = canvas.width < clippingFrame.width;
        var heightChanged = canvas.height < clippingFrame.height;

        if (widthChanged) {
            canvas.width = clippingFrame.width;
        }

        if (heightChanged) {
            canvas.height = clippingFrame.height;
        }

        if (widthChanged || heightChanged) {
            this.setNeedsDisplay();
        }
    },

    /**
     * @property{Number}
     *
     * The minimum delay between canvas redraws in milliseconds, equal to 1000
     * divided by the desired number of frames per second.
     */
    minimumRedrawDelay: 1000.0 / 30.0,

    /**
     * Subclasses have to override this method to perform any drawing that they
     * need to.
     *
     * @param rect{Rect} The rectangle to draw in.
     * @param context{CanvasRenderingContext2D} The 2D graphics context, taken
     *   from the canvas.
     */
    drawRect: function(rect) { },

    /**
     * Calls drawRect() on all the invalid rects to redraw the canvas contents.
     * Generally, you should not need to call this function unless you override
     * the default implementations of didCreateLayer() or render().
     *
     * @return True on a successful render, or false if the rendering wasn't
     *   done because the view wasn't visible.
     */
    redraw: function() {
        var clippingFrame = this._getClippingFrame();
        clippingFrame = {
            x:      Math.round(clippingFrame.x),
            y:      Math.round(clippingFrame.y),
            width:  clippingFrame.width,
            height: clippingFrame.height
        };

        var context = this._getContext();
        context.save();
        context.translate(clippingFrame.x, clippingFrame.y);

        var invalidRects = this._invalidRects;
        if (invalidRects === 'all') {
            this.drawRect(clippingFrame, context);
        } else {
            var rect;
            var invalidRects = Rect.merge(invalidRects);
            var i = invalidRects.length;

            while (i--) {
                rect = Rect.intersectRects(invalidRects[i], clippingFrame);
                if (rect.width !== 0 && rect.height !== 0) {
                    context.save();

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

                    context.restore();
                }
            }
        }

        context.restore();

        this._invalidRects = [];
        this._lastRedrawTime = new Date().getTime();
        return true;
    },

    render: function(firstTime) {
        if (firstTime) {
            var cNode = document.createElement('canvas');
            // this._cvCanvasId = SC.guidFor(canvasContext);
            // canvasContext.id(this._cvCanvasId);
            cNode.setAttribute('style', 'position: absolute; left:0; top:0;');
            this._canvasDom = cNode;

            this.node.appendChild(cNode);
            return;
        }

        // Don't continue if there is a rendering or redraw timer already.
        if (this._renderTimer || this._redrawTimer) {
            return;
        }

        var self = this;

        // Queue the redraw at the end of the current event queue to make sure
        // everyting is done when redrawing.
        this._renderTimer = setTimeout(function() {
            self.tryRedraw();
            self._renderTimer = null;
        }, 0);
    },

    /**
     * Invalidates the entire visible region of the canvas.
     */
    setNeedsDisplay: function(rect) {
        this._invalidRects = 'all';
        this.render();
    },

    /**
     * Invalidates the given rect of the canvas, and schedules that portion of
     * the canvas to be redrawn at the end of the run loop.
     */
    setNeedsDisplayInRect: function(rect) {
        var invalidRects = this._invalidRects;
        if (invalidRects !== 'all') {
            invalidRects.push(rect);
        }

        this.render();
    },

    tryRedraw: function() {
        var now = new Date().getTime();
        var lastRedrawTime = this._lastRedrawTime;
        var minimumRedrawDelay = this.minimumRedrawDelay;

        if (lastRedrawTime === null ||
                now - lastRedrawTime >= minimumRedrawDelay) {
            this.redraw();
            return;
        }

        var redrawTimer = this._redrawTimer;
        if (redrawTimer !== null) {
            return; // already scheduled
        }

        var self = this;
        this._redrawTimer = setTimeout(function() {
            self._redrawTimer = null;
            self.redraw();
        }, minimumRedrawDelay);
    },

    scrollViewClippingFrameChanged: function() {
        this._clippingFrameChanged();
    },

    viewDimensionChanged: function() {
        // Don't catch this if we are inside of a ScrollView.
        if (this._scrollView === null) {
            this._clippingFrameChanged();
        }
    },

    set scrollView(scrollView) {
        this._scrollView = scrollView;

        scrollView.clippingEvent.add(this.scrollViewClippingFrameChanged);

    }
});
