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
 
// module: bespin/events

var bespin = require("bespin");
var util = require("bespin/util/util");

/**
 * Given an <code>eventString</code> parse out the arguments and configure an
 * event object.
 * <p>For example:
 * <li><code>command:execute;name=ls,args=bespin</code>
 * <li><code>command:execute</code>
 */
exports.toFire = function(eventString) {
    var event = {};
    if (eventString.indexOf(';') < 0) { // just a plain command with no args
        event.name = eventString;
    } else { // split up the args
        var pieces = eventString.split(';');
        event.name = pieces[0];
        event.args = util.queryToObject(pieces[1], ',');
    }
    return event;
};

/**
 * Return a default scope to be used for evaluation files
 */
exports.defaultScope = function() {
    if (this._defaultScope) return this._defaultScope;

    var scope = {
        bespin: bespin,
        include: function(file) {
            bespin.get('files').evalFile(bespin.userSettingsProject, file);
        },
        tryTocopyComponent: function(id) {
            bespin.withComponent(id, dojo.hitch(this, function(component) {
                this.id = component;
            }));
        },
        require: require,
        publish: bespin.publish,
        subscribe: bespin.subscribe
    };

    bespin.withComponent('commandLine', function(commandLine) {
        scope.commandLine = commandLine;
        scope.execute = function(cmd) {
            commandLine.executeCommand(cmd);
        };
    });

    scope.tryTocopyComponent('editor');
    scope.tryTocopyComponent('editSession');
    scope.tryTocopyComponent('files');
    scope.tryTocopyComponent('server');
    scope.tryTocopyComponent('toolbar');

    this._defaultScope = scope; // setup the short circuit

    return this._defaultScope;
};
