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
var MultiDelegateSupport = require('delegate_support').MultiDelegateSupport;
var Range = require('rangeutils:utils/range');
var SyntaxManager = require('syntax_manager:controllers/syntaxmanager').
    SyntaxManager;
var TextStorage = require('models/textstorage').TextStorage;
var catalog = require('bespin:plugins').catalog;

exports.LayoutManager = SC.Object.extend(MultiDelegateSupport, {
    _maximumWidth: 0,

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

    /**
     * @property
     *
     * The model instance that this object is responsible for laying out.
     */
    textStorage: TextStorage,

    /**
     * @property
     *
     * The theme to use.
     *
     * TODO: Convert to a SproutCore theme.
     */
    theme: {
        editorTextColor:            'rgb(230, 230, 230)',
        editorTextColor_comment:    'rgb(102, 102, 102)',
        editorTextColor_directive:  'rgb(153, 153, 153)',
        editorTextColor_error:      'rgb(255, 0, 0)',
        editorTextColor_identifier: 'rgb(230, 230, 230)',
        editorTextColor_keyword:    'rgb(66, 168, 237)',
        editorTextColor_operator:   'rgb(136, 187, 255)',
        editorTextColor_plain:      'rgb(230, 230, 230)',
        editorTextColor_string:     'rgb(3, 154, 10)'
    },

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
                    y:      startRect.y + this.get('lineHeight'),
                    width:  Number.MAX_VALUE,
                    height: Number.MAX_VALUE
                }
            ];
    },

    // Returns the last valid position in the buffer.
    _lastCharacterPosition: function() {
        return {
            row:    this.get('textLines').length - 1,
            col: this._maximumWidth
        };
    },

    _recalculateMaximumWidth: function() {
        // Lots of room for optimization here if this turns out to be slow. But
        // for now...
        var textLines = this.get('textLines');
        var max = 0;
        textLines.forEach(function(line) {
            var width = line.characters.length;
            if (max < width) {
                max = width;
            }
        });
        this._maximumWidth = max;
    },

    _recomputeEntireLayout: function() {
        var entireRange = this.get('textStorage').range();
        this._recomputeLayoutForRanges(entireRange, entireRange);
    },

    _recomputeLayoutForRanges: function(oldRange, newRange) {
        var oldStartRow = oldRange.start.row, oldEndRow = oldRange.end.row;
        var newEndRow = newRange.end.row;
        var newRowCount = newEndRow - oldStartRow + 1;

        var lines = this.getPath('textStorage.lines');
        var theme = this.get('theme');
        var plainColor = theme.editorTextColor_plain;

        var newTextLines = [];
        for (var i = 0; i < newRowCount; i++) {
            var line = lines[oldStartRow + i];
            newTextLines[i] = {
                characters: line,
                colors: [ { start: 0, end: null, color: plainColor } ]
            };
        }

        this.textLines.replace(oldStartRow, oldEndRow - oldStartRow + 1,
            newTextLines);
        this._recalculateMaximumWidth();

        // Take the cached attributes from the syntax manager.
        this.updateTextRows(oldStartRow, newEndRow + 1);

        this.notifyDelegates('layoutManagerChangedTextAtRow', oldStartRow);

        var invalidRects = this._computeInvalidRects(oldRange, newRange);
        this.notifyDelegates('layoutManagerInvalidatedRects', invalidRects);
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
                row:    this.get('textLines').length - 1,
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
        var margin = this.get('margin');
        var x = point.x - margin.left, y = point.y - margin.top;

        var characterWidth = this.get('characterWidth');
        var textStorage = this.get('textStorage');
        var clampedPosition = textStorage.clampPosition({
            row:    Math.floor(y / this.get('lineHeight')),
            col: Math.floor(x / characterWidth)
        });

        var lineLength = textStorage.get('lines')[clampedPosition.row].length;
        return SC.mixin(clampedPosition, {
            partialFraction:
                x < 0 || clampedPosition.col === lineLength ? 0.0 :
                x % characterWidth / characterWidth
        });
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
        var lineHeight = this.get('lineHeight');
        var characterWidth = this.get('characterWidth');
        var margin = this.get('margin');
        var x = rect.x - margin.left, y = rect.y - margin.top;
        return {
            start:  {
                row:    Math.max(Math.floor(y / lineHeight), 0),
                col: Math.max(Math.floor(x / characterWidth), 0)
            },
            end:    {
                row:    Math.floor((y + rect.height - 1) / lineHeight),
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
        this.set('syntaxManager', this.get('syntaxManager').create({
            delegates:      [ this ],
            textStorage:    this.get('textStorage')
        }));
    },

    /**
     * @protected
     *
     * Instantiates the internal text storage object. The default
     * implementation of this method simply calls create() on the internal
     * textStorage property.
     */
    createTextStorage: function() {
        this.set('textStorage', this.get('textStorage').create());
    },

    init: function() {
        this.set('textLines', [
            {
                characters: '',
                colors:     [
                    {
                        start:  0,
                        end:    0,
                        color:  this.get('theme').editorTextColor
                    }
                ]
            }
        ]);

        this.createTextStorage();
        this.get('textStorage').addDelegate(this);

        this.createSyntaxManager();

        this._recomputeEntireLayout();
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
        var margin = this.get('margin');
        var characterWidth = this.get('characterWidth');
        var lineHeight = this.get('lineHeight');
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
        var characterWidth = this.get('characterWidth');
        var lineHeight = this.get('lineHeight');
        var maximumWidth = this._maximumWidth;
        var margin = this.get('margin');

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

    syntaxManagerInvalidatedSyntax: function(sender) {
        this._recomputeEntireLayout();
    },

    textStorageEdited: function(sender, oldRange, newRange) {
        this.get('syntaxManager').layoutManagerReplacedText(oldRange,
            newRange);
        this._recomputeLayoutForRanges(oldRange, newRange);
    },

    /**
     * Updates the text lines in the given range to correspond to the current
     * state of the syntax highlighter. Does not actually run the syntax
     * highlighters.
     */
    updateTextRows: function(startRow, endRow) {
        var textLines = this.get('textLines');
        var attrs = this.get('syntaxManager').attrsForRows(startRow, endRow);
        var theme = this.get('theme');

        for (var i = 0; i < attrs.length; i++) {
            textLines[startRow + i].colors = attrs[i].map(function(range) {
                var color = theme['editorTextColor_' + range.tag];
                if (SC.none(color)) {
                    color = theme.editorTextColor_plain;
                }

                return { start: range.start, end: range.end, color: color };
            });
        }
    }
});

