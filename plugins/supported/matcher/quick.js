/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the 'License'); you may not use this file except in compliance with
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
 * either the GNU General Public License Version 2 or later (the 'GPL'), or
 * the GNU Lesser General Public License Version 2.1 or later (the 'LGPL'),
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
var Matcher = require('matcher').Matcher;

/**
 * @class
 *
 * Provides smart matching suitable for "quick open" functionality.
 */
exports.QuickMatcher = Matcher.extend({
    match: function(query, str) {
        var queryLen = query.length, strLen = str.length;
        if (queryLen > strLen) {
            return 0;
        }

        query = query.toLowerCase();
        str = str.toLowerCase();

        // Prefix match?
        if (str.substring(0, queryLen) === query) {
            return 3000 - strLen;
        }

        // Suffix match?
        if (str.substring(strLen - queryLen, strLen) === query) {
            return 2000 - strLen;
        }

        // Fuzzy match?
        var queryChar = query.substring(0, 1), queryIndex = 0, score = 1000;
        for (var i = 0; i < strLen; i++) {
            if (str.substring(i, i + 1) === queryChar) {
                queryIndex++;

                // Have we found the whole query?
                if (queryIndex === queryLen) {
                    return score;
                }

                queryChar = query.substring(queryIndex, queryIndex + 1);
            } else if (queryIndex !== 0) {
                // Dock a point for every intervening character between the
                // first and last characters in the query.
                score--;
            }
        }

        // No match.
        return 0;
    }
});

