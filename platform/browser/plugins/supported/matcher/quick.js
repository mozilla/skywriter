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

var Matcher = require('matcher').Matcher;

/**
 * Provides smart matching suitable for 'quick open' functionality.
 */
exports.QuickMatcher = function(query) {
    Matcher.call(this, query);
};

exports.QuickMatcher.prototype = new Matcher('subclassPrototype');

exports.QuickMatcher.prototype.score = function(query, item) {
    query = query.toLowerCase();
    var str = item.name.toLowerCase();
    var path = item.path ? item.path.toLowerCase() : null;

    // Name prefix match?
    if (str.substring(0, query.length) === query) {
        return 5000 - str.length;
    }

    // Path prefix match?
    if (path && path.substring(0, query.length) === query) {
        return 4000 - path.length;
    }

    // Name suffix match?
    if (str.substring(str.length - query.length, str.length) === query) {
        return 3000 - str.length;
    }

    // Full name fuzzy match?
    if (path) {
        str = path + str;
    }
    var queryChar = query.substring(0, 1);
    var queryIndex = 0;
    var score = 2000;

    for (var i = 0; i < str.length; i++) {
        if (str.substring(i, i + 1) === queryChar) {
            queryIndex++;

            // Have we found the whole query?
            if (queryIndex === query.length) {
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
};
