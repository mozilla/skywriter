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

var SC = require('sproutcore/runtime').SC;

var targetMatches = function(command, target) {
    var predicates = command.predicates;
    for (var i = 0; i < predicates.length; i += 2) {
        var key = predicates[i], value = predicates[i+1];
        if (target[key] !== value) {
            return false;
        }
    }
    return true;
};

/**
 * Sends a command to the appropriate responder in the chain, if one exists.
 *
 * @return  True if the command was successfully routed to a responder or false
 *          otherwise.
 */
exports.sendThroughResponderChain = function(command, firstResponder, args) {
    while (!SC.none(firstResponder)) {
        if (targetMatches(command, firstResponder)) {
            firstResponder[command.message].apply(firstResponder, args);
            return true;
        }
        firstResponder = firstResponder.get('nextResponder');
    }
    return false;
};

