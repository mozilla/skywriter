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

"define metadata";
({
    "description": "Easy-to-use basis for syntax engines",
    "environments": { "worker": true },
    "dependencies": { 
        "syntax_directory": "0.0.0", 
        "underscore": "0.0.0",
        "syntax_worker": "0.0.0"
    }
});
"end";

var promise = require('bespin:promise');
var _ = require('underscore')._;
var console = require('bespin:console').console;
var syntaxDirectory = require('syntax_directory').syntaxDirectory;

exports.StandardSyntax = function(states, subsyntaxes) {
    this.states = states;
    this.subsyntaxes = subsyntaxes;
};

/** This syntax controller exposes a simple regex- and line-based parser. */
exports.StandardSyntax.prototype = {
    get: function(fullState, line, col) {
        var context = fullState[0], state = fullState[1];

        if (!this.states.hasOwnProperty(state)) {
            throw new Error('StandardSyntax: no such state "' + state + '"');
        }

        var str = line.substring(col);  // TODO: sticky flag where available
        var token = { start: col, state: fullState };

        var result = null;
        _(this.states[state]).each(function(alt) {
            var regex = alt.regex;
            var match = regex.exec(str);
            if (match == null) {
                return;
            }

            var len = match[0].length;
            token.end = col + len;
            token.tag = alt.tag;

            var newSymbol = null;
            if (alt.hasOwnProperty('symbol')) {
                var replace = function(_, n) { return match[n]; };
                var symspec = alt.symbol.replace(/\$([0-9]+)/g, replace);
                var symMatch = /^([^:]+):(.*)/.exec(symspec);
                newSymbol = [ symMatch[1], symMatch[2] ];
            }

            var nextState, newContext = null;
            if (alt.hasOwnProperty('then')) {
                var then = alt.then.split(" ");
                nextState = [ context, then[0] ];
                if (then.length > 1) {
                    newContext = then[1].split(":");
                }
            } else if (len === 0) {
                throw new Error("StandardSyntax: Infinite loop detected: " +
                    "zero-length match that didn't change state");
            } else {
                nextState = fullState;
            }

            result = { state: nextState, token: token, symbol: newSymbol };
            if (newContext != null) {
                result.newContext = newContext;
            }

            _.breakLoop();
        });

        return result;
    }
};

