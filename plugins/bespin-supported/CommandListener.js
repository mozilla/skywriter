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

"define metadata";
({
    "depends": []
});
"end";

var SC = require('sproutcore/runtime').SC;
var catalog = require('bespin:plugins').catalog;
var m_commands = require('bespin:util/commands');

exports.CommandListener = SC.Responder.extend({
    keyDown: function(evt) {
        var keycode = evt.which;
        var firstResponder = this.getPath('pane.firstResponder');

        var commands = catalog.getExtensions('command');
        for (var i = 0; i < commands.length; i++) {
            var command = commands[i];
            if (command.keycode === keycode &&
                    m_commands.sendThroughResponderChain(command,
                    firstResponder, [ evt ])) {
                return true;
            }
        }

        return false;
    }
});

