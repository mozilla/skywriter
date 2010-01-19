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

var webpieces = require("bespin/util/webpieces");
var command = require("bespin/command");

/**
 * This list of wizards that we can run. Each must have a url, which is a
 * pointer to the server side resource to display, and a set of functions
 * that are run by parts of the resource. A special onLoad function (note
 * the exact case) will be called when the wizard is first displayed.
 */
var wizards = {
    newuser: { url: "/overlays/newuser.html" },
    overview: { url: "/overlays/overview.html" }
};

// TODO: Find some way to only do this if we're sure that this is a new user
// Now we know what are settings are we can decide if we need to
// open the new user wizard
// if (!settings.values.hidewelcomescreen && bespin.wizard) {
//     bespin.wizard.show(null, "newuser", false);
// }

/**
 * A collection of functions for displaying Wizards
 */
exports.wizard = {
    /**
     * Change the session settings when a new file is opened
     */
    show: function(instruction, type, warnOnFail) {
        var wizard = wizards[type];
        if (!wizard && instruction) {
            instruction.addErrorOutput("Unknown wizard: " + type);
            return;
        }
        var self = this;

        // Warn when the HTML fetch fails
        var onFailure = function() {
            if (warnOnFail && instruction) {
                instruction.addErrorOutput("Failed to display wizard: " + xhr.responseText);
            }
        };

        // When the HTML fetch succeeds, display it in the centerpopup div
        var onSuccess = function(data) {
            self.element = document.getElementById("centerpopup");
            self.element.innerHTML = data;
            dojo.query("#centerpopup script").forEach(function(node) {
                eval(node.innerHTML);
            });

            webpieces.showCenterPopup(self.element, true);
            if (typeof wizard.onLoad == "function") {
                wizard.onLoad();
            }
        };

        bespin.get("server").fetchResource(wizard.url, onSuccess, onFailure);
    },

    /**
     * Designed to be called by a button in a wizard:
     * Close the wizard
     */
    onClose: function() {
        webpieces.hideCenterPopup(this.element);
    },

    /**
     * Designed to be called by a button in a wizard:
     * Open a web page as we close the wizard
     */
    onJump: function(url, close) {
        window.open(url);
        if (close) {
            this.onClose();
        }
    },

    /**
     * Designed to be called by a button in a wizard:
     * Open another wizard page as we close this one
     */
    onWizard: function(type) {
        this.show(type);
        this.onClose();
    }
};

/**
 * The wizard command to show a wizard
 */
command.store.addCommand({
    "name": "wizard",
    "takes": [ "type" ],
    "hidden": true,
    "description": "display a named wizard to step through some process",
    "completeText": "The name of the wizard to run. Leave blank to list known wizards",
    execute: function(instruction, type) {
        if (!type) {
            var list = "";
            for (var name in wizards) {
                if (wizards.hasOwnProperty(name)) {
                    list += ", " + name;
                }
            }
            instruction.addOutput("Known wizards: " + list.substring(2));
            return;
        }

        exports.show(instruction, type, true);
    }
});
