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

exports.TextStorage = SC.Object.extend({
    /**
     * A list of delegates objects. All objects in this array receive
     * textStorageEdited() messages.
     */
    delegates: null,

    /**
     * @property{Array<String>}
     *
     * The list of lines, stored as an array of strings. Read-only.
     */
    lines: null,

    init: function() {
        this.superclass();

        this.set('delegates', []);
        this.set('lines', [ "" ]);
    },

    value: function(key, value) {
        var lines = this.get('lines');
        if (value !== undefined) {
            var rowCount = lines.length;
            this.replaceCharacters({
                start:  { row: 0, column: 0 },
                end:    {
                    row:    rowCount - 1,
                    column: lines[rowCount - 1].length
                }
            }, value);
        }

        return lines.join("\n");
    }.property('lines.[]'),

    replaceCharacters: function(range, characters) {
        var addedLines = characters.split("\n");
        var lines = this.get('lines');
        var startRow = range.start.row, endRow = range.end.row;
        addedLines[0] = lines[startRow].substring(0, range.start.column) +
            addedLines[0];
        addedLines[addedLines.length - 1] +=
            lines[endRow].substring(range.end.column);

        lines.replace(startRow, endRow - startRow + 1, addedLines);

        var thisTextStorage = this;
        this.get('delegates').forEach(function(delegate) {
            delegate.textStorageEdited(thisTextStorage, range, characters);
        }); 
    },

    insertCharacters: function(position, characters) {
        this.replaceCharacters({ start: position, end: position }, characters);
    },

    deleteCharacters: function(range) {
        this.replaceCharacters(range, "");
    }
});

