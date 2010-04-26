/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
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

var console = require('bespin:console').console;
var Trace = require('bespin:util/stacktrace').Trace;

var keyboard = require('canon:keyboard');
var Request = require('canon:request').Request;

/**
 * Debug to the console
 */
var loadError = function(ex) {
    var trace = new Trace(ex, true);
    console.group('Error executing: ' + input.typed);
    console.error(ex);
    trace.log(3);
    console.groupEnd();
};

/**
 * Take the results of a parseInput, wait for the argsPromise to resolve
 * load the command and then execute it.
 */
exports.executeResults = function(input) {
    input.argsPromise.then(function(args) {
        input._commandExt.load().then(function(command) {

            var request = Request.create({
                command: command,
                commandExt: input._commandExt,
                typed: input.typed,
                args: args
            });

            // Check the function pointed to in the meta-data exists
            if (!command) {
                request.doneWithError('Command not found.');
                return;
            }

            try {
                command(input.env, args, request);
            } catch (ex) {
                var trace = new Trace(ex, true);
                console.group('Error executing command \'' + input.typed + '\'');
                console.error(ex);
                trace.log(3);
                console.groupEnd();

                request.doneWithError(ex);
            }
        }, loadError);
    }, loadError);
};
