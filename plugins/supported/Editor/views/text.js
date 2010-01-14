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
var LayoutManager = require('controllers/layoutmanager').LayoutManager;
var MultiDelegateSupport =
    require('mixins/multidelegate').MultiDelegateSupport;
var Range = require('utils/range');
var Rect = require('utils/rect');
var TextInput = require('bespin:editor/mixins/textinput').TextInput;
var keyboardManager = require('Canon:keyboard').keyboardManager;

exports.TextView = CanvasView.extend(MultiDelegateSupport, TextInput, {
    _dragPoint: null,
    _dragTimer: null,
    _inChangeGroup: false,

    // TODO: calculate from the size or let the user override via themes if
    // desired
    _lineAscent: 16,

    _selectedRange: null,
    _selectedRangeEndVirtual: null,

    _beginChangeGroup: function() {
        if (this._inChangeGroup) {
            throw "TextView._beginChangeGroup() called while already in a " +
                "change group";
        }

        this._inChangeGroup = true;
        this.notifyDelegates('textViewBeganChangeGroup', this._selectedRange);
    },

    _drag: function() {
        var point = this.convertFrameFromView(this._dragPoint);
        var offset = Rect.offsetFromRect(this.get('clippingFrame'), point);

        this._moveCursorTo(this._selectionPositionForPoint({
                x:  point.x - offset.x,
                y:  point.y - offset.y
            }), false, true);

        this.becomeFirstResponder();
    },

    // Draws a single insertion point.
    _drawInsertionPoint: function(rect, context) {
        var range = this._selectedRange;
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

        context.save();
        context.font = theme.editorTextFont;

        var range = layoutManager.characterRangeForBoundingRect(rect);
        var rangeStart = range.start, rangeEnd = range.end;
        var startRow = rangeStart.row, endRow = rangeEnd.row;
        for (var row = startRow; row <= endRow; row++) {
            var textLine = textLines[row];
            if (SC.none(textLine)) {
                continue;
            }

            // Clamp the start column and end column to fit within the line
            // text.
            var characters = textLine.characters;
            var length = characters.length;
            var endColumn = Math.min(rangeEnd.column, length);
            var startColumn = rangeStart.column;
            if (startColumn >= length) {
                continue;
            }

            // Figure out which color range to start in.
            var colorRanges = textLine.colors;
            var colorIndex = 0;
            while (startColumn < colorRanges[colorIndex].start) {
                colorIndex++;
            }

            // And finally draw the line.
            var column = startColumn;
            while (column < endColumn) {
                var colorRange = colorRanges[colorIndex];
                var colorRangeEnd = colorRange.end;
                context.fillStyle = colorRange.color;

                var characterRect = layoutManager.characterRectForPosition({
                    row:    row,
                    column: column
                });
                context.fillText(characters.substring(column, colorRangeEnd),
                    characterRect.x, characterRect.y + lineAscent);

                column = colorRangeEnd;
                colorIndex++;
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
        var layoutManager = this.get('layoutManager');

        context.save();

        var range = Range.normalizeRange(this._selectedRange);
        context.fillStyle = fillStyle;
        layoutManager.rectsForRange(range).forEach(function(rect) {
            context.fillRect(rect.x, rect.y, rect.width, rect.height);
        });

        context.restore();
    },

    // Draws either the selection or the insertion point.
    _drawSelection: function(rect, context) {
        if (this._rangeIsInsertionPoint(this._selectedRange)) {
            this._drawInsertionPoint(rect, context);
        } else {
            this._drawSelectionHighlight(rect, context);
        }
    },

    _endChangeGroup: function() {
        if (!this._inChangeGroup) {
            throw "TextView._endChangeGroup() called while not in a change " +
                "group";
        }

        this._inChangeGroup = false;
        this.notifyDelegates('textViewEndedChangeGroup', this._selectedRange);
    },

    _getVirtualSelection: function(startPropertyAsWell) {
        return {
            start:  startPropertyAsWell && this._selectedRangeEndVirtual ?
                    this._selectedRangeEndVirtual : this._selectedRange.start,
            end:    this._selectedRangeEndVirtual || this._selectedRange.end
        };
    },

    // Replaces the selection with the given text and updates the selection
    // boundaries appropriately.
    _insertText: function(text) {
        this._beginChangeGroup();

        var textStorage = this.getPath('layoutManager.textStorage');
        var range = Range.normalizeRange(this._selectedRange);

        this._replaceCharacters(range, text);

        // Update the selection to point immediately after the inserted text.
        var lines = text.split("\n");
        this._moveCursorTo(lines.length > 1 ?
            {
                row:    range.start.row + lines.length - 1,
                column: lines[lines.length - 1].length
            } :
            Range.addPositions(range.start, { row: 0, column: text.length }));

        this._endChangeGroup();
    },

    _invalidateInsertionPointIfNecessary: function(range) {
        if (!this._rangeIsInsertionPoint(range)) {
            return;
        }

        var rect = this.get('layoutManager').
            characterRectForPosition(range.start);
        this.setNeedsDisplayInRect({
            x:      rect.x,
            y:      rect.y,
            width:  1,
            height: rect.height
        });
    },

    _isDelimiter: function(character) {
        return [
            "=", " ", "\t", ">", "<", ".", ",", "(", ")", "{", "}", ":", '"',
            "'", ";"
        ].indexOf(character) > -1;
    },

    _moveCursorTo: function(position, doSaveVirtualEnd, selection) {
        var positionToUse;
        var textStorage = this.getPath('layoutManager.textStorage');

        positionToUse = textStorage.clampPosition(position);

        this.setSelection({
            start:  selection ? this._selectedRange.start : positionToUse,
            end:    positionToUse
        });

        if (doSaveVirtualEnd) {
            if (position.row > 0 && position.row < textStorage.lines.length) {
                this._selectedRangeEndVirtual = position;
            } else {
                this._selectedRangeEndVirtual = position;
            }
        } else {
            this._selectedRangeEndVirtual = null;
        }

        this._scrollToPosition(this._selectedRange.end);
    },

    _moveOrSelectEnd: function(shift, inLine) {
        var lines = this.getPath('layoutManager.textStorage.lines');
        var row = inLine ? this._selectedRange.end.row : lines.length - 1;
        this._moveCursorTo({ row: row, column: lines[row].length }, false,
            shift);
    },

    _moveOrSelectStart: function(shift, inLine) {
        var range = this._selectedRange;
        var row = inLine ? range.end.row : 0;
        var position = {
            row: row,
            column: 0
        };

        this._moveCursorTo(position, false, shift);
    },

    _performBackspaceOrDelete: function(isBackspace) {
        this._beginChangeGroup();

        var textStorage = this.getPath('layoutManager.textStorage');
        var lines = textStorage.get('lines');

        // If the selection is an insertion point...
        var range = Range.normalizeRange(this._selectedRange);
        if (this._rangeIsInsertionPoint(range)) {
            if (isBackspace) {
                // ... extend it backward by one character.
                range = {
                    start:  textStorage.displacePosition(range.start, -1),
                    end:    range.end
                };
            } else {
                // ... otherwise, extend it forward by one character.
                range = {
                    start:  range.start,
                    end:    textStorage.displacePosition(range.end, 1)
                };
            }
        }

        this._replaceCharacters(range, "");

        // Position the insertion point at the start of all the ranges that
        // were just deleted.
        this._moveCursorTo(range.start);

        this._endChangeGroup();
    },

    _performVerticalKeyboardSelection: function(offset) {
        var textStorage = this.getPath('layoutManager.textStorage');
        var oldPosition = this._selectedRangeEndVirtual !== null ?
            this._selectedRangeEndVirtual : this._selectedRange.end;
        var newPosition = Range.addPositions(oldPosition,
            { row: offset, column: 0 });

        this._moveCursorTo(newPosition, true, true);
    },

    _rangeIsInsertionPoint: function(range) {
        return Range.isZeroLength(range);
    },

    _replaceCharacters: function(oldRange, characters) {
        if (!this._inChangeGroup) {
            throw "TextView._replaceCharacters() called without a change " +
                "group";
        }
        oldRange = Range.normalizeRange(oldRange);
        this.notifyDelegates('textViewWillReplaceRange', oldRange);
        this.getPath('layoutManager.textStorage').replaceCharacters(oldRange,
            characters);
        this.notifyDelegates('textViewReplacedCharacters', oldRange,
            characters);
    },

    // Moves the selection, if necessary, to keep all the positions pointing to
    // actual characters.
    _repositionSelection: function() {
        var textLines = this.getPath('layoutManager.textLines');
        var textLineLength = textLines.length;

        var range = this._selectedRange;
        var newStartRow = Math.min(range.start.row, textLineLength - 1);
        var newEndRow = Math.min(range.end.row, textLineLength - 1);
        var startLine = textLines[newStartRow];
        var endLine = textLines[newEndRow];
        this.setSelection({
            start:  {
                row:    newStartRow,
                column: Math.min(range.start.column,
                            startLine.characters.length)
            },
            end:    {
                row:    newEndRow,
                column: Math.min(range.end.column, endLine.characters.length)
            }
        });
    },

    _resize: function() {
        var boundingRect = this.get('layoutManager').boundingRect();
        var padding = this.get('padding');
        var parentFrame = this.getPath('parentView.frame');
        this.set('layout', SC.mixin(SC.clone(this.get('layout')), {
            width:  Math.max(parentFrame.width,
                    boundingRect.width + padding.right),
            height: Math.max(parentFrame.height,
                    boundingRect.height + padding.bottom)
        }));
    },

    _scrollPage: function(scrollUp) {
        var scrollable = this._scrollView();
        var visibleFrame = this.get('clippingFrame');
        scrollable.scrollTo(visibleFrame.x, visibleFrame.y +
            (visibleFrame.height + this._lineAscent) * (scrollUp ? -1 : 1));
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
        this._performBackspaceOrDelete(true);
    },

    copy: function() {
        return this.getSelectedCharacters();
    },

    cut: function() {
        var cutData = this.getSelectedCharacters();

        if (cutData != '') {
            this.deleteSelectionOrNextCharacter();
        }

        return cutData;
    },

    /**
     * Deletes the selection or the next character, if the selection is an
     * insertion point.
     */
    deleteSelectionOrNextCharacter: function() {
        this._performBackspaceOrDelete(false);
    },

    /**
     * This is where the editor is painted from head to toe. Pitiful tricks are
     * used to draw as little as possible.
     */
    drawRect: function(rect, context) {
        context.fillStyle = this.get('theme').backgroundStyle;
        context.fillRect(rect.x, rect.y, rect.width, rect.height);

        this._drawSelection(rect, context);
        this._drawLines(rect, context);
    },

    /**
     * Returns the characters that are currently selected as a string, or the
     * empty string if none are selected.
     */
    getSelectedCharacters: function() {
        return this._rangeIsInsertionPoint(this._selectedRange) ? "" :
            this.getPath('layoutManager.textStorage').getCharacters(Range.
            normalizeRange(this._selectedRange));
    },

    init: function() {
        arguments.callee.base.apply(this, arguments);

        this._invalidRange = null;
        this._selectedRange =
            { start: { row: 0, column: 0 }, end: { row: 0, column: 0 } };

        // Allow the user to change the fields of the padding object without
        // screwing up the prototype.
        this.set('padding', SC.clone(this.get('padding')));

        this.get('layoutManager').addDelegate(this);

        this._resize();
    },

    keyDown: function(evt) {
        // SC puts keyDown and keyPress event together. Here we only want to
        // handle the real/browser's keydown event. To do so, we have to check
        // if the evt.charCode value is set. If this isn't set, we have been
        // called after a keypress event took place.
        if (evt.charCode === 0) {
            return keyboardManager.processKeyEvent(evt, this,
                { isTextView: true })
        } else {
            // This is a real keyPress event. This should not be handled,
            // otherwise the textInput mixin can't detect the key events.
            return false;
        }
    },

    /**
     * The layout manager calls this method to signal to the view that the text
     * and/or layout has changed.
     */
    layoutManagerInvalidatedRects: function(sender, rects) {
        rects.forEach(this.setNeedsDisplayInRect, this);
        this._repositionSelection();
        this._resize();
    },

    mouseDown: function(evt) {
        switch (evt.clickCount) {
        case 1:
            var pos = this._selectionPositionForPoint(this.
                convertFrameFromView({
                    x:  evt.clientX,
                    y:  evt.clientY
                }));
            this._moveCursorTo(pos, false, evt.shiftKey);
            break;

        // Select the word under the cursor.
        case 2:
            var pos = this._selectionPositionForPoint(this.
                convertFrameFromView({ x: evt.clientX, y: evt.clientY }));
            var line = this.getPath('layoutManager.textStorage').
                                                        lines[pos.row];

            // If there is nothing to select in this line, then skip.
            if (line.length === 0) {
                return;
            }

            pos.column -= (pos.column == line.length ? 1 : 0);
            var skipOnDelimiter = !this._isDelimiter(line[pos.column]);

            var thisTextView = this;
            var searchForDelimiter = function(pos, dir) {
                for (pos; pos > -1 && pos < line.length; pos += dir) {
                    if (thisTextView._isDelimiter(line[pos]) ===
                            skipOnDelimiter) {
                        break;
                    }
                }
                return pos + (dir == 1 ? 0 : 1);
            }

            var columnFrom = searchForDelimiter(pos.column, -1);
            var columnTo   = searchForDelimiter(pos.column, 1);

            this._moveCursorTo({
                    row: pos.row,
                    column: columnFrom
            });
            this._moveCursorTo({
                    row: pos.row,
                    column: columnTo
            }, false, true);

            break;

        case 3:
            var lines = this.getPath('layoutManager.textStorage').lines;
            var pos = this._selectionPositionForPoint(this.
                convertFrameFromView({ x: evt.clientX, y: evt.clientY }));
            this.setSelection({
                start: {
                    row: pos.row,
                    column: 0
                },
                end: {
                    row: pos.row,
                    column: lines[pos.row].length
                }
            })
            break;
        }

        this._dragPoint = { x: evt.clientX, y: evt.clientY };
        this._dragTimer = SC.Timer.schedule({
            target:     this,
            action:     '_scrollWhileDragging',
            interval:   100,
            repeats:    true
        });

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

    moveDocEnd: function() {
        this._moveOrSelectEnd(false, false);
    },

    moveDocStart: function() {
        this._moveOrSelectStart(false, false);
    },

    moveDown: function() {
        var selection = this._getVirtualSelection();
        var range = Range.normalizeRange(selection);
        var position;
        if (this._rangeIsInsertionPoint(this._selectedRange)) {
            position = range.end;
        } else {
            // Yes, this is actually what Cocoa does... weird, huh?
            position = { row: range.end.row, column: range.start.column };
        }
        position = Range.addPositions(position, { row: 1, column: 0 });

        this._moveCursorTo(position, true);
    },

    moveLeft: function() {
        var range = Range.normalizeRange(this._selectedRange);
        if (this._rangeIsInsertionPoint(range)) {
            this._moveCursorTo(this.getPath('layoutManager.textStorage').
                displacePosition(range.start, -1));
        } else {
            this._moveCursorTo(range.start);
        }
    },

    moveLineEnd: function() {
        this._moveOrSelectEnd(false, true);
    },

    moveLineStart: function () {
        this._moveOrSelectStart(false, true);
    },

    moveRight: function() {
        var range = Range.normalizeRange(this._selectedRange);
        if (this._rangeIsInsertionPoint(range)) {
            this._moveCursorTo(this.getPath('layoutManager.textStorage').
                displacePosition(range.end, 1));
        } else {
            this._moveCursorTo(range.end);
        }
    },

    moveUp: function() {
        var range = Range.normalizeRange(this._getVirtualSelection(true));
        position = Range.addPositions({
            row: range.start.row,
            column: this._getVirtualSelection().end.column
        }, { row: -1, column: 0 });

        this._moveCursorTo(position, true);
    },

    selectDocEnd: function() {
        this._moveOrSelectEnd(true, false);
    },

    selectDocStart: function() {
        this._moveOrSelectStart(true, false);
    },

    selectLineEnd: function() {
        this._moveOrSelectEnd(true, true);
    },

    selectLineStart: function() {
        this._moveOrSelectStart(true, true);
    },

    /**
     * Inserts a newline at the insertion point.
     */
    newline: function() {
        // Insert a newline, and copy the spaces at the beginning of the
        // current row to autoindent.
        var position = this._selectedRange.start;
        this._insertText("\n" + /^\s*/.exec(this.
            getPath('layoutManager.textStorage.lines')[position.row].
            substring(0, position.column))[0]);
    },

    scrollDocStart: function() {
        this._scrollToPosition({ column: 0, row: 0 });
    },

    scrollDocEnd: function() {
        this._scrollToPosition(this.getPath('layoutManager.textStorage').
            range().end);
    },

    scrollPageDown: function() {
        this._scrollPage(false);
    },

    scrollPageUp: function() {
        this._scrollPage(true);
    },

    selectAll: function() {
        var range = this._selectedRange;
        var lines = this.getPath('layoutManager.textStorage.lines');
        var lastRow = lines.length - 1;
        this.setSelection({
            start:  { row: 0, column: 0 },
            end:    { row: lastRow, column: lines[lastRow].length }
        });
    },

    selectDown: function() {
        this._performVerticalKeyboardSelection(1);
    },

    selectLeft: function() {
        this._moveCursorTo((this.getPath('layoutManager.textStorage').
            displacePosition(this._selectedRange.end, -1)), false, true);
    },

    selectRight: function() {
        this._moveCursorTo((this.getPath('layoutManager.textStorage').
            displacePosition(this._selectedRange.end, 1)), false, true);
    },

    selectUp: function() {
        this._performVerticalKeyboardSelection(-1);
    },

    /**
     * Directly replaces the current selection with a new one. No bounds
     * checking is performed, and the user is not able to undo this action.
     */
    setSelection: function(newRange) {
        var lines = this.getPath('layoutManager.textStorage').lines.length - 1;

        var oldRangeOrdered = Range.normalizeRange(this._selectedRange);
        var newRangeOrdered = Range.normalizeRange(newRange);
        this._selectedRange = newRange;

        var layoutManager = this.get('layoutManager');
        layoutManager.rectsForRange(oldRangeOrdered).
                forEach(this.setNeedsDisplayInRect, this);
        layoutManager.rectsForRange(newRangeOrdered).
                forEach(this.setNeedsDisplayInRect, this);

        // Also invalidate any insertion points. These have to be handled
        // separately, because they're drawn outside of their associated
        // character regions.
        this._invalidateInsertionPointIfNecessary(oldRangeOrdered);
        this._invalidateInsertionPointIfNecessary(newRangeOrdered);
    },

    tab: function() {
        this._insertText("        ".substring(0, 8 -
            this._selectedRange.start.column % 8));
    },

    textInserted: function(text) {
        this._insertText(text);
    }
});

exports.textViewCommand = function(instruction, args, command) {
    var view = args.view;
    var methodName = command.name;
    view[methodName]();
};
