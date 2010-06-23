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
    "description": "Coordinates multiple syntax engines",
    "environments": { "worker": true },
    "dependencies": { "syntax_directory": "0.0.0", "underscore": "0.0.0" }
});
"end";

var promise = require('bespin:promise');
var _ = require('underscore')._;
var console = require('bespin:console').console;
var syntaxDirectory = require('syntax_directory').syntaxDirectory;

var syntaxWorker = {
    engines: {},

    annotate: function(state, lines, range) {
        function splitParts(str) { return str.split(":"); }
        function saveState() {
            states.push(_(stateStack).invoke('join', ":").join(" "));
        }

        var engines = this.engines;
        var states = [], attrs = [], symbols = [];
        var stateStack = _(state.split(" ")).map(splitParts);

        _(lines).each(function(line, offset) {
            saveState();

            var lineAttrs = [], lineSymbols = {};
            var col = 0;
            while (col < line.length) {
                // Check for the terminator string.
                // FIXME: This is wrong. It should check *inside* the token
                // that was just parsed as well.
                var curState;
                while (true) {
                    curState = _(stateStack).last();
                    if (curState.length < 3) {
                        break;
                    }

                    var term = curState[2];
                    if (line.substring(col, col + term.length) !== term) {
                        break;
                    }

                    stateStack.pop();
                }

                var context = curState[0];
                var result = engines[context].get(curState, line, col);
                var token;
                if (result == null) {
                    token = {
                        state: 'plain',
                        tag: 'plain',
                        start: col,
                        end: line.length
                    };
                } else {
                    stateStack[stateStack.length - 1] = result.state;
                    if (result.hasOwnProperty('newContext')) {
                        stateStack.push(result.newContext);
                    }

                    token = result.token;

                    var sym = result.symbol;
                    if (sym != null) {
                        lineSymbols["-" + sym[0]] = sym[1];
                    }
                }

                lineAttrs.push(token);
                col = token.end;
            }

            attrs.push(lineAttrs);
            symbols.push(lineSymbols);
        });

        saveState();

        return { states: states, attrs: attrs, symbols: symbols };
    },

    loadSyntax: function(syntaxName) {
        var pr = new promise.Promise;

        var engines = this.engines;
        if (engines.hasOwnProperty(syntaxName)) {
            pr.resolve();
            return pr;
        }

        var info = syntaxDirectory.get(syntaxName);
        if (info == null) {
            throw new Error('No syntax engine installed for syntax "' +
                syntaxName + '".');
        }

        info.extension.load().then(function(engine) {
            engines[syntaxName] = engine;

            var subsyntaxes = engine.subsyntaxes;
            if (subsyntaxes == null) {
                pr.resolve();
                return;
            }

            var pr2 = promise.group(_(subsyntaxes).map(this.loadSyntax, this));
            pr2.then(_(pr.resolve).bind(pr));
        }.bind(this));

        return pr;
    }
};

exports.syntaxWorker = syntaxWorker;

