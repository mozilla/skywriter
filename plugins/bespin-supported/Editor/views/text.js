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
var LayoutManager = require('controllers/layoutmanager').LayoutManager;
var Range = require('utils/range');
var Rect = require('utils/rect');
var TextInput = require('bespin:editor/mixins/textinput').TextInput;
var catalog = require('bespin:plugins').catalog;

exports.TextView = CanvasView.extend(TextInput, {
    _backgroundInvalid: false,
    _dragPoint: null,
    _dragTimer: null,
    _invalidRange: null,

    // TODO: calculate from the size or let the user override via themes if
    // desired
    _lineAscent: 16,

    _selectedRanges: null,
    _selectionOrigin: null,
    _virtualInsertionPoint: null,

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

    _drag: function() {
        var point = this.convertFrameFromView(this._dragPoint);
        var offset = Rect.offsetFromRect(this.get('clippingFrame'), point);

        this._extendSelectionFromStandardOrigin(this.
            _selectionPositionForPoint({
                x:  point.x - offset.x,
                y:  point.y - offset.y
            }));

        this.setNeedsDisplay();
        this.becomeFirstResponder();
    },

    // Draws a single insertion point.
    _drawInsertionPoint: function(rect, context) {
        var range = this._selectedRanges[0];
        var characterRect = this.get('layoutManager').
            characterRectForPosition(range.start);

        context.save();

        context.strokeStyle = this.get('theme').cursorStyle;
        context.beginPath();
        context.moveTo(characterRect.x + 0.5, characterRect.y);
        context.lineTo(characterRect.x + 0.5,
            characterRect.y + characterRect.height);
        context.closePath();
        context.stroke();

        context.restore();
    },

    _drawLines: function(rect, context) {
        var layoutManager = this.get('layoutManager');
        var textLines = layoutManager.get('textLines');
        var theme = this.get('theme');
        var lineAscent = this._lineAscent;

        var visibleRange = layoutManager.characterRangeForBoundingRect(rect);

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
                var characterRect = layoutManager.characterRectForPosition({
                    row:    row,
                    column: col
                });
                context.fillText(characters.substring(col, col + 1),
                    characterRect.x - 0.5, characterRect.y + lineAscent - 0.5);
            }
        }

        context.restore();
    },

    // Draws the background highlight for selections.
    _drawSelectionHighlight: function(rect, context) {
        var theme = this.get('theme');
        var fillStyle = this.get('isFirstResponder') ?
            theme.editorSelectedTextBackground :
            theme.unfocusedCursorFillStyle;

        context.save();

        this._selectedRanges.forEach(function(range) {
            context.fillStyle = fillStyle;
            this._createPathForRange(context, range);
            context.fill();
        }, this);

        context.restore();
    },

    // Draws either the selection or the insertion point.
    _drawSelection: function(rect, context) {
        if (this._rangeSetIsInsertionPoint(this._selectedRanges)) {
            this._drawInsertionPoint(rect, context);
        } else {
            this._drawSelectionHighlight(rect, context);
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

    // Returns the virtual insertion point, which is the origin used for
    // vertical movement. Normally, the virtual insertion point is the same as
    // the actual insertion point, but when the cursor moves vertically, the
    // column of the virtual insertion point remains the same.
    _getVirtualInsertionPoint: function() {
        var point = this._virtualInsertionPoint;
        return point === null ? this._selectedRanges[0].start : point;
    },

    // Replaces the selection with the given text and updates the selection
    // boundaries appropriately.
    _insertText: function(text) {
        var textStorage = this.getPath('layoutManager.textStorage');
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
        this._reanchorSelection(lines.length > 1 ?
            {
                row:    firstRange.start.row + lines.length - 1,
                column: lines[lines.length - 1].length
            } :
            Range.addPositions(firstRange.start,
                { row: 0, column: text.length }));
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
        this.setNeedsDisplay();
        this._invalidRange = this._invalidRange === null ? newRange :
            Range.unionRanges(this._invalidRange, newRange);
    },

    _performVerticalKeyboardSelection: function(offset) {
        var oldPosition = this._virtualInsertionPoint !== null ?
            this._virtualInsertionPoint : this._selectionTail();
        var newPosition = Range.addPositions(oldPosition,
            { row: offset, column: 0 });
        var clampedPosition = this.getPath('layoutManager.textStorage').
            clampPosition(newPosition);

        this._extendSelectionFromStandardOrigin(clampedPosition);

        // Never let the virtual insertion point's row go beyond the boundaries
        // of the text.
        this._virtualInsertionPoint = {
            row:    clampedPosition.row,
            column: newPosition.column
        };
    },

    _rangeSetIsInsertionPoint: function(rangeSet) {
        return Range.isZeroLength(rangeSet[0]);
    },

    // Clears out the selection, moves the selection origin and the insertion
    // point to the given position, and scrolls to the new selection.
    _reanchorSelection: function(newPosition) {
        this._replaceSelection([ { start: newPosition, end: newPosition } ]);
        this._selectionOrigin = newPosition;
        this._scrollToPosition(newPosition);
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

    _scrollToPosition: function(position) {
        var scrollable = this._scrollView();
        if (SC.none(scrollable)) {
            return;
        }

        var rect = this.get('layoutManager').
            characterRectForPosition(position);
        var rectX = rect.x, rectY = rect.y;
        var rectWidth = rect.width, rectHeight = rect.height;

        var frame = this.get('clippingFrame');
        var frameX = frame.x, frameY = frame.y;

        var padding = this.get('padding');
        var width = frame.width - padding.right;
        var height = frame.height - padding.bottom;

        scrollable.scrollTo(rectX >= frameX &&
            rectX + rectWidth < frameX + width ?
            frameX : rectX - width / 2 + rectWidth / 2,
            rectY >= frameY &&
            rectY + rectHeight < frameY + height ?
            frameY : rectY - height / 2 + rectHeight / 2);
    },

    _scrollWhileDragging: function() {
        var scrollView = this._scrollView();
        if (SC.none(scrollView)) {
            return;
        }

        var offset = Rect.offsetFromRect(this.get('clippingFrame'),
            this.convertFrameFromView(this._dragPoint));
        if (offset.x === 0 && offset.y === 0) {
            return;
        }

        scrollView.scrollBy(offset.x, offset.y);
        this._drag();
    },

    /**
     * @private
     *
     * Returns the parent scroll view, if one exists.
     */
    _scrollView: function() {
        var view = this.get('parentView');
        while (!SC.none(view) && !view.get('isScrollable')) {
            view = view.get('parentView');
        }
        return view;
    },

    // Returns the position of the tail of the selection, or the farthest
    // position within the selection from the origin.
    _selectionTail: function() {
        var ranges = this._selectedRanges;
        return Range.comparePositions(ranges[0].start,
                this._selectionOrigin) === 0 ?
            ranges[ranges.length - 1].end : // selection extends down
            ranges[0].start;                // selection extends up
    },

    // Returns the character closest to the given point, obeying the selection
    // rules (including the partialFraction field).
    _selectionPositionForPoint: function(point) {
        var position = this.get('layoutManager').characterAtPoint(point);
        return position.partialFraction < 0.5 ? position :
            Range.addPositions(position, { row: 0, column: 1 });
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

    /**
     * Deletes the selection or the previous character, if the selection is an
     * insertion point.
     */
    backspace: function() {
        var textStorage = this.getPath('layoutManager.textStorage');
        var lines = textStorage.get('lines');

        // If the selection is an insertion point, extend it back by one
        // character.
        var ranges = this._selectedRanges;
        if (this._rangeSetIsInsertionPoint(ranges)) {
            var range = ranges[0];
            ranges = [
                {
                    start:  textStorage.displacePosition(range.start, -1),
                    end:    range.end
                }
            ]
        }

        ranges.forEach(function(range) {
            textStorage.deleteCharacters(range);
        });

        // Position the insertion point at the start of all the ranges that
        // were just deleted.
        this._reanchorSelection(ranges[0].start);
    },

    /**
     * This is where the editor is painted from head to toe. Pitiful tricks are
     * used to draw as little as possible.
     */
    drawRect: function(rect, context) {
        if (this._backgroundInvalid) {
            context.fillStyle = this.get('theme').backgroundStyle;
            context.fillRect(rect.x, rect.y, rect.width, rect.height);
            this._backgroundInvalid = false;
        }

        if (this._invalidRange !== null) {
            this._createPathForRange(context, this._invalidRange);
            context.fillStyle = this.get('theme').backgroundStyle;
            context.fill();
            context.clip();

            this._drawSelection(rect, context);
            this._drawLines(rect, context);
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
        this._reanchorSelection(this._selectionPositionForPoint(this.
            convertFrameFromView({ x: evt.clientX, y: evt.clientY })));
        this._virtualInsertionPoint = null;

        this._dragPoint = { x: evt.clientX, y: evt.clientY };
        this._dragTimer = SC.Timer.schedule({
            target:     this,
            action:     '_scrollWhileDragging',
            interval:   100,
            repeats:    true
        });

        this.setNeedsDisplay();
        this.becomeFirstResponder();
    },

    mouseDragged: function(evt) {
        this._dragPoint = { x: evt.clientX, y: evt.clientY };
        this._drag();
    },

    mouseUp: function(evt) {
        if (this._dragTimer !== null) {
            this._dragTimer.invalidate();
        }
    },

    moveDown: function() {
        var ranges = this._selectedRanges;
        var position;
        if (this._rangeSetIsInsertionPoint(ranges)) {
            position = this._getVirtualInsertionPoint();
        } else {
            // Yes, this is actually what Cocoa does... weird, huh?
            var range = ranges[0];
            position = { row: range.end.row, column: range.start.column };
        }
        position = Range.addPositions(position, { row: 1, column: 0 });

        this._reanchorSelection(this.getPath('layoutManager.textStorage').
            clampPosition(position));
        this._virtualInsertionPoint = position;
    },

    moveLeft: function() {
        this._reanchorSelection(this.getPath('layoutManager.textStorage').
            displacePosition(this._selectedRanges[0].start, -1));
        this._virtualInsertionPoint = null;
    },

    moveRight: function() {
        var ranges = this._selectedRanges;
        this._reanchorSelection(this.getPath('layoutManager.textStorage').
            displacePosition(ranges[ranges.length - 1].end, 1));
        this._virtualInsertionPoint = null;
    },

    moveUp: function() {
        var ranges = this._selectedRanges;
        var position = this._rangeSetIsInsertionPoint(ranges) ?
            this._getVirtualInsertionPoint() : ranges[0].start;
        position = Range.addPositions(position, { row: -1, column: 0 });

        this._reanchorSelection(this.getPath('layoutManager.textStorage').
            clampPosition(position));
        this._virtualInsertionPoint = position;
    },

    /**
     * Inserts a newline at the insertion point.
     */
    newline: function() {
        // Insert a newline, and copy the spaces at the beginning of the
        // current row to autoindent.
        var position = this._selectedRanges[0].start;
        this._insertText("\n" + /^\s*/.exec(this.
            getPath('layoutManager.textStorage.lines')[position.row].
            substring(0, position.column))[0]);
    },

    selectDown: function() {
        this._performVerticalKeyboardSelection(1);
    },

    selectLeft: function() {
        this._extendSelectionFromStandardOrigin(this.
            getPath('layoutManager.textStorage').
            displacePosition(this._selectionTail(), -1));
        this._virtualInsertionPoint = null;
    },

    selectRight: function() {
        this._extendSelectionFromStandardOrigin(this.
            getPath('layoutManager.textStorage').
            displacePosition(this._selectionTail(), 1));
        this._virtualInsertionPoint = null;
    },

    selectUp: function() {
        this._performVerticalKeyboardSelection(-1);
    },

    tab: function() {
        this._insertText("        ".substring(0, 8 -
            this._selectedRanges[0].start.column % 8));
    },

    textInserted: function(text) {
        this._insertText(text);
    }
});

