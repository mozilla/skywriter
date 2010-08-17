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

var Event = require('events').Event;
var util = require('bespin:util/util');

var TextStorage;

/**
 * Creates a new text storage object holding the given string (if supplied).
 *
 * @constructor
 * @exports TextStorage as text_editor:models.textstorage.TextStorage
 */
TextStorage = function(initialValue) {
    if (initialValue !== null && initialValue !== undefined) {
        this._lines = initialValue.split("\n");
    } else {
        this._lines = [ '' ];
    }

    /**
     * Called whenever the text changes with the old and new ranges supplied.
     */
    this.changed = new Event();

    return this;
};

TextStorage.prototype = {
    /** @lends TextStorage */

    _lines: null,

    /**
     * Whether this model is read-only. Attempts to modify a read-only model
     * result in exceptions.
     *
     * @type {boolean}
     */
    readOnly: false,

    /**
     * Returns the position of the nearest character to the given position,
     * according to the selection rules.
     *
     * @param {position} pos The position to clamp.
     */
    clampPosition: function(pos) {
        var lines = this._lines;

        var row = pos.row;
        if (row < 0) {
            return { row: 0, col: 0 };
        } else if (row >= lines.length) {
            return this.range.end;
        }

        var col = Math.max(0, Math.min(pos.col, lines[row].length));
        return { row: row, col: col };
    },

    /**
     * Returns the actual range closest to the given range, according to the
     * selection rules.
     */
    clampRange: function(range) {
        var start = this.clampPosition(range.start);
        var end = this.clampPosition(range.end);
        return { start: start, end: end };
    },

    /** Deletes all characters in the range. */
    deleteCharacters: function(range) {
        this.replaceCharacters(range, '');
    },

    /**
     * Returns the result of displacing the given position by count characters
     * forward (if count > 0) or backward (if count < 0).
     */
    displacePosition: function(pos, count) {
        var forward = count > 0;
        var lines = this._lines;
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
                    lines = this._lines;
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
        var lines = this._lines;
        var start = range.start, end = range.end;
        var startRow = start.row, endRow = end.row;
        var startCol = start.col, endCol = end.col;

        if (startRow === endRow) {
            return lines[startRow].substring(startCol, endCol);
        }

        var firstLine = lines[startRow].substring(startCol);
        var middleLines = lines.slice(startRow + 1, endRow);
        var endLine = lines[endRow].substring(0, endCol);
        return [ firstLine ].concat(middleLines, endLine).join('\n');
    },

    /** Returns the lines of the text storage as a read-only array. */
    getLines: function() {
        return this._lines;
    },

    /** Returns the span of the entire text content. */
    getRange: function() {
        var lines = this._lines;
        var endRow = lines.length - 1;
        var endCol = lines[endRow].length;
        var start = { row: 0, col: 0 }, end = { row: endRow, col: endCol };
        return { start: start, end: end };
    },

    /** Returns the text in the text storage as a string. */
    getValue: function() {
        return this._lines.join('\n');
    },

    /** Inserts characters at the supplied position. */
    insertCharacters: function(pos, chars) {
        this.replaceCharacters({ start: pos, end: pos }, chars);
    },

    /** Replaces the characters within the supplied range. */
    replaceCharacters: function(oldRange, characters) {
        if (this.readOnly) {
            throw new Error("Attempt to modify a read-only text storage " +
                "object");
        }

        var addedLines = characters.split('\n');
        var addedLineCount = addedLines.length;

        var newRange = this.resultingRangeForReplacement(oldRange, addedLines);

        var oldStart = oldRange.start, oldEnd = oldRange.end;
        var oldStartRow = oldStart.row, oldEndRow = oldEnd.row;
        var oldStartColumn = oldStart.col;

        var lines = this._lines;
        addedLines[0] = lines[oldStartRow].substring(0, oldStartColumn) +
            addedLines[0];
        addedLines[addedLineCount - 1] +=
            lines[oldEndRow].substring(oldEnd.col);

        this._lines = util.replace(lines, oldStartRow, oldEndRow - oldStartRow + 1, addedLines);

        this.changed(oldRange, newRange, characters);
    },

    /**
     * Returns the character range that would be modified if the range were
     * replaced with the given lines.
     */
    resultingRangeForReplacement: function(range, lines) {
        var lineCount = lines.length;
        var lastLineLength = lines[lineCount - 1].length;
        var start = range.start;
        var endRow = start.row + lineCount - 1;
        var endCol = (lineCount === 1 ? start.col : 0) + lastLineLength;
        return { start: start, end: { row: endRow, col: endCol } };
    },

    setLines: function(newLines) {
        this.setValue(newLines.join('\n'));
    },

    setValue: function(newValue) {
        this.replaceCharacters(this.range, newValue);
    }
};

exports.TextStorage = TextStorage;

Object.defineProperties(exports.TextStorage.prototype, {
    lines: {
        get: function() {
            return this.getLines();
        },
        set: function(newLines) {
            return this.setLines(newLines);
        }
    },
    
    range: {
        get: function() {
            return this.getRange();
        }
    },
    
    value: {
        get: function() {
            return this.getValue();
        },
        set: function(newValue) {
            this.setValue(newValue);
        }
    }
});
