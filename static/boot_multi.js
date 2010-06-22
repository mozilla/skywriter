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

// Load up Bespin's boot code (the plugin system, basically)
bespin.tiki.require.ensurePackage("::bespin", function() {
    var require = bespin.tiki.require;
    var plugins = require("bespin:plugins");
    var pr = plugins.catalog.loadMetadataFromURL("plugin/register/defaults");
    pr.then(function() {
        // The "hosted" plugin sets up the environment
        bespin.tiki.require.ensurePackage("::appconfig", function() {
            var appconfig = require("appconfig");
            appconfig.launch({
                stealFocus: true,
                element: document.getElementById('editor1')
            }).then(function(env) {
                // Empty function.
            }, function(error) {
                console.error('Error during launch: ' + error);
            });

            appconfig.launch({
                stealFocus: true,
                element: document.getElementById('editor2')
            }).then(function(env) {
                // Empty function.
            }, function(error) {
                console.error('Error during launch: ' + error);
            });
        });
    }, function(error) {
        console.log("Unable to load metadata: ", error);
    });
});
