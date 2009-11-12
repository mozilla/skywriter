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

var bespin = require("package");
var SC = require("sproutcore/runtime:package").SC;

/**
 * Add a setting to restrict the cursor to valid cursor positions
 */
bespin.get("settings").addSetting({
    name: "strictlines",
    type: "boolean",
    defaultValue: false
});

/**
 * Add a setting to alter cursor positioning on new lines?
 */
bespin.get("settings").addSetting({
    name: "smartmove",
    type: "boolean",
    defaultValue: true
});

/**
 * Handles the position of the cursor, hiding the complexity of translating
 * between screen and model positions and so forth
 */
exports.CursorManager = SC.Object.extend({
    editor: null,
    init: function() {
        this.position = { row: 0, col: 0 };
        this.virtualCol = 0;

        // If someone does 'set strictlines on' then we need to check to see
        // if the cursor is in a valid place, and correct if not.
        bespin.subscribe("settings:set:strictlines", function(setting) {
            if (setting.value) {
                var oldPos = exports.copyPos(this.position);
                this.checkPastEndOfLine(oldPos);
            }
        }.bind(this));

        sc_super();
    },

    /**
     * Returns 'this.position' or 'pos' from optional input 'modelPos'
     */
    getCursorPosition: function(modelPos) {
        if (modelPos == undefined) {
            return this.position;
        }

        var pos = exports.copyPos(modelPos);

        // Avoid modifying model by just using an empty array if row is out of
        // range this is because getRowArray adds rows if the row is out of
        // range.
        var line = [];
        if (this.editor.model.hasRow(pos.row)) {
            line = this.editor.model.getRowArray(pos.row);
        }

        var tabsize = this.editor.getTabSize();

        // Special tab handling
        if (line.indexOf("\t") != -1) {
            // console.log( 'Cursor modelPos.col/pos.col begin: ', modelPos.col, pos.col );
            var tabs = 0, nottabs = 0;

            for (var i = 0; i < modelPos.col; i++) {
                if (line[i] == "\t") {
                    pos.col += tabsize - 1 - (nottabs % tabsize);
                    tabs++;
                    nottabs = 0;
                } else {
                    nottabs++;
                    tabs = 0;
                }
                // console.log( 'tabs: ' + tabs, 'nottabs: ' + nottabs, 'pos.col: ' + pos.col );
            }

            // console.log( 'Cursor modelPos.col/pos.col end: ' + modelPos.col, pos.col );
        }

        return pos;
    },

    /**
     * Returns 'modelPos' from optional input 'pos' or 'this.position'
     */
    getModelPosition: function(pos) {
        pos = (pos != undefined) ? pos : this.position;
        var modelPos = exports.copyPos(pos);

        //avoid modifying model by just using an empty array if row is out of range
        //this is because getRowArray adds rows if the row is out of range.
        var line = [];
        if (this.editor.model.hasRow(pos.row)){line = this.editor.model.getRowArray(pos.row);}

        var tabsize = this.editor.getTabSize();

        // Special tab handling
        if (line.indexOf("\t") != -1) {
            // for now, modelPos MUST BE more than the final result. So, we can loop up to it.
            // simplest thing is to just add characters until we would exceed modelPos.
            var current_pos = 0;
            for (var i = 0; i < modelPos.col; i++) {
                var new_pos = current_pos;

                // if there is a tab, find what the editor position would be if we added it.
                if (line[i] == '\t') {
                    new_pos = Math.floor((current_pos + tabsize) / tabsize) * tabsize;
                } else {
                    new_pos += 1;
                }

                // if the position including the tab is PAST the editor position supplied, then stop.
                if (new_pos > modelPos.col) {
                    // if modelPos is closer to new_pos than current_pos, we got to next character
                    //if (new_pos - modelPos.col < modelPos.col - current_pos)
                    //    i++; //got to next character
                    break;
                }
                current_pos = new_pos;
            }
            modelPos.col = i;
        }

        return modelPos;
    },

    /**
     *
     */
    getCharacterLength: function(character, column) {
        if (character.length > 1) {
            return;
        }
        if (column == undefined) {
            column = this.position.col;
        }
        if (character == "\t") {
            var tabsize = this.editor.getTabSize();
            return tabsize - (column % tabsize);
        } else {
            return 1;
        }
    },

    /**
     * Returns the length of a given string. This takes '\t' in account!
     */
    getStringLength: function(str) {
        if (!str || str.length == 0) {
            return 0;
        }
        var count = 0;
        str = str.split("");
        for (var x = 0; x < str.length; x++) {
            count += this.getCharacterLength(str[x], count);
        }
        return count;
    },

    // returns the numbers of white spaces from the beginning of the line
    // tabs are counted as whitespace
    getLeadingWhitespace: function(rowIndex) {
        var row = this.editor.model.getRowArray(rowIndex).join("");
        var match = /^(\s+).*/.exec(row);
        return (match && match.length == 2 ? this.getStringLength(match[1]) : 0);
    },

    // Returns the numbers of white spaces (NOT '\t'!!!) in a row
    // if the string between <from> and <to> is "  ab     " this will give you 2, as
    // there are 2 white spaces together from the beginning
    getContinuousSpaceCount: function(from, to, rowIndex) {
        rowIndex = rowIndex || this.position.row;
        var settings = bespin.get('settings');
        var row = this.editor.model.getRowArray(rowIndex);
        var delta = (from < to ? 1 : -1);
        var length = row.length;
        from = from + (delta == 1 ? 0 : -1);
        to = to + (delta == 1 ? 0 : -1);
        from = this.getModelPosition({col: from, row: rowIndex}).col;
        to = this.getModelPosition({col: to, row: rowIndex}).col;
        if (settings.values.strictlines) {
            from = Math.min(from, length);
            to = Math.min(to, length);
        }
        var count = 0;
        for (var x = from; x != to; x += delta) {
            if (x < length) {
                if (row[x] != ' ') {
                    break;
                }
            }
            count++;
        }
        return count;
    },

    getNextTablevelLeft: function(col) {
        var tabsize = this.editor.getTabSize();
        col = col || this.position.col;
        col--;
        return Math.floor(col / tabsize) * tabsize;
    },

    getNextTablevelRight: function(col) {
        var tabsize = this.editor.getTabSize();
        col = col || this.position.col;
        col++;
        return Math.ceil(col / tabsize) * tabsize;
    },

    moveToLineStart: function() {
        var oldPos = exports.copyPos(this.position);
        var leadingWhitespaceLength = this.getLeadingWhitespace(oldPos.row);

        if (this.position.col == 0) {
            this.moveCursor({ col:  leadingWhitespaceLength });
        } else if (this.position.col == leadingWhitespaceLength) {
            this.moveCursor({ col: 0 });
        } else if (leadingWhitespaceLength != this.editor.editorView.getRowScreenLength(this.editor.cursorManager.getCursorPosition().row)) {
            this.moveCursor({ col: leadingWhitespaceLength });
        } else {
            this.moveCursor({ col: 0 });
        }

        return { oldPos: oldPos, newPos: exports.copyPos(this.position) };
    },

    moveToLineEnd: function() {
        var oldPos = exports.copyPos(this.position);

        this.moveCursor({ col: this.editor.editorView.getRowScreenLength(oldPos.row) });

        return { oldPos: oldPos, newPos: exports.copyPos(this.position) };
    },

    moveToTop: function() {
        var oldPos = exports.copyPos(this.position);

        this.editor.cursorManager.moveCursor({ row: 0, col: 0 });

        return { oldPos: oldPos, newPos: exports.copyPos(this.position) };
    },

    moveToBottom: function() {
        var oldPos = exports.copyPos(this.position);

        var row = this.editor.model.getRowCount() - 1;
        this.editor.cursorManager.moveCursor({
            row: row,
            col: this.editor.editorView.getRowScreenLength(row)
        });

        return { oldPos: oldPos, newPos: exports.copyPos(this.position) };
    },

    moveUp: function() {
        var oldPos = exports.copyPos(this.position);

        this.moveCursor({
            row: oldPos.row - 1,
            col: Math.max(oldPos.col, this.virtualCol)
        });

        this.checkPastEndOfLine(oldPos);

        return { oldPos: oldPos, newPos: exports.copyPos(this.position) };
    },

    moveDown: function() {
        var oldPos = exports.copyPos(this.position);

        this.moveCursor({
            row: Math.max(0, oldPos.row + 1),
            col: Math.max(oldPos.col, this.virtualCol)
        });

        this.checkPastEndOfLine(oldPos);

        return { oldPos: oldPos, newPos: exports.copyPos(this.position) };
    },

    moveLeft: function(args) {
        var settings = bespin.get("settings");
        var oldPos = exports.copyPos(this.position);
        var shiftKey = (args.event ? args.event.shiftKey : false);

        if (!this.editor.getSelection() || shiftKey) {
            if (settings.values.smartmove) {
                var freeSpaces = this.getContinuousSpaceCount(oldPos.col, this.getNextTablevelLeft());
                if (freeSpaces == this.editor.getTabSize()) {
                    this.moveCursor({ col: oldPos.col - freeSpaces });
                    return { oldPos: oldPos, newPos: exports.copyPos(this.position) };
                } // else {
                //  this case is handled by the code following
                //}
            }

            // start of the line so move up
            if (settings.values.strictlines && this.position.col == 0) {
                this.moveUp();
                if (oldPos.row > 0) {
                    this.moveToLineEnd();
                }
            } else {
                this.moveCursor({ row: oldPos.row, col: Math.max(0, oldPos.col - 1) });
            }
        } else {
            this.moveCursor(this.editor.getSelection().startPos);
        }

        return { oldPos: oldPos, newPos: exports.copyPos(this.position) };
    },

    moveRight: function(args) {
        var settings = bespin.get("settings");
        var oldPos = exports.copyPos(this.position);
        var shiftKey = (args.event ? args.event.shiftKey : false);

        if (!this.editor.getSelection() || shiftKey) {
            if (settings.values.smartmove && args != true) {
                var freeSpaces = this.getContinuousSpaceCount(oldPos.col, this.getNextTablevelRight());
                if (freeSpaces == this.editor.getTabSize()) {
                    this.moveCursor({ col: oldPos.col + freeSpaces });
                    return { oldPos: oldPos, newPos: exports.copyPos(this.position) };
                }// else {
                //  this case is handled by the code following
                //}
            }

            // end of the line, so go to the start of the next line
            if (settings.values.strictlines && (this.position.col >= this.editor.editorView.getRowScreenLength(this.position.row))) {
                this.moveDown();
                if (oldPos.row < this.editor.model.getRowCount() - 1) {
                    this.moveCursor({ col: 0 });
                }
            } else {
                this.moveCursor({ col: this.position.col + 1 });
            }
        } else {
            this.moveCursor(this.editor.getSelection().endPos);
        }

        return { oldPos: oldPos, newPos: exports.copyPos(this.position) };
    },

    movePageUp: function() {
        var oldPos = exports.copyPos(this.position);

        this.moveCursor({
            row: Math.max(this.editor.editorView.firstVisibleRow
                - this.editor.editorView.visibleRows, 0)
        });

        this.checkPastEndOfLine(oldPos);

        return { oldPos: oldPos, newPos: exports.copyPos(this.position) };
    },

    movePageDown: function() {
        var oldPos = exports.copyPos(this.position);

        this.moveCursor({
            row: Math.min(this.position.row
                + this.editor.editorView.visibleRows,
                this.editor.model.getRowCount() - 1)
        });

        this.checkPastEndOfLine(oldPos);

        return { oldPos: oldPos, newPos: exports.copyPos(this.position) };
    },

    /**
     * If strictlines is off, then we need to ensure that the cursor isn't off
     * the end of the line.
     */
    checkPastEndOfLine: function(oldPos) {
        var settings = bespin.get("settings");
        var isStrictLines = settings.values.strictlines;
        var maxCol
            = this.editor.editorView.getRowScreenLength(this.position.row);
        if (isStrictLines && this.position.col > maxCol) {
            // this sets this.virtulaCol = 0!
            this.moveToLineEnd();
            this.virtualCol = Math.max(oldPos.col, this.virtualCol);
        }
    },

    smartMoveLeft: function() {
        var oldPos = exports.copyPos(this.position);

        var row = this.editor.editorView.getRowString(oldPos.row);

        var c, charCode;

        if (this.position.col == 0) { // -- at the start to move up and to the end
            this.moveUp();
            this.moveToLineEnd();
        } else {
            // Short circuit if cursor is ahead of actual spaces in model
            if (row.length < this.position.col){this.moveToLineEnd();}

            var newcol = this.position.col;

            // This slurps up trailing spaces
            var wasSpaces = false;
            while (newcol > 0) {
                newcol--;

                c = row.charAt(newcol);
                charCode = c.charCodeAt(0);
                if (charCode == 32 /*space*/) {
                    wasSpaces = true;
                } else {
                    newcol++;
                    break;
                }
            }

            // This jumps to stop words
            if (!wasSpaces) {
                while (newcol > 0) {
                    newcol--;
                    c = row.charAt(newcol);
                    charCode = c.charCodeAt(0);
                    // if you get to an alpha you are done
                    if ((charCode < 65) || (charCode > 122)) {
                        if (newcol != this.position.col - 1) {
                            // right next to a stop char, move back one
                            newcol++;
                        }
                        break;
                    }
                }
            }

            this.moveCursor({ col: newcol });
        }

        return { oldPos: oldPos, newPos: exports.copyPos(this.position) };
    },

    smartMoveRight: function() {
        var oldPos = exports.copyPos(this.position);

        var row = this.editor.editorView.getRowString(oldPos.row);

        if (row.length <= this.position.col) { // -- at the edge so go to the next line
            this.moveDown();
            this.moveToLineStart();
        } else {
            var c, charCode;

            var newcol = this.position.col;

            // This slurps up leading spaces
            var wasSpaces = false;
            while (newcol < row.length) {
                c = row[newcol];
                charCode = c.charCodeAt(0);
                if (charCode == 32 /*space*/) {
                    wasSpaces = true;
                    newcol++;
                } else {
                    break;
                }
            }

            // This jumps to stop words
            if (!wasSpaces) {
                while (newcol < row.length) {
                    newcol++;

                    if (row.length == newcol) { // one more to go
                        this.moveToLineEnd();
                        newcol = -1;
                        break;
                    }

                    c = row[newcol];
                    charCode = c.charCodeAt(0);

                    if ( (charCode < 65) || (charCode > 122) ) {
                        break;
                    }
                }
            }

            if (newcol != -1){this.moveCursor({ col: newcol });}
        }

        return { oldPos: oldPos, newPos: exports.copyPos(this.position) };
    },

    moveCursor: function(newpos) {
        if (!newpos) {
            return; // guard against a bad position (certain redo did this)
        }
        if (newpos.col === undefined) {
            newpos.col = this.position.col;
        }
        if (newpos.row === undefined) {
            newpos.row = this.position.row;
        }

        this.virtualCol = 0;
        var oldpos = this.position;

        // last row if you go over
        var row = Math.min(newpos.row, this.editor.model.getRowCount() - 1);
        if (row < 0) {
            row = 0; // can't move negative off screen
        }

        var invalid = this.isInvalidCursorPosition(row, newpos.col);
        if (invalid) {
            // console.log('Comparing (' + oldpos.row + ',' + oldpos.col + ') to (' + newpos.row + ',' + newpos.col + ') ...');
            // console.log("invalid position: " + invalid.left + ", " + invalid.right + "; half: " + invalid.half);
            if (oldpos.row != newpos.row) {
                newpos.col = invalid.right;
            } else if (oldpos.col < newpos.col) {
                newpos.col = invalid.right;
            } else if (oldpos.col > newpos.col) {
                newpos.col = invalid.left;
            } else {
                // default
                newpos.col = invalid.right;
            }
        }

        this.position = { row: row, col: newpos.col };
        // console.log('Position: (' + this.position.row + ', ' + this.position.col + ')', '[' + this.getModelPosition().col + ']');

        // keeps the editor's cursor from blinking while moving it
        var editorView = bespin.get('editor').editorView;
        editorView.showCursor = true;
        editorView.toggleCursorAllowed = false;

        // Tell the editor view that the cursor moved; this is the main way
        // the model informs the view of changes.
        editorView.cursorDidMove(this, this.position);
    },

    // Pass in a screen position; returns undefined if the postion is valid,
    // otherwise returns closest left and right valid positions
    isInvalidCursorPosition: function(row, col) {
        var rowArray = this.editor.model.getRowArray(row);

        // we need to track the cursor position separately because we're
        // stepping through the array, not the row string
        var curCol = 0;
        for (var i = 0; i < rowArray.length; i++) {
            if (rowArray[i].charCodeAt(0) == 9) {
                // if current character in the array is a tab, work out the
                // white space between here and the tab stop
                var toInsert = this.editor.getTabSize() - (curCol % this.editor.getTabSize());

                // if the passed column is in the whitespace between the tab and
                // the tab stop, it's an invalid position
                if ((col > curCol) && (col < (curCol + toInsert))) {
                    return { left: curCol, right: curCol + toInsert, half: toInsert / 2 };
                }

                curCol += toInsert - 1;
            }
            curCol++;
        }

        return undefined;
    }
});

/**
 * Mess with positions mainly
 */
exports.buildArgs = function(oldPos) {
    return {
        pos: exports.copyPos(oldPos || bespin.get('editor').getCursorPos())
    };
};

exports.changePos = function(args, pos) {
    return {
        pos: exports.copyPos(pos || bespin.get('editor').getCursorPos())
    };
};

exports.copyPos = function(oldPos) {
    return {
        row: oldPos.row,
        col: oldPos.col
    };
};

exports.posEquals = function(pos1, pos2) {
    if (pos1 == pos2) {
        return true;
    }
    if (!pos1 || !pos2) {
        return false;
    }
    return (pos1.col == pos2.col) && (pos1.row == pos2.row);
};
