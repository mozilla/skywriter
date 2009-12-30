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
var Range = require('utils/range');
var TextInput = require('bespin:editor/mixins/textinput').TextInput;
var catalog = require('bespin:plugins').catalog;

exports.TextView = SC.View.extend(Canvas, TextInput, {
    _backgroundInvalid: false,
    _invalidRange: null,

    // TODO: calculate from the size or let the user override via themes if
    // desired
    _lineAscent: 16,

    _previousClippingFrame: null,
    _selectedRanges: null,
    _selectionOrigin: null,

    _clippingFrameChanged: function() {
        // False positives here are very common, so check to make sure before
        // we take the slow path.
        var previousClippingFrame = this._previousClippingFrame;
        var clippingFrame = this.get('clippingFrame');
        if (previousClippingFrame === null ||
                !SC.rectsEqual(clippingFrame, previousClippingFrame)) {
            this._previousClippingFrame = clippingFrame;
            this._invalidate();
        }
    }.observes('clippingFrame'),

    // Creates a path around the given range of text. Useful for drawing
    // selections, highlights, and backgrounds.
    _createPathForRange: function(context, range) {
        var layoutManager = this.get('layoutManager');

        var startPosition = range.start, endPosition = range.end;
        var startRow = startPosition.row, endRow = endPosition.row;

        var startCharRect =
            layoutManager.characterRectForPosition(startPosition);
        var endCharRect = layoutManager.characterRectForPosition(endPosition);

        if (startRow === endRow) {
            // Plain rectangle
            context.beginPath();
            context.moveTo(startCharRect.x, startCharRect.y);
            context.lineTo(endCharRect.x, endCharRect.y);
            context.lineTo(endCharRect.x, endCharRect.y + endCharRect.height);
            context.lineTo(startCharRect.x,
                startCharRect.y + startCharRect.height);
            context.closePath();
            return;
        }

        //                _____1__________
        //  _______3_____|2    _____7_____|8
        // |4_________5_______|6

        var startLineRect = layoutManager.lineRectForRow(startRow);
        var endLineRect = layoutManager.lineRectForRow(endRow);
        var padding = this.get('padding');

        context.beginPath();
        context.moveTo(startLineRect.x + startLineRect.width +
            padding.right, startLineRect.y);
        context.lineTo(startCharRect.x, startCharRect.y);           // 1
        context.lineTo(startCharRect.x,
            startCharRect.y + startCharRect.height);                // 2
        context.lineTo(startLineRect.x,
            startLineRect.y + startLineRect.height);                // 3
        context.lineTo(endLineRect.x,
            endLineRect.y + endLineRect.height);                    // 4
        context.lineTo(endCharRect.x,
            endCharRect.y + endCharRect.height);                    // 5
        context.lineTo(endCharRect.x, endCharRect.y);               // 6
        context.lineTo(endLineRect.x + endLineRect.width + padding.right,
            endLineRect.y);                                         // 7
        context.lineTo(startLineRect.x + startLineRect.width +
            padding.right, startLineRect.y);                        // 8
        context.closePath();
    },

    // Draws a single insertion point.
    _drawInsertionPoint: function(context, visibleFrame) {
        var range = this._selectedRanges[0];
        var rect = this.get('layoutManager').
            characterRectForPosition(range.start);

        context.save();

        context.strokeStyle = this.get('theme').cursorStyle;
        context.beginPath();
        context.moveTo(rect.x + 0.5, rect.y);
        context.lineTo(rect.x + 0.5, rect.y + rect.height);
        context.closePath();
        context.stroke();

        context.restore();
    },

    _drawLines: function(context, visibleFrame) {
        var layoutManager = this.get('layoutManager');
        var textLines = layoutManager.get('textLines');
        var theme = this.get('theme');
        var lineAscent = this._lineAscent;

        var visibleRange =
            layoutManager.characterRangeForBoundingRect(visibleFrame);

        context.save();

        context.font = theme.editorTextFont;

        var range = this._invalidRange;
        var startRow = range.start.row, endRow = range.end.row;
        for (var row = startRow; row <= endRow; row++) {
            var textLine = textLines[row];
            if (SC.none(textLine)) {
                continue;
            }

            // Clamp the start column and end column to fit within the line
            // text.
            var characters = textLine.characters;
            var length = characters.length;
            var startColumn = row === startRow ? range.start.column :
                visibleRange.start.column;
            if (startColumn >= length) {
                continue;
            }
            var endColumn = row === endRow ? range.end.column :
                visibleRange.end.column;
            if (endColumn > length) {
                endColumn = length;
            }

            // And finally draw the line.
            context.fillStyle = theme.editorTextColor;
            for (var col = startColumn; col < endColumn; col++) {
                var rect = layoutManager.characterRectForPosition({ row: row,
                    column: col });
                context.fillText(characters.substring(col, col + 1),
                    rect.x - 0.5, rect.y + lineAscent - 0.5);
            }
        }

        context.restore();
    },

    // Draws the background highlight for selections.
    _drawSelectionHighlight: function(context, visibleFrame) {
        var theme = this.get('theme');
        var fillStyle = this.get('isFirstResponder') ?
            theme.editorSelectedTextBackground :
            theme.unfocusedCursorFillStyle;

        context.save();

        var thisEditor = this;
        this._selectedRanges.forEach(function(range) {
            context.fillStyle = fillStyle;
            thisEditor._createPathForRange(context, range);
            context.fill();
        });

        context.restore();
    },

    // Draws either the selection or the insertion point.
    _drawSelection: function(context, visibleFrame) {
        if (this._rangeSetIsInsertionPoint(this._selectedRanges)) {
            this._drawInsertionPoint(context, visibleFrame);
        } else {
            this._drawSelectionHighlight(context, visibleFrame);
        }
    },

    // Extends the selection from the origin in the natural way (as opposed to
    // rectangular selection).
    _extendSelectionFromStandardOrigin: function(position) {
        var origin = this._selectionOrigin;
        this._replaceSelection([
            Range.comparePositions(position, origin) < 0 ?
            { start: position, end: origin } :
            { start: origin, end: position }
        ]);
    },

    // Invalidates the entire visible frame. Does not automatically mark the
    // editor for repainting.
    _invalidate: function() {
        this._backgroundInvalid = true;
        this._invalidRange = this.get('layoutManager').
            characterRangeForBoundingRect(this.get('clippingFrame'));
    },

    _invalidateInsertionPointIfNecessary: function(rangeSet) {
        if (this._rangeSetIsInsertionPoint(rangeSet)) {
            this._invalidateRange(Range.extendRange(rangeSet[0],
                { row: 0, column: 1 }));
        }
    },

    _invalidateRange: function(newRange) {
        this.set('layerNeedsUpdate', true);
        this._invalidRange = this._invalidRange === null ? newRange :
            Range.union(this._invalidRange, newRange);
    },

    _rangeSetIsInsertionPoint: function(rangeSet) {
        return Range.isZeroLength(rangeSet[0]);
    },

    // Updates the current selection, invalidating regions appropriately.
    _replaceSelection: function(newRanges) {
        var oldRanges = this._selectedRanges;
        this._selectedRanges = newRanges;

        // Invalidate the parts of the previous selection that aren't in the
        // new selection.
        var intersection = Range.intersectRangeSets(oldRanges, newRanges);
        if (intersection.length !== 0) {
            this._invalidateRange({
                start:  intersection[0].start,
                end:    intersection[intersection.length - 1].end
            });
        }

        // Also invalidate any insertion points. These have to be handled
        // separately, because they're drawn outside of their associated
        // character regions.
        this._invalidateInsertionPointIfNecessary(oldRanges);
        this._invalidateInsertionPointIfNecessary(newRanges);
    },

    // Moves the selection, if necessary, to keep all the positions pointing to
    // actual characters.
    _repositionSelection: function() {
        var textLines = this.get('layoutManager').get('textLines');
        var textLineLength = textLines.length;

        this._replaceSelection(this._selectedRanges.map(function(range) {
            var newStartRow = Math.min(range.start.row, textLineLength);
            var newEndRow = Math.min(range.end.row, textLineLength);
            var startLine = textLines[newStartRow];
            var endLine = textLines[newEndRow];
            return {
                start:  {
                    row:    newStartRow,
                    column: Math.min(range.start.column,
                                startLine.characters.length)
                },
                end:    {
                    row:    newEndRow,
                    column: Math.min(range.end.column,
                                endLine.characters.length)
                }
            };
        }));
    },

    _resize: function() {
        var boundingRect = this.get('layoutManager').boundingRect();
        var padding = this.get('padding');
        this.set('layout', SC.mixin(SC.clone(this.get('layout')), {
            width:  boundingRect.width + padding.right,
            height: boundingRect.height + padding.bottom
        }));
    },

    // Returns the character closest to the given point, obeying the selection
    // rules (including the partialFraction field).
    _selectionPositionForPoint: function(point) {
        var position = this.get('layoutManager').characterAtPoint(point);
        return position.partialFraction < 0.5 ? position :
            { row: position.row, column: position.column + 1 };
    },

    acceptsFirstResponder: true,

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
     * The layout manager from which this editor view receives text.
     */
    layoutManager: null,

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
        backgroundStyle: "#2a211c",
        cursorStyle: "#879aff",
        editorTextColor: "rgb(230, 230, 230)",
        editorTextFont: "10pt Monaco, Lucida Console, monospace",
        editorSelectedTextColor: "rgb(240, 240, 240)",
        editorSelectedTextBackground: "#526da5",
        unfocusedCursorStrokeStyle: "#ff0033",
        unfocusedCursorFillStyle: "#73171e"
    },

    didCreateLayer: function() {
        this.attachTextInputEvents();
    },

    /**
     * This is where the editor is painted from head to toe. Pitiful tricks are
     * used to draw as little as possible.
     */
    drawRect: function(context, visibleFrame) {
        if (this._backgroundInvalid) {
            context.fillStyle = this.get('theme').backgroundStyle;
            context.fillRect(visibleFrame.x, visibleFrame.y,
                visibleFrame.width, visibleFrame.height);
            this._backgroundInvalid = false;
        }

        if (this._invalidRange !== null) {
            this._createPathForRange(context, this._invalidRange);
            context.fillStyle = this.get('theme').backgroundStyle;
            context.fill();
            context.clip();

            this._drawSelection(context, visibleFrame);
            this._drawLines(context, visibleFrame);
        }

        this._invalidRange = null;
    },

    init: function() {
        arguments.callee.base.apply(this, arguments);

        this._invalidRange = null;
        this._selectedRanges =
            [ { start: { row: 0, column: 0 }, end: { row: 0, column: 0 } } ];

        // Allow the user to change the fields of the padding object without
        // screwing up the prototype.
        this.set('padding', SC.clone(this.get('padding')));

        this.getPath('layoutManager.delegates').push(this);

        this._resize();
    },

    keyDown: function(evt) {
        return catalog.getObject('canon').processKeyEvent(evt, this, {
            isTextView: true
        });
    },

    /**
     * The layout manager calls this method to signal to the view that the text
     * and/or layout has changed.
     */
    layoutManagerChangedLayout: function(sender, range) {
        this._invalidateRange(range);
        this._repositionSelection();
        this._resize();
    },

    mouseDown: function(evt) {
        var point = this.convertFrameFromView({
            x: evt.clientX,
            y: evt.clientY
        });

        var position = this._selectionPositionForPoint(point);
        this._replaceSelection([ { start: position, end: position } ]);
        this._selectionOrigin = position;

        this.set('layerNeedsUpdate', true);
        this.becomeFirstResponder();
    },

    mouseDragged: function(evt) {
        this._extendSelectionFromStandardOrigin(
            this._selectionPositionForPoint(
            this.convertFrameFromView({ x: evt.clientX, y: evt.clientY })));

        this.set('layerNeedsUpdate', true);
        this.becomeFirstResponder();
    },

    render: function(context, firstTime) {
        arguments.callee.base.apply(this, arguments);
        if (firstTime) {
            this.renderTextInput(context, firstTime);
        }
    },

    textInserted: function(text) {
        var textStorage = this.get('layoutManager').get('textStorage');
        var selectedRanges = this._selectedRanges;

        // Delete text from all ranges except the first (in reverse order, so
        // that we don't have to check and update positions as we go), then
        // overwrite the first selected range with the text. This is
        // "Cocoa-style" behavior, not "TextMate-style".
        for (var i = selectedRanges.length - 1; i > 0; i--) {
            textStorage.deleteCharacters(selectedRanges[i]);
        }
        var firstRange = selectedRanges[0];
        textStorage.replaceCharacters(firstRange, text);

        // Update the selection to point immediately after the inserted text.
        var lines = text.split("\n");
        var position = lines.length > 1 ?
            {
                row:    firstRange.start.row + lines.length - 1,
                column: lines[lines.length - 1].length
            } :
            {
                row:    firstRange.start.row,
                column: firstRange.start.column + text.length
            };
        this._replaceSelection([ { start: position, end: position } ]);
    }
});

