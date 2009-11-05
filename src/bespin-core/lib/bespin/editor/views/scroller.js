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
        if (value !== undefined) {
            if (value >= 0)
                this._value = value;
        } else {
            return Math.min(this._value || 0, this.get('maximum'));
        }
    }.property('maximum').cacheable(),
 
    /**
     * @property{Number}
     * The maximum value for the scroll bar.
     *
     * TODO: When set to a value less than the width or height of the knob, the
     * scroll bar is disabled.
     *
     */
    maximum: 0,

    // position/size of the scrollbar track
    rect: null,

    // size of the current visible subset
    extent: null,

    // return a Rect for the scrollbar handle
    getHandleBounds: function() {
        var sx = this.isH() ? this.rect.x : this.rect.y;
        var sw = this.isH() ? this.rect.w : this.rect.h;

        var smultiple = this.extent / (this.max + this.extent);
        var asw = smultiple * sw;
        if (asw < this.MINIMUM_HANDLE_SIZE) {
            asw = this.MINIMUM_HANDLE_SIZE;
        }

        sx += (sw - asw) * (this.value / (this.max - this.min));

        return this.isH() ?
            new exports.Rect(Math.floor(sx), this.rect.y, asw, this.rect.h) :
            new exports.Rect(this.rect.x, sx, this.rect.w, asw);
    },

    isH: function() {
        return !(this.orientation == this.VERTICAL);
    },

    fixValue: function(value) {
        if (value < this.min) {
            value = this.min;
        }
        if (value > this.max) {
            value = this.max;
        }
        return value;
    },

    mouseWheel: function(evt) {
        // TODO
    },

    mouseDown: function(evt) {
        if (withinHandle(evt)) {
            this._mouseDownScreenPoint
                = this.get('layoutDirection') == SC.LAYOUT_HORIZONTAL
                ? evt.x : evt.y;
            this._mouseDownValue = this.get('value');
        }
        var bar = this.getHandleBounds();
        // TODO
    },

    onmousedown: function(e) {
        
        var clientY = e.clientY - this.ui.getTopOffset();
        var clientX = e.clientX - this.ui.getLeftOffset();

        var bar = this.getHandleBounds();
        if (bar.contains({ x: clientX, y: clientY })) {
            this.mousedownScreenPoint = this.isH() ? e.screenX : e.screenY;
            this.mousedownValue = this.value;
        } else {
            var p = this.isH() ? clientX : clientY;
            var b1 = this.isH() ? bar.x : bar.y;
            var b2 = this.isH() ? bar.x2 : bar.y2;

            if (p < b1) {
                this.setValue(this.value -= this.extent);
            } else if (p > b2) {
                this.setValue(this.value += this.extent);
            }
        }
    },

    onmouseup: function(e) {
        this.mousedownScreenPoint = null;
        this.mousedownValue = null;
        if (this.valueChanged) {
            this.valueChanged(); // make the UI responsive when the user releases the mouse button (in case arrow no longer hovers over scrollbar)
        }
    },

    onmousemove: function(e) {
        if (this.mousedownScreenPoint) {
            var diff = ((this.isH()) ? e.screenX : e.screenY) - this.mousedownScreenPoint;
            var multiplier = diff / (this.isH() ? this.rect.w : this.rect.h);
            this.setValue(this.mousedownValue + Math.floor(((this.max + this.extent) - this.min) * multiplier));
        }
    },

    setValue: function(value) {
        this.value = this.fixValue(value);
        if (this.valueChanged) {
            this.valueChanged();
        }
    },

    // FIXME --pcw
    render: function(context, firstTime) {
        if (firstTime) {
            context.push('<canvas width="" height="">');

        var bar = scrollbar.getHandleBounds();
        var alpha = (ctx.globalAlpha) ? ctx.globalAlpha : 1;

        if (!scrollbar.isH()) {
            ctx.save();     // restored in another if (!scrollbar.isH()) block at end of function
            ctx.translate(bar.x + Math.floor(bar.w / 2), bar.y + Math.floor(bar.h / 2));
            ctx.rotate(Math.PI * 1.5);
            ctx.translate(-(bar.x + Math.floor(bar.w / 2)), -(bar.y + Math.floor(bar.h / 2)));

            // if we're vertical, the bar needs to be re-worked a bit
            bar = new scroller.Rect(bar.x - Math.floor(bar.h / 2) + Math.floor(bar.w / 2),
                    bar.y + Math.floor(bar.h / 2) - Math.floor(bar.w / 2), bar.h, bar.w);
        }

        var halfheight = bar.h / 2;

        ctx.beginPath();
        ctx.arc(bar.x + halfheight, bar.y + halfheight, halfheight, Math.PI / 2, 3 * (Math.PI / 2), false);
        ctx.arc(bar.x2 - halfheight, bar.y + halfheight, halfheight, 3 * (Math.PI / 2), Math.PI / 2, false);
        ctx.lineTo(bar.x + halfheight, bar.y + bar.h);
        ctx.closePath();

        var gradient = ctx.createLinearGradient(bar.x, bar.y, bar.x, bar.y + bar.h);
        gradient.addColorStop(0, this.editor.theme.scrollBarFillGradientTopStart.replace(/%a/, alpha));
        gradient.addColorStop(0.4, this.editor.theme.scrollBarFillGradientTopStop.replace(/%a/, alpha));
        gradient.addColorStop(0.41, this.editor.theme.scrollBarFillStyle.replace(/%a/, alpha));
        gradient.addColorStop(0.8, this.editor.theme.scrollBarFillGradientBottomStart.replace(/%a/, alpha));
        gradient.addColorStop(1, this.editor.theme.scrollBarFillGradientBottomStop.replace(/%a/, alpha));
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.save();
        ctx.clip();

        ctx.fillStyle = this.editor.theme.scrollBarFillStyle.replace(/%a/, alpha);
        ctx.beginPath();
        ctx.moveTo(bar.x + (halfheight * 0.4), bar.y + (halfheight * 0.6));
        ctx.lineTo(bar.x + (halfheight * 0.9), bar.y + (bar.h * 0.4));
        ctx.lineTo(bar.x, bar.y + (bar.h * 0.4));
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bar.x + bar.w - (halfheight * 0.4), bar.y + (halfheight * 0.6));
        ctx.lineTo(bar.x + bar.w - (halfheight * 0.9), bar.y + (bar.h * 0.4));
        ctx.lineTo(bar.x + bar.w, bar.y + (bar.h * 0.4));
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        ctx.beginPath();
        ctx.arc(bar.x + halfheight, bar.y + halfheight, halfheight, Math.PI / 2, 3 * (Math.PI / 2), false);
        ctx.arc(bar.x2 - halfheight, bar.y + halfheight, halfheight, 3 * (Math.PI / 2), Math.PI / 2, false);
        ctx.lineTo(bar.x + halfheight, bar.y + bar.h);
        ctx.closePath();

        ctx.strokeStyle = this.editor.theme.scrollTrackStrokeStyle;
        ctx.stroke();

        if (!scrollbar.isH()) {
            ctx.restore();
        }
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

