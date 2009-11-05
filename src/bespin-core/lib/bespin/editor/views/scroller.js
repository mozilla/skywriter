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

var SC = require('sproutcore');

// The fancy custom Bespin scroll bars.
exports.BespinScrollerView = SC.View.extend({
    classNames: ['bespin-scroller-view'],

    _mouseDownScreenPoint: null,
    _mouseDownValue: null,

    _value: 0,

    _bespinScrollerView_valueDidChange: function() {
        console.log("valueDidChange");
        SC.RunLoop.begin();
        this.set('layerNeedsUpdate', true);
        SC.RunLoop.end();
    }.observes('value'),

    _bespinScrollerView_maximumDidChange: function() {
        console.log("maximumDidChange");
        SC.RunLoop.begin();
        this.set('layerNeedsUpdate', true);
        SC.RunLoop.end();
    }.observes('maximum'),

    // TODO: Make this a real SproutCore theme (i.e. an identifier that gets
    // prepended to CSS properties), perhaps?
    theme: {
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
     */
    ownerScrollValueKey: function() {
        switch (this.get('layoutDirection')) {
        case SC.LAYOUT_VERTICAL:    return 'verticalScrollOffset';
        case SC.LAYOUT_HORIZONTAL:  return 'horizontalScrollOffset';
        }
        return null;
    }.property('layoutDirection').cacheable(),

    /**
     * @property
     * The current position that the scroll bar is scrolled to.
     */
    value: function(key, value) {
        console.log("value called, " + this._value + " -> " + value);
        if (value !== undefined) {
            if (value >= 0)
                this._value = value;
        } else {
            return Math.min(this._value || 0, this.get('maximum'));
        }
    }.property('maximum').cacheable(),

    /**
     * @property
     * Returns the dimensions of the handle or knob. Read-only.
     */
    handleFrame: function() {
        var value = this.get('value');
        var maximum = this.get('maximum');
        var frame = this.get('frame');
        var scrollerThickness = this.get('scrollerThickness');
        switch (this.get('layoutDirection')) {
        case SC.LAYOUT_VERTICAL:
            return {
                x:      0,
                y:      value * frame.height / maximum,
                width:  scrollerThickness,
                height: frame.height * frame.height / maximum
            };
        case SC.LAYOUT_HORIZONTAL:
            return {
                x:      value * frame.width / maximum,
                y:      0,
                width:  frame.width * frame.width / maximum,
                height: scrollerThickness
            };
        }
    }.property('value', 'maximum', 'frame'),
 
    /**
     * @property{Number}
     * The maximum value for the scroll bar.
     *
     * TODO: When set to a value less than the width or height of the knob, the
     * scroll bar is disabled.
     *
     */
    maximum: 0,

    mouseWheel: function(evt) {
        // TODO
    },

    mouseDown: function(evt) {
        var value = this.get('value');
        var pos = this.positionRelativeToHandle(evt);
        switch (pos) {
        case 'before':
            this.set('value', value - this.get('frame').height);
            break;
        case 'after':
            this.set('value', value + this.get('frame').height);
            break;
        case 'inside':
            this._mouseDownScreenPoint
                = this.get('layoutDirection') === SC.LAYOUT_HORIZONTAL
                ? evt.x : evt.y;
            this._mouseDownValue = value;
            break;
        }
    },

    mouseUp: function(evt) {
        this._mouseDownScreenPoint = null;
        this._mouseDownValue = null;
    },

    mouseMove: function(evt) {
        if (this._mouseDownScreenPoint !== null) {
            var dist = this.get('layoutDirection') === SC.LAYOUT_HORIZONTAL
                ? evt.x : evt.y;
            var delta = dist - this._mouseDownScreenPoint;
            this.set('value', this._mouseDownValue
                + screenLengthToContentLength(delta));
        }
    },

    _paint: function() {
        var ctx = this.$('canvas')[0].getContext('2d');
        
        var frame = this.get('frame');
        var bar = this.get('handleFrame');
        var alpha = (ctx.globalAlpha) ? ctx.globalAlpha : 1;

        console.log("_paint: layoutDirection " + this.get('layoutDirection'));
        console.log("_paint: frame " + frame.toSource());
        console.log("_paint: bar " + bar.toSource());
        console.log("_paint: maximum " + this.get('maximum') + " value "
            + this.get('value'));

        var handleFrame = this.get('handleFrame');
        var layoutDirection = this.get('layoutDirection');
        var handleDistance, handleLength, frameLength;
        switch (layoutDirection) {
        case SC.LAYOUT_VERTICAL:
            handleDistance = handleFrame.y;
            handleLength = handleFrame.height;
            frameLength = frame.height;     

            // The rest of the painting code assumes the scroll bar is
            // horizontal. Create that fiction by installing a 90 degree
            // rotation.
            ctx.save();
            //var deltaX = handleFrame.y + Math.floor(handleFrame.width / 2);
            //var deltaY = 0 + Math.floor(handleFrame.height / 2);
            //ctx.translate(deltaX, deltaY);
            ctx.translate(frame.width, 0);
            ctx.rotate(Math.PI * 0.5);
            //ctx.translate(-deltaX, -deltaY);
            break;

        case SC.LAYOUT_HORIZONTAL:
            handleDistance = handleFrame.x;
            handleLength = handleFrame.width;
            frameLength = frame.width;
            break;

        default:
            console.log("BUG");
        }

        console.log("_paint: handleDistance %@ handleLength %@ frameLength %@"
            .fmt(handleDistance, handleLength, frameLength));

        if (this.get('isEnabled') === false || frameLength <= handleLength)
            return;     // The scroll bar is disabled...

        /* if (!scrollbar.isH()) {
            ctx.save();     // restored in another if (!scrollbar.isH()) block at end of function
            ctx.translate(handleDistance + Math.floor(bar.w / 2), 0 + Math.floor(bar.h / 2));
            ctx.rotate(Math.PI * 1.5);
            ctx.translate(-(handleDistance + Math.floor(bar.w / 2)), -(0 + Math.floor(bar.h / 2)));

            // if we're vertical, the bar needs to be re-worked a bit
            bar = new scroller.Rect(handleDistance - Math.floor(bar.h / 2) + Math.floor(bar.w / 2),
                    0 + Math.floor(bar.h / 2) - Math.floor(bar.w / 2), bar.h, bar.w);
        } */

        var theme = this.get('theme');
        var scrollerThickness = this.get('scrollerThickness');
        var halfThickness = scrollerThickness / 2;

        ctx.beginPath();
        ctx.arc(handleDistance + halfThickness, 0 + halfThickness, halfThickness,
            Math.PI / 2, 3 * (Math.PI / 2), false);
        ctx.arc(handleDistance + handleLength - halfThickness, 0 + halfThickness, halfThickness,
            3 * (Math.PI / 2), Math.PI / 2, false);
        ctx.lineTo(handleDistance + halfThickness, 0 + scrollerThickness);
        ctx.closePath();

        var gradient = ctx.createLinearGradient(handleDistance, 0, handleDistance,
            0 + scrollerThickness);
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

        ctx.save();
        ctx.clip();

        ctx.fillStyle = theme.scrollBarFillStyle.replace(/%a/, alpha);
        ctx.beginPath();
        ctx.moveTo(handleDistance + (halfThickness * 0.4), 0 + (halfThickness * 0.6));
        ctx.lineTo(handleDistance + (halfThickness * 0.9), 0 + (scrollerThickness * 0.4));
        ctx.lineTo(handleDistance, 0 + (scrollerThickness * 0.4));
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(handleDistance + handleLength - (halfThickness * 0.4),
            0 + (halfThickness * 0.6));
        ctx.lineTo(handleDistance + handleLength - (halfThickness * 0.9),
            0 + (scrollerThickness * 0.4));
        ctx.lineTo(handleDistance + handleLength, 0 + (scrollerThickness * 0.4));
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        ctx.beginPath();
        ctx.arc(handleDistance + halfThickness, 0 + halfThickness, halfThickness,
            Math.PI / 2, 3 * (Math.PI / 2), false);
        ctx.arc(handleDistance + handleLength - halfThickness, 0 + halfThickness, halfThickness,
            3 * (Math.PI / 2), Math.PI / 2, false);
        ctx.lineTo(handleDistance + halfThickness, 0 + scrollerThickness);
        ctx.closePath();

        ctx.strokeStyle = theme.scrollTrackStrokeStyle;
        ctx.stroke();

        if (layoutDirection === SC.LAYOUT_VERTICAL)
            ctx.restore();
    },

    didCreateLayer: function() {
        console.log('didCreateLayer ' + this.get('layoutDirection'));
        this._paint();
    },

    render: function(context, firstTime) {
        console.log('render ' + this.get('layoutDirection'));

        if (!firstTime) {
            this._paint();
            return;
        }

        // FIXME: doesn't work properly if not visible --pcw
        var frame = this.get('frame');
        context.push('<canvas width="%@" height="%@">'.fmt(frame.width,
            frame.height));
    },

    // FIXME --pcw
    paintNib: function(ctx, nibStyle, arrowStyle, strokeStyle) {
        var midpoint = Math.floor(this.NIB_WIDTH / 2);

        ctx.fillStyle = nibStyle;
        ctx.beginPath();
        ctx.arc(0, 0, Math.floor(this.NIB_WIDTH / 2), 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = strokeStyle;
        ctx.stroke();

        ctx.fillStyle = arrowStyle;
        ctx.beginPath();
        ctx.moveTo(0, -midpoint + this.NIB_ARROW_INSETS.top);
        ctx.lineTo(-midpoint + this.NIB_ARROW_INSETS.left, midpoint - this.NIB_ARROW_INSETS.bottom);
        ctx.lineTo(midpoint - this.NIB_ARROW_INSETS.right, midpoint - this.NIB_ARROW_INSETS.bottom);
        ctx.closePath();
        ctx.fill();
    },

});

