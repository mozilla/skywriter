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

/**
 * @class
 *
 * A simple line-based patch implementation, used for Undo.
 */
exports.Patch = SC.Object.extend({
    /**
     * @property{Array}
     *
     * The hunks in the patch. Hunk objects have the following properties:
     *   * newRange{LineRange}: The resulting post-patch range.
     *   * oldRange{LineRange}: The original, pre-patch range.
     *   * operations{Array}: The operations to perform, given as an array of
     *         objects with 'op' (one of '+', '-', or ' ') and 'line'
     *         properties.
     */
    hunks: null,

    /**
     * Applies the patch to a text storage object.
     *
     * @param  text{TextStorage} The text storage object to modify.
     * @return True on success or false on failure. On failure, the text
     *         storage object will be unchanged.
     */
    applyTo: function(textStorage) {
        var lines = textStorage.get('lines');
        var hunks = this.get('hunks');

        // Ensure that the patch matches.
        for (var i = 0; i < hunks.length; i++) {
            var hunk = hunks[i];
            var start = hunks[i].oldRange.start;
            for (var j = 0; j < hunk.length; i++) {
                var ops = hunk.operations;
                for (var k = 0; k < ops.length; k++) {
                    var op = ops[k];
                    if ((op.op === '-' || op.op === ' ') &&
                            lines[start + k] !== op.line) {
                        // TODO: Find an offset and match elsewhere.
                        return false;
                    }
                }
            }
        }

        // Apply the patch.
        var offset = 0;
        hunks.forEach(function(hunk) {
            var row = hunk.oldRange.start + offset;
            hunk.operations.forEach(function(op) {
                switch (op.op) {
                case '-':
                    textStorage.deleteCharacters({
                        start:  { row: row,     column: 0 },
                        end:    { row: row + 1, column: 0 }
                    });
                    offset--;
                    break;
                case '+':
                    textStorage.insertCharacters({ row: row, column: 0 },
                        op.line + "\n");
                    row++;
                    offset++;
                    break;
                case ' ':
                    row++;
                    break;
                }
            });
        });

        return true;
    },

    /**
     * Returns the reverse of this patch, which allows this patch to be undone.
     */
    reverse: function() {
        return exports.Patch.create({
            hunks: this.hunks.map(function(hunk) {
                return {
                    oldRange:   hunk.newRange,
                    newRange:   hunk.oldRange,
                    operations: hunk.operations.map(function(operation) {
                        var op;
                        switch (operation.op) {
                        case '+':   op = '-';   break;
                        case '-':   op = '+';   break;
                        case ' ':   op = ' ';   break;
                        }
                        return { op: op, line: operation.line };
                    })
                };
            })
        });
    },

    /**
     * Returns the patch in unified diff format.
     */
    toString: function() {
        return this.hunks.map(function(hunk) {
            var oldRange = hunk.oldRange, newRange = hunk.newRange;
            var oldStart = oldRange.start, newStart = newRange.start;
            return [
                "@@ -%@,%@ +%@,%@ @@".fmt(oldStart, oldRange.end - oldStart +
                    1, newStart, newRange.end - newStart + 1)
            ].concat(hunk.operations.map(function(operation) {
                return operation.op + operation.line;
            })).join("\n");
        }).join("\n");
    }
});

