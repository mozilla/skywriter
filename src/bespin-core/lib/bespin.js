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

// Version numbers
SC.mixin(exports, {
    // BEGIN VERSION BLOCK
    /** The core version of the Bespin system */
    versionNumber: 'tip',
    /** The version number to display to users */
    versionCodename: 'DEVELOPMENT MODE',
    /** The version number of the API (to ensure that the client and server are talking the same language) */
    apiVersion: 'dev',
    // END VERSION BLOCK

    /** The name of the project that contains the users client side settings */
    userSettingsProject: "BespinSettings"
});

/**
 * Set innerHTML on the element given, with the Bespin version info
 */
exports.displayVersion = function(el) {
    el = document.getElementById(el) || document.getElementById("version");
    if (!el) {
        return;
    }
    el.innerHTML = '<a href="https://wiki.mozilla.org/Labs/Bespin/ReleaseNotes" title="Read the release notes">Version <span class="versionnumber">' + this.versionNumber + '</span> "' + this.versionCodename + '"</a>';
};

// Clone the hub
var hub = require("bespin/util/hub");
exports.publish = hub.publish;
exports.subscribe = hub.subscribe;
exports.unsubscribe = hub.unsubscribe;
exports.fireAfter = hub.fireAfter;

// Clone the container
var container = require("bespin/util/container");
exports.register = container.register;
exports.unregister = container.unregister;
exports.get = container.get;
exports.getComponent = container.getComponent;
