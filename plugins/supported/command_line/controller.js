/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the 'License'); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an 'AS IS' basis,
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
var catalog = require('bespin:plugins').catalog;
var console = require('bespin:console').console;
var Trace = require('bespin:util/stacktrace').Trace;

var environment = require('canon:environment');
var keyboard = require('canon:keyboard');
var Request = require('canon:request').Request;

var hint = require('command_line:hint');
var typehint = require('command_line:typehint');
var Input = require('command_line:input').Input;

/**
 * Command line controller.
 */
exports.cliController = SC.Object.create({
    /**
     * @property{CliInputView}
     * The current command line view.
     */
    view: null,

    /**
     * A string containing the current contents of the command line
     */
    input: null,

    /**
     * A set of hints which could help the user complete their typing
     */
    hints: null,

    /**
     * Is the input in a state where it could possibly work?
     */
    error: false,

    init: function() {
        this.hints = [];
    },

    /**
     * Called by the UI to execute a command. Assumes that #input is bound to
     * the CLI input text field.
     */
    exec: function() {
        this.executeCommand(this.get('input'));
    },

    /**
     * We need to re-parse the CLI whenever the input changes
     */
    _inputChanged: function() {
        var hints = this.get('hints');
        hints.propertyWillChange('[]');
        hints.length = 0;

        var input = Input.create({
            typed: this.get('input'),
            env: environment.global,
            flags: keyboard.buildFlags(environment.global, { })
        });
        var results = input.parse();
        results.hints.forEach(function(hint) {
            hints.pushObject(hint);
        }.bind(this));

        hints.propertyDidChange('[]');
    }.observes('input'),

    /**
     * Execute a command manually without using the UI
     * @param typed {String} The command to turn into an Instruction and execute
     */
    executeCommand: function(typed) {
        console.log('executeCommand "' + typed + '"');
        var hints = this.get('hints');

        if (!typed || typed === '') {
            return;
        }

        var input = Input.create({
            typed: typed,
            env: environment.global,
            flags: keyboard.buildFlags(environment.global, { })
        });
        var results = input.parse();

        /**
         *
         */
        var onError = function(ex) {
            /*
            var trace = new Trace(ex, true);
            console.group('Error executing: ' + typed);
            console.error(ex);
            trace.log(3);
            console.groupEnd();
            */

            // TODO: Better UI
            hints.pushObject(hint.Hint.create({
                level: hint.Level.Error,
                element: 'ex'
            }));

            this.set('input', '');
        }.bind(this);

        var exec = function(command, args) {
            // Check the function pointed to in the meta-data exists
            if (!command) {
                hints.pushObject(hint.Hint.create({
                    level: hint.Level.Error,
                    element: "Command not found."
                }));
                this.set('input', '');
                return;
            }

            var request = Request.create({
                command: command,
                commandExt: input._commandExt,
                typed: typed,
                args: args
            });

            try {
                command(environment.global, args, request);

                // Only clear the input if the command worked
                this.set('input', '');
            } catch (ex) {
                onError(ex);
            }
        }.bind(this);

        results.argsPromise.then(function(args) {
            input._commandExt.load().then(function(command) {
                SC.run(function() {
                    exec(command, args);
                });
            });
        }, onError);
    },

    /**
     * Replaces the contents of the command line with the given text as a
     * prompt, positions the insertion point at the end, and focuses the
     * command line.
     */
    prompt: function(text) {
        var view = this.get('view');
        view.focus();
        view.replaceSelection(text);
    }
});
