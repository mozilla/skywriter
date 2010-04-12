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

var SC = require('sproutcore/runtime').SC;
var m_promise = require('bespin:promise');
var ArrayUtils = require('utils/array');
var MultiDelegateSupport = require('delegate_support').MultiDelegateSupport;
var Promise = m_promise.Promise;
var Range = require('rangeutils:utils/range');
var Yield = require('utils/yield');
var catalog = require('bespin:plugins').catalog;
var console = require('bespin:console').console;
var syntaxDirectory = require('controllers/syntaxdirectory').syntaxDirectory;

/**
 * @class
 *
 * The syntax manager manages syntax contexts and controls the interaction of
 * the syntax highlighting modules and the layout manager. It receives text
 * editing notifications, updates and stores the relevant syntax attributes,
 * and provides marked up text as the layout manager requests it.
 */
exports.SyntaxManager = SC.Object.extend(MultiDelegateSupport, {
    _invalidRows: [],
    _lineAttrInfo: null,

    _adjustInvalidRowsForDeletion: function(startRow, endRow) {
        var newInvalidRows = [];
        this._invalidRows.forEach(function(invalidRow) {
            // before the deleted range
            if (invalidRow <= startRow) {
                newInvalidRows.push(invalidRow);
                return;
            }

            // inside the deleted range
            if (invalidRow > startRow || invalidRow < endRow) {
                return;
            }

            // after the deleted range
            if (invalidRow >= endRow) {
                newInvalidRows.push(invalidRow - (endRow - startRow));
            }
        });
        this._invalidRows = newInvalidRows;
    },

    _adjustInvalidRowsForInsertion: function(startRow, endRow) {
        this._invalidRows = this._invalidRows.map(function(invalidRow) {
            return invalidRow < startRow ? invalidRow :
                invalidRow + endRow - startRow;
        });
    },

    // Searches for the attribute range containing the given row and column and
    // returns its index.
    _attrIndexForColumn: function(attrs, column) {
        var attrIndex = ArrayUtils.binarySearch(attrs, column,
            function(column, range) {
                if (column < range.start) {
                    return -1;
                }

                var end = range.end;
                if (end !== null && column >= end) {
                    return 1;
                }

                return 0;
            });

        if (attrIndex === null) {
            console.error('position not found', position);
        }

        return attrIndex;
    },

    _attrsToString: function(attrs) {
        return attrs.map(function(range) {
            return '%@.%@.%@@%@-%@'.fmt(range.context, range.state, range.tag,
                range.start, range.end);
        }.bind(this)).join(', ');
    },

    _clearAttrsAtRow: function(row) {
        var attrs = [];
        for (var i = 0; i < 2; i++) {
            attrs.push(this._defaultAttrs());
        }

        this._lineAttrInfo[row].attrs = attrs;
    },

    // Returns an array of context info, each with 'attrs' and 'next'
    // properties.
    _deepSyntaxInfoForLine: function(snapshot, line) {
        var promise = new Promise();

        var outerContextAndState = snapshot[0];
        var outerContext    = outerContextAndState.context;
        var outerState      = outerContextAndState.state;

        // Style the outer part of the line.
        this._shallowSyntaxInfoForLineFragment(outerContext, outerState, line,
            0, null).then(function(outerShallowSyntaxInfo) {
                var outerAttrs = outerShallowSyntaxInfo.attrs;
                outerAttrs.forEach(function(outerAttrRange) {
                    // It's simpler if we store the context in each range
                    // instead of having consumers infer it from the parent
                    // context.
                    outerAttrRange.context = outerContext;
                });

                var deepAttrs = [
                    { attrs: outerAttrs, next: outerShallowSyntaxInfo.next }
                ];

                var innerRanges = this._innerRangesFromAttrs(outerAttrs,
                    snapshot[1]);

                if (innerRanges.length === 0) {
                    deepAttrs.push({
                        attrs:  [ { context: null, start: 0, end: null } ],
                        next:   { context: null }
                    });

                    promise.resolve(deepAttrs);
                    return;
                }

                var promises = innerRanges.map(function(ir) {
                    return this._shallowSyntaxInfoForLineFragment(ir.context,
                        ir.state, line, ir.start, ir.end);
                }.bind(this));

                m_promise.group(promises).
                    then(function(innerShallowSyntaxInfos) {
                        var innerAttrGroups = innerShallowSyntaxInfos.
                            map(function(issi) { return issi.attrs; });

                        // Assign the appropriate context to each attribute
                        // range.
                        for (var i = 0; i < innerAttrGroups.length; i++) {
                            var innerContext = innerRanges[i].context;
                            innerAttrGroups[i].forEach(function(ir) {
                                ir.context = innerContext;
                            });
                        }

                        var innerAttrs = this.
                            _flattenAttrGroups(innerAttrGroups);

                        var lastInnerAttrGroup =
                            innerAttrGroups[innerAttrGroups.length - 1];
                        var lastInnerAttrRange =
                            lastInnerAttrGroup[lastInnerAttrGroup.length - 1];

                        var innerNext;
                        if (lastInnerAttrRange.end === null) {
                            innerNext = {
                                context:    lastInnerAttrRange.context,
                                state:      lastInnerAttrRange.state
                            };
                        } else {
                            innerNext = { context: null };
                        }

                        deepAttrs.push({ attrs: innerAttrs, next: innerNext });
                        promise.resolve(deepAttrs);
                    }.bind(this));
        }.bind(this));

        return promise;
    },

    _defaultAttrs: function() {
        return [ { start: 0, end: null, tag: 'plain', actions: [] } ];
    },

    _deleteAttrsInRange: function(range) {
        var startRow = range.start.row, endRow = range.end.row;
        this._clearAttrsAtRow(startRow);
        this._lineAttrInfo.splice(startRow + 1, endRow - startRow);
    },

    _deleteRange: function(oldRange) {
        if (Range.isZeroLength(oldRange)) {
            return;
        }

        this._deleteAttrsInRange(oldRange);

        var oldStartRow = oldRange.start.row, oldEndRow = oldRange.end.row;
        this._adjustInvalidRowsForDeletion(oldStartRow, oldEndRow);
        this._invalidateRow(oldStartRow);
    },

    _flattenAttrGroups: function(attrGroups) {
        var flattenedAttrs = [];
        var position = 0;

        attrGroups.forEach(function(attrs) {
            var start = attrs[0].start;
            if (position !== start) {
                flattenedAttrs.push({
                    start:      position,
                    end:        start,
                    context:    null
                });
            }

            flattenedAttrs.pushObjects(attrs);

            position = attrs[attrs.length - 1].end;
        });

        if (position !== null) {
            flattenedAttrs.push({
                start:      position,
                end:        null,
                context:    null
            });
        }

        return flattenedAttrs;
    },

    _initialContextChanged: function() {
        this._reset();
        this.notifyDelegates('syntaxManagerInvalidatedSyntax');
    }.observes('initialContext'),

    _innerRangesFromAttrs: function(outerAttrs, innerContextAndState) {
        var currentContext = innerContextAndState.context;
        var currentState = innerContextAndState.state;
        var contextStart = 0;
        var innerRanges = [];

        outerAttrs.forEach(function(outerAttrRange) {
            outerAttrRange.actions.forEach(function(action) {
                switch (action[0]) {
                case 'start':
                    // TODO: Right now we silently refuse to highlight contexts
                    // nested more than one level deep.
                    if (currentContext !== null) {
                        break;
                    }

                    currentContext  = action[1];
                    currentState    = 'start';
                    contextStart    = outerAttrRange.end;
                    break;

                case 'stop':
                    if (currentContext !== action[1]) {
                        break;
                    }

                    var end = outerAttrRange.start;
                    if (contextStart !== end) {
                        innerRanges.push({
                            context:    currentContext,
                            state:      currentState,
                            start:      contextStart,
                            end:        end
                        });
                    }

                    currentContext = null;
                    break;
                }
            });
        });

        if (currentContext !== null) {
            innerRanges.push({
                context:    currentContext,
                state:      currentState,
                start:      contextStart,
                end:        null
            });
        }

        return innerRanges;
    },

    _insertAttrsIntoRange: function(range) {
        var start = range.start;
        var startRow = start.row, endRow = range.end.row;

        // Clear the first line.
        this._clearAttrsAtRow(startRow);

        // Insert the rest of the lines.
        var lineAttrInfo = this._lineAttrInfo;
        var newRowCount = endRow - startRow;
        for (var i = 0; i < newRowCount; i++) {
            var snapshot = [], attrs = [];
            for (var j = 0; j < 2; j++) {
                snapshot.push({ context: null });
                attrs.push(this._defaultAttrs());
            }

            lineAttrInfo.splice(startRow + 1, 0,
                { snapshot: snapshot, attrs: attrs });
        }
    },

    _insertRange: function(newRange) {
        if (Range.isZeroLength(newRange)) {
            return;
        }

        this._insertAttrsIntoRange(newRange);

        var newStartRow = newRange.start.row, newEndRow = newRange.end.row;
        this._adjustInvalidRowsForInsertion(newStartRow, newEndRow);
        this._invalidateRow(newStartRow);
    },

    // Adds a row to the set of invalid rows.
    _invalidateRow: function(row) {
        var invalidRows = this._invalidRows;

        invalidRows.push(row);
        invalidRows.sort(function(a, b) { return a - b; });
        this._invalidRows = invalidRows.uniq();
    },

    _mergeAttrGroups: function(attrGroups) {
        var mergedGroups = [];

        var outerGroup = attrGroups[0], innerGroup = attrGroups[1];
        var outerIndex = 0, innerIndex = 0;
        var pos = 0;

        while (pos !== null) {
            var outerRange = outerGroup[outerIndex];
            var innerRange = innerGroup[innerIndex];

            if (innerRange.context !== null) {
                // Inner ranges override outer ranges.
                mergedGroups.push(innerRange);

                pos = innerRange.end;
                innerIndex++;

                if (outerRange.end === pos) {
                    outerIndex++;
                }
            } else {
                mergedGroups.push(outerRange);

                pos = outerRange.end;
                outerIndex++;

                if (innerRange.end === pos) {
                    innerIndex++;
                }
            }
        }

        return mergedGroups;
    },

    // Runs the syntax highlighters. Returns the first unchanged row (i.e. the
    // row immediately following the row where the synchronization happened),
    // or null if the highlighting failed to synchronize before the end of the
    // range.
    _recomputeAttrInfoForRows: function(startRow, endRow, depth) {
        var promise = new Promise();
        var lineAttrInfo = this._lineAttrInfo;

        if (startRow === endRow) {
            // We succeeded only if we got to the end of the buffer.
            var result = startRow === lineAttrInfo.length ? startRow : false;
            promise.resolve(result);
            return promise;
        }

        if (SC.none(depth)) {
            depth = 0;
        }

        var thisLineAttrInfo = lineAttrInfo[startRow];
        var line = this.getPath('textStorage.lines')[startRow];

        this._deepSyntaxInfoForLine(thisLineAttrInfo.snapshot, line).
            then(function(deepSyntaxInfo) {
                thisLineAttrInfo.attrs =
                    deepSyntaxInfo.map(function(dsi) { return dsi.attrs; });

                if (startRow !== lineAttrInfo.length - 1) {
                    var nextLineAttrInfo = lineAttrInfo[startRow + 1];
                    var oldSnapshot = nextLineAttrInfo.snapshot;
                    var newSnapshot = deepSyntaxInfo.map(function(dsi) {
                        return dsi.next;
                    });

                    if (this._snapshotsEqual(oldSnapshot, newSnapshot)) {
                        promise.resolve(startRow + 1);
                        return;
                    }

                    nextLineAttrInfo.snapshot = newSnapshot;
                }

                if (depth === 50) {
                    // Do a 'manual tail call' so that we don't overflow the
                    // call stack. See bug 556151.
                    window.setTimeout(function() {
                        SC.run(function() {
                            this._recomputeAttrInfoForRows(startRow + 1,
                                endRow, 0).then(function(lastRow) {
                                    promise.resolve(lastRow);
                                });
                        }.bind(this));
                    }.bind(this), 0);
                } else {
                    this._recomputeAttrInfoForRows(startRow + 1, endRow,
                        depth + 1).then(function(lastRow) {
                            promise.resolve(lastRow);
                        });
                }
            }.bind(this));

        return promise;
    },

    // Invalidates all the highlighting.
    _reset: function() {
        var lineAttrInfo = [];
        var lineCount = this.getPath('textStorage.lines').length;
        var initialContext = this.get('initialContext');

        for (var i = 0; i < lineCount; i++) {
            var firstContext;
            if (i === 0) {
                firstContext = { context: initialContext, state: 'start' };
            } else {
                firstContext = { context: null };
            }

            lineAttrInfo.push({
                snapshot: [ firstContext, { context: null } ],
                attrs: [
                    this._defaultAttrs(),
                    [ { context: null, start: 0, end: null } ]
                ]
            });
        }

        this._invalidRows = [ 0 ];
        this._lineAttrInfo = lineAttrInfo;
    },

    // Calls out to the appropriate syntax highlighter.
    _shallowSyntaxInfoForLineFragment: function(context, state, line, start,
            end) {
        var promise = new Promise();

        if (context === 'plain') {
            promise.resolve({
                attrs:  this._defaultAttrs(),
                next:   { context: 'plain', state: 'start' }
            });
        } else {
            syntaxDirectory.loadSyntax(context).then(function(syntax) {
                try {
                    syntax.syntaxInfoForLineFragment(context, state, line,
                        start, end).then(function(result) {
                            promise.resolve(result);
                        });
                } catch (e) {
                    console.log('Syntax highlighter ', context, ' caused an ' +
                        'exception:', e);
                    promise.resolve({
                        attrs:  this._defaultAttrs(),
                        next:   { context: 'plain', state: 'start' }
                    });
                }
            }.bind(this));
        }

        return promise;
    },

    _snapshotsEqual: function(snapshotA, snapshotB) {
        if (snapshotA.length !== snapshotB.length) {
            return false;
        }

        for (var i = 0; i < snapshotA.length; i++) {
            var casA = snapshotA[i], casB = snapshotB[i];
            if (casA.context !== casB.context || casA.state !== casB.state) {
                return false;
            }
        }

        return true;
    },

    /**
     * @property{string}
     *
     * The initial context. Defaults to 'plain'.
     */
    initialContext: 'plain',

    /**
     * @property{TextStorage}
     *
     * The character data is read from this text storage instance.
     */
    textStorage: null,

    /**
     * Returns the attributed text currently in the cache for the given range
     * of rows. To ensure that the text returned by this method is up to date,
     * updateSyntaxForRows() should be called first.
     */
    attrsForRows: function(startRow, endRow) {
        return this._lineAttrInfo.slice(startRow, endRow).map(function(lai) {
            return this._mergeAttrGroups(lai.attrs);
        }, this);
    },

    /**
     * Returns the contexts active at the given row and column.
     */
    contextsAtPosition: function(pos) {
        var attrGroups = this._lineAttrInfo[pos.row].attrs;
        var contexts = [];
        attrGroups.forEach(function(attrs) {
            var index = this._attrIndexForColumn(attrs, pos.column);
            var context = attrs[index].context;
            if (context !== null) {
                contexts.push(context);
            }
        }, this);

        return contexts;
    },

    init: function() {
        this._reset();
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
     * Sets the initial context to the syntax highlighter appropriately for
     * the given file extension, or to 'plain' if the extension doesn't have an
     * associated syntax highlighter.
     */
    setInitialContextFromExt: function(fileExt) {
        fileExt = fileExt.toLowerCase();
        var extension = catalog.getExtensionByKey('fileextension', fileExt);

        var syntax;
        if (SC.none(extension) || SC.none(extension.syntax)) {
            syntax = 'plain';
        } else {
            syntax = extension.syntax;
        }

        this.set('initialContext', syntax);
    },

    /**
     * Returns a string representation of the internal structure of the syntax
     * manager, for debugging purposes.
     */
    toString: function() {
        return '{ lineAttrInfo: [ %@ ], invalidRows: [ %@ ] }'.
            fmt(this._lineAttrInfo.map(function(info) {
                return '{ (%@) -> (%@) }'.fmt(info.snapshot.map(function(cas) {
                    return cas.context + ': ' + cas.state;
                }).join(', '),
                info.attrs.map(this._attrsToString.bind(this)).join(', '));
            }.bind(this)).join(', '),
            this._invalidRows.join(', '));
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
            if (invalidRow < endRow) {
                break;
            }
        }

        var promise = new Promise();

        if (index === invalidRowCount) {
            // Nothing to do.
            promise.resolve({ startRow: startRow, endRow: startRow });
        } else {
            var invalidRow = invalidRows[index];

            // Remove any invalid rows within the range we're about to update.
            while (index < invalidRows.length && invalidRows[index] < endRow) {
                invalidRows.splice(index, 1);
            }

            // Recompute the attributes for the appropriate rows.
            this._recomputeAttrInfoForRows(invalidRow, endRow).
                then(function(firstUnchangedRow) {
                    if (firstUnchangedRow === false) {
                        this._invalidateRow(endRow);
                        firstUnchangedRow = endRow;
                    }

                    promise.resolve({
                        startRow:   startRow,
                        endRow:     firstUnchangedRow
                    });
                }.bind(this));
        }

        return promise;
    }
});

