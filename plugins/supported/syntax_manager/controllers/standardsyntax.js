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
var Promise = require('bespin:promise').Promise;

/**
 * @class
 *
 * This syntax controller exposes a simple regex- and line-based parser.
 */
exports.StandardSyntax = SC.Object.extend({
    _stickySupported: null,

    _parseActions: function(actions) {
        if (SC.none(actions)) {
            return [];
         }

        return actions.split(" ").map(function(action) {
            var parts = action.split(":");
            return parts.length === 1 ? [ 'transition', parts[0] ] : parts;
        });
    },

    _transition: function(range, state) {
        var newState = state;
        range.actions.forEach(function(action) {
            if (action[0] === 'transition') {
                newState = action[1];
            }
        });

        return newState;
    },

    states: null,

    init: function() {
        var stickySupported = null;

        // Set the sticky flag on the regexes, if we can.
        var states = this.get('states');
        var stateCount = states.length;
        for (var i = 0; i < stateCount; i++) {
            var alternations = states[i];
            var alternationCount = alternations.length;
            for (var j = 0; j < alternationCount; j++) {
                var alternation = alternations[j];
                var regex = alternation.regex;

                if (stickySupported === null) {
                    stickySupported = regex.sticky !== undefined;
                }

                if (stickySupported) {
                    regex.sticky = true;
                }
            }
        }

        this._stickySupported = stickySupported;
    },

    syntaxInfoForLineFragment: function(context, state, line, start, end) {
        var promise = new Promise();

        var attrs = [];
        var stickySupported = this._stickySupported;
        var lineLength = line.length;
        var states = this.get('states');

        if (end !== null && end < line.length) {
            line = line.substring(0, end);
        }

        var endColumn = line.length;

        var column = start;
        while (column !== endColumn) {
            var str = stickySupported ? line : line.substring(column);

            if (states[state] === undefined) {
                throw new Error("StandardSyntax: no such states '%@'".
                    fmt(state));
            }

            var range = { start: column, state: state };
            var newState;
            var alternations = states[state];
            var alternationCount = alternations.length;

            for (var i = 0; i < alternationCount; i++) {
                var alt = alternations[i];
                var regex = alt.regex;

                if (stickySupported) {
                    regex.lastIndex = column;
                }

                var result = regex.exec(str);
                if (result === null) {
                    continue;
                }

                var resultLength = result[0].length;
                range.end = column + resultLength;
                range.tag = alt.tag;
                range.actions = this._parseActions(alt.then);

                newState = this._transition(range, state);

                if (resultLength === 0 && newState === state) {
                    // Emit a helpful diagnostic rather than going into an
                    // infinite loop, to aid syntax writers...
                    throw new Error("Syntax regex matches the empty " +
                        "string and the state didn't change: " + regex.
                        toSource());
                }

                state = newState;
                break;
            }

            if (range.tag === undefined) {
                // The (inefficient) default case.
                range.end = column + 1;
                range.tag = 'plain';
                range.actions = [];
            }

            if (column !== range.end) {
                // Only push the range if it spans at least one character.
                attrs.push(range);
            }

            column = range.end;
        }

        if (end === null) {
            // Style the newline.
            attrs.push({
                start:      column,
                end:        null,
                state:      state,
                tag:        'plain',
                actions:    []
            });
        }

        var next = { context: context, state: state };
        promise.resolve({ attrs: attrs, next: next });
        return promise;
    }
});

