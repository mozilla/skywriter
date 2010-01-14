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
var MultiDelegateSupport =
    require('mixins/multidelegate').MultiDelegateSupport;
var Range = require('utils/range');
var TextStorage = require('models/textstorage').TextStorage;
var catalog = require('bespin:plugins').catalog;

exports.LayoutManager = SC.Object.extend(MultiDelegateSupport, {
    _characterWidth: 8,
    _layoutAnnotations: null,
    _lineHeight: 20,
    _maximumWidth: 0,

    /**
     * @property
     *
     * The margins on each edge in pixels, expressed as an object with "left",
     * "bottom", "top", and "right" properties.
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
     * @property{Array}
     *
     * The marked-up lines of text, consisting of an array of objects with
     * 'character' and 'lineHeight' properties, along with any other properties
     * that annotations may have added. Read-only.
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
        editorTextColor: "rgb(230, 230, 230)"
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
                    y:      startRect.y + this._lineHeight,
                    width:  Number.MAX_VALUE,
                    height: Number.MAX_VALUE
                }
            ];
    },

    // Returns the last valid position in the buffer.
    _lastCharacterPosition: function() {
        return {
            row:    this.get('textLines').length - 1,
            column: this._maximumWidth
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
        var theme = this.get('theme');
        var oldStartRow = oldRange.start.row;
        this.textLines.replace(oldStartRow, oldRange.end.row - oldStartRow + 1,
            this.getPath('textStorage.lines').slice(oldStartRow,
            newRange.end.row + 1).map(function(line) {
                return {
                    characters: line,
                    colors:     [
                        {
                            start:  0,
                            end:    line.length,
                            color:  theme.editorTextColor
                        }
                    ]
                };
            }));

        this._recalculateMaximumWidth();

        var changedRange = this._runAnnotations(Range.unionRanges(oldRange,
            newRange));

        var invalidRects = this._computeInvalidRects(oldRange, newRange);
        this.notifyDelegates('layoutManagerInvalidatedRects', invalidRects);
    },

    _runAnnotations: function(range) {
        var textLines = this.get('textLines');
        this._layoutAnnotations.forEach(function(annotation) {
            range = annotation.annotateLayout(textLines, range);
        });
        return range;
    },

    /**
     * Determines the boundaries of the entire text area.
     *
     * TODO: Unit test.
     */
    boundingRect: function() {
        return this.rectsForRange({
            start:  { row: 0, column: 0 },
            end:    {
                row:    this.get('textLines').length - 1,
                column: this._maximumWidth
            }
        })[0];
    },

    /**
     * Determines the location of the character underneath the given point.
     *
     * @return Returns an object with three properties:
     *   * row: The row of the character nearest the point.
     *   * column: The column of the character nearest the point.
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
        var clientX = point.x - margin.left, clientY = point.y - margin.top;

        var characterWidth = this._characterWidth;
        var textStorage = this.get('textStorage');
        var clampedPosition = textStorage.clampPosition({
            row:    Math.floor(clientY / this._lineHeight),
            column: Math.floor(clientX / characterWidth)
        });

        var lineLength = textStorage.get('lines')[clampedPosition.row].length;
        return SC.mixin(clampedPosition, {
            partialFraction:
                clientX < 0 || clampedPosition.column === lineLength ? 0.0 :
                clientX % characterWidth / characterWidth
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
        var lineHeight = this._lineHeight;
        var characterWidth = this._characterWidth;
        var margin = this.get('margin');
        var x = rect.x - margin.left, y = rect.y - margin.top;
        return {
            start:  {
                row:    Math.max(Math.floor(y / lineHeight), 0),
                column: Math.max(Math.floor(x / characterWidth), 0)
            },
            end:    {
                row:    Math.floor((y + rect.height - 1) / lineHeight),
                column: Math.floor((x + rect.width - 1) / characterWidth) + 1
            }
        };
    },

    /**
     * Returns the boundaries of the character at the given position.
     */
    characterRectForPosition: function(position) {
        return this.rectsForRange({
            start:  position,
            end:    { row: position.row, column: position.column + 1 }
        })[0];
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
        this._layoutAnnotations = [];
        this.set('textLines', [
            {
                characters: "",
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

        var thisLayoutManager = this;
        this.get('pluginCatalog').getExtensions('layoutannotations').
            forEach(function(extension) {
                extension.load(function(annotation) {
                    thisLayoutManager._layoutAnnotations.push(annotation);
                    thisLayoutManager._recomputeEntireLayout();
                }, 'layoutannotation');
            });

        this._recomputeEntireLayout();
    },

    /**
     * Returns the pixel boundaries of the given line.
     *
     * TODO: Unit test.
     */
    lineRectForRow: function(row) {
        return this.rectsForRange({
            start:  { row: row, column: 0                   },
            end:    { row: row, column: this._maximumWidth  }
        })[0];
    },

    rectForPosition: function(position) {
        var margin = this.get('margin');
        var characterWidth = this._characterWidth;
        var lineHeight = this._lineHeight;
        return {
            x:      margin.left + characterWidth * position.column,
            y:      margin.top + lineHeight * position.row,
            width:  characterWidth,
            height: lineHeight
        };
    },

    /**
     * Returns the 1, 2, or 3 rectangles that make up the given range.
     */
    rectsForRange: function(range) {
        var characterWidth = this._characterWidth;
        var lineHeight = this._lineHeight;
        var maximumWidth = this._maximumWidth;
        var margin = this.get('margin');

        var start = range.start, end = range.end;
        var startRow = start.row, startColumn = start.column;
        var endRow = end.row, endColumn = end.column;

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

    textStorageEdited: function(sender, oldRange, newRange) {
        this._recomputeLayoutForRanges(oldRange, newRange);
    }
});

