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

var CanvasView = require('views/canvas').CanvasView;
var m_scratchcanvas = require('bespin:util/scratchcanvas');

// TODO need to implement this behavior
// _frameChanged: function() {
//     // We have to be more aggressive than the canvas view alone would be,
//     // because of the possibility that we will have to draw additional line
//     // numbers in the gutter when the height of the text changes.
//     this.setNeedsDisplay();
// }.observes('frame')

/*
 * A view that renders the gutter for the editor.
 * 
 * The domNode attribute contains the domNode for this view that should be
 * added to the document appropriately.
 */
exports.GutterView = function() {
    this.layoutManager.invalidatedRects.add(function(sender, rects) {
        this._recomputeLayout();
    }.bind(this));
    var interiorView = new CanvasView();
    interiorView.drawRect.add(this.drawRect.bind(this));
    this._interiorView = interiorView;
    this.domNode = interiorView.domNode;

    this._recomputeLayout();
};

exports.GutterView.prototype = {
    /**
     * Theme colors. Value is set by editorView class. Don't change this
     * property directly. Use the editorView function to adjust it.
     */
    _theme: { },

    _interiorView: null,
    
    drawRect: function(canvasview, rect, context) {
        var theme = this.parentView._theme;

        context.fillStyle = theme.backgroundColor;
        context.fillRect(rect.x, rect.y, rect.width, rect.height);

        context.save();

        var parentView = this.parentView;
        var padding = parentView.padding;
        context.translate(padding.left, 0);

        var layoutManager = parentView.layoutManager;
        var range = layoutManager.characterRangeForBoundingRect(rect);
        var endRow = Math.min(range.end.row,
            layoutManager.textLines.length - 1);
        var lineAscent = layoutManager.lineAscent;

        context.fillStyle = theme.color;
        context.font = parentView.editor.font;

        for (var row = range.start.row; row <= endRow; row++) {
            // TODO: breakpoints
            context.fillText('' + (row + 1), -0.5,
                layoutManager.lineRectForRow(row).y + lineAscent - 0.5);
        }

        context.restore();
    },

    _computeWidth: function() {
        var padding = this.padding;
        var paddingWidth = padding.left + padding.right;

        var lineNumberFont = this.editor.font;

        var layoutManager = this.layoutManager;
        var lineCount = layoutManager.textLines.length;
        var lineCountStr = '' + lineCount;

        var characterWidth = layoutManager.characterWidth;
        var strWidth = characterWidth * lineCountStr.length;

        return strWidth + paddingWidth;
    },

    _frameChanged: function() {
        this._recomputeLayout();
    }.observes('frame'),

    _recomputeLayout: function() {
        var layoutManager = this.layoutManager;
        var padding = this.padding;

        var width = this._computeWidth();

        var layout = SC.clone(this.layout);
        if (layout.width !== width) {
            layout.width = width;
            this.set('layout', layout); // triggers a restart of this function
            return;
        }

        var frame = this.frame;
        this._interiorView.set('layout', {
            left:   0,
            top:    -this.verticalScrollOffset,
            width:  width,
            height: Math.max(frame.height,
                    layoutManager.boundingRect().height + padding.bottom)
        });
    },

    _verticalScrollOffsetChanged: function() {
        this._recomputeLayout();
    }.observes('verticalScrollOffset'),

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
     * object with 'bottom', 'left', and 'right' properties.
     */
    padding: { bottom: 30, left: 5, right: 10 },

    /**
     * @property{number}
     *
     * The amount by which the user has scrolled the neighboring editor in
     * pixels.
     */
    verticalScrollOffset: 0
};

