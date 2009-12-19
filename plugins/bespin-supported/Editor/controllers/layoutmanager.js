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
var TextStorage = require('models/textstorage').TextStorage; 
var catalog = require('bespin:plugins').catalog;

exports.LayoutManager = SC.Object.extend({
    _characterWidth: 8,
    _layoutAnnotations: null,
    _lineHeight: 20,
    _maximumWidth: 0,

    /**
     * @property
     *
     * The delegate object, which receives layoutManagerChangedLayout()
     * messages for this layout manager.
     */
    delegate: null,

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

    _computeStandardLayoutInfo: function(range) {
        var textLines = this.get('textLines');
        var lineHeight = this._lineHeight;
        var startRow = range.startRow, endRow = range.endRow;
        for (var i = range.startRow; i <= endRow; i++) {
            textLines[i].lineHeight = lineHeight;
        }
    },

    _recalculateDimensions: function() {
        // Lots of room for optimization here if this turns out to be slow. But
        // for now...
        var characterWidth = this._characterWidth;
        var textLines = this.get('textLines');
        var max = 0;
        for (var i = 0; i < textLines.length; i++) {
            var width = textLines[i].characters.length * characterWidth;
            if (max < width) {
                max = width;
            }
        }

        this._maximumWidth = max;
    },

    _recomputeEntireLayout: function() {
        var lines = this.get('textStorage').get('lines');
        this._recomputeLayoutForRange({
            startRow:       0,
            startColumn:    0,
            endRow:         lines.length - 1,
            endColumn:      lines[lines.length - 1].length
        });
    },

    _recomputeLayoutForRange: function(range) {
        var startRow = range.startRow;
        var rowCount = range.endRow - startRow + 1;
        var textStorageLines = this.get('textStorage').get('lines');
        var newTextLines = [];
        for (var i = 0; i < rowCount; i++) {
            newTextLines[i] = { characters: textStorageLines[startRow + i] };
        }
        this.get('textLines').replace(startRow, rowCount, newTextLines);

        this._computeStandardLayoutInfo(range);
        this._recalculateDimensions();
        this._runAnnotations(range);

        var delegate = this.get('delegate');
        if (!SC.none(delegate)) {
            delegate.layoutManagerChangedLayout(this, range);
        }
    },

    _runAnnotations: function(range) {
        var textLines = this.get('textLines');
        this._layoutAnnotations.forEach(function(annotation) {
            annotation.annotateLayout(textLines, range);
        });
    },

    /**
     * Determines the boundaries of the entire text area.
     *
     * TODO: Unit test.
     */
    boundingRect: function() {
        var margin = this.get('margin');
        var lastRowRect = this.lineRectForRow(this.get('textLines').length -
            1);
        return {
            x:      0,
            y:      0,
            width:  margin.left + this._maximumWidth + margin.right,
            height: margin.top + lastRowRect.y + lastRowRect.height +
                        margin.bottom
        };
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
        var lineHeight = this._lineHeight;
        var column = Math.floor(point.x / characterWidth);
        var row = Math.floor(point.y / lineHeight);

        var textLines = this.get('textLines');
        var lineCount = textLines.length;
        if (row >= lineCount) {
            row = lineCount - 1;
        }
        var textLine = textLines[row];

        var textLineLength = textLine.characters.length;
        var partialFraction;
        if (column <= textLineLength) {
            partialFraction = clientX % characterWidth / characterWidth;
        } else {
            partialFraction = 1.0;
            column = textLineLength;
        }

        return { column: column, row: row, partialFraction: partialFraction };
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
        var lineHeight = this.get('textLines')[0].lineHeight;
        var characterWidth = this._characterWidth;
        var x = rect.x, y = rect.y;
        return {
            startRow:       Math.floor(y / lineHeight),
            endRow:         Math.ceil((y + rect.height) / lineHeight),
            startColumn:    Math.floor(x / characterWidth),
            endColumn:      Math.ceil((x + rect.width) / characterWidth)
        };
    },

    /**
     * Returns the boundaries of the character at the given position.
     *
     * TODO: Unit test.
     */
    characterRectForPosition: function(position) {
        var lineRect = this.lineRectForRow(position.row);
        var margin = this.get('margin');
        var characterWidth = this._characterWidth;
        return {
            x:      margin.left + position.column * characterWidth,
            y:      lineRect.y,
            width:  characterWidth,
            height: lineRect.height
        };
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
        this.set('textLines', []);

        this.createTextStorage();
        this.get('textStorage').get('delegates').push(this);

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
        var lineHeight = this._lineHeight;
        var margin = this.get('margin');
        return {
            x:      0,
            y:      margin.top + row * lineHeight,
            width:  margin.left + this._maximumWidth + margin.right,
            height: lineHeight
        };
    },

    textStorageEdited: function(sender, range, characters) {
        // Remove text lines as appropriate.
        var insertedLines = characters.split("\n");
        var startRow = range.startRow, endRow = range.endRow;
        var rowsToDelete = endRow - startRow + 1 - insertedLines.length;
        if (rowsToDelete > 0) {
            this.get('textLines').removeAt(startRow + insertedLines.length,
                rowsToDelete);
        }

        var startColumn = range.startColumn;
        var insertedEndRow = startRow + insertedLines.length - 1;
        this._recomputeLayoutForRange({
            startRow:       startRow,
            startColumn:    startColumn,
            endRow:         insertedEndRow,
            endColumn:      (startRow === insertedEndRow ? startColumn : 0) +
                            insertedLines[insertedLines.length - 1].length
        });
    }
});

