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
var canvas = require('editor/mixins/canvas');

var NIB_ARROW_PADDING_BEFORE    = 3;
var NIB_ARROW_PADDING_AFTER     = 5;
var NIB_LENGTH                  = 15;
var NIB_PADDING                 = 8;    // 15/2

// The fancy custom Bespin scroll bars.
exports.BespinScrollerView = SC.View.extend(canvas.Canvas, {
    classNames: ['bespin-scroller-view'],

    _mouseDownScreenPoint: null,
    _mouseDownValue: null,
    _isMouseOver: false,

    _value: 0,

    _bespinScrollerView_valueDidChange: function() {
        this.set('layerNeedsUpdate', true);
    }.observes('value'),

    _bespinScrollerView_maximumDidChange: function() {
        this.set('layerNeedsUpdate', true);
    }.observes('maximum'),

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

    /**
     * @property
     * The thickness of this scroll bar. The default is
     * SC.NATURAL_SCROLLER_THICKNESS (16 as of this writing on the desktop).
     */
    scrollerThickness: SC.NATURAL_SCROLLER_THICKNESS,

    /**
     * @property
     * The minimum size of the scroll bar handle/knob.
     */
    minimumHandleSize: 20,

    /**
     * @property
     * The amount to scroll when the nibs/arrows are clicked.
     */
    lineHeight: 15,

    /**
     * @property
     * Specifies the direction of the scroll bar: one of SC.LAYOUT_HORIZONTAL
     * or SC.LAYOUT_VERTICAL.
     *
     * Changes to this value after the view has been created have no effect.
     */
    layoutDirection: SC.LAYOUT_VERTICAL,

    /**
     * @property
     * Specifies whether the scroll bar is enabled. Even if this property is
     * set to YES, the scroll bar will still be disabled if the scroll bar is
     * too large for the maximum value.
     */
    isEnabled: true,

    /**
     * @property{String}
     * The property of the owning view that the scroll bar should modify
     * whenever its value changes. By default the scroll bar updates
     * verticalScrollOffset if its layoutDirection is SC.LAYOUT_VERTICAL or
     * horizontalScrollOffset if its layoutDirection is SC.LAYOUT_HORIZONTAL.
     * Read-only.
     */
    ownerScrollValueKey: function() {
        switch (this.get('layoutDirection')) {
        case SC.LAYOUT_VERTICAL:    return 'verticalScrollOffset';
        case SC.LAYOUT_HORIZONTAL:  return 'horizontalScrollOffset';
        default:                    return null;
        }
    }.property('layoutDirection').cacheable(),

    /**
     * @property
     * The dimensions of transparent space inside the frame, given as an object
     * with 'left', 'bottom', 'top', and 'right' properties.
     *
     * Note that the scrollerThickness property includes the padding on the
     * sides of the bar.
     */
    padding: { left: 0, bottom: 0, top: 0, right: 0 },

    // The frame of the scroll bar, not counting any padding. Read-only.
    _clientFrame: function() {
        var frame = this.get('frame'), padding = this.get('padding');
        return {
            x:      padding.left,
            y:      padding.top,
            width:  frame.width - (padding.left + padding.right),
            height: frame.height - (padding.top + padding.bottom)
        };
    }.property('frame', 'padding').cacheable(),

    // The thickness of the scroll bar, not counting any padding. Read-only.
    _clientThickness: function() {
        var padding = this.get('padding');
        var scrollerThickness = this.get('scrollerThickness');
        switch (this.get('layoutDirection')) {
        case SC.LAYOUT_VERTICAL:
            return scrollerThickness - (padding.left + padding.right);
        case SC.LAYOUT_HORIZONTAL:
            return scrollerThickness - (padding.top + padding.bottom);
        default:
            console.assert(false, "unknown layout direction");
            return null;
        }
    }.property('layoutDirection', 'padding', 'scrollerThickness').cacheable(),

    // The dimensions of the gutter (the middle area between the buttons, which
    // contains the handle or knob). Read-only.
    _gutterFrame: function() {
        var clientFrame = this.get('_clientFrame');
        var thickness = this.get('_clientThickness');
        switch (this.get('layoutDirection')) {
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
    }.property('_clientFrame', '_clientThickness',
        'layoutDirection').cacheable(),

    // The length of the gutter, equal to _gutterFrame.width or
    // _gutterFrame.height depending on the scroll bar's layout direction.
    // Read-only.
    _gutterLength: function() {
        var gutterFrame = this.get('_gutterFrame');
        var gutterLength;
        switch (this.get('layoutDirection')) {
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
    }.property('_gutterFrame', 'layoutDirection').cacheable(),

    // The length of the scroll bar, counting the padding. Equal to frame.width
    // or frame.height, depending on the layout direction of the bar.
    // Read-only.
    _frameLength: function() {
        var frame = this.get('frame');
        switch (this.get('layoutDirection')) {
        case SC.LAYOUT_HORIZONTAL:
            return frame.width;
        case SC.LAYOUT_VERTICAL:
            return frame.height;
        default:
            console.assert(false, "unknown layout direction");
            return null;
        }
    }.property('frame', 'layoutDirection').cacheable(),

    // The length of the scroll bar, not counting any padding. Equal to
    // _clientFrame.width or _clientFrame.height, depending on the scroll bar's
    // layout direction. Read-only. 
    _clientLength: function() {
        var clientFrame = this.get('_clientFrame');
        switch (this.get('layoutDirection')) {
        case SC.LAYOUT_HORIZONTAL:
            return clientFrame.width;
        case SC.LAYOUT_VERTICAL:
            return clientFrame.height;
        default:
            console.assert(false, "unknown layout direction");
            return null;
        }
    }.property('_clientFrame', 'layoutDirection').cacheable(),

    // The dimensions of the handle or knob. Read-only.
    _handleFrame: function() {
        var value = this.get('value');
        var maximum = this.get('maximum');
        var frame = this.get('frame');
        var clientFrame = this.get('_clientFrame');
        var gutterFrame = this.get('_gutterFrame');
        var clientThickness = this.get('_clientThickness');

        switch (this.get('layoutDirection')) {
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
    }.property('_clientFrame', '_clientThickness', '_gutterFrame', 'maximum',
        'value').cacheable(),
 
    /**
     * @property{Number}
     * The actual maximum value, which will be less than the maximum due to
     * accounting for the frame length. Read-only.
     */
    maximumValue: function() {
        return Math.max(this.get('maximum') - this.get('_frameLength'), 0);
    }.property('_frameLength', 'maximum').cacheable(),

    /**
     * @property
     * The current position that the scroll bar is scrolled to.
     */
    value: function(key, value) {
        var maximumValue = this.get('maximumValue');
        if (value !== undefined) {
            if (value < 0) {
                value = 0;
            } else if (value > maximumValue) {
                value = maximumValue;
            }

            this._value = value;
            return value;
        }

        return Math.min(this._value || 0, maximumValue);
    }.property('maximumValue').cacheable(),

    /**
     * @property{Number}
     * The maximum value for the scroll bar.
     *
     * TODO: When set to a value less than the width or height of the knob, the
     * scroll bar is disabled.
     *
     */
    maximum: 0,

    _segmentForMouseEvent: function(evt) {
        var point = this.convertFrameFromView({ x: evt.pageX, y: evt.pageY });
        var clientFrame = this.get('_clientFrame');

        if (!SC.pointInRect(point, clientFrame)) {
            return null;
        }

        var layoutDirection = this.get('layoutDirection');
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

        var handleFrame = this.get('_handleFrame');
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

    mouseEntered: function(evt) {
        SC.RunLoop.begin();
        this._isMouseOver = true;
        this.set('layerNeedsUpdate', true);
        SC.RunLoop.end();
    },

    mouseExited: function(evt) {
        SC.RunLoop.begin();
        this._isMouseOver = false;
        this._mouseDownScreenPoint = null;
        this.set('layerNeedsUpdate', true);
        SC.RunLoop.end();
    },

    mouseWheel: function(evt) {
        SC.RunLoop.begin();
        var delta;
        switch (this.get('layoutDirection')) {
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
        this.set('value', this.get('value') + 2*delta);
        SC.RunLoop.end();
    },

    mouseDown: function(evt) {
        SC.RunLoop.begin();
        var value = this.get('value');
        var gutterLength = this.get('_gutterLength');

        switch (this._segmentForMouseEvent(evt)) {
        case 'nib-start':
            this.set('value', value - this.get('lineHeight'));
            break;
        case 'nib-end':
            this.set('value', value + this.get('lineHeight'));
            break;
        case 'gutter-before':
            this.set('value', value - gutterLength);
            break;
        case 'gutter-after':
            this.set('value', value + gutterLength);
            break;
        case 'handle':
            switch (this.get('layoutDirection')) {
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
        SC.RunLoop.end();
    },

    mouseUp: function(evt) {
        this._mouseDownScreenPoint = null;
        this._mouseDownValue = null;
    },

    mouseMoved: function(evt) {
        SC.RunLoop.begin();
        if (this._mouseDownScreenPoint !== null) {
            var eventDistance;
            switch (this.get('layoutDirection')) {
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

            var maximum = this.get('maximum');
            var gutterLength = this.get('_gutterLength');

            this.set('value', this.get('value') +
                eventDelta * maximum / gutterLength);

            this._mouseDownScreenPoint = eventDistance;
        }
        SC.RunLoop.end();
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
        var thickness = this.get('_clientThickness');
        var value = this.get('value');

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
        if (isMouseOver || value !== this.get('maximumValue')) {
            ctx.save();
            ctx.translate(this.get('_clientLength') - NIB_PADDING,
                thickness / 2);
            ctx.rotate(Math.PI * 0.5);
            ctx.moveTo(0, 0);
            this._drawNib(ctx);
            ctx.restore();
        }
    },

    drawRect: function(ctx, visibleFrame) {
        var alpha = (ctx.globalAlpha) ? ctx.globalAlpha : 1;
        var theme = this.get('theme');

        var frame = this.get('frame');
        ctx.clearRect(0, 0, frame.width, frame.height);

        // Begin master drawing context
        ctx.save();

        // Translate so that we're only drawing in the padding.
        var padding = this.get('padding');
        ctx.translate(padding.left, padding.top);

        var handleFrame = this.get('_handleFrame');
        var gutterLength = this.get('_gutterLength');
        var thickness = this.get('_clientThickness');
        var halfThickness = thickness / 2;

        var layoutDirection = this.get('layoutDirection');
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

        if (this.get('isEnabled') === false || gutterLength <= handleLength) {
            return; // Don't display the scroll bar.
        }
   
        if (this._isMouseOver === false) {
            ctx.globalAlpha = 0.3;
        } else {
            // Draw the scroll track rectangle.
            var clientLength = this.get('_clientLength');
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
    }
});

