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
var MultiDelegateSupport = require('delegate_support').MultiDelegateSupport;
var TextBuffer = require('mixins/textbuffer').TextBuffer;

exports.TextStorage = SC.Object.extend(MultiDelegateSupport, TextBuffer, {
    /**
     * @property{string}
     *
     * The initial string to store in the text storage buffer. Has no meaning
     * after this object is initialized.
     */
    initialValue: "",

    /**
     * @property{Array<String>}
     *
     * The list of lines, stored as an array of strings. Read-only.
     */
    lines: null,

    /**
     * Returns the position of the nearest character to the given position,
     * according to the selection rules.
     */
    clampPosition: function(position) {
        var lines = this.get('lines');
        var row = position.row;
        if (row < 0) {
            return { row: 0, col: 0 };
        } else if (row >= lines.length) {
            return this.range().end;
        }

        return {
            row:    row,
            col: Math.max(0, Math.min(position.col, lines[row].length))
        };
    },

    /**
     * Returns the actual range closest to the given range, according to the
     * selection rules.
     */
    clampRange: function(range) {
        return {
            start:  this.clampPosition(range.start),
            end:    this.clampPosition(range.end)
        };
    },

    /**
     * Returns the result of displacing the given position by @count characters
     * forward (if @count > 0) or backward (if @count < 0).
     */
    displacePosition: function(pos, count) {
        var forward = count > 0;
        var lines = this.get('lines');
        var lineCount = lines.length;

        for (var i = Math.abs(count); i !== 0; i--) {
            if (forward) {
                var rowLength = lines[pos.row].length;
                if (pos.row === lineCount - 1 && pos.col === rowLength) {
                    return pos;
                }
                pos = pos.col === rowLength ?
                    { row: pos.row + 1, col: 0            } :
                    { row: pos.row,     col: pos.col + 1  };
            } else {
                if (pos.row === 0 && pos.col == 0) {
                    return pos;
                }

                if (pos.col === 0) {
                    var lines = this.get('lines');
                    pos = {
                        row:    pos.row - 1,
                        col: lines[pos.row - 1].length
                    };
                } else {
                    pos = { row: pos.row, col: pos.col - 1 };
                }
            }
        }
        return pos;
    },

    /**
     * Returns the characters in the given range as a string.
     */
    getCharacters: function(range) {
        var lines = this.get('lines');
        var start = range.start, end = range.end;
        var startRow = start.row, endRow = end.row;
        var startColumn = start.col, endColumn = end.col;
        if (startRow === endRow) {
            return lines[startRow].substring(startColumn, endColumn);
        }
        return [ lines[startRow].substring(startColumn) ].
            concat(lines.slice(startRow + 1, endRow),
            lines[endRow].substring(0, endColumn)).join('\n');
    },

    getValue: function() {
        return this.get('lines').join('\n');
    },

    init: function() {
        arguments.callee.base.apply(this, arguments);

        this.set('lines', this.get('initialValue').split('\n'));
        delete this.initialValue;
    },

    /**
     * Returns the span of the entire text content.
     */
    range: function() {
        var lines = this.get('lines');
        return {
            start:  { row: 0, col: 0 },
            end:    {
                row: lines.length - 1,
                col: lines[lines.length - 1].length
            }
        };
    },

    /**
     * Replaces the characters within the supplied range with the given string.
     */
    replaceCharacters: function(oldRange, characters) {
        var addedLines = characters.split('\n');
        var addedLineCount = addedLines.length;

        var newRange = this.resultingRangeForReplacement(oldRange, addedLines);

        var oldStart = oldRange.start, oldEnd = oldRange.end;
        var oldStartRow = oldStart.row, oldEndRow = oldEnd.row;
        var oldStartColumn = oldStart.col;

        var lines = this.get('lines');
        addedLines[0] = lines[oldStartRow].substring(0, oldStartColumn) +
            addedLines[0];
        addedLines[addedLineCount - 1] +=
            lines[oldEndRow].substring(oldEnd.col);

        lines.replace(oldStartRow, oldEndRow - oldStartRow + 1, addedLines);

        this.notifyDelegates('textStorageEdited', oldRange, newRange);
    },

    /**
     * Sets the contents of the text buffer to the given string.
     */
    setValue: function(newValue) {
        this.replaceCharacters(this.range(), newValue);
    }
});

