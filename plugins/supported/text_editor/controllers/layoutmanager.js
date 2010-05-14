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

var util = require('bespin:util/util');
var Event = require("events").Event;
var Range = require('rangeutils:utils/range');
var SyntaxManager = require('syntax_manager:controllers/syntaxmanager').
    SyntaxManager;
var TextStorage = require('models/textstorage').TextStorage;
var catalog = require('bespin:plugins').catalog;

exports.LayoutManager = function(opts) {
    this.changedTextAtRow = new Event();
    this.invalidatedRects = new Event();

    util.mixin(this, opts);

    this.textLines = [
        {
            characters: '',
            colors:     [
                {
                    start:  0,
                    end:    0,
                    color:  this._theme.plain
                }
            ]
        }
    ];

    this.createTextStorage();
    this.createSyntaxManager();

    this._size = { width: 0, height: 0 };
    this.sizeChanged = new Event();

    // Now that the syntax manager is set up, we can recompute the layout.
    // (See comments in _textStorageChanged().)
    this._recomputeEntireLayout();
};

exports.LayoutManager.prototype = {
    _maximumWidth: 0,
    _syntaxManagerInitialized: false,
    _textStorage: null,

    _size: null,
    sizeChanged: null,

    /**
     * @protected
     *
     * Instantiates the internal text storage object. The default
     * implementation of this method simply calls create() on the internal
     * textStorage property.
     */
    createTextStorage: function() {
        this.textStorage = new TextStorage();
    },

    /**
     * Theme colors. Value is set by editorView class. Don't change this
     * property directly. Use the editorView function to adjust it.
     */
    _theme: { },

    /**
     * @property{number}
     *
     * The width of one character.
     */
    characterWidth: 8,

    /**
     * @property{number}
     *
     * The ascent of one line. This is used for painting text.
     */
    lineAscent: 16,

    /**
     * @property{number}
     *
     * The height of one line.
     */
    lineHeight: 20,

    /**
     * @property
     *
     * The margins on each edge in pixels, expressed as an object with 'left',
     * 'bottom', 'top', and 'right' properties.
     *
     * Do not modify the properties of this object directly; clone, adjust, and
     * reset the margin property of the layout manager instead.
     */
    margin: { left: 5, bottom: 6, top: 0, right: 12 },

    /**
     * @property
     *
     * The plugin catalog to use. Typically this will be plugins.catalog, but
     * for testing this may be replaced with a mock object.
     */
    pluginCatalog: catalog,

    /**
     * @property{SyntaxManager}
     *
     * The syntax manager class to use.
     */
    syntaxManager: SyntaxManager,

    /**
     * @property{Array<object>}
     *
     * The marked-up lines of text. Each line has the properties 'characters',
     * 'colors', and 'lineHeight'.
     */
    textLines: null,

    _computeInvalidRects: function(oldRange, newRange) {
        var startRect = this.characterRectForPosition(oldRange.start);

        var lineRect = {
            x:      startRect.x,
            y:      startRect.y,
            width:  Number.MAX_VALUE,
            height: startRect.height
        };

        return oldRange.end.row === newRange.end.row ?
            [ lineRect ] :
            [
                lineRect,
                {
                    x:      0,
                    y:      startRect.y + this.lineHeight,
                    width:  Number.MAX_VALUE,
                    height: Number.MAX_VALUE
                }
            ];
    },

    // Returns the last valid position in the buffer.
    _lastCharacterPosition: function() {
        return {
            row: this.textLines.length - 1,
            col: this._maximumWidth
        };
    },

    _recalculateMaximumWidth: function() {
        // Lots of room for optimization here if this turns out to be slow. But
        // for now...
        var textLines = this.textLines;
        var max = 0;
        textLines.forEach(function(line) {
            var width = line.characters.length;
            if (max < width) {
                max = width;
            }
        });
        this._maximumWidth = max;

        this.size = { width: max, height: this.textLines.length };
    },

    _recomputeEntireLayout: function() {
        var entireRange = this._textStorage.range;
        this._recomputeLayoutForRanges(entireRange, entireRange);
    },

    _recomputeLayoutForRanges: function(oldRange, newRange) {
        var oldStartRow = oldRange.start.row, oldEndRow = oldRange.end.row;
        var newEndRow = newRange.end.row;
        var newRowCount = newEndRow - oldStartRow + 1;

        var lines = this._textStorage.lines;
        var theme = this._theme;
        var plainColor = theme.plain;

        var newTextLines = [];
        for (var i = 0; i < newRowCount; i++) {
            var line = lines[oldStartRow + i];
            newTextLines[i] = {
                characters: line,
                colors: [ { start: 0, end: null, color: plainColor } ]
            };
        }

        this.textLines = util.replace(this.textLines, oldStartRow,
                                oldEndRow - oldStartRow + 1, newTextLines);
        this._recalculateMaximumWidth();

        // Take the cached attributes from the syntax manager.
        this.updateTextRows(oldStartRow, newEndRow + 1);

        this.changedTextAtRow(this, oldStartRow);

        var invalidRects = this._computeInvalidRects(oldRange, newRange);
        this.invalidatedRects(this, invalidRects);
    },

    /**
     * Determines the boundaries of the entire text area.
     *
     * TODO: Unit test.
     */
    boundingRect: function() {
        return this.rectsForRange({
            start:  { row: 0, col: 0 },
            end:    {
                row: this.textLines.length - 1,
                col: this._maximumWidth
            }
        })[0];
    },

    /**
     * Determines the location of the character underneath the given point.
     *
     * @return Returns an object with three properties:
     *   * row: The row of the character nearest the point.
     *   * col: The col of the character nearest the point.
     *   * partialFraction: The fraction of the horizontal distance between
     *       this character and the next character. The extreme left of the
     *       character is 0.0, while the extreme right of the character is 1.0.
     *       If you are calling this function to determine where to place the
     *       cursor, then you should place the cursor after the returned
     *       character if this value is greater than 0.5.
     *
     * If there is no character under the point, then the character nearest the
     * given point is returned, according to the selection rules.
     */
    characterAtPoint: function(point) {
        var margin = this.margin;
        var x = point.x - margin.left, y = point.y - margin.top;

        var characterWidth = this.characterWidth;
        var textStorage = this._textStorage;
        var clampedPosition = textStorage.clampPosition({
            row: Math.floor(y / this.lineHeight),
            col: Math.floor(x / characterWidth)
        });

        var lineLength = textStorage.lines[clampedPosition.row].length;
        clampedPosition.partialFraction = x < 0 ||
            clampedPosition.col === lineLength ? 0.0 :
            x % characterWidth / characterWidth;

        return clampedPosition;
    },

    /**
     * Given a rectangle expressed in pixels, returns the range of characters
     * that lie at least partially within the rectangle as an object.
     *
     * TODO: Write unit tests for this method.
     */
    characterRangeForBoundingRect: function(rect) {
        // TODO: variable line heights, needed for word wrap and perhaps
        // extensions as well
        var lineHeight = this.lineHeight;
        var characterWidth = this.characterWidth;
        var margin = this.margin;
        var x = rect.x - margin.left, y = rect.y - margin.top;
        return {
            start:  {
                row: Math.max(Math.floor(y / lineHeight), 0),
                col: Math.max(Math.floor(x / characterWidth), 0)
            },
            end:    {
                row: Math.floor((y + rect.height - 1) / lineHeight),
                col: Math.floor((x + rect.width - 1) / characterWidth) + 1
            }
        };
    },

    /**
     * Returns the boundaries of the character at the given position.
     */
    characterRectForPosition: function(position) {
        return this.rectsForRange({
            start:  position,
            end:    { row: position.row, col: position.col + 1 }
        })[0];
    },

    /**
     * @protected
     *
     * Instantiates the internal syntax manager object. The default
     * implementation of this method simply calls create() on the internal
     * syntaxManager property.
     */
    createSyntaxManager: function() {
        this.syntaxManager = new this.syntaxManager(this);

        var boundRecompute = this._recomputeEntireLayout.bind(this);
        this.syntaxManager.invalidatedSyntax.add(boundRecompute);

        this._syntaxManagerInitialized = true;
    },

    /**
     * Returns the pixel boundaries of the given line.
     *
     * TODO: Unit test.
     */
    lineRectForRow: function(row) {
        return this.rectsForRange({
            start:  { row: row, col: 0                   },
            end:    { row: row, col: this._maximumWidth  }
        })[0];
    },

    rectForPosition: function(position) {
        var margin = this.margin;
        var characterWidth = this.characterWidth;
        var lineHeight = this.lineHeight;
        return {
            x:      margin.left + characterWidth * position.col,
            y:      margin.top + lineHeight * position.row,
            width:  characterWidth,
            height: lineHeight
        };
    },

    /**
     * Returns the 1, 2, or 3 rectangles that make up the given range.
     */
    rectsForRange: function(range) {
        var characterWidth = this.characterWidth;
        var lineHeight = this.lineHeight;
        var maximumWidth = this._maximumWidth;
        var margin = this.margin;

        var start = range.start, end = range.end;
        var startRow = start.row, startColumn = start.col;
        var endRow = end.row, endColumn = end.col;

        if (startRow === endRow) {
            // The simple rectangle case.
            return [
                {
                    x:      margin.left + characterWidth * startColumn,
                    y:      margin.top + lineHeight * startRow,
                    width:  characterWidth * (endColumn - startColumn),
                    height: lineHeight
                }
            ];
        }

        var rects = [];

        // Top line
        var middleStartRow;
        if (startColumn === 0) {
            middleStartRow = startRow;
        } else {
            middleStartRow = startRow + 1;
            rects.push({
                x:      margin.left + characterWidth * startColumn,
                y:      margin.top + lineHeight * startRow,
                width:  characterWidth * (maximumWidth - startColumn),
                height: lineHeight
            });
        }

        // Bottom line
        var middleEndRow;
        if (endColumn === 0) {
            middleEndRow = endRow - 1;
        } else if (endColumn === maximumWidth) {
            middleEndRow = endRow;
        } else {
            middleEndRow = endRow - 1;
            rects.push({
                x:      margin.left,
                y:      margin.top + lineHeight * endRow,
                width:  characterWidth * endColumn,
                height: lineHeight
            });
        }

        // Middle area
        rects.push({
            x:      margin.left,
            y:      margin.top + lineHeight * middleStartRow,
            width:  characterWidth * maximumWidth,
            height: lineHeight * (middleEndRow - middleStartRow + 1)
        });

        return rects;
    },

    textStorageChanged: function(oldRange, newRange) {
        this.syntaxManager.layoutManagerReplacedText(oldRange, newRange);
        this._recomputeLayoutForRanges(oldRange, newRange);
    },

    /**
     * Updates the text lines in the given range to correspond to the current
     * state of the syntax highlighter. Does not actually run the syntax
     * highlighters.
     */
    updateTextRows: function(startRow, endRow) {
        var textLines = this.textLines;
        var attrs = this.syntaxManager.attrsForRows(startRow, endRow);
        var theme = this._theme;

        for (var i = 0; i < attrs.length; i++) {
            textLines[startRow + i].colors = attrs[i].map(function(range) {
                var color = theme[range.tag];
                if (util.none(color)) {
                    color = theme.editorTextColor_plain;
                }

                return { start: range.start, end: range.end, color: color };
            });
        }
    }
};

Object.defineProperties(exports.LayoutManager.prototype, {
    size: {
        set: function(size) {
            if (size.width !== this._size.width || size.height !== this._size.height) {
                this.sizeChanged(size);
            }
        },
        get: function() {
            return this._size;
        }
    },
    textStorage: {
        get: function() {
            return this._textStorage;
        },
        set: function(newTextStorage) {
            var oldTextStorage = this._textStorage;
            this._textStorage = newTextStorage;

            if (!util.none(oldTextStorage)) {
                oldTextStorage.changed.remove(this.textStorageChanged);
            }

            newTextStorage.changed.add(this.textStorageChanged.bind(this));

            if (this._syntaxManagerInitialized) {
                var oldRange = oldTextStorage.range;
                var newRange = newTextStorage.range;

                if (!util.none(oldTextStorage)) {
                    this.syntaxManager.layoutManagerReplacedText(oldRange, newRange);
                }

                // During initial setup, the text storage is set before the syntax
                // manager is. We can't recompute the layout before the syntax
                // manager is set up, so we solve this chicken-and-egg problem by
                // suppressing the layout.
                this._recomputeLayoutForRanges(oldRange, newRange);
            }
        }
    }
});
