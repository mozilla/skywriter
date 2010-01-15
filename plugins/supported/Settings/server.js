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

var MemorySettings = require("memory").MemorySettings;
var catalog = require("bespin:plugins").catalog;

var files = catalog.getObject("files");

/**
 * Save the settings using the server.
 * This code has not been tested since reboot
 * @class
 */
exports.ServerSettings = MemorySettings.extend({
    _loadInitialValues: function() {
        this._loadDefaultValues();

        var onLoad = function(file) {
            // Strip \n\n from the end of the file and insert into this.settings
            file.content.split(/\n/).forEach(function(setting) {
                if (setting.match(/^\s*#/)) {
                    return; // if comments are added ignore
                }
                if (setting.match(/\S+\s+\S+/)) {
                    var pieces = setting.split(/\s+/);
                    this.values[pieces[0].trim()] = pieces[1].trim();
                }
            });
        }.bind(this);

        files.loadContents(files.userSettingsProject, "settings", onLoad);
    },

    _changeValue: function(key, value) {
        // Aggregate the settings into a file
        var content = "";
        for (var key in this.values) {
            if (this.values.hasOwnProperty(key)) {
                content += key + " " + this.values[key] + "\n";
            }
        }
        // Send it to the server
        files.saveFile(files.userSettingsProject, {
            name: "settings",
            content: content,
            timestamp: new Date().getTime()
        });
    }
});
