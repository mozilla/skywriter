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
var Promise = require('bespin:promise').Promise;

/**
 * @class
 *
 * This syntax controller exposes a simple regex- and line-based parser.
 */
exports.StandardSyntax = SC.Object.extend({
    _stickySupported: null,

    _transition: function(alternation, contexts) {
        var nextState   = alternation.nextState;
        var pushContext = alternation.pushContext;
        var popContext  = alternation.popContext;

        var newContexts;
        if (pushContext !== undefined) {        // push a new context
            newContexts = contexts.concat({
                context:    pushContext,
                state:      nextState
            });
        } else if (popContext === true) {       // pop this context
            newContexts = contexts.concat();
            newContexts.pop();
        } else if (nextState !== undefined) {   // state transition
            var contextInfo = contexts[contexts.length - 1];
            newContexts = contexts.concat();
            newContexts[newContexts.length - 1] = {
                context:    contextInfo.context,
                state:      nextState
            };
        } else {                                // no state transition
            newContexts = contexts;
        }

        return newContexts;
    },

    states: null,

    computeAttributeRange: function(line, column, contexts) {
        var promise = new Promise();

        var stickySupported = this._stickySupported;
        var str = stickySupported ? line : line.substring(column);
        var lineLength = line.length;

        var contextInfo = contexts[contexts.length - 1];
        var state = contextInfo.state;
        var states = this.get('states');
        if (states[state] === undefined) {
            throw new Error("StandardSyntax: no such state '%@'".fmt(state));
        }

        var alternations = states[state];
        var alternationCount = alternations.length;
        for (var i = 0; i < alternationCount; i++) {
            var alternation = alternations[i];
            var regex = alternation.regex;

            if (stickySupported) {
                regex.lastIndex = column;
            }

            var result = regex.exec(str);
            if (result !== null) {
                var end = column + result[0].length;
                var attrRange = {
                    start:      column,
                    end:        end === lineLength ? null : end,
                    contexts:   this._transition(alternation, contexts),
                    tag:        alternation.tag,
                };

                promise.resolve(attrRange);
                return promise;
            }
        }

        // The (inefficient) default case.
        promise.resolve({
            start:      column,
            end:        column === lineLength ? null : column + 1,
            contexts:   contexts,
            tag:        'plain'
        });

        return promise;
    },

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
});

