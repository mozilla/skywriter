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
var m_scratchcanvas = require('bespin:util/scratchcanvas');

var InteriorGutterView = CanvasView.extend({
    // TODO: calculate from the size or let the user override via themes if
    // desired
    _lineAscent: 16,

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

    _frameChanged: function() {
        // We have to be more aggressive than the canvas view alone would be,
        // because of the possibility that we will have to draw additional line
        // numbers in the gutter when the height of the text changes.
        this.setNeedsDisplay();
    }.observes('frame'),

    drawRect: function(rect, context) {
        var theme = this.get('theme');
        context.fillStyle = theme.gutterStyle;
        context.fillRect(rect.x, rect.y, rect.width, rect.height);

        context.save();

        var parentView = this.get('parentView');
        var padding = parentView.get('padding');
        context.translate(padding.left, 0);

        context.fillStyle = theme.lineNumberColor;
        context.font = theme.lineNumberFont;

        var layoutManager = parentView.get('layoutManager');
        var range = layoutManager.characterRangeForBoundingRect(rect);
        var endRow = Math.min(range.end.row,
            layoutManager.get('textLines').length - 1);
        var lineAscent = this._lineAscent;
        for (var row = range.start.row; row <= endRow; row++) {
            // TODO: breakpoints
            context.fillText("" + (row + 1), -0.5,
                layoutManager.lineRectForRow(row).y + lineAscent - 0.5);
        }

        context.restore();
    }
});

exports.GutterView = SC.View.extend({
    _interiorView: null,

    layout: { left: 0, top: 0, bottom: 0, width: 32 },

    /**
     * @property{LayoutManager}
     *
     * The layout manager to monitor. This property must be filled in upon
     * instantiating the gutter view.
     */
    layoutManager: null,

    /**
     * @property
     *
     * The amount of padding to leave on the sides of the gutter, given as an
     * object with "bottom", "left", and "right" properties.
     */
    padding: { bottom: 30, left: 5, right: 10 },

    /**
     * @property{number}
     *
     * The amount by which the user has scrolled the neighboring editor in
     * pixels.
     */
    verticalScrollOffset: 0,

    _recomputeLayout: function() {
        var layoutManager = this.get('layoutManager');
        var padding = this.get('padding');

        var width = 32;
        // padding.left + padding.right + m_scratchcanvas.get().getContext().
        // measureStringWidth(this.get('theme').lineNumberFont,
        // "" + (layoutManager.get('textLines').length + 1))

        this.set('layout', SC.mixin(SC.clone(this.get('layout')), {
            width: width
        }));
        this._interiorView.set('layout', {
            left:   0,
            top:    -this.get('verticalScrollOffset'),
            width:  this.get('frame').width,
            height: layoutManager.boundingRect().height + padding.bottom
        });
    },

    _verticalScrollOffsetChanged: function() {
        this._recomputeLayout();
    }.observes('verticalScrollOffset'),

    createChildViews: function() {
        var interiorView = this.createChildView(InteriorGutterView);
        this._interiorView = interiorView;

        var frame = this.get('frame');
        this._recomputeLayout();

        this.set('childViews', [ interiorView ]);
    },

    init: function() {
        arguments.callee.base.apply(this, arguments);

        this.get('layoutManager').addDelegate(this);
    },

    layoutManagerInvalidatedRects: function(sender, rects) {
        this._recomputeLayout();
    }


});

