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

var Trace = require('bespin:util/stacktrace').Trace;
var catalog = require('bespin:plugins').catalog;

/**
 * Current requirements are around displaying the command line, and provision
 * of a 'history' command and cursor up|down navigation of history.
 * <p>Future requirements could include:
 * <ul>
 * <li>Multiple command lines
 * <li>The ability to recall key presses (i.e. requests with no output) which
 * will likely be needed for macro recording or similar
 * <li>The ability to store the command history either on the server or in the
 * browser local storage.
 * </ul>
 * <p>The execute() command doesn't really live here, except as part of that
 * last future requirement, and because it doesn't really have anywhere else to
 * live.
 */

/**
 * The array of requests that wish to announce their presence
 */
exports.requests = [];

/**
 * How many requests do we store?
 */
var maxRequestLength = 100;

/**
 * Called by Request instances when some output (or a cell to async() happens)
 */
exports.addRequestOutput = function(request) {
    exports.requests.push(request);
    // This could probably be optimized with some maths, but 99.99% of the
    // time we will only be off by one, and I'm feeling lazy.
    while (exports.requests.length > maxRequestLength) {
        exports.requests.shiftObject();
    }

    catalog.publish(this, 'addedRequestOutput', null, request);
};

/**
 * Execute a new command.
 * This is basically an error trapping wrapper around request.command(...)
 */
exports.execute = function(args, request) {
    // Check the function pointed to in the meta-data exists
    if (!request.command) {
        request.doneWithError('Command not found.');
        return;
    }

    try {
        request.command(args, request);
    } catch (ex) {
        var trace = new Trace(ex, true);
        console.group('Error executing command \'' + request.typed + '\'');
        console.log('command=', request.commandExt);
        console.log('args=', args);
        console.error(ex);
        trace.log(3);
        console.groupEnd();

        request.doneWithError(ex);
    }
};
