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
var CanvasView = require('views/canvas').CanvasView;

var LINE_HEIGHT                 = 15;
var MINIMUM_HANDLE_SIZE         = 20;
var NIB_ARROW_PADDING_BEFORE    = 3;
var NIB_ARROW_PADDING_AFTER     = 5;
var NIB_LENGTH                  = 15;
var NIB_PADDING                 = 8;    // 15/2

// The fancy custom Bespin scroll bars.
var ScrollerCanvasView = CanvasView.extend({
    classNames: ['bespin-scroller-view'],

    _mouseDownScreenPoint: null,
    _mouseDownValue: null,
    _isMouseOver: false,

    // TODO: Make this a real SproutCore theme (i.e. an identifier that gets
    // prepended to CSS properties), perhaps?
    theme: {
        backgroundStyle: "#2A211C",
        partialNibStyle: "rgba(100, 100, 100, 0.3)",
        partialNibArrowStyle: "rgba(255, 255, 255, 0.3)",
        partialNibStrokeStyle: "rgba(150, 150, 150, 0.3)",
        fullNibStyle: "rgb(100, 100, 100)",
        fullNibArrowStyle: "rgb(255, 255, 255)",
        fullNibStrokeStyle: "rgb(150, 150, 150)",
        scrollTrackFillStyle: "rgba(50, 50, 50, 0.8)",
        scrollTrackStrokeStyle: "rgb(150, 150, 150)",
        scrollBarFillStyle: "rgba(0, 0, 0, %a)",
        scrollBarFillGradientTopStart: "rgba(90, 90, 90, %a)",
        scrollBarFillGradientTopStop: "rgba(40, 40, 40, %a)",
        scrollBarFillGradientBottomStart: "rgba(22, 22, 22, %a)",
        scrollBarFillGradientBottomStop: "rgba(44, 44, 44, %a)"
    },

    _drawNib: function(ctx) {
        var theme = this.get('theme');
        var fillStyle, arrowStyle, strokeStyle;
        if (this._isMouseOver) {
            fillStyle   = theme.fullNibStyle;
            arrowStyle  = theme.fullNibArrowStyle;
            strokeStyle = theme.fullNibStrokeStyle;
        } else {
            fillStyle   = theme.partialNibStyle;
            arrowStyle  = theme.partialNibArrowStyle;
            strokeStyle = theme.partialNibStrokeStyle;
        }

        var midpoint = Math.floor(NIB_LENGTH / 2);

        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.arc(0, 0, Math.floor(NIB_LENGTH / 2), 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = strokeStyle;
        ctx.stroke();

        ctx.fillStyle = arrowStyle;
        ctx.beginPath();
        ctx.moveTo(0, -midpoint + NIB_ARROW_PADDING_BEFORE);
        ctx.lineTo(-midpoint + NIB_ARROW_PADDING_BEFORE,
            midpoint - NIB_ARROW_PADDING_AFTER);
        ctx.lineTo(midpoint - NIB_ARROW_PADDING_BEFORE,
            midpoint - NIB_ARROW_PADDING_AFTER);
        ctx.closePath();
        ctx.fill();
    },

    _drawNibs: function(ctx) {
        var isMouseOver = this._isMouseOver;
        var thickness = this._getClientThickness();
        var value = this.getPath('parentView.value');

        // Starting nib
        if (isMouseOver || value !== 0) {
            ctx.save();
            ctx.translate(NIB_PADDING, thickness / 2);
            ctx.rotate(Math.PI * 1.5);
            ctx.moveTo(0, 0);
            this._drawNib(ctx);
            ctx.restore();
        }

        // Ending nib
        if (isMouseOver || value !== this.getMaximumValue()) {
            ctx.save();
            ctx.translate(this._getClientLength() - NIB_PADDING,
                thickness / 2);
            ctx.rotate(Math.PI * 0.5);
            ctx.moveTo(0, 0);
            this._drawNib(ctx);
            ctx.restore();
        }
    },

    // Returns the frame of the scroll bar, not counting any padding.
    _getClientFrame: function() {
        var frame = this.get('frame');
        var padding = this.getPath('parentView.padding');
        return {
            x:      padding.left,
            y:      padding.top,
            width:  frame.width - (padding.left + padding.right),
            height: frame.height - (padding.top + padding.bottom)
        };
    },

    // Returns the length of the scroll bar, not counting any padding. Equal to
    // the width or height of the client frame, depending on the layout
    // direction.
    _getClientLength: function() {
        var clientFrame = this._getClientFrame();
        switch (this.getPath('parentView.layoutDirection')) {
        case SC.LAYOUT_HORIZONTAL:
            return clientFrame.width;
        case SC.LAYOUT_VERTICAL:
            return clientFrame.height;
        default:
            console.assert(false, "unknown layout direction");
            return null;
        }
    },

    // Returns the thickness of the scroll bar, not counting any padding.
    _getClientThickness: function() {
        var parentView = this.get('parentView');
        var padding = parentView.get('padding');
        var scrollerThickness = parentView.get('scrollerThickness');

        switch (parentView.get('layoutDirection')) {
        case SC.LAYOUT_VERTICAL:
            return scrollerThickness - (padding.left + padding.right);
        case SC.LAYOUT_HORIZONTAL:
            return scrollerThickness - (padding.top + padding.bottom);
        default:
            console.assert(false, "unknown layout direction");
            return null;
        }
    }.property(),

    // The length of the scroll bar, counting the padding. Equal to frame.width
    // or frame.height, depending on the layout direction of the bar.
    // Read-only.
    _getFrameLength: function() {
        var frame = this.get('frame');
        switch (this.getPath('parentView.layoutDirection')) {
        case SC.LAYOUT_HORIZONTAL:
            return frame.width;
        case SC.LAYOUT_VERTICAL:
            return frame.height;
        default:
            console.assert(false, "unknown layout direction");
            return null;
        }
    },

    // The dimensions of the gutter (the middle area between the buttons, which
    // contains the handle or knob).
    _getGutterFrame: function() {
        var clientFrame = this._getClientFrame();
        var thickness = this._getClientThickness();
        switch (this.getPath('parentView.layoutDirection')) {
        case SC.LAYOUT_VERTICAL:
            return {
                x:      clientFrame.x,
                y:      clientFrame.y + NIB_LENGTH,
                width:  thickness,
                height: Math.max(0, clientFrame.height - 2*NIB_LENGTH)
            };
        case SC.LAYOUT_HORIZONTAL:
            return {
                x:      clientFrame.x + NIB_LENGTH,
                y:      clientFrame.y,
                width:  Math.max(0, clientFrame.width - 2*NIB_LENGTH),
                height: thickness
            };
        default:
            console.assert(false, "unknown layout direction");
            return null;
        }
    },

    // The length of the gutter, equal to gutterFrame.width or
    // gutterFrame.height depending on the scroll bar's layout direction.
    _getGutterLength: function() {
        var gutterFrame = this._getGutterFrame();
        var gutterLength;
        switch (this.getPath('parentView.layoutDirection')) {
        case SC.LAYOUT_HORIZONTAL:
            gutterLength = gutterFrame.width;
            break;
        case SC.LAYOUT_VERTICAL:
            gutterLength = gutterFrame.height;
            break;
        default:
            console.assert(false, "unknown layout direction");
            break;
        }
        return gutterLength;
    },

    // Returns the dimensions of the handle or knob.
    _getHandleFrame: function() {
        var parentView = this.get('parentView');
        var value = parentView.get('value');
        var maximum = parentView.get('maximum');
        var frame = this.get('frame');
        var clientFrame = this._getClientFrame();
        var gutterFrame = this._getGutterFrame();
        var clientThickness = this._getClientThickness();

        switch (parentView.get('layoutDirection')) {
        case SC.LAYOUT_VERTICAL:
            return {
                x:      clientFrame.x,
                y:      clientFrame.y + NIB_LENGTH +
                        value * gutterFrame.height / maximum,
                width:  clientThickness,
                height: Math.min(frame.height, maximum) * gutterFrame.height /
                        maximum
            };
        case SC.LAYOUT_HORIZONTAL:
            return {
                x:      clientFrame.x + NIB_LENGTH +
                        value * gutterFrame.width / maximum,
                y:      clientFrame.y,
                width:  Math.min(frame.width, maximum) * gutterFrame.width /
                        maximum,
                height: clientThickness
            };
        default:
            console.assert(false, "unknown layout direction");
            return null;
        }
    },

    _segmentForMouseEvent: function(evt) {
        var point = this.convertFrameFromView({ x: evt.pageX, y: evt.pageY });
        var clientFrame = this._getClientFrame();

        if (!SC.pointInRect(point, clientFrame)) {
            return null;
        }

        var layoutDirection = this.getPath('parentView.layoutDirection');
        switch (layoutDirection) {
        case SC.LAYOUT_HORIZONTAL:
            if (point.x < NIB_LENGTH) {
                return 'nib-start';
            } else if (point.x >= clientFrame.width - NIB_LENGTH) {
                return 'nib-end';
            }
            break;
        case SC.LAYOUT_VERTICAL:
            if (point.y < NIB_LENGTH) {
                return 'nib-start';
            } else if (point.y >= clientFrame.height - NIB_LENGTH) {
                return 'nib-end';
            }
            break;
        default:
            console.assert(false, "unknown layout direction");
            break;
        }

        var handleFrame = this._getHandleFrame();
        if (SC.pointInRect(point, handleFrame)) {
            return 'handle';
        }

        switch (layoutDirection) {
        case SC.LAYOUT_HORIZONTAL:
            if (point.x < handleFrame.x) {
                return 'gutter-before';
            } else if (point.x >= handleFrame.x + handleFrame.width) {
                return 'gutter-after';
            }
            break;
        case SC.LAYOUT_VERTICAL:
            if (point.y < handleFrame.y) {
                return 'gutter-before';
            } else if (point.y >= handleFrame.y + handleFrame.height) {
                return 'gutter-after';
            }
            break;
        default:
            console.assert(false, "unknown layout direction");
            break;
        }

        console.assert(false, "_segmentForMouseEvent: point ", point,
            " outside view with handle frame ", handleFrame,
            " and client frame ", clientFrame);
        return null;
    },

    /**
     * Adjusts the canvas view's frame to match the parent container's frame.
     */
    adjustFrame: function() {
        var parentFrame = this.getPath('parentView.frame');
        this.set('layout', {
            left:   0,
            top:    0,
            width:  parentFrame.width,
            height: parentFrame.height
        });
    },

    drawRect: function(rect, ctx) {
        var alpha = (ctx.globalAlpha) ? ctx.globalAlpha : 1;
        var theme = this.get('theme');

        var frame = this.get('frame');
        ctx.clearRect(0, 0, frame.width, frame.height);

        // Begin master drawing context
        ctx.save();

        // Translate so that we're only drawing in the padding.
        var parentView = this.get('parentView');
        var padding = parentView.get('padding');
        ctx.translate(padding.left, padding.top);

        var handleFrame = this._getHandleFrame();
        var gutterLength = this._getGutterLength();
        var thickness = this._getClientThickness();
        var halfThickness = thickness / 2;

        var layoutDirection = parentView.get('layoutDirection');
        var handleDistance, handleLength;
        switch (layoutDirection) {
        case SC.LAYOUT_VERTICAL:
            handleDistance = handleFrame.y - padding.top;
            handleLength = handleFrame.height;

            // The rest of the drawing code assumes the scroll bar is
            // horizontal. Create that fiction by installing a 90 degree
            // rotation.
            ctx.translate(thickness + 1, 0);
            ctx.rotate(Math.PI * 0.5);
            break;

        case SC.LAYOUT_HORIZONTAL:
            handleDistance = handleFrame.x - padding.left;
            handleLength = handleFrame.width;
            break;

        default:
            console.assert(false, "unknown layout direction");
            break;
        }

        if (gutterLength <= handleLength) {
            return; // Don't display the scroll bar.
        }

        if (this._isMouseOver === false) {
            ctx.globalAlpha = 0.3;
        } else {
            // Draw the scroll track rectangle.
            var clientLength = this._getClientLength();
            ctx.fillStyle = theme.scrollTrackFillStyle;
            ctx.fillRect(NIB_PADDING + 0.5, 0.5,
                clientLength - 2*NIB_PADDING, thickness - 1);
            ctx.strokeStyle = theme.scrollTrackStrokeStyle;
            ctx.strokeRect(NIB_PADDING + 0.5, 0.5,
                clientLength - 2*NIB_PADDING, thickness - 1);
        }

        var buildHandlePath = function() {
            ctx.beginPath();
            ctx.arc(handleDistance + halfThickness + 0.5,                // x
                halfThickness,                                     // y
                halfThickness - 0.5, Math.PI / 2, 3 * Math.PI / 2, false);
            ctx.arc(handleDistance + handleLength - halfThickness - 0.5, // x
                halfThickness,                                     // y
                halfThickness - 0.5, 3 * Math.PI / 2, Math.PI / 2, false);
            ctx.lineTo(handleDistance + halfThickness + 0.5, thickness - 0.5);
            ctx.closePath();
        };
        buildHandlePath();

        // Paint the interior of the handle path.
        var gradient = ctx.createLinearGradient(handleDistance, 0,
            handleDistance, thickness);
        gradient.addColorStop(0,
            theme.scrollBarFillGradientTopStart.replace(/%a/, alpha));
        gradient.addColorStop(0.4,
            theme.scrollBarFillGradientTopStop.replace(/%a/, alpha));
        gradient.addColorStop(0.41,
            theme.scrollBarFillStyle.replace(/%a/, alpha));
        gradient.addColorStop(0.8,
            theme.scrollBarFillGradientBottomStart.replace(/%a/, alpha));
        gradient.addColorStop(1,
            theme.scrollBarFillGradientBottomStop.replace(/%a/, alpha));
        ctx.fillStyle = gradient;
        ctx.fill();

        // Begin handle shine edge context
        ctx.save();
        ctx.clip();

        // Draw the little shines in the handle.
        ctx.fillStyle = theme.scrollBarFillStyle.replace(/%a/, alpha);
        ctx.beginPath();
        ctx.moveTo(handleDistance + halfThickness * 0.4, halfThickness * 0.6);
        ctx.lineTo(handleDistance + halfThickness * 0.9, thickness * 0.4);
        ctx.lineTo(handleDistance, thickness * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(handleDistance + handleLength - (halfThickness * 0.4),
            0 + (halfThickness * 0.6));
        ctx.lineTo(handleDistance + handleLength - (halfThickness * 0.9),
            0 + (thickness * 0.4));
        ctx.lineTo(handleDistance + handleLength, 0 + (thickness * 0.4));
        ctx.closePath();
        ctx.fill();

        ctx.restore();
        // End handle border context

        // Begin handle outline context
        ctx.save();
        buildHandlePath();
        ctx.strokeStyle = theme.scrollTrackStrokeStyle;
        ctx.stroke();
        ctx.restore();
        // End handle outline context

        if (this._isMouseOver === false) {
            ctx.globalAlpha = 1.0;
        }

        this._drawNibs(ctx);

        ctx.restore();
        // End master drawing context
    },

    /**
     * Returns the actual maximum value, which will be less than the maximum
     * due to accounting for the frame length.
     */
    getMaximumValue: function() {
        return Math.max(this.getPath('parentView.maximum') -
            this._getFrameLength(), 0);
    },

    mouseDown: function(evt) {
        var parentView = this.get('parentView');
        var value = parentView.get('value');
        var gutterLength = this._getGutterLength();

        switch (this._segmentForMouseEvent(evt)) {
        case 'nib-start':
            parentView.set('value', value - this.get('lineHeight'));
            break;
        case 'nib-end':
            parentView.set('value', value + this.get('lineHeight'));
            break;
        case 'gutter-before':
            parentView.set('value', value - gutterLength);
            break;
        case 'gutter-after':
            parentView.set('value', value + gutterLength);
            break;
        case 'handle':
            switch (parentView.get('layoutDirection')) {
            case SC.LAYOUT_HORIZONTAL:
                this._mouseDownScreenPoint = evt.clientX;
                break;
            case SC.LAYOUT_VERTICAL:
                this._mouseDownScreenPoint = evt.clientY;
                break;
            default:
                console.assert(false, "unknown layout direction");
                break;
            }
        default:
            console.assert("_segmentForMouseEvent returned an unknown value");
            break;
        }
    },

    mouseDragged: function(evt) {
        var parentView = this.get('parentView');

        var eventDistance;
        switch (parentView.get('layoutDirection')) {
        case SC.LAYOUT_HORIZONTAL:
            eventDistance = evt.clientX;
            break;
        case SC.LAYOUT_VERTICAL:
            eventDistance = evt.clientY;
            break;
        default:
            console.assert(false, "unknown layout direction");
            break;
        }

        var eventDelta = eventDistance - this._mouseDownScreenPoint;

        var maximum = parentView.get('maximum');
        var gutterLength = this._getGutterLength();

        var oldValue = parentView.get('value');
        parentView.set('value', oldValue + eventDelta * maximum /
            gutterLength);

        // If we didn't actually move, don't update the reference point.
        if (parentView.get('value') !== oldValue) {
            this._mouseDownScreenPoint = eventDistance;
        }
    },

    mouseEntered: function(evt) {
        this._isMouseOver = true;
        this.setNeedsDisplay();
    },

    mouseExited: function(evt) {
        this._isMouseOver = false;
        this.setNeedsDisplay();
    },

    mouseUp: function(evt) {
        this._mouseDownScreenPoint = null;
        this._mouseDownValue = null;
    },

    mouseWheel: function(evt) {
        var parentView = this.get('parentView');

        var delta;
        switch (parentView.get('layoutDirection')) {
        case SC.LAYOUT_HORIZONTAL:
            delta = evt.wheelDeltaX;
            break;
        case SC.LAYOUT_VERTICAL:
            delta = evt.wheelDeltaY;
            break;
        default:
            console.assert(false, "unknown layout direction");
            return;
        }

        parentView.set('value', parentView.get('value') + 2*delta);
    }
});

/**
 * @class
 *
 * A canvas-based scroller view.
 */
exports.BespinScrollerView = SC.View.extend({
    _scrollerCanvasView: null,

    _frameChanged: function() {
        this._scrollerCanvasView.adjustFrame();
    }.observes('frame'),

    _maximumChanged: function() {
        this._scrollerCanvasView.adjustFrame();
    }.observes('maximum'),

    _valueChanged: function() {
        var scrollerCanvasView = this._scrollerCanvasView;
        var maximumValue = scrollerCanvasView.getMaximumValue();

        var value = this.get('value');
        if (value < 0) {
            this.set('value', 0);
        } else if (value > maximumValue) {
            this.set('value', maximumValue);
        }

        scrollerCanvasView.setNeedsDisplay();
    }.observes('value'),

    /**
     * @property
     * Specifies the direction of the scroll bar: one of SC.LAYOUT_HORIZONTAL
     * or SC.LAYOUT_VERTICAL.
     *
     * Changes to this value after the view has been created have no effect.
     */
    layoutDirection: SC.LAYOUT_VERTICAL,

    /**
     * @property{Number}
     * The maximum value for the scroll bar.
     *
     * TODO: When set to a value less than the width or height of the knob, the
     * scroll bar is disabled.
     *
     */
    maximum: 0,

    /**
     * @property
     * The dimensions of transparent space inside the frame, given as an object
     * with 'left', 'bottom', 'top', and 'right' properties.
     *
     * Note that the scrollerThickness property includes the padding on the
     * sides of the bar.
     */
    padding: { left: 0, bottom: 0, top: 0, right: 0 },

    /**
     * @property
     * The thickness of this scroll bar. The default is
     * SC.NATURAL_SCROLLER_THICKNESS.
     */
    scrollerThickness: SC.NATURAL_SCROLLER_THICKNESS,

    /**
     * @property
     * The current position that the scroll bar is scrolled to.
     */
    value: 0,

    createChildViews: function() {
        var scrollerCanvasView = this.createChildView(ScrollerCanvasView);
        scrollerCanvasView.adjustFrame();
        this._scrollerCanvasView = scrollerCanvasView;

        this.set('childViews', [ scrollerCanvasView ]);
    }
});

