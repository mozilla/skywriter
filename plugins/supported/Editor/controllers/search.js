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
var Range = require('RangeUtils:utils/range');
var console = require('bespin:console').console;

/**
 * @class
 *
 */
exports.EditorSearchController = SC.Object.extend({

    /**
     * @property{TextView}
     *
     * The view object to search in.
     */
    textView: null,

    isRegExp: null,

    /**
     * @property{String}
     *
     * The current search text.
     */
    searchText: null,

    /**
     *
     */
    searchRegExp: null,

    /**
     * This is based on the idea from http://simonwillison.net/2006/Jan/20/escape/.
     */
    _escapeString: /(\/|\.|\*|\+|\?|\||\(|\)|\[|\]|\{|\}|\\)/g,

    setSeachText: function(text, isRegExp) {
        var regExp;
        // If the search string is not a RegExp make sure to escape the
        if (!isRegExp) {
            regExp = new RegExp(text.replace(this._escapeString, '\\$1'), 'gi');
        } else {
            regExp = new RegExp(text);
        }
        this.set('searchRegExp', regExp);
        this.set('isRegExp', isRegExp);
        this.set('searchText', text);
    },

    _makeRange: function(searchResult, row) {
        return {
            start: {
                row: row,
                column: searchResult.index
            },
            end: {
                row: row,
                column: searchResult.index + searchResult[0].length
            }
        };
    },

    _findMatchesInString: function(str) {
        var result = [];
        var searchRegExp = this.get('searchRegExp');
        var searchResult;
        var endIndex;

        searchRegExp.lastIndex  = 0;

        while (true){
            searchResult = searchRegExp.exec(str);
            if (searchResult === null) {
                break;
            }
            result.push(searchResult);
            searchRegExp.lastIndex = searchResult.index + searchResult[0].length;
        }

        return result;
    },

    findNext: function(allowFromStart, startPos) {
        if (SC.none(this.searchRegExp)) {
            return null;
        }

        startPos = startPos || Range.normalizeRange(
                                this.getPath('textView._selectedRange')).end;

        var lines = this.getPath('textView.layoutManager.textStorage.lines');
        var searchRegExp = this.get('searchRegExp');
        var searchResult;

        searchRegExp.lastIndex = startPos.column;

        for (var row = startPos.row; row < lines.length; row++) {
            searchResult = searchRegExp.exec(lines[row]);
            if (!SC.none(searchResult)) {
                return this._makeRange(searchResult, row);
            }
        }

        if (!allowFromStart) {
            return null;
        }

        for (var row = 0; row <= startPos.row; row++) {
            searchResult = searchRegExp.exec(lines[row]);
            if (!SC.none(searchResult)) {
                return this._makeRange(searchResult, row);
            }
        }

        return null;
    },

    findPrevious: function(allowFromEnd, startPos) {
        if (SC.none(this.searchRegExp)) {
            return null;
        }

        startPos = startPos || Range.normalizeRange(
                                this.getPath('textView._selectedRange')).start;

        var lines = this.getPath('textView.layoutManager.textStorage.lines');
        var searchResults;

        // Treat first line different.
        var firstLine = lines[startPos.row].substring(0, startPos.column);
        searchResults = this._findMatchesInString(firstLine);

        if (searchResults.length != 0) {
            return this._makeRange(searchResults[searchResults.length - 1],
                                                                startPos.row);
        }

        // Loop over all other lines
        for (var row = startPos.row - 1; row != -1; row--) {
            searchResults = this._findMatchesInString(lines[row]);
            if (searchResults.length != 0) {
                return this._makeRange(searchResults[searchResults.length - 1],
                                                                        row);
            }
        }

        if (!allowFromEnd) {
            return null;
        }

        // Loop over all other lines
        for (var row = lines.length - 1; row >= startPos.row; row--) {
            searchResults = this._findMatchesInString(lines[row]);
            if (searchResults.length != 0) {
                return this._makeRange(searchResults[searchResults.length - 1],
                                                                        row);
            }
        }

        return null;
    }
});

