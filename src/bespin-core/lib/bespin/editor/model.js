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

var bespin = require("bespin");
var copyPos = require("bespin/editor/utils");

/**
 * The editor has a model of the data that it works with.
 * This representation is encapsulated in Bespin.Editor.DocumentModel
 */
exports.DocumentModel = SC.Object.extend({
    editor: null,
    init: function() {
        this.clear();
    },

    /**
     * addHistoryItem adds an item to the model's history.
     * Erases anything after the current position in the history stack
     */
    addHistoryItem: function(func, data) {
        this.history.length = this.historyIndex + 1; // if current index == -1 (no history), length = 0. ==0, length = 1.
        this.history.push({ func: func, data: data });
        this.historyIndex++;
    },

    performHistoryItem: function(item) {
        var func = item.func;
        var data = item.data;
        switch (func) {
            case 'deleteCharacters':
                this.deleteCharacters(data.pos, data.characters.length, true);
                break;
            case 'insertCharacters':
                this.insertCharacters(data.pos, data.characters, true);
                break;
            case 'deleteChunk':
                this.deleteChunk(data.selection, data.chunk, true);
                break;
            case 'insertChunk':
                this.insertChunk(data.selection.startModelPos, data.chunk, true);
                break;
            case 'joinRow':
                this.joinRow(data.selection.startModelPos.row, true);
                break;
            case 'replaceRow':
                this.replaceRow(data.row, item.undo ? data.oldline : data.newline, true);
                break;
        }
    },

    unperformHistoryItem: function(item) {
        var func = item.func;
        var data = item.data;
        switch (func) {
            case 'deleteCharacters':
                func = 'insertCharacters';
                break;
            case 'insertCharacters':
                func = 'deleteCharacters';
                break;
            case 'deleteChunk':
                func = 'insertChunk';
                break;
            case 'insertChunk':
                func = 'deleteChunk';
                break;
            case 'joinRow':
                func = 'insertChunk';
                break;
        }
        this.performHistoryItem({func: func, data: data, undo: true});
    },

    applyState: function(state) {
        if (state >= this.history.length || state < -1) {
            return; // this would indicate a problem.
        } else if (state == this.historyIndex) {
            return; // nothing to do.
        }

        if (state > this.historyIndex) {
            for (var i = this.historyIndex + 1; i <= state; i++) {
                var historyItem = this.history[i];
                this.performHistoryItem(historyItem);
            }
        } else {
            for (var i = this.historyIndex; i > state; i--) {
                var historyItem = this.history[i];
                this.unperformHistoryItem(historyItem);
            }
        }

        this.historyIndex = state;
    },

    getState: function() {
        return this.historyIndex;
    },

    isEmpty: function() {
        if (this.rows.length > 1) {
            return false;
        }
        if (this.rows.length == 1 && this.rows[0].length > 0) {
            return false;
        }
        return true;
    },

    getDirtyRows: function() {
        var dr = (this.dirtyRows) ? this.dirtyRows : [];
        this.dirtyRows = null;
        return dr;
    },

    setRowDirty: function(row) {
        if (!this.dirtyRows){this.dirtyRows = new Array(this.rows.length);}
        this.dirtyRows[row] = true;
    },

    isRowDirty: function(row) {
        if (!this.dirtyRows) {
            return true;
        }
        return this.dirtyRows[row];
    },

    setRowArray: function(rowIndex, row) {  // invalidate
        if (!dojo.isArray(row)) {
            row = row.split('');
        }
        this.rows[rowIndex] = row;
    },

    /**
     * Gets the row array for the specified row, creating it and any
     * intermediate rows as necessary
     */
    getRowArray: function(rowIndex) {
        while (this.rows.length <= rowIndex){this.rows.push([]);}
        return this.rows[rowIndex];
    },

    /**
     * Checks if there is a row at the specified index; useful because
     * getRowArray() creates rows as necessary
     */
    hasRow: function(rowIndex) {
        return (this.rows[rowIndex]);
    },

    /**
     * Will insert blank spaces if passed col is past the end of passed row
     */
    insertCharacters: function(modelPos, string, noHistory) {
        var row = this.getRowArray(modelPos.row);
        while (row.length < modelPos.col){row.push(" ");}

        var newrow = (modelPos.col > 0) ? row.splice(0, modelPos.col) : [];
        newrow = newrow.concat(string.split(""));
        this.rows[modelPos.row] = newrow.concat(row);

        this.setRowDirty(modelPos.row);
        this.editor.ui.syntaxModel.invalidateCache(modelPos.row);

        if (!noHistory) {
            this.addHistoryItem('insertCharacters', { pos: copyPos(modelPos), characters: string});
        }
    },

    getDocument: function() {
        var file = [];
        for (var x = 0; x < this.getRowCount(); x++) {
            file[x] = this.getRowArray(x).join('');
        }
        return file.join("\n");
    },

    insertDocument: function(content) {
        this.clear();
        var rows = content.split("\n");
        for (var x = 0; x < rows.length; x++) {
            this.insertCharacters({ row: x, col: 0 }, rows[x], true /* no history */);
        }
    },

    changeEachRow: function(changeFunction) {
        for (var x = 0; x < this.getRowCount(); x++) {
            var row = this.getRowArray(x);
            row = changeFunction(row);
            this.setRowArray(x, row);
        }
    },

    replace: function(search, replace) {
        var regex = new RegExp(search, "g");
        for (var x = 0; x < this.getRowCount(); x++) {
            var line = this.getRowArray(x).join('');
            var newline = line.replace(regex, replace);
            if (newline != line) {
                this.replaceRow(x, newline);
            }
        }
    },

    replaceRow: function(row, newline, noHistory) {
        var oldline = this.getRowArray(row).join('');
        this.rows[row] = newline.split('');
        if (!noHistory) {
            this.addHistoryItem('replaceRow', { row: row, oldline: oldline, newline: newline});
        }
    },

    /**
     * Will silently adjust the length argument if invalid
     */
    deleteCharacters: function(modelPos, length, noHistory) {
        var row = this.getRowArray(modelPos.row);
        var diff = (modelPos.col + length - 1) - row.length;
        if (diff > 0){length -= diff;}
        if (length > 0) {
            this.setRowDirty(modelPos.row);
            this.editor.ui.syntaxModel.invalidateCache(modelPos.row);

            var deleted = row.splice(modelPos.col, length).join("");
            if (!noHistory) {
                this.addHistoryItem('deleteCharacters', {
                    pos: copyPos(modelPos),
                    characters: deleted
                });
            }
            return deleted;
        }
        return "";
    },

    clear: function() {
        this.rows = [];
        this.cacheRowMetadata = [];
        this.history = [];
        this.historyIndex = -1;
    },

    deleteRows: function(row, count) {
        var diff = (row + count - 1) - this.rows.length;
        if (diff > 0){count -= diff;}
        if (count > 0) {
            this.rows.splice(row, count);
            this.cacheRowMetadata.splice(row, count);
        }
    },

    /**
     * Splits the passed row at the col specified, putting the right-half on a
     * new line beneath the passed row
     */
    splitRow: function(modelPos) {
        this.editor.ui.syntaxModel.invalidateCache(modelPos.row);
        this.setRowDirty(modelPos.row);

        var row = this.getRowArray(modelPos.row);

        var newRow = [];

        if (modelPos.col < row.length) {
            newRow = newRow.concat(row.splice(modelPos.col));
        }

        if (modelPos.row == (this.rows.length - 1)) {
            this.rows.push(newRow);
        } else {
            var newRows = this.rows.splice(0, modelPos.row + 1);
            newRows.push(newRow);
            newRows = newRows.concat(this.rows);
            this.rows = newRows;

            var newCacheRowMetadata = this.cacheRowMetadata.splice(0, modelPos.row + 1);
            newCacheRowMetadata.push(undefined);
            this.cacheRowMetadata = newCacheRowMetadata.concat(this.cacheRowMetadata);
        }
    },

    /**
     * Joins the passed row with the row beneath it; optionally removes leading
     * whitespace as well.
     */
    joinRow: function(rowIndex, noHistory) {
        this.editor.ui.syntaxModel.invalidateCache(rowIndex);
        this.setRowDirty(rowIndex);

        if (rowIndex >= this.rows.length - 1) {
            return;
        }
        var row = this.getRowArray(rowIndex);
        var nextrow = this.rows[rowIndex + 1];
        var rowLength = row.length;

        //now, remove the row
        this.rows[rowIndex] = row.concat(nextrow);
        this.rows.splice(rowIndex + 1, 1);

        this.cacheRowMetadata.splice(rowIndex + 1, 1);

        if (!noHistory) {
            var pos = { row: rowIndex, col: rowLength };
            this.addHistoryItem('joinRow', { selection: {startModelPos: pos, endModelPos: pos}, chunk: '\n' });
        }
    },

    /**
     * Returns the number of rows in the model
     */
    getRowCount: function() {
        return this.rows.length;
    },

    /**
     * Returns a "chunk": a string representing a part of the document with \n
     * characters representing end of line
     */
    getChunk: function(selection) {
        var startModelPos = selection.startModelPos;
        var endModelPos = selection.endModelPos;

        var startModelCol, endModelCol;
        var chunk = "";

        // get the first line
        startModelCol = startModelPos.col;
        var row = this.getRowArray(startModelPos.row);
        endModelCol = (endModelPos.row == startModelPos.row) ? endModelPos.col : row.length;
        if (endModelCol > row.length){endModelCol = row.length;}
        chunk += row.join("").substring(startModelCol, endModelCol);

        // get middle lines, if any
        for (var i = startModelPos.row + 1; i < endModelPos.row; i++) {
            chunk += "\n";
            chunk += this.getRowArray(i).join("");
        }

        // get the end line
        if (startModelPos.row != endModelPos.row) {
            startModelCol = 0;
            endModelCol = endModelPos.col;
            row = this.getRowArray(endModelPos.row);
            if (endModelCol > row.length){endModelCol = row.length;}
            chunk += "\n" + row.join("").substring(startModelCol, endModelCol);
        }

        return chunk;
    },

    /**
     * Deletes the text between the startPos and endPos, joining as necessary.
     * startPos and endPos are inclusive
     */
    deleteChunk: function(selection, noHistory) {
        var chunk = this.getChunk(selection);

        var startModelPos = selection.startModelPos;
        var endModelPos = selection.endModelPos;

        this.editor.ui.syntaxModel.invalidateCache(startModelPos.row);

        var startModelCol, endModelCol;

        // get the first line
        startModelCol = startModelPos.col;
        var row = this.getRowArray(startModelPos.row);
        endModelCol = (endModelPos.row == startModelPos.row) ? endModelPos.col : row.length;
        if (endModelCol > row.length){endModelCol = row.length;}
        this.deleteCharacters({ row: startModelPos.row, col: startModelCol }, endModelCol - startModelCol, true /* nohistory */ );

        // get the end line
        if (startModelPos.row != endModelPos.row) {
            startModelCol = 0;
            endModelCol = endModelPos.col;
            row = this.getRowArray(endModelPos.row);
            if (endModelCol > row.length){endModelCol = row.length;}
            this.deleteCharacters({ row: endModelPos.row, col: startModelCol }, endModelCol - startModelCol, true /* no history */ );
        }

        // remove any lines in-between
        if ((endModelPos.row - startModelPos.row) > 1){this.deleteRows(startModelPos.row + 1, endModelPos.row - startModelPos.row - 1);}

        // join the rows
        if (endModelPos.row != startModelPos.row){this.joinRow(startModelPos.row, true /* no history */);}

        if (!noHistory){this.addHistoryItem('deleteChunk', { selection: { startModelPos: copyPos(selection.startModelPos), endModelPos: copyPos(selection.endModelPos)}, chunk: chunk});}
        return chunk;
    },

    /**
     * inserts the chunk and returns the ending position
     */
    insertChunk: function(modelPos, chunk, noHistory) {
        this.editor.ui.syntaxModel.invalidateCache(modelPos.row);

        var lines = chunk.split("\n");
        var cModelPos = copyPos(modelPos);
        for (var i = 0; i < lines.length; i++) {
            this.insertCharacters(cModelPos, lines[i], true /* No history */);
            cModelPos.col = cModelPos.col + lines[i].length;

            if (i < lines.length - 1) {
                this.splitRow(cModelPos);
                cModelPos.col = 0;
                cModelPos.row = cModelPos.row + 1;
            }
        }

        if (!noHistory) {
            this.addHistoryItem('insertChunk', {
                selection: {
                    startModelPos: copyPos(modelPos),
                    endModelPos: copyPos(cModelPos)
                },
                chunk: chunk
            });
        }
        return cModelPos;
    },

    /**
     * Returns an array with the col positions of the substrings str in the
     * given row
     */
    getStringIndicesInRow: function(row, str) {
        str = str.toLowerCase();
        var row = this.getRowArray(row).join('').toLowerCase();

        if (row.indexOf(str) == -1) {
            return false;
        }

        var result = new Array();
        var start = 0;
        var index = row.indexOf(str);

        do {
            result.push(index);
            index = row.indexOf(str, index + 1);
        } while (index != -1);

        return result;
    },

    /**
     * Count the occurrences of str in the whole file
     */
    getCountOfString: function(str) {
        var count = 0;
        var line;
        var match;

        for (var x = 0; x < this.getRowCount(); x++) {
            match = this.getStringIndicesInRow(x, str);   // TODO: Couldn't this be done with an regex much more faster???
            if (match) {
                count += match.length;
            }
        }

        return count;
    },

    searchStringChanged: function(str) {
        for (var row = 0; row < this.cacheRowMetadata.length; row++) {
            if (this.cacheRowMetadata[row]) {
                if (str) {
                    this.cacheRowMetadata[row].searchIndices = this.getStringIndicesInRow(row, str);
                } else {
                    this.cacheRowMetadata[row].searchIndices = false;
                }
            }
        }
    },

    /**
     * Find the position of the previous match.
     * Returns a complete selection-object
     */
    findPrev: function(row, col, str) {
        var indices;
        var strLen = str.length;

        for (var x = row; x > -1; x--) {
            indices = this.getStringIndicesInRow(x, str);
            if (!indices) {
                continue;
            }

            for (var y = indices.length - 1; y > -1; y--) {
                if (indices[y] < (col - strLen) || row != x) {
                    return { startPos: { col: indices[y], row: x}, endPos: {col: indices[y] + strLen, row: x} };
                }
            }
        }
        return false;
    },

    /**
     * Find the position of the next match.
     * Returns a complete selection-object
     */
    findNext: function(row, col, str) {
        var indices;

        for (var x = row; x < this.getRowCount(); x++) {
            indices = this.getStringIndicesInRow(x, str);
            if (!indices) {
                continue;
            }
            for (var y = 0; y < indices.length; y++) {
                if (indices[y] > col || row != x) {
                    return { startPos: { col: indices[y], row: x}, endPos: {col: indices[y] + str.length, row: x} };
                }
            }
        }
        return false;
    },

    findBefore: function(row, col, comparator) {
        var line = this.getRowArray(row);
        if (!dojo.isFunction(comparator)){comparator = function(letter) { // default to non alpha
            if (letter.charAt(0) == ' ') {
                return true;
            }
            var letterCode = letter.charCodeAt(0);
            return (letterCode < 48) || (letterCode > 122); // alpha only
        };}

        //validate col to prevent endless loop
        if (col >= line.length){col = Math.max(line.length - 1, 0); // what about 0 length lines?
}

        while (col > 0) {
            var letter = line[col];
            if (!letter) {
                continue;
            }

            if (comparator(letter)) {
                col++; // move it back
                break;
            }

            col--;
        }

        return { row: row, col: col };
    },

    findAfter: function(row, col, comparator) {
        var line = this.getRowArray(row);
        if (!dojo.isFunction(comparator)){comparator = function(letter) { // default to non alpha
            if (letter.charAt(0) == ' ') {
                return true;
            }
            var letterCode = letter.charCodeAt(0);
            return (letterCode < 48) || (letterCode > 122); // alpha only
        };}

        while (col < line.length) {
            col++;

            var letter = line[col];
            if (!letter) {
                continue;
            }

            if (comparator(letter)) {
                break;
            }
        }

        return { row: row, col: col };
    },

    /**
     * Returns various metadata about the row, mainly concerning tab information
     * uses a cache to speed things up
     */
    getRowMetadata: function(row) {
        // check if we can use the cached RowMetadata
        if (!this.isRowDirty(row) && this.cacheRowMetadata[row]) {
            return this.cacheRowMetadata[row];
        }

        // No cache or row is dirty? Well, then we have to calculate things new...

        // contains the row metadata; this object is returned at the end of the function
        var meta = { tabExpansions: [] };

        var rowArray = this.editor.model.getRowArray(row);
        var lineText = rowArray.join("");
        var tabsize = this.editor.getTabSize();

        meta.lineTextWithoutTabExpansion = lineText;
        meta.lineLengthWithoutTabExpansion = rowArray.length;

        // check for tabs and handle them
        for (var ti = 0; ti < lineText.length; ti++) {
            // check if the current character is a tab
            if (lineText.charCodeAt(ti) == 9) {
                // since the current character is a tab, we potentially need to insert some blank space between the tab character
                // and the next tab stop
                var toInsert = tabsize - (ti % tabsize);

                // create a spacer string representing the space between the tab and the tabstop
                var spacer = "";
                for (var si = 1; si < toInsert; si++) {spacer += " ";}

                // split the row string into the left half and the right half (eliminating the tab character) in preparation for
                // creating a new row string
                var left = (ti == 0) ? "" : lineText.substring(0, ti);
                var right = (ti < lineText.length - 1) ? lineText.substring(ti + 1) : "";

                // create the new row string; the blank space essentially replaces the tab character
                lineText = left + " " + spacer + right;
                meta.tabExpansions.push({ start: left.length, end: left.length + spacer.length + 1 });

                // increment the column counter to correspond to the new space
                ti += toInsert - 1;
            }
        }

        meta.lineText = lineText;
        meta.lineLength = meta.lineText.length;

        if (this.editor.ui.searchString) {
            meta.searchIndices = this.getStringIndicesInRow(row, this.editor.ui.searchString);
        } else {
            meta.searchIndices = false;
        }

        // save the calcualted metadata to the cache
        this.cacheRowMetadata[row] = meta;

        return meta;
    }
});
