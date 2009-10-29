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

// The fancy custom Bespin scrollbars.
exports.Scrollbar = SC.Object.extend({
    HORIZONTAL: "horizontal",
    VERTICAL: "vertical",
    MINIMUM_HANDLE_SIZE: 20,

    ui: null,

    // "horizontal" or "vertical"
    orientation: null,

    // position/size of the scrollbar track
    rect: null,

    // current offset value
    value: null,

    // minimum offset value
    min: null,

    // maximum offset value
    max: null,

    // size of the current visible subset
    extent: null,

    // used for scroll bar dragging tracking; point at which the mousedown first occurred
    mousedownScreenPoint: null,

    // value at time of scroll drag start
    mousedownValue: null,

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

    onmousewheel: function(e) {
        // We need to move the editor unless something else needs to scroll.
        // We need a clean way to define that behaviour, but for now we hack and put in other elements that can scroll
        var command_output = document.getElementById("command_output");
        var target = e.target || e.originalTarget;
        if (command_output && (target.id == "command_output" || util.contains(command_output, target))) {
            return;
        }
        if (!this.ui.editor.focus) {
            return;
        }

        var wheel = mousewheelevent.wheel(e);
        //console.log("Wheel speed: ", wheel);
        var axis = mousewheelevent.axis(e);

        if (this.orientation == this.VERTICAL && axis == this.VERTICAL) {
            this.setValue(this.value + (wheel * this.ui.lineHeight));
        } else if (this.orientation == this.HORIZONTAL && axis == this.HORIZONTAL) {
            this.setValue(this.value + (wheel * this.ui.charWidth));
        }
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
    }
});

/**
 * treat as immutable (pretty please)
 *
 * TODO: Delete me as part of the scrollbar revamp - SproutCore has its own
 * rect structure --pcw
 */
exports.Rect = SC.Object.extend({
    x: null,
    y: null,
    w: null,
    h: null,

    init: function() {
        this.x2 = this.x + this.w;
        this.y2 = this.y + this.h;
        this.sc_super();
    },

    // inclusive of bounding lines
    contains: function(point) {
        if (!this.x) {
            return false;
        }
        return ((this.x <= point.x) && ((this.x + this.w) >= point.x) && (this.y <= point.y) && ((this.y + this.h) >= point.y));
    }
});

