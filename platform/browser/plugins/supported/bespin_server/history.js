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

var history = require('canon:history');

/**
 * Store the history in BespinSettings/command.history.
 * <p>TODO: This code needs updating, however it's not 100% clear that we need
 * to story the history on the server. It could be expensive bandwidth wise,
 * (or not save all that we need) and might not be the best user model.
 */
exports.ServerHistory = history.InMemoryHistory.extend({
    init: function() {
        // load last 50 instructions from history
        var project = this.files.userSettingsProject;
        this.files.loadContents(project, 'command.history', function(file) {
            var typings = file.content.split(/\n/);
            var instructions = [];

            typings.forEach(function(typed) {
                if (typed && typed !== '') {
                    var instruction = Instruction.create({
                        typed: typed,
                        historical: true
                    });
                    instructions.push(instruction);
                }
            });

            this.setInstructions(instructions);
        });
    },

    save: function(instructions) {
        var content = '';
        instructions.forEach(function(instruction) {
            if (instruction.typed && instruction.typed !== '') {
                content += instruction.typed + '\n';
            }
        });
        // save instructions back to server asynchronously
        this.files.saveFile(this.files.userSettingsProject, {
            name: 'command.history',
            content: content,
            autosave: true,
            timestamp: new Date().getTime()
        });
    }
});
