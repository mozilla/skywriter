/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the 'License'); you may not use this file except in compliance with
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
 * either the GNU General Public License Version 2 or later (the 'GPL'), or
 * the GNU Lesser General Public License Version 2.1 or later (the 'LGPL'),
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
var MultiDelegateSupport = require('delegate_support').MultiDelegateSupport;
var Range = require('rangeutils:utils/range');
var Rect = require('utils/rect');
var TextInput = require('mixins/textinput').TextInput;
var keyboardManager = require('canon:keyboard').keyboardManager;
var settings = require('settings').settings;

// Set this to true to outline all text ranges with a box. This may be useful
// when optimizing syntax highlighting engines.
var DEBUG_TEXT_RANGES = false;

exports.TextView = CanvasView.extend(MultiDelegateSupport, TextInput, {
    _dragPoint: null,
    _dragTimer: null,
    _inChangeGroup: false,
    _insertionPointBlinkTimer: null,
    _insertionPointVisible: true,

    // FIXME: These should be public, not private.
    _keyBuffer: '',
    _keyMetaBuffer: '',
    _keyState: 'start',

    // TODO: calculate from the size or let the user override via themes if
    // desired
    _lineAscent: 16,

    _selectedRange: null,
    _selectedRangeEndVirtual: null,

    _drag: function() {
        var point = this.convertFrameFromView(this._dragPoint);
        var offset = Rect.offsetFromRect(this.get('clippingFrame'), point);

        this.moveCursorTo(this._selectionPositionForPoint({
                x:  point.x - offset.x,
                y:  point.y - offset.y
            }), true);

        this.becomeFirstResponder();
    },

    // Draws a single insertion point.
    _drawInsertionPoint: function(rect, context) {
        if (!this._insertionPointVisible) {
            return;
        }

        var range = this._selectedRange;
        var characterRect = this.get('layoutManager').
            characterRectForPosition(range.start);
        var x = Math.floor(characterRect.x), y = characterRect.y;
        var width = Math.ceil(characterRect.width);
        var height = characterRect.height;

        context.save();

        var theme = this.get('theme');
        if (this.get('isFirstResponder')) {
            context.strokeStyle = theme.cursorStyle;
            context.beginPath();
            context.moveTo(x + 0.5, y);
            context.lineTo(x + 0.5, y + height);
            context.closePath();
            context.stroke();
        } else {
            context.fillStyle = theme.unfocusedCursorFillStyle;
            context.fillRect(x + 0.5, y, width, height);
            context.strokeStyle = theme.unfocusedCursorStrokeStyle;
            context.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
        }

        context.restore();
    },

    _drawLines: function(rect, context) {
        var layoutManager = this.get('layoutManager');
        var textLines = layoutManager.get('textLines');
        var lineAscent = layoutManager.get('lineAscent');
        var theme = this.get('theme');

        context.save();
        context.font = this.getPath('editor.font');

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
            var column = colorRanges[colorIndex].start;
            while (column !== null && column < endColumn) {
                var colorRange = colorRanges[colorIndex];
                var colorRangeEnd = colorRange.end;
                context.fillStyle = colorRange.color;

                var characterRect = layoutManager.characterRectForPosition({
                    row:    row,
                    column: column
                });

                var snippet = colorRangeEnd === null ?
                    characters.substring(column) :
                    characters.substring(column, colorRangeEnd);
                context.fillText(snippet, characterRect.x,
                    characterRect.y + lineAscent);

                if (DEBUG_TEXT_RANGES) {
                    context.strokeStyle = colorRange.color;
                    context.strokeRect(characterRect.x + 0.5,
                        characterRect.y + 0.5,
                        characterRect.width * snippet.length - 1,
                        characterRect.height - 1);
                }

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

    _getVirtualSelection: function(startPropertyAsWell) {
        return {
            start:  startPropertyAsWell && this._selectedRangeEndVirtual ?
                    this._selectedRangeEndVirtual : this._selectedRange.start,
            end:    this._selectedRangeEndVirtual || this._selectedRange.end
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

        var layoutManager = this.get('layoutManager');
        var range = Range.normalizeRange(this._selectedRange);
        if (!this._rangeIsInsertionPoint(range)) {
            var rects = layoutManager.rectsForRange(range);
            rects.forEach(function(rect) {
                this.setNeedsDisplayInRect(adjustRect(rect));
            }, this);

            return;
        }

        var rect = layoutManager.characterRectForPosition(range.start);
        this.setNeedsDisplayInRect(adjustRect(rect));
    },

    _keymappingChanged: function() {
        this._keyBuffer = '';
        this._keyState = 'start';
    },

    _performVerticalKeyboardSelection: function(offset) {
        var textStorage = this.getPath('layoutManager.textStorage');
        var oldPosition = this._selectedRangeEndVirtual !== null ?
            this._selectedRangeEndVirtual : this._selectedRange.end;
        var newPosition = Range.addPositions(oldPosition,
            { row: offset, column: 0 });

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
            this._insertionPointBlinkTimer.invalidate();
        }

        this._insertionPointBlinkTimer = SC.Timer.schedule({
            target:     this,
            action:     'blinkInsertionPoint',
            interval:   750,
            repeats:    true
        });
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

    _syntaxManagerUpdatedSyntaxForRows: function(startRow, endRow) {
        if (startRow === endRow) {
            return;
        }

        var layoutManager = this.get('layoutManager');
        layoutManager.updateTextRows(startRow, endRow);

        layoutManager.rectsForRange({
                start:  { row: startRow,    column: 0 },
                end:    { row: endRow,      column: 0 }
            }).forEach(this.setNeedsDisplayInRect, this);
    },

    // Instructs the syntax manager to begin highlighting from the given row to
    // the end of the visible range, or within the entire visible range if the
    // row is null.
    _updateSyntax: function(row) {
        var layoutManager = this.get('layoutManager');
        var visibleRange = layoutManager.characterRangeForBoundingRect(this.
            get('clippingFrame'));
        var startRow = visibleRange.start.row, endRow = visibleRange.end.row;

        if (row !== null) {
            if (row < startRow || row > endRow) {
                return; // Outside the visible range; nothing to do.
            }

            startRow = row;
        }

        var self = this;
        var lines = layoutManager.getPath('textStorage.lines');
        var syntaxManager = layoutManager.get('syntaxManager');
        var lastRow = Math.min(lines.length, endRow + 1);
        syntaxManager.updateSyntaxForRows(startRow, lastRow).
            then(function(result) {
                self._syntaxManagerUpdatedSyntaxForRows(result.startRow,
                    result.endRow);
            });
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
        editorSelectedTextColor: "rgb(240, 240, 240)",
        editorSelectedTextBackground: "#526da5",
        unfocusedCursorStrokeStyle: "#ff0033",
        unfocusedCursorFillStyle: "#73171e"
    },

    /**
     * Toggles the visible state of the insertion point.
     */
    blinkInsertionPoint: function() {
        this._insertionPointVisible = !this._insertionPointVisible;
        this._invalidateSelection();
    },

    /**
     * Updates the syntax information. Automatically called when the clipping
     * frame of the text view changes.
     */
    clippingFrameChanged: function() {
        arguments.callee.base.apply(this, arguments);
        this._updateSyntax(null);
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
        context.fillStyle = this.get('theme').backgroundStyle;
        context.fillRect(rect.x, rect.y, rect.width, rect.height);

        this._drawSelection(rect, context);
        this._drawLines(rect, context);
    },

    /**
     * Directs keyboard input to this text view.
     */
    focus: function() {
        this.focusTextInput();
    },

    /**
     * Returns the characters that are currently selected as a string, or the
     * empty string if none are selected.
     */
    getSelectedCharacters: function() {
        return this._rangeIsInsertionPoint(this._selectedRange) ? '' :
            this.getPath('layoutManager.textStorage').getCharacters(Range.
            normalizeRange(this._selectedRange));
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
            return Range.normalizeRange(this._selectedRange);
        } else {
            return this._selectedRange;
        }
    },

    /**
     * Groups all the changes in the callback into a single undoable action.
     * Nested change groups are supported; one undoable action is created for
     * the entire group of changes.
     */
    groupChanges: function(performChanges) {
        if (this._inChangeGroup) {
            performChanges();
            return;
        }

        this._inChangeGroup = true;
        this.notifyDelegates('textViewBeganChangeGroup', this._selectedRange);

        try {
            performChanges();
        } finally {
            this._inChangeGroup = false;
            this.notifyDelegates('textViewEndedChangeGroup',
                this._selectedRange);
        }
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

    /**
     * Replaces the selection with the given text and updates the selection
     * boundaries appropriately.
     */
    insertText: function(text) {
        this.groupChanges(function() {
            var textStorage = this.getPath('layoutManager.textStorage');
            var range = Range.normalizeRange(this._selectedRange);

            this.replaceCharacters(range, text);

            // Update the selection to point immediately after the inserted
            // text.
            var lines = text.split("\n");

            var destPosition;
            if (lines.length > 1) {
                destPosition = {
                    row:    range.start.row + lines.length - 1,
                    column: lines[lines.length - 1].length
                };
            } else {
                destPosition = Range.addPositions(range.start,
                    { row: 0, column: text.length });
            }

            this.moveCursorTo(destPosition);
        }.bind(this));
    },

    /**
     * Returns true if the given character is a word separator.
     *
     * TODO: Should this be moved out of the text view?
     */
    isDelimiter: function(character) {
        return "\"',;.!~@#$%^&*?[]<>:/\\-+ \t".indexOf(character) !== -1;
    },

    keyDown: function(evt) {
        // SC puts keyDown and keyPress event together. Here we only want to
        // handle the real/browser's keydown event. To do so, we have to check
        // if the evt.charCode value is set. If this isn't set, we have been
        // called after a keypress event took place.
        if (evt.charCode === 0) {
            return keyboardManager.processKeyEvent(evt, this,
                { isTextView: true });
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
        this._updateSyntax(row);
        this._repositionSelection();
    },

    /**
     * Marks the given rectangles as invalid.
     */
    layoutManagerInvalidatedRects: function(sender, rects) {
        rects.forEach(this.setNeedsDisplayInRect, this);
        this._resize();
    },

    mouseDown: function(evt) {
        arguments.callee.base.apply(this, arguments);

        var point = { x: evt.pageX, y: evt.pageY };

        switch (evt.clickCount) {
        case 1:
            var pos = this._selectionPositionForPoint(this.
                convertFrameFromView(point));
            this.moveCursorTo(pos, evt.shiftKey);
            break;

        // Select the word under the cursor.
        case 2:
            var pos = this._selectionPositionForPoint(this.
                convertFrameFromView(point));
            var line = this.getPath('layoutManager.textStorage').
                                                        lines[pos.row];

            // If there is nothing to select in this line, then skip.
            if (line.length === 0) {
                return true;
            }

            pos.column -= (pos.column == line.length ? 1 : 0);
            var skipOnDelimiter = !this.isDelimiter(line[pos.column]);

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

            var columnFrom = searchForDelimiter(pos.column, -1);
            var columnTo   = searchForDelimiter(pos.column, 1);

            this.moveCursorTo({ row: pos.row, column: columnFrom });
            this.moveCursorTo({ row: pos.row, column: columnTo }, true);

            break;

        case 3:
            var lines = this.getPath('layoutManager.textStorage').lines;
            var pos = this._selectionPositionForPoint(this.
                convertFrameFromView(point));
            this.setSelection({
                start: {
                    row: pos.row,
                    column: 0
                },
                end: {
                    row: pos.row,
                    column: lines[pos.row].length
                }
            });
            break;
        }

        this._dragPoint = point;
        this._dragTimer = SC.Timer.schedule({
            target:     this,
            action:     '_scrollWhileDragging',
            interval:   100,
            repeats:    true
        });

        return true;
    },

    mouseDragged: function(evt) {
        this._dragPoint = { x: evt.pageX, y: evt.pageY };
        this._drag();
        return true;
    },

    mouseUp: function(evt) {
        if (this._dragTimer !== null) {
            this._dragTimer.invalidate();
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
        var textStorage = this.getPath('layoutManager.textStorage');
        var positionToUse = textStorage.clampPosition(position);

        this.setSelection({
            start:  select ? this._selectedRange.start : positionToUse,
            end:    positionToUse
        });

        if (virtual) {
            var lineCount = textStorage.get('lines').length;
            var row = position.row, column = position.column;
            if (row > 0 && row < lineCount) {
                this._selectedRangeEndVirtual = position;
            } else {
                this._selectedRangeEndVirtual = {
                    row:    row < 1 ? 0 : lineCount - 1,
                    column: column
                };
            }
        } else {
            this._selectedRangeEndVirtual = null;
        }

        this.scrollToPosition(this._selectedRange.end);
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

        this.moveCursorTo(position, false, true);
    },

    moveLeft: function() {
        var range = Range.normalizeRange(this._selectedRange);
        if (this._rangeIsInsertionPoint(range)) {
            this.moveCursorTo(this.getPath('layoutManager.textStorage').
                displacePosition(range.start, -1));
        } else {
            this.moveCursorTo(range.start);
        }
    },

    moveRight: function() {
        var range = Range.normalizeRange(this._selectedRange);
        if (this._rangeIsInsertionPoint(range)) {
            this.moveCursorTo(this.getPath('layoutManager.textStorage').
                displacePosition(range.end, 1));
        } else {
            this.moveCursorTo(range.end);
        }
    },

    moveUp: function() {
        var range = Range.normalizeRange(this._getVirtualSelection(true));
        position = Range.addPositions({
            row: range.start.row,
            column: this._getVirtualSelection().end.column
        }, { row: -1, column: 0 });

        this.moveCursorTo(position, false, true);
    },

    parentViewFrameChanged: function() {
        arguments.callee.base.apply(this, arguments);
        this._resize();
    },

    /**
     * As an undoable action, replaces the characters within the old range with
     * the supplied characters.
     */
    replaceCharacters: function(oldRange, characters) {
        this.groupChanges(function() {
            oldRange = Range.normalizeRange(oldRange);
            this.notifyDelegates('textViewWillReplaceRange', oldRange);

            var textStorage = this.getPath('layoutManager.textStorage');
            textStorage.replaceCharacters(oldRange, characters);
            this.notifyDelegates('textViewReplacedCharacters', oldRange,
                characters);
        }.bind(this));
    },

    /**
     * Performs a delete-backward or delete-forward operation.
     *
     * @param isBackspace If true, the deletion proceeds backward (as if the
     *                    backspace key were pressed); otherwise, deletion
     *                    proceeds forward.
     */
    performBackspaceOrDelete: function(isBackspace) {
        var model = this.getPath('layoutManager.textStorage');

        var lines = model.get('lines');
        var range = this.getSelectedRange();

        if (Range.isZeroLength(range)) {
            if (isBackspace) {
                var start = range.start;
                var tabstop = settings.get('tabstop');
                var row = start.row, column = start.column;
                var line = lines[row];

                if (column > 0 && column % tabstop === 0 &&
                        new RegExp("^\\s{" + column + "}").test(line)) {
                    // 'Smart tab' behavior: delete a tab worth of whitespace.
                    range = {
                        start:  { row: row, column: column - tabstop },
                        end:    range.end
                    };
                } else {
                    // Just one character.
                    range = {
                        start:  model.displacePosition(range.start, -1),
                        end:    range.end
                    };
                }
            } else {
                // Extend the selection forward by one character.
                range = {
                    start:  range.start,
                    end:    model.displacePosition(range.end, 1)
                };
            }
        }

        this.groupChanges(function() {
            this.replaceCharacters(range, '');

            // Position the insertion point at the start of all the ranges that
            // were just deleted.
            this.moveCursorTo(range.start);
        }.bind(this));
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
     * Selects all characters in the buffer.
     */
    selectAll: function() {
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
        this.moveCursorTo((this.getPath('layoutManager.textStorage').
            displacePosition(this._selectedRange.end, -1)), true);
    },

    selectRight: function() {
        this.moveCursorTo((this.getPath('layoutManager.textStorage').
            displacePosition(this._selectedRange.end, 1)), true);
    },

    selectUp: function() {
        this._performVerticalKeyboardSelection(-1);
    },

    /**
     * Directly replaces the current selection with a new one.
     */
    setSelection: function(newRange, ensureVisible) {
        var textStorage = this.getPath('layoutManager.textStorage');

        newRange = textStorage.clampRange(newRange);
        if (Range.equal(newRange, this._selectedRange)) {
            return;
        }

        // Invalidate the old selection.
        this._invalidateSelection();

        // Set the new selection and invalidate it.
        this._selectedRange = textStorage.clampRange(newRange);
        this._invalidateSelection();

        this._rearmInsertionPointBlinkTimer();

        if (ensureVisible) {
            this.scrollToPosition(this._selectedRange.end);
        }
    },

    textInserted: function(text) {
        if(!keyboardManager.processKeyInput(text, this,
                { isTextView: true, isCommandKey: false })) {
            this.insertText(text);
            this.resetKeyBuffers();
        }
    },

    willBecomeKeyResponderFrom: function() {
        arguments.callee.base.apply(this, arguments);
        this._invalidateSelection();
        this._rearmInsertionPointBlinkTimer();
    },

    willLoseKeyResponderTo: function() {
        arguments.callee.base.apply(this, arguments);
        this._invalidateSelection();
        this._insertionPointBlinkTimer.invalidate();
        this._insertionPointVisible = true;
    }
});

