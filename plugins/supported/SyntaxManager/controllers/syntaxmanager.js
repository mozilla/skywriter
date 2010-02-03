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
var ArrayUtils = require('utils/array');
var Promise = require('Promise:core/promise').Promise;
var Range = require('RangeUtils:utils/range');

/**
 * @class
 *
 * The syntax manager manages syntax contexts and controls the interaction of
 * the syntax highlighting modules and the layout manager. It receives text
 * editing notifications, updates and stores the relevant syntax attributes,
 * and provides marked up text as the layout manager requests it.
 */
exports.SyntaxManager = SC.Object.extend({
    _attributes: null,
    _invalidRows: [],

    _adjustInvalidRowsForDeletion: function(range) {
        var rangeStartRow = range.start.row, rangeEndRow = range.end.row;
        var newInvalidRows = [];
        this._invalidRows.forEach(function(invalidRow) {
            // before the deleted range
            if (invalidRow <= rangeStartRow) {
                newInvalidRows.push(invalidRow);
                return;
            }

            // inside the deleted range
            if (invalidRow > rangeStartRow || invalidRow < rangeEndRow) {
                return;
            }

            // after the deleted range
            if (invalidRow >= rangeEndRow) {
                newInvalidRows.push(invalidRow - (rangeEndRow -
                    rangeStartRow));
            }
        });
        this._invalidRows = newInvalidRows;
    },

    _adjustInvalidRowsForInsertion: function(range) {
        var rangeStartRow = range.start.row, rangeEndRow = range.end.row;
        this._invalidRows = this._invalidRows.map(function(invalidRow) {
            return invalidRow < rangeStartRow ?
                invalidRow :                    // before the inserted range
                invalidRow + rangeEndRow - rangeStartRow;   // after
        });
    },

    //
    // Determines whether two attribute ranges are equal.
    //
    // TODO: Unit tests.
    //
    _attributeRangesEqual: function(rangeA, rangeB) {
        if (rangeA.start !== rangeB.start || rangeA.end !== rangeB.end) {
            return false;
        }

        var contextsA = rangeA.contexts, contextsB = rangeB.contexts;

        if (contextsA === null || contextsB === null) {
            return contextsA === contextsB;
        }

        if (contextsA.length !== contextsB.length) {
            return false;
        }
        var contextsLength = contextsA.length;
        for (var i = 0; i < contextsLength; i++) {
            var contextA = contextsA[i], contextB = contextsB[i];
            if (contextA.name !== contextB.name ||
                    contextA.state !== contextB.state) {
                return false;
            }
        }

        return true;
    },

    // Calls out to the appropriate syntax highlighter, or the default if the
    // highlighter hasn't been loaded yet.
    _computeAttributeRange: function(line, column, contexts) {
        return this._defaultAttributeRange(column, contexts);
    },

    _contextsBeforeRow: function(row) {
        if (row === 0) {
            return [ this._getInitialContext() ];
        }

        var lineAttributes = this._attributes[row - 1];
        return lineAttributes[lineAttributes.length - 1].contexts;
    },

    _defaultAttributeRange: function(column, contexts) {
        var newContext = this._getDefaultContext();
        var newContexts;
        if (contexts === null) {
            newContexts = [ newContext ];       // for unit testing
        } else if (contexts[contexts.length - 1].context !== 'plain') {
            newContexts = contexts.concat(newContext);
        } else {
            newContexts = contexts;
        }
        return { start: column, end: null, contexts: contexts };
    },

    _deleteAttributes: function(range) {
        var attributes = this._attributes;
        var start = range.start, end = range.end;
        var startRow = start.row, endRow = end.row;

        this._splitAttributesAtPosition(start);
        var startIndex = this._getAttributeIndexForPosition(start);
        this._splitAttributesAtPosition(end);
        var endIndex = this._getAttributeIndexForPosition(end);

        var startRowAttributes = attributes[startRow];

        if (startRow === endRow) {
            startRowAttributes.splice(startIndex, endIndex - startIndex);
        } else {
            // Chop attributes off the end of the first line.
            startRowAttributes.splice(startIndex, startRowAttributes.length -
                startIndex);
            // Join the last line to the first line.
            startRowAttributes.pushObjects(attributes[endRow].slice(endIndex));
            // Remove all lines beyond the first.
            attributes.splice(startRow + 1, endRow - startRow);
        }

        // Adjust the offsets on the first line.
        this._offsetAttributeRanges(startRow, startIndex, start.column -
            end.column);
    },

    _deleteRange: function(oldRange) {
        if (Range.isZeroLength(oldRange)) {
            return;
        }

        this._deleteAttributes(oldRange);
        this._adjustInvalidRowsForDeletion(oldRange);
        this._invalidateRow(oldRange.start.row);
    },

    // Searches for the attribute range containing the given row and column and
    // returns its index.
    _getAttributeIndexForPosition: function(position) {
        var attributeIndex = ArrayUtils.binarySearch(this.
            _attributes[position.row], position.column,
            function(column, attributeRange) {
                if (column < attributeRange.start) {
                    return -1;
                }

                var end = attributeRange.end;
                if (end !== null && column >= end) {
                    return 1;
                }

                return 0;
            });

        if (attributeIndex === null) {
            console.error("position not found", position);
        }
        return attributeIndex;
    },

    _getDefaultContext: function() {
        return {
            context:    'plain',
            state:      'normal',
            tag:        'plain'
        }
    },

    _getInitialContext: function() {
        return {
            context:    this.get('initialContext'),
            state:      this.get('initialState'),
            tag:        'plain'
        };
    },

    _insertAttributes: function(newRange) {
        var attributes = this._attributes;

        var start = newRange.start, end = newRange.end;
        var startRow = start.row, endRow = end.row;
        var startColumn = start.column, endColumn = end.column;

        this._splitAttributesAtPosition(start);
        var startIndex = this._getAttributeIndexForPosition(start);

        var startRowAttributes = attributes[startRow];

        var endIndex;
        if (startRow === endRow) {
            startRowAttributes.splice(startIndex, 0,
                { start: startColumn, end: endColumn, contexts: null });

            endIndex = startIndex + 1;
        } else {
            // Detach the remainder of the first row to form the new end row.
            var endRowAttributes = startRowAttributes.slice(startIndex);
            startRowAttributes.splice(startIndex,
                startRowAttributes.length - startIndex,
                { start: startColumn, end: null, contexts: null });

            // Add in any empty rows.
            for (var i = startRow + 1; i < endRow; i++) {
                attributes.splice(startRow + 1, 0,
                    [ { start: 0, end: null, contexts: null } ]);
            }

            // Add space to the start of the end row, if necessary.
            if (endColumn === 0) {
                endIndex = 0;
            } else {
                endRowAttributes.unshift({ start: 0, end: endColumn,
                    contexts: null });
                endIndex = 1;
            }

            // Attach the end row.
            attributes.splice(endRow, 0, endRowAttributes);
        }

        // Adjust the offsets on the last line.
        this._offsetAttributeRanges(endRow, endIndex, endColumn - startColumn);
    },

    _insertRange: function(newRange) {
        if (Range.isZeroLength(newRange)) {
            return;
        }

        this._insertAttributes(newRange);
        this._adjustInvalidRowsForInsertion(newRange);
        this._invalidateRow(newRange.start.row);
    },

    // Adds a row to the set of invalid rows.
    _invalidateRow: function(row) {
        var invalidRows = this._invalidRows;
        invalidRows.push(row);
        invalidRows.sort(function(a, b) { return a - b; });
        this._invalidRows = invalidRows.uniq();
    },

    _offsetAttributeRanges: function(row, startIndex, offset) {
        var lineAttributes = this._attributes[row];
        var attributeRangeCount = lineAttributes.length;
        for (var i = startIndex; i < attributeRangeCount; i++) {
            var attributeRange = lineAttributes[i];
            attributeRange.start += offset;
            if (attributeRange.end !== null) {
                attributeRange.end += offset;
            }
        }
    },

    // Runs the syntax highlighters. Returns the first unchanged row (i.e. the
    // row immediately following the row where the synchronization happened),
    // or null if the highlighting failed to synchronize before the end of the
    // range.
    _recomputeAttributesForRows: function(startRow, endRow) {
        var attributes = this._attributes;
        var lines = this.getPath('textStorage.lines');

        var contexts = this._contextsBeforeRow(startRow);
        for (var row = startRow; row <= endRow; row++) {
            var lineAttributes = attributes[row];
            for (var index = 0; index < lineAttributes.length; index++) {
                var oldAttributeRange = lineAttributes[index];

                var line = lines[row];
                var computedAttributeRange = this._computeAttributeRange(line,
                    oldAttributeRange.start, contexts);

                contexts = computedAttributeRange.contexts;

                if (row !== startRow &&
                    this._attributeRangesEqual(oldAttributeRange,
                    computedAttributeRange)) {
                    // Successfully synchronized!
                    return index === 0 ? row : row + 1;
                }

                lineAttributes.splice(index, 0, computedAttributeRange);

                // Delete any overwritten attribute ranges.
                var computedEnd = computedAttributeRange.end;
                var deletedEnd = null;
                while (index + 1 < lineAttributes.length) {
                    var nextAttributeRange = lineAttributes[index+1];
                    var nextStart = nextAttributeRange.start;
                    if (computedEnd !== null &&
                            nextAttributeRange.start >= computedEnd) {
                        break;
                    }

                    deletedEnd = nextAttributeRange.end;
                    lineAttributes.splice(index + 1, 1);
                }

                // Insert blank attributes to fill the space.
                if (computedEnd !== null && (deletedEnd === null ||
                        (deletedEnd !== null && computedEnd < deletedEnd))) {
                    lineAttributes.splice(index + 1, 0, { start: computedEnd,
                        end: deletedEnd, contexts: null });
                }
            }
        }

        // If we got to the end of the buffer, then that's a successful
        // synchronization. Otherwise, it's not.
        return row === attributes.length ? row : null;
    },

    // If the position is in the middle of a range, splits the range in two.
    _splitAttributesAtPosition: function(position) {
        var row = position.row, column = position.column;
        var lineAttributes = this._attributes[row];
        var index = this._getAttributeIndexForPosition(position);
        var attributeRange = lineAttributes[index];
        var start = attributeRange.start, end = attributeRange.end;

        if (column > start && (end === null || column < end)) {
            lineAttributes.splice(index, 1,
                { start: start,     end: column,    contexts: null },
                { start: column,    end: end,       contexts: null });
            return { row: row, column: start };
        }
    },

    /**
     * Returns the attributed text currently in the cache for the given range
     * of rows. To ensure that the text returned by this method is up to date,
     * updateSyntaxForRows() should be called first.
     */
    attributedTextForRows: function(startRow, endRow) {
        return this._attributes.slice(startRow, endRow);
    },

    /**
     * @property{string}
     *
     * The initial context. Defaults to "plain".
     */
    initialContext: 'plain',

    /**
     * @property{number}
     *
     * The initial state to take on within the context.
     */
    initialState: 'normal',

    /**
     * @property{TextStorage}
     *
     * The character data is read from this text storage instance.
     */
    textStorage: null,

    init: function() {
        this._attributes = [
            [
                {
                    start:      0,
                    end:        null,
                    contexts:   [
                        SC.mixin(this._getInitialContext(), { tag: 'plain' })
                    ]
                }
            ]
        ];
    },

    /**
     * Informs the syntax manager that a range of text has changed. The
     * attributes are altered and invalidated as appropriate.
     */
    layoutManagerReplacedText: function(oldRange, newRange) {
        this._deleteRange(oldRange);
        this._insertRange(newRange);
    },

    /**
     * Returns a string representation of the internal structure of the syntax
     * manager, for debugging purposes.
     */
    toString: function() {
        return "{ attributes: [ %@ ], invalidRows: [ %@ ] }".
            fmt(this._attributes.map(function(attributeLine) {
                return "[ %@ ]".fmt(attributeLine.
                    map(function(attributeRange) {
                        return "%@-%@".fmt(attributeRange.start,
                            attributeRange.end);
                }).join());
            }).join(),
            this._invalidRows.join());
    },

    /**
     * Runs the syntax highlighters as necessary on the rows within the given
     * range and returns a promise to return the range of changed rows.
     */
    updateSyntaxForRows: function(startRow, endRow) {
        var invalidRows = this._invalidRows;
        var invalidRowCount = invalidRows.length;
        var index;
        for (index = 0; index < invalidRowCount; index++) {
            var invalidRow = invalidRows[index];
            if (invalidRow >= startRow && invalidRow < endRow) {
                break;
            }
        }

        var promise = new Promise();
        var firstUnchangedRow;

        if (index === invalidRowCount) {
            firstUnchangedRow = startRow; // nothing to do
        } else {
            var invalidRow = invalidRows[index];

            // Remove any invalid rows within the range we're about to update.
            while (index < invalidRows.length && invalidRows[index] < endRow) {
                invalidRows.splice(index, 1);
            }

            // Recompute the attributes for the appropriate rows.
            firstUnchangedRow = this._recomputeAttributesForRows(invalidRow,
                endRow - 1);
            if (firstUnchangedRow === null) {
                this._invalidateRow(endRow);
                firstUnchangedRow = endRow;
            }
        }

        promise.resolve({ startRow: startRow, endRow: firstUnchangedRow });
        return promise;
    }
});

