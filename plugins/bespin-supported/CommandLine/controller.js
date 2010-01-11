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

var SC = require("sproutcore/runtime").SC;
var InMemoryHistory = require("history").InMemoryHistory;
var Instruction = require("instruction").Instruction;
var rootCanon = require("Canon2").rootCanon;

/**
 * Command line controller.
 */
exports.cliController = SC.Object.create({
    /**
     * A string containing the current contents of the command line
     */
    input: "",

    /**
     * Called by the UI to execute a command. Assumes that #input is bound to
     * the CLI input text field.
     */
    exec: function() {
        this.executeCommand(this.get("input"));
        this.set("input", "");
    },

    /**
     * Execute a command manually without using the UI
     * @param typed {String} The command to turn into an Instruction and execute
     * @param hidden {boolean} Should the Instruction be added to the #history?
     */
    executeCommand: function(typed, hidden) {
        console.log("executeCommand '" + typed + "'");

        if (!typed || typed === "") {
            return null;
        }

        var instruction = Instruction.create({
            typed: typed,
            canon: rootCanon
        });

        if (hidden !== true) {
            this.history.add(instruction);
        }

        instruction.onOutput(function() {
            this.history.update();
        }.bind(this));

        instruction.exec();
        return instruction;
    },

    /**
     * The history of executed commands
     * TODO: We should get the implementation of this from the plugin system
     */
    history: InMemoryHistory.create()
});
