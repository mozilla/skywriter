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
var Rect = require('utils/rect');
var Event = require('events').Event;

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
 *
 * The canvas that is created is available in the domNode attribute and should
 * be added to the document by the caller.
 */
exports.CanvasView = function(container) {
    if (!container) {
        return;
    }

    this._invalidRects = [];
    this._frame = {
        x: 0,
        y: 0,
        width: 0,
        height: 0
    };

    this._clippingFrame = this._frame;

    var canvas = document.createElement("canvas");
    canvas.innerHTML = 'canvas tag not supported by your browser';
    canvas.setAttribute('style', 'position: absolute');
    container.appendChild(canvas);
    this.domNode = canvas;

    this.clipping = new Event();
    this.clipping.add(this.clippingFrameChanged.bind(this));
};

exports.CanvasView.prototype = {
    _canvasContext: null,
    domNode: null,
    _canvasId: null,
    _invalidRects: null,
    _lastRedrawTime: null,
    _redrawTimer: null,
    _clippingFrame: null,

    _frame: null,

    clippingChanged: null,

    get clippingFrame() {
        return this._clippingFrame;
    },

    set clippingFrame(clippingFrame) {
        clippingFrame = util.mixin(this._clippingFrame, clippingFrame);

        if (this._clippingFrame === null ||
                !Rect.rectsEqual(clippingFrame, this._clippingFrame)) {
            this._clippingFrame = clippingFrame;
            this.clippingChanged();
        }
    },

    setFrame: function(frame, preventDownsize) {
        var domStyle = this.domNode.style;
        domStyle.left = frame.x + 'px';
        domStyle.top = frame.y + 'px';

        var widthChanged, heightChanged;
        if (frame.width !== this._frame.width) {
            if (frame.width < this._frame.width) {
                if (!preventDownsize) {
                    widthChanged = true;
                }
            } else {
                widthChanged = true;
            }
        }
        if (frame.height !== this._frame.height) {
            if (frame.height < this._frame.height) {
                if (!preventDownsize) {
                    heightChanged = true;
                }
            } else {
                heightChanged = true;
            }
        }

        if (widthChanged) {
            this.domNode.width = frame.width;
        }
        if (heightChanged) {
            this.domNode.height = frame.height;
        }

        this._frame = frame;

        // The clipping frame might have changed if the size changed.
        this.clippingFrame = {
            width: frame.width,
            height: frame.height
        };
    },

    get frame() {
        return this._frame;
    },

    _getContext: function() {
        if (this._canvasContext === null) {
            this._canvasContext = this.domNode.getContext('2d');
        }
        return this._canvasContext;
    },

    computeWithClippingFrame: function(x, y) {
        var clippingFrame = this.clippingFrame;
        return {
            x: x + clippingFrame.x,
            y: y + clippingFrame.y
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
     * Subclasses can override this method to provide custom behavior whenever
     * the clipping frame changes. The default implementation simply
     * invalidates the entire visible area.
     */
    clippingFrameChanged: function() {
        this.setNeedsDisplay();
    },

    drawRect: function(rect, context) { },

    /**
     * Calls drawRect() on all the invalid rects to redraw the canvas contents.
     * Generally, you should not need to call this function unless you override
     * the default implementations of didCreateLayer() or render().
     *
     * @return True on a successful render, or false if the rendering wasn't
     *   done because the view wasn't visible.
     */
    redraw: function() {
        var clippingFrame = this.clippingFrame;
        clippingFrame = {
            x:      Math.round(clippingFrame.x),
            y:      Math.round(clippingFrame.y),
            width:  clippingFrame.width,
            height: clippingFrame.height
        };

        var context = this._getContext();
        context.save();
        context.translate(-clippingFrame.x, -clippingFrame.y);

        var invalidRects = this._invalidRects;
        if (invalidRects === 'all') {
            this.drawRect(clippingFrame, context);
        } else {
            Rect.merge(invalidRects).forEach(function(rect) {
                rect = Rect.intersectRects(rect, clippingFrame);
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

            }, this);
        }

        context.restore();

        this._invalidRects = [];
        this._redrawTimer = null;
        this._lastRedrawTime = new Date().getTime();
        return true;
    },

    render: function() {
         // Don't continue if there is a rendering or redraw timer already.
        if (this._renderTimer || this._redrawTimer) {
            return;
        }

        // Queue the redraw at the end of the current event queue to make sure
        // everyting is done when redrawing.
        this._renderTimer = setTimeout(this.tryRedraw.bind(this), 0);
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
            this.render();
        }
    },

    tryRedraw: function(context, firstTime) {
        this._renderTimer = null;

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

        // TODO This is not as good as SC.Timer... Will it work?
        this._redrawTimer = window.setTimeout(this.redraw.bind(this),
            minimumRedrawDelay);
    }
};

