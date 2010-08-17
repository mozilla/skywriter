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

var util = require('bespin:util/util');
var Range = require('rangeutils:utils/range');
var console = require('bespin:console').console;

/**
 * @class
 *
 * Manages the Find functionality.
 */
exports.EditorSearchController = function(editor) {
    this.editor = editor;
};

exports.EditorSearchController.prototype = {

    /**
     * The editor holding the buffer object to search in.
     */
    editor: null,

    /**
     * This is based on the idea from:
     *      http://simonwillison.net/2006/Jan/20/escape/.
     */
    _escapeString: /(\/|\.|\*|\+|\?|\||\(|\)|\[|\]|\{|\}|\\)/g,

    _findMatchesInString: function(str) {
        var result = [];
        var searchRegExp = this.searchRegExp;
        var searchResult;
        var endIndex;

        searchRegExp.lastIndex = 0;

        while (true) {
            searchResult = searchRegExp.exec(str);
            if (searchResult === null) {
                break;
            }

            result.push(searchResult);

            var index = searchResult.index;
            searchRegExp.lastIndex = index + searchResult[0].length;
        }

        return result;
    },

    _makeRange: function(searchResult, row) {
        return {
            start: { row: row, col: searchResult.index },
            end: {
                row: row,
                col: searchResult.index + searchResult[0].length
            }
        };
    },

    /**
     * @property{boolean}
     *
     * True if the search query is a regular expression, false if it's a
     * literal string.
     */
    isRegExp: null,

    /**
     * @property{RegExp}
     *
     * The current search query as a regular expression.
     */
    searchRegExp: null,

    /**
     * @property{String}
     *
     * The current search text.
     */
    searchText: null,

    /**
     * Sets the search query.
     *
     * @param text     The search query to set.
     * @param isRegExp True if the text is a regex, false if it's a literal
     *                 string.
     */
    setSearchText: function(text, isRegExp) {
        var regExp;
        // If the search string is not a RegExp make sure to escape the
        if (!isRegExp) {
            regExp = new RegExp(text.replace(this._escapeString, '\\$1'), 'gi');
        } else {
            regExp = new RegExp(text);
        }
        this.searchRegExp = regExp;
        this.isRegExp = isRegExp;
        this.searchText = text;
    },

    /**
     * Finds the next occurrence of the search query.
     *
     * @param startPos       The position at which to restart the search.
     * @param allowFromStart True if the search is allowed to wrap.
     */
    findNext: function(startPos, allowFromStart) {
        var searchRegExp = this.searchRegExp;
        if (util.none(searchRegExp)) {
            return null;
        }

        startPos = startPos || this.editor.textView.getSelectedRange().end;

        var lines = this.editor.layoutManager.textStorage.lines;
        var searchResult;

        searchRegExp.lastIndex = startPos.col;

        var row;
        for (row = startPos.row; row < lines.length; row++) {
            searchResult = searchRegExp.exec(lines[row]);
            if (!util.none(searchResult)) {
                return this._makeRange(searchResult, row);
            }
        }

        if (!allowFromStart) {
            return null;
        }

        // Wrap around.
        for (row = 0; row <= startPos.row; row++) {
            searchResult = searchRegExp.exec(lines[row]);
            if (!util.none(searchResult)) {
                return this._makeRange(searchResult, row);
            }
        }

        return null;
    },

    /**
     * Finds the previous occurrence of the search query.
     *
     * @param startPos       The position at which to restart the search.
     * @param allowFromStart True if the search is allowed to wrap.
     */
    findPrevious: function(startPos, allowFromEnd) {
        var searchRegExp = this.searchRegExp;
        if (util.none(searchRegExp)) {
            return null;
        }

        startPos = startPos || this.editor.textView.getSelectedRange().start;

        var lines = this.editor.buffer.layoutManager.textStorage.lines;
        var searchResults;

        // Treat the first line specially.
        var firstLine = lines[startPos.row].substring(0, startPos.col);
        searchResults = this._findMatchesInString(firstLine);

        if (searchResults.length !== 0) {
            return this._makeRange(searchResults[searchResults.length - 1],
                                                                startPos.row);
        }

        // Loop over all other lines.
        var row;
        for (row = startPos.row - 1; row !== -1; row--) {
            searchResults = this._findMatchesInString(lines[row]);
            if (searchResults.length !== 0) {
                return this._makeRange(searchResults[searchResults.length - 1],
                                                                        row);
            }
        }

        if (!allowFromEnd) {
            return null;
        }

        // Wrap around.
        for (row = lines.length - 1; row >= startPos.row; row--) {
            searchResults = this._findMatchesInString(lines[row]);
            if (searchResults.length !== 0) {
                return this._makeRange(searchResults[searchResults.length - 1],
                                                                        row);
            }
        }

        return null;
    }
};

