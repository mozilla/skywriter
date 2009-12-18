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
var Canvas = require('bespin:editor/mixins/canvas').Canvas;
var LayoutManager = require('controllers/layoutmanager').LayoutManager;


exports.EditorView = SC.View.extend(Canvas, {
    _backgroundValid: false,
    _invalidRange: null,
    _layout: { left: 0, top: 0, width: 0, height: 0 },

    // TODO: calculate from the size or let the user override via themes if
    // desired
    _lineAscent: 16,

    _selectedRanges: null,

    _characterRangeForFrame: function(frame) {
        var layoutManager = this.get('layoutManager');

        // TODO: variable line heights, needed for word wrap and perhaps
        // extensions as well
        var lineHeight = layoutManager.get('textLines')[0].lineHeight;
        var characterWidth = layoutManager._characterWidth;

        var frameX = frame.x, frameY = frame.y;

        return {
            startRow:       Math.floor(frameY / lineHeight),
            endRow:         Math.ceil((frameY + frame.height) / lineHeight),
            startColumn:    Math.floor(frameX / characterWidth),
            endColumn:      Math.ceil((frameX + frame.width) / characterWidth)
        };
    },

    _clippingFrameChanged: function() {
        this._invalidate();
    }.observes('clippingFrame'),

    _drawLines: function(context, visibleFrame) {
        var layoutManager = this.get('layoutManager');
        var textLines = layoutManager.get('textLines');
        var margin = layoutManager.get('margin');

        // TODO: variable line heights, needed for word wrap and perhaps
        // extensions as well
        var lineHeight = textLines[0].lineHeight;
        var lineAscent = this._lineAscent;
        var characterWidth = layoutManager._characterWidth;

        var visibleFrameWidth = visibleFrame.width;
        var visibleRange = this._characterRangeForFrame(visibleFrame);

        var theme = this.get('theme');

        context.save();                         // start context 1
        context.font = theme.editorTextFont;

        var range = this._invalidRange;
        var startRow = range.startRow, endRow = range.endRow;
        for (var row = startRow; row <= endRow; row++) {
            var y = row * lineHeight;

            var startColumn = row == startRow ? range.startColumn :
                visibleRange.startColumn;
            var endColumn = row == endRow ? range.endColumn :
                visibleRange.endColumn;

            context.fillStyle = theme.backgroundStyle;
            context.fillRect(startColumn * characterWidth,
                row * lineHeight,
                (endColumn - startColumn) * characterWidth,
                lineHeight);

            var textLine = textLines[row];
            if (SC.none(textLine)) {
                continue;
            }

            // Clamp the start column and end column to fit within the line
            // text.
            var characters = textLine.characters;
            var length = characters.length;
            if (startColumn >= length) {
                continue;
            }
            if (endColumn >= length) {
                endColumn = length - 1;
            }

            // And finally draw the line.
            context.fillStyle = theme.editorTextColor;
            for (var col = startColumn; col <= endColumn; col++) {
                context.fillText(characters.substring(col, col + 1),
                    col * characterWidth, row * lineHeight + lineAscent);
            }
        }
        
        context.restore();                      // end context 1
    },

    // Invalidates the entire visible frame. Does not automatically mark the
    // editor for repainting.
    _invalidate: function() {
        this._invalidRange = this._characterRangeForFrame(this.get(
            'clippingFrame'));
    },

    _recomputeLayout: function() {
        var layoutManager = this.get('layoutManager');
        var margin = layoutManager.get('margin');
        var textLines = layoutManager.get('textLines');
        var originalLayout = this._layout;

        var newLayout = {
            // The origin can be set by the user...
            left:   originalLayout.left,
            top:    originalLayout.top,

            // ... but the width and height are computed by us.
            width:  layoutManager.get('maximumWidth') + margin.left +
                        margin.right,
            height: textLines.length * textLines[0].lineHeight + margin.top +
                        margin.bottom
        };

        this._layout = newLayout;
        this.notifyPropertyChange('layout', newLayout);
    },

    // Moves the selection, if necessary, to keep all the positions pointing to
    // actual characters.
    _repositionSelection: function() {
        var textLines = this.get('layoutManager').get('textLines');
        var textLineLength = textLines.length;

        this._selectedRanges.forEach(function(range) {
            if (range.startRow >= textLineLength) {
                range.startRow = textLineLength;
            }
            var startLine = textLines[range.startRow];
            if (range.startColumn > startLine.characters.length) {
                range.startColumn = startLine.characters.length;
            }

            if (range.endRow >= textLineLength) {
                range.endRow = textLineLength;
            }
            var endLine = textLines[range.endRow];
            if (range.endColumn > endLine.characters.length) {
                range.endColumn = endLine.characters.length;
            }
        });
    },

    /**
     * @property{Boolean}
     *
     * This property is always true for objects that expose a padding property.
     * The BespinScrollView uses this.
     */
    hasPadding: true,

    /**
     * @property
     *
     * The layer frame, which fills the parent view. Not cacheable, because it
     * depends on the frame of the parent view.
     */
    layerFrame: function() {
        var parentView = this.get('parentView');
        var parentFrame = parentView.get('frame');
        return {
            x:      0,
            y:      0,
            width:  parentFrame.width,
            height: parentFrame.height
        };
    }.property(),

    /**
     * @property
     *
     * Changes to the editor layout affect the origin only; the width and
     * height are read-only and are determined by the text height and width.
     */
    layout: function(key, value) {
        if (!SC.none(value)) {
            this._layout = value;
            this._recomputeLayout();
        }
        return this._layout;
    }.property(),

    /**
     * @property
     *
     * The layout manager that this editor view maintains.
     */
    layoutManager: LayoutManager,

    /**
     * @property
     *
     * The padding to leave inside the clipping frame, given as an object with
     * 'bottom' and 'right' properties. Text content is displayed inside this
     * padding as usual, but the cursor cannot enter it. In a BespinScrollView,
     * this feature is used to prevent the cursor from ever going behind the
     * scroll bars.
     */
    padding: { bottom: 0, right: 0 },

    /**
     * @property
     *
     * The theme to use.
     *
     * TODO: Convert to a SproutCore theme. This is super ugly.
     */
    theme: {
        backgroundStyle:    "#2a211c",
        editorTextFont:     "10pt Monaco, Lucida Console, monospace",
        editorTextColor:    "rgb(230, 230, 230)"
    },

    /**
     * Creates the layout manager, which in turn creates a text storage object.
     * The default implementation of this method simply instantiates the
     * layoutManager property and sets its delegate to this object.
     */
    createLayoutManager: function() {
        var layoutManager = this.get('layoutManager').create();
        layoutManager.set('delegate', this);
        this.set('layoutManager', layoutManager);
    },

    /**
     * This is where the editor is painted from head to toe. Pitiful tricks are
     * used to draw as little as possible.
     */
    drawRect: function(context, visibleFrame) {
        if (!this._backgroundValid) {
            context.fillStyle = this.get('theme').backgroundStyle;
            context.fillRect(visibleFrame.x, visibleFrame.y,
                visibleFrame.width, visibleFrame.height);
            this._backgroundValid = true;
        }

        if (this._invalidRange === null) {
            return;
        }

        this._drawLines(context, visibleFrame);

        this._invalidRange = null;
    },

    init: function() {
        this.superclass();
        this._invalidRange = null;
        this._selectedRanges = [
            { startRow: 0, startColumn: 0, endRow: 0, endColumn: 0 }
        ];

        // Allow the user to change the fields of the padding object without
        // screwing up the prototype.
        this.set('padding', SC.clone(this.get('padding')));

        this.createLayoutManager();
    },

    /**
     * The layout manager calls this method to signal to the view that the text
     * and/or layout has changed.
     */
    layoutManagerChangedLayout: function(sender, range) {
        if (this._invalidRange !== null) {
            throw "layout manager changed layout twice without an " +
                "intervening drawRect";
        }

        this._invalidRange = range;
        this.set('layerNeedsUpdate', true);
        this._repositionSelection();
        this._recomputeLayout();
    }
});

