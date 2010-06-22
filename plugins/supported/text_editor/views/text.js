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

var catalog = require('bespin:plugins').catalog;
var util = require('bespin:util/util');

var Event = require('events').Event;
var CanvasView = require('views/canvas').CanvasView;
var LayoutManager = require('controllers/layoutmanager').LayoutManager;
var Range = require('rangeutils:utils/range');
var Rect = require('utils/rect');
var TextInput = require('views/textinput').TextInput;
var console = require('bespin:console').console;
var settings = require('settings').settings;

// Set this to true to outline all text ranges with a box. This may be useful
// when optimizing syntax highlighting engines.
var DEBUG_TEXT_RANGES = false;


exports.TextView = function(container, editor) {
    CanvasView.call(this, container, true /* preventDownsize */ );
    this.editor = editor;

    // Takes the layoutManager of the editor and uses it.
    var textInput = this.textInput = new TextInput(container, this);

    this.padding = {
        top: 0,
        bottom: 30,
        left: 0,
        right: 30
    };

    this.clippingChanged.add(this.clippingFrameChanged.bind(this));

    var dom = this.domNode;
    dom.style.cursor = "text";
    dom.addEventListener('mousedown', this.mouseDown.bind(this), false);
    dom.addEventListener('mousemove', this.mouseMove.bind(this), false);
    window.addEventListener('mouseup', this.mouseUp.bind(this), false);

    editor.willChangeBuffer.add(this.editorWillChangeBuffer.bind(this));

    // Changeevents.
    this.selectionChanged = new Event();
    this.beganChangeGroup = new Event();
    this.endedChangeGroup = new Event();
    this.willReplaceRange = new Event();
    this.replacedCharacters = new Event();
};

exports.TextView.prototype = new CanvasView();

util.mixin(exports.TextView.prototype, {
    _dragPoint: null,
    _dragTimer: null,
    _enclosingScrollView: null,
    _inChangeGroup: false,
    _insertionPointBlinkTimer: null,
    _insertionPointVisible: true,


    // FIXME: These should be public, not private.
    _keyBuffer: '',
    _keyMetaBuffer: '',
    _keyState: 'start',

    _hasFocus: false,
    _mouseIsDown: false,

    selectionChanged: null,
    beganChangeGroup: null,
    endedChangeGroup: null,
    willReplaceRange: null,
    replacedCharacters: null,

    editorWillChangeBuffer: function(newBuffer) {
        if (this.editor.layoutManager) {
            // Remove events from the old layoutManager.
            var layoutManager = this.editor.layoutManager;
            layoutManager.invalidatedRects.remove(this);
            layoutManager.changedTextAtRow.remove(this);
        }

        // Add the events to the new layoutManager.
        layoutManager = newBuffer.layoutManager;
        layoutManager.invalidatedRects.add(this,
                                this.layoutManagerInvalidatedRects.bind(this));
        layoutManager.changedTextAtRow.add(this,
                                this.layoutManagerChangedTextAtRow.bind(this));
    },

    /**
     * Called by the textInput whenever the textInput gained the focus.
     */
    didFocus: function() {
        // Call _setFocus and not this.hasFocus as we have to pass the
        // 'isFromTextInput' flag.
        this._setFocus(true, true /* fromTextInput */);
    },

    /**
     * Called by the textInput whenever the textinput lost the focus.
     */
    didBlur: function() {
        // Call _setFocus and not this.hasFocus as we have to pass the
        // 'isFromTextInput' flag.
        this._setFocus(false, true /* fromTextInput */);
    },

    _drag: function() {
        var point = this._dragPoint;
        var offset = Rect.offsetFromRect(this.clippingFrame, point);

        this.moveCursorTo(this._selectionPositionForPoint({
                x:  point.x - offset.x,
                y:  point.y - offset.y
            }), true);
    },

    // Draws a single insertion point.
    _drawInsertionPoint: function(rect, context) {
        if (!this._insertionPointVisible) {
            return;
        }

        var range = this.editor.buffer._selectedRange;
        var characterRect = this.editor.layoutManager.
            characterRectForPosition(range.start);
        var x = Math.floor(characterRect.x), y = characterRect.y;
        var width = Math.ceil(characterRect.width);
        var height = characterRect.height;

        context.save();

        var theme = this.editor.themeData.editor;
        if (this._hasFocus) {
            context.strokeStyle = theme.cursorColor;
            context.beginPath();
            context.moveTo(x + 0.5, y);
            context.lineTo(x + 0.5, y + height);
            context.closePath();
            context.stroke();
        } else {
            context.fillStyle = theme.unfocusedCursorBackgroundColor;
            context.fillRect(x + 0.5, y, width - 0.5, height);
            context.strokeStyle = theme.unfocusedCursorColor;
            context.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
        }

        context.restore();
    },

    _drawLines: function(rect, context) {
        var layoutManager = this.editor.layoutManager;
        var textLines = layoutManager.textLines;
        var lineAscent = layoutManager.fontDimension.lineAscent;
        var themeHighlighter = this.editor.themeData.highlighter

        context.save();
        context.font = this.editor.font;

        var range = layoutManager.characterRangeForBoundingRect(rect);
        var rangeStart = range.start, rangeEnd = range.end;
        var startRow = rangeStart.row, endRow = rangeEnd.row;
        for (var row = startRow; row <= endRow; row++) {
            var textLine = textLines[row];
            if (util.none(textLine)) {
                continue;
            }

            // Clamp the start column and end column to fit within the line
            // text.
            var characters = textLine.characters;
            var length = characters.length;
            var endCol = Math.min(rangeEnd.col, length);
            var startCol = rangeStart.col;
            if (startCol >= length) {
                continue;
            }

            // Get the color ranges, or synthesize one if it doesn't exist. We
            // have to be tolerant of bad data, because we may be drawing ahead
            // of the syntax highlighter.
            var colorRanges = textLine.colors;
            if (colorRanges == null) {
                colorRanges = [];
            }

            // Figure out which color range to start in.
            var colorIndex = 0;
            while (colorIndex < colorRanges.length &&
                    startCol < colorRanges[colorIndex].start) {
                colorIndex++;
            }

            var col = (colorIndex < colorRanges.length)
                      ? colorRanges[colorIndex].start
                      : startCol;

            // And finally draw the line.
            while (col < endCol) {
                var colorRange = colorRanges[colorIndex];
                var end = colorRange != null ? colorRange.end : endCol;
                var tag = colorRange != null ? colorRange.tag : 'plain';

                var color = themeHighlighter.hasOwnProperty(tag)
                            ? themeHighlighter[tag]
                            : 'red';
                context.fillStyle = color;

                var pos = { row: row, col: col };
                var rect = layoutManager.characterRectForPosition(pos);

                var snippet = characters.substring(col, end);
                context.fillText(snippet, rect.x, rect.y + lineAscent);

                if (DEBUG_TEXT_RANGES) {
                    context.strokeStyle = color;
                    context.strokeRect(rect.x + 0.5, rect.y + 0.5,
                        rect.width * snippet.length - 1, rect.height - 1);
                }

                col = end;
                colorIndex++;
            }
        }

        context.restore();
    },

    // Draws the background highlight for selections.
    _drawSelectionHighlight: function(rect, context) {
        var theme = this.editor.themeData.editor;
        var fillStyle = this._hasFocus ?
            theme.selectedTextBackgroundColor :
            theme.unfocusedCursorBackgroundColor;
        var layoutManager = this.editor.layoutManager;

        context.save();

        var range = Range.normalizeRange(this.editor.buffer._selectedRange);
        context.fillStyle = fillStyle;
        layoutManager.rectsForRange(range).forEach(function(rect) {
            context.fillRect(rect.x, rect.y, rect.width, rect.height);
        });

        context.restore();
    },

    // Draws either the selection or the insertion point.
    _drawSelection: function(rect, context) {
        if (this._rangeIsInsertionPoint(this.editor.buffer._selectedRange)) {
            this._drawInsertionPoint(rect, context);
        } else {
            this._drawSelectionHighlight(rect, context);
        }
    },

    _getVirtualSelection: function(startPropertyAsWell) {
        var selectedRange = this.editor.buffer._selectedRange;
        var selectedRangeEndVirtual = this.editor.buffer._selectedRangeEndVirtual;

        return {
            start:  startPropertyAsWell && selectedRangeEndVirtual ?
                    selectedRangeEndVirtual : selectedRange.start,
            end:    selectedRangeEndVirtual || selectedRange.end
        };
    },

    _invalidateSelection: function() {
        var adjustRect = function(rect) {
            return {
                x:      rect.x - 1,
                y:      rect.y,
                width:  rect.width + 2,
                height: rect.height
            };
        };

        var layoutManager = this.editor.layoutManager;
        var range = Range.normalizeRange(this.editor.buffer._selectedRange);
        if (!this._rangeIsInsertionPoint(range)) {
            var rects = layoutManager.rectsForRange(range);
            rects.forEach(function(rect) {
                this.invalidateRect(adjustRect(rect));
            }, this);

            return;
        }

        var rect = layoutManager.characterRectForPosition(range.start);
        this.invalidateRect(adjustRect(rect));
    },

    _isReadOnly: function() {
        return this.editor.layoutManager.textStorage.readOnly;
    },

    _keymappingChanged: function() {
        this._keyBuffer = '';
        this._keyState = 'start';
    },

    _performVerticalKeyboardSelection: function(offset) {
        var textStorage = this.editor.layoutManager.textStorage;
        var selectedRangeEndVirtual = this.editor.buffer._selectedRangeEndVirtual;
        var oldPosition = selectedRangeEndVirtual !== null ?
            selectedRangeEndVirtual : this.editor.buffer._selectedRange.end;
        var newPosition = Range.addPositions(oldPosition,
            { row: offset, col: 0 });

        this.moveCursorTo(newPosition, true, true);
    },

    _rangeIsInsertionPoint: function(range) {
        return Range.isZeroLength(range);
    },

    _rearmInsertionPointBlinkTimer: function() {
        if (!this._insertionPointVisible) {
            // Make sure it ends up visible.
            this.blinkInsertionPoint();
        }

        if (this._insertionPointBlinkTimer !== null) {
            clearInterval(this._insertionPointBlinkTimer);
        }

        this._insertionPointBlinkTimer = setInterval(
                                            this.blinkInsertionPoint.bind(this),
                                            750);
    },

    // Moves the selection, if necessary, to keep all the positions pointing to
    // actual characters.
    _repositionSelection: function() {
        var textLines = this.editor.layoutManager.textLines;
        var textLineLength = textLines.length;

        var range = this.editor.buffer._selectedRange;
        var newStartRow = Math.min(range.start.row, textLineLength - 1);
        var newEndRow = Math.min(range.end.row, textLineLength - 1);
        var startLine = textLines[newStartRow];
        var endLine = textLines[newEndRow];
        this.setSelection({
            start: {
                row: newStartRow,
                col: Math.min(range.start.col, startLine.characters.length)
            },
            end: {
                row: newEndRow,
                col: Math.min(range.end.col, endLine.characters.length)
            }
        });
    },

    _scrollPage: function(scrollUp) {
        var clippingFrame = this.clippingFrame;
        var lineAscent = this.editor.layoutManager.fontDimension.lineAscent;
        this.editor.scrollBy(0,
                    (clippingFrame.height + lineAscent) * (scrollUp ? -1 : 1));
    },

    _scrollWhileDragging: function() {
        var point = this._dragPoint;
        var newPoint = this.computeWithClippingFrame(point.layerX, point.layerY);
        util.mixin(this._dragPoint, newPoint);
        this._drag();
    },

    // Returns the character closest to the given point, obeying the selection
    // rules (including the partialFraction field).
    _selectionPositionForPoint: function(point) {
        var position = this.editor.layoutManager.characterAtPoint(point);
        return position.partialFraction < 0.5 ? position :
            Range.addPositions(position, { row: 0, col: 1 });
    },

    _syntaxManagerUpdatedSyntaxForRows: function(startRow, endRow) {
        if (startRow === endRow) {
            return;
        }

        var layoutManager = this.editor.layoutManager;
        layoutManager.updateTextRows(startRow, endRow);

        layoutManager.rectsForRange({
                start:  { row: startRow, col: 0 },
                end:    { row: endRow,   col: 0 }
            }).forEach(this.invalidateRect, this);
    },

    /**
     * Toggles the visible state of the insertion point.
     */
    blinkInsertionPoint: function() {
        this._insertionPointVisible = !this._insertionPointVisible;
        this._invalidateSelection();
    },

    /**
     * Returns the selected characters.
     */
    copy: function() {
        return this.getSelectedCharacters();
    },

    /**
     * Removes the selected characters from the text buffer and returns them.
     */
    cut: function() {
        var cutData = this.getSelectedCharacters();

        if (cutData != '') {
            this.performBackspaceOrDelete(false);
        }

        return cutData;
    },

    /**
     * This is where the editor is painted from head to toe. Pitiful tricks are
     * used to draw as little as possible.
     */
    drawRect: function(rect, context) {
        context.fillStyle = this.editor.themeData.editor.backgroundColor;
        context.fillRect(rect.x, rect.y, rect.width, rect.height);

        this._drawSelection(rect, context);
        this._drawLines(rect, context);
    },

    /**
     * Directs keyboard input to this text view.
     */
    focus: function() {
        this.textInput.focus();
    },

    /** Returns the location of the insertion point in pixels. */
    getInsertionPointPosition: function() {
        var editor = this.editor;
        var range = editor.buffer._selectedRange;
        var rect = editor.layoutManager.characterRectForPosition(range.start);
        return { x: rect.x, y: rect.y };
    },

    /**
     * Returns the characters that are currently selected as a string, or the
     * empty string if none are selected.
     */
    getSelectedCharacters: function() {
        return this._rangeIsInsertionPoint(this.editor.buffer._selectedRange) ? '' :
            this.editor.layoutManager.textStorage.getCharacters(Range.
            normalizeRange(this.editor.buffer._selectedRange));
    },

    /*
     * Returns the currently selected range.
     *
     * @param raw If true, the direction of the selection is preserved: the
     *            'start' field will be the selection origin, and the 'end'
     *            field will always be the selection tail.
     */
    getSelectedRange: function(raw) {
        if (!raw) {
            return Range.normalizeRange(this.editor.buffer._selectedRange);
        } else {
            return this.editor.buffer._selectedRange;
        }
    },

    /**
     * Groups all the changes in the callback into a single undoable action.
     * Nested change groups are supported; one undoable action is created for
     * the entire group of changes.
     */
    groupChanges: function(performChanges) {
        if (this._isReadOnly()) {
            return false;
        }

        if (this._inChangeGroup) {
            performChanges();
            return true;
        }

        this._inChangeGroup = true;
        this.beganChangeGroup(this, this.editor.buffer._selectedRange);

        try {
            performChanges();
        } catch (e) {
            console.error("Error in groupChanges(): " + e);
            this._inChangeGroup = false;
            this.endedChangeGroup(this, this.editor.buffer._selectedRange);
            return false;
        } finally {
            this._inChangeGroup = false;
            this.endedChangeGroup(this, this.editor.buffer._selectedRange);
            return true;
        }
    },

    /**
     * Replaces the selection with the given text and updates the selection
     * boundaries appropriately.
     *
     * @return True if the text view was successfully updated; false if the
     *     change couldn't be made because the text view is read-only.
     */
    insertText: function(text) {
        if (this._isReadOnly()) {
            return false;
        }

        this.groupChanges(function() {
            var textStorage = this.editor.layoutManager.textStorage;
            var range = Range.normalizeRange(this.editor.buffer._selectedRange);

            this.replaceCharacters(range, text);

            // Update the selection to point immediately after the inserted
            // text.
            var lines = text.split('\n');

            var destPosition;
            if (lines.length > 1) {
                destPosition = {
                    row:    range.start.row + lines.length - 1,
                    col: lines[lines.length - 1].length
                };
            } else {
                destPosition = Range.addPositions(range.start,
                    { row: 0, col: text.length });
            }

            this.moveCursorTo(destPosition);
        }.bind(this));

        return true;
    },

    /**
     * Returns true if the given character is a word separator.
     */
    isDelimiter: function(character) {
        return '"\',;.!~@#$%^&*?[]<>():/\\-+ \t'.indexOf(character) !== -1;
    },

    keyDown: function(evt) {
        if (evt.charCode === 0 || evt._charCode === 0) {    // hack for Fx
            var preds = { isTextView: true };
            return this.editor.processKeyEvent(evt, this, preds);
        } else if (evt.keyCode === 9) {
            // Stops the tab. Otherwise the editor can lose focus.
            evt.preventDefault();
        } else {
            // This is a real keyPress event. This should not be handled,
            // otherwise the textInput mixin can't detect the key events.
            return false;
        }
    },

    /**
     * Runs the syntax highlighter from the given row to the end of the visible
     * range, and repositions the selection.
     */
    layoutManagerChangedTextAtRow: function(sender, row) {
        this._repositionSelection();
    },

    /**
     * Marks the given rectangles as invalid.
     */
    layoutManagerInvalidatedRects: function(sender, rects) {
        rects.forEach(this.invalidateRect, this);
    },

    mouseDown: function(evt) {
        util.stopEvent(evt);

        this.hasFocus = true;
        this._mouseIsDown = true;

        var point = this.computeWithClippingFrame(evt.layerX, evt.layerY);
        util.mixin(point, { layerX: evt.layerX, layerY: evt.layerY});

        switch (evt.detail) {
        case 1:
            var pos = this._selectionPositionForPoint(point);
            this.moveCursorTo(pos, evt.shiftKey);
            break;

        // Select the word under the cursor.
        case 2:
            var pos = this._selectionPositionForPoint(point);
            var line = this.editor.layoutManager.textStorage.lines[pos.row];

            // If there is nothing to select in this line, then skip.
            if (line.length === 0) {
                return true;
            }

            pos.col -= (pos.col == line.length ? 1 : 0);
            var skipOnDelimiter = !this.isDelimiter(line[pos.col]);

            var thisTextView = this;
            var searchForDelimiter = function(pos, dir) {
                for (pos; pos > -1 && pos < line.length; pos += dir) {
                    if (thisTextView.isDelimiter(line[pos]) ===
                            skipOnDelimiter) {
                        break;
                    }
                }
                return pos + (dir == 1 ? 0 : 1);
            };

            var colFrom = searchForDelimiter(pos.col, -1);
            var colTo   = searchForDelimiter(pos.col, 1);

            this.moveCursorTo({ row: pos.row, col: colFrom });
            this.moveCursorTo({ row: pos.row, col: colTo }, true);

            break;

        case 3:
            var lines = this.editor.layoutManager.textStorage.lines;
            var pos = this._selectionPositionForPoint(point);
            this.setSelection({
                start: {
                    row: pos.row,
                    col: 0
                },
                end: {
                    row: pos.row,
                    col: lines[pos.row].length
                }
            });
            break;
        }

        this._dragPoint = point;
        this._dragTimer = setInterval(this._scrollWhileDragging.bind(this), 100);
    },

    mouseMove: function(evt) {
        if (this._mouseIsDown) {
            this._dragPoint = this.computeWithClippingFrame(evt.layerX, evt.layerY);
            util.mixin(this._dragPoint, { layerX: evt.layerX, layerY: evt.layerY});
            this._drag();
        }
    },

    mouseUp: function(evt) {
        this._mouseIsDown = false;
        if (this._dragTimer !== null) {
            clearInterval(this._dragTimer);
            this._dragTimer = null;
        }
    },

    /**
     * Moves the cursor.
     *
     * @param position{Position} The position to move the cursor to.
     *
     * @param select{bool} Whether to preserve the selection origin. If this
     *        parameter is false, the selection is removed, and the insertion
     *        point moves to @position. Typically, this parameter is set when
     *        the mouse is being dragged or the shift key is held down.
     *
     * @param virtual{bool} Whether to save the current end position as the
     *        virtual insertion point. Typically, this parameter is set when
     *        moving vertically.
     */
    moveCursorTo: function(position, select, virtual) {
        var textStorage = this.editor.layoutManager.textStorage;
        var positionToUse = textStorage.clampPosition(position);

        this.setSelection({
            start:  select ? this.editor.buffer._selectedRange.start : positionToUse,
            end:    positionToUse
        });

        if (virtual) {
            var lineCount = textStorage.lines.length;
            var row = position.row, col = position.col;
            if (row > 0 && row < lineCount) {
                this.editor.buffer._selectedRangeEndVirtual = position;
            } else {
                this.editor.buffer._selectedRangeEndVirtual = {
                    row: row < 1 ? 0 : lineCount - 1,
                    col: col
                };
            }
        } else {
            this.editor.buffer._selectedRangeEndVirtual = null;
        }

        this.scrollToPosition(this.editor.buffer._selectedRange.end);
    },

    moveDown: function() {
        var selection = this._getVirtualSelection();
        var range = Range.normalizeRange(selection);
        var position;
        if (this._rangeIsInsertionPoint(this.editor.buffer._selectedRange)) {
            position = range.end;
        } else {
            // Yes, this is actually what Cocoa does... weird, huh?
            position = { row: range.end.row, col: range.start.col };
        }
        position = Range.addPositions(position, { row: 1, col: 0 });

        this.moveCursorTo(position, false, true);
    },

    moveLeft: function() {
        var range = Range.normalizeRange(this.editor.buffer._selectedRange);
        if (this._rangeIsInsertionPoint(range)) {
            this.moveCursorTo(this.editor.layoutManager.textStorage.
                displacePosition(range.start, -1));
        } else {
            this.moveCursorTo(range.start);
        }
    },

    moveRight: function() {
        var range = Range.normalizeRange(this.editor.buffer._selectedRange);
        if (this._rangeIsInsertionPoint(range)) {
            this.moveCursorTo(this.editor.layoutManager.textStorage.
                displacePosition(range.end, 1));
        } else {
            this.moveCursorTo(range.end);
        }
    },

    moveUp: function() {
        var range = Range.normalizeRange(this._getVirtualSelection(true));
        position = Range.addPositions({
            row: range.start.row,
            col: this._getVirtualSelection().end.col
        }, { row: -1, col: 0 });

        this.moveCursorTo(position, false, true);
    },

    parentViewFrameChanged: function() {
        arguments.callee.base.apply(this, arguments);
        this._resize();
    },

    /**
     * As an undoable action, replaces the characters within the old range with
     * the supplied characters.
     *
     * TODO: Factor this out into the undo controller. The fact that commands
     * have to go through the view in order to make undoable changes is
     * counterintuitive.
     *
     * @param oldRange{Range}    The range of characters to modify.
     * @param characters{string} The string to replace the characters with.
     *
     * @return True if the changes were successfully made; false if the changes
     *     couldn't be made because the editor is read-only.
     */
    replaceCharacters: function(oldRange, characters) {
        if (this._isReadOnly()) {
            return false;
        }

        this.groupChanges(function() {
            oldRange = Range.normalizeRange(oldRange);
            this.willReplaceRange(this, oldRange);

            var textStorage = this.editor.layoutManager.textStorage;
            textStorage.replaceCharacters(oldRange, characters);
            this.replacedCharacters(this, oldRange, characters);
        }.bind(this));

        return true;
    },

    /**
     * Performs a delete-backward or delete-forward operation.
     *
     * @param isBackspace{boolean} If true, the deletion proceeds backward (as if
     *     the backspace key were pressed); otherwise, deletion proceeds forward.
     *
     * @return True if the operation was successfully performed; false if the
     *     operation failed because the editor is read-only.
     */
    performBackspaceOrDelete: function(isBackspace) {
        if (this._isReadOnly()) {
            return false;
        }

        var model = this.editor.layoutManager.textStorage;

        var lines = model.lines;
        var line = '', count = 0;
        var tabstop = settings.get('tabstop');
        var range = this.getSelectedRange();

        if (Range.isZeroLength(range)) {
            if (isBackspace) {
                var start = range.start;
                line = lines[start.row];
                var preWhitespaces = line.substring(0, start.col).
                                                    match(/\s*$/)[0].length;

                // If there are less then n-tabstop whitespaces in front, OR
                // the current cursor position is not n times tabstop, THEN
                // delete only 1 character.
                if (preWhitespaces < tabstop
                        || (start.col - tabstop) % tabstop != 0) {
                    count = 1;
                } else {
                    // Otherwise delete tabstop whitespaces.
                    count = tabstop;
                }

                range = {
                    start:  model.displacePosition(start, count * -1),
                    end:    range.end
                };
            } else {
                var end = range.end;
                line = lines[end.row];
                var trailingWhitespaces = line.substring(end.col).
                                                    match(/^\s*/)[0].length;

                // If there are less then n-tabstop whitespaces after the cursor
                // position, then delete only 1 character. Otherwise delete
                // tabstop whitespaces.
                if (trailingWhitespaces < tabstop) {
                    count = 1;
                } else {
                    count = tabstop;
                }

                range = {
                    start:  range.start,
                    end:    model.displacePosition(range.end, count)
                };
            }
        }

        this.groupChanges(function() {
            this.replaceCharacters(range, '');

            // Position the insertion point at the start of all the ranges that
            // were just deleted.
            this.moveCursorTo(range.start);
        }.bind(this));

        return true;
    },

    /** Removes all buffered keys. */
    resetKeyBuffers: function() {
        this._keyBuffer = '';
        this._keyMetaBuffer = '';
    },

    /**
     * If the text view is inside a scrollable view, scrolls down by one page.
     */
    scrollPageDown: function() {
        this._scrollPage(false);
    },

    /**
     * If the text view is inside a scrollable view, scrolls up by one page.
     */
    scrollPageUp: function() {
        this._scrollPage(true);
    },

    /**
     * If this view is in a scrollable container, scrolls to the given
     * character position.
     */
    scrollToPosition: function(position) {
        var rect = this.editor.layoutManager.characterRectForPosition(position);
        var rectX = rect.x, rectY = rect.y;
        var rectWidth = rect.width, rectHeight = rect.height;

        var frame = this.clippingFrame;
        var frameX = frame.x, frameY = frame.y;

        var padding = this.padding;
        var width = frame.width - padding.right;
        var height = frame.height - padding.bottom;

        var x;
        if (rectX >= frameX + 30 /* This is a hack to allow dragging to the left */
                    && rectX + rectWidth < frameX + width) {
            x = frameX;
        } else {
            x = rectX - width / 2 + rectWidth / 2;
        }

        var y;
        if (rectY >= frameY && rectY + rectHeight < frameY + height) {
            y = frameY;
        } else {
            y = rectY - height / 2 + rectHeight / 2;
        }

        this.editor.scrollTo({ x: x, y: y });
    },

    /**
     * Selects all characters in the buffer.
     */
    selectAll: function() {
        var lines = this.editor.layoutManager.textStorage.lines;
        var lastRow = lines.length - 1;
        this.setSelection({
            start:  { row: 0, col: 0 },
            end:    { row: lastRow, col: lines[lastRow].length }
        });
    },

    selectDown: function() {
        this._performVerticalKeyboardSelection(1);
    },

    selectLeft: function() {
        this.moveCursorTo((this.editor.layoutManager.textStorage.
            displacePosition(this.editor.buffer._selectedRange.end, -1)), true);
    },

    selectRight: function() {
        this.moveCursorTo((this.editor.layoutManager.textStorage.
            displacePosition(this.editor.buffer._selectedRange.end, 1)), true);
    },

    selectUp: function() {
        this._performVerticalKeyboardSelection(-1);
    },

    /**
     * Directly replaces the current selection with a new one.
     */
    setSelection: function(newRange, ensureVisible) {
        var textStorage = this.editor.layoutManager.textStorage;

        newRange = textStorage.clampRange(newRange);
        if (Range.equal(newRange, this.editor.buffer._selectedRange)) {
            return;
        }

        // Invalidate the old selection.
        this._invalidateSelection();

        // Set the new selection and invalidate it.
        this.editor.buffer._selectedRange = newRange =
                                                textStorage.clampRange(newRange);
        this._invalidateSelection();

        if (this._hasFocus) {
            this._rearmInsertionPointBlinkTimer();
        }

        if (ensureVisible) {
            this.scrollToPosition(newRange.end);
        }

        this.selectionChanged(newRange);
        catalog.publish(this.editor, 'editorChange', 'selection', newRange);
    },

    textInserted: function(text) {
        // We don't handle the new line char at this point.
        if (text === '\n') {
            return;
        }

        var preds = { isTextView: true, isCommandKey: false };
        if (!this.editor.processKeyEvent(text, this, preds)) {
            this.insertText(text);
            this.resetKeyBuffers();
        }
    },

    /**
     * Changes the internal hasFocus flag if the current hasFocus value is not
     * equal to the parameter 'value'. If 'fromTextInput' is true, then
     * the textInput.focus() and textInput.blur() is not called. This is
     * necessary as otherwise the textInput detects the blur event, calls
     * hasFocus = false and the _setFocus function calls textInput.blur() again.
     * If the textInput was blured, because the entire page lost the focus, then
     * the foucs is not reset to the textInput when the page gains the focus again.
     */
    _setFocus: function(value, fromTextInput) {
        if (value == this._hasFocus) {
            return;
        }

        this._hasFocus = value;

        if (this._hasFocus) {
            this._rearmInsertionPointBlinkTimer();
            this._invalidateSelection();
            if (!fromTextInput) {
                 this.textInput.focus();
            }
        } else {
            if (this._insertionPointBlinkTimer) {
                clearInterval(this._insertionPointBlinkTimer);
                this._insertionPointBlinkTimer = null;
            }
            this._insertionPointVisible = true;
            this._invalidateSelection();
            if (!fromTextInput) {
                 this.textInput.blur();
            }
        }
    }
});

Object.defineProperties(exports.TextView.prototype, {
    hasFocus: {
        get: function() {
            return this._hasFocus;
        },

        set: function(value) {
            this._setFocus(value, false /* fromTextInput*/);
        }
    }
});
