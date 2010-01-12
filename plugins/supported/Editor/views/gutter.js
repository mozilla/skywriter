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
var CanvasView = require('views/canvas').CanvasView;
var m_scratchcanvas = require('bespin:util/scratchcanvas');

exports.GutterView = CanvasView.extend({
    // TODO: calculate from the size or let the user override via themes if
    // desired
    _lineAscent: 16,

    _clippingFrameChanged: function() {
        this.setNeedsDisplay();
    }.observes('clippingFrame'),

    /**
     * @property
     *
     * The layer frame of the gutter view stretches from the bottom to the top
     * of the enclosing view. Not cacheable, because it depends on the frame of
     * the parent view.
     */
    layerFrame: function() {
        var layerFrame = {
            x:      0,
            y:      0,
            width:  this.get('layout').width,
            height: this.get('parentView').get('frame').height
        };
        return layerFrame;
    }.property('layout', 'parentView'),

    /**
     * @property
     *
     * The amount of padding to leave on each side of the gutter, given as an
     * object with "left" and "right" properties.
     */
    padding: { left: 5, right: 10 },

    /**
     * @property
     * Theme information for the gutter. Currently exposed properties are
     * gutterStyle, lineNumberColor, and lineNumberFont.
     *
     * TODO: Convert to SproutCore's theme system.
     */
    theme: {
        gutterStyle: "#4c4a41",
        lineNumberColor: "#e5c138",
        lineNumberFont: "10pt Monaco, Lucida Console, monospace",
        editorTextFont: "10pt Monaco, Lucida Console, monospace"
    },

    _resize: function() {
        var layoutManager = this.get('layoutManager');
        var padding = this.get('padding');
        this.set('layout', SC.mixin(SC.clone(this.get('layout')), {
            width:  32, /* padding.left + padding.right +
                    m_scratchcanvas.get().getContext().
                    measureStringWidth(this.get('theme').lineNumberFont,
                    "" + (layoutManager.get('textLines').length + 1)), */
            height: layoutManager.boundingRect().height
        }));
    },

    drawRect: function(rect, context) {
        var visibleFrame = this.get('clippingFrame');

        var theme = this.get('theme');
        context.fillStyle = theme.gutterStyle;
        context.fillRect(0, visibleFrame.y, visibleFrame.width,
            visibleFrame.height);

        context.save();

        var padding = this.get('padding');
        context.translate(padding.left, 0);

        context.fillStyle = theme.lineNumberColor;
        context.font = theme.lineNumberFont;

        var layoutManager = this.get('layoutManager');
        var range = layoutManager.characterRangeForBoundingRect(visibleFrame);
        var endRow = Math.min(range.end.row,
            layoutManager.get('textLines').length - 1);
        var lineAscent = this._lineAscent;
        for (var row = range.start.row; row <= endRow; row++) {
            // TODO: breakpoints
            context.fillText("" + (row + 1), -0.5,
                layoutManager.lineRectForRow(row).y + lineAscent - 0.5);
        }

        context.restore();
    },

    init: function() {
        arguments.callee.base.apply(this, this.arguments);

        this.getPath('layoutManager.delegates').push(this);
        this._resize();
    },

    layoutManagerInvalidatedRects: function(sender, rects) {
        this.setNeedsDisplay();
        this._resize();
    }

});

