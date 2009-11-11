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

var bespin  = require("bespin");
var command = require("bespin/command");
var path = require("bespin/util/path");
var keys = require("bespin/util/keys");
var webpieces = require("bespin/util/webpieces");

/**
 * TODO: We need to find a way to add in a key-sequence for this. Currently
 * it's in with all the other key sequences ...
 */

/**
 * Add a setting to alter how previews are displayed
 */
bespin.get("setting").addSetting({
    name: "preview",
    type: "text",
    defaultValue: "window"
});

/**
 * Add in the preview command
 */
command.store.addCommand({
    name: 'preview',
    takes: ['filename'],
    preview: 'view the file in a new browser window',
    completeText: 'add the filename to view or use the current file',
    withKey: "CMD B",
    execute: function(instruction, filename) {
        exports.show(filename);
    }
});

/**
 * Preview the given file in a browser context
 */
exports.show = function(filename, project, type) {
    var editSession = bespin.get('editSession');
    var settings = bespin.get("settings");

    // Provide defaults
    var filename = filename || editSession.path;
    var project = project || editSession.project;
    var type = type || settings.values.preview;

    var url = path.combine("preview/at", project, filename);

    if (!settings || !filename) {
        // TODO: Warn in some way?
        return;
    }

    // Make sure to save the file first
    // TODO: add onSuccess/onFailure
    bespin.get("editor").saveFile(null, filename);

    if (type == "inline") {
        var preview = dojo.byId("preview");
        var subheader = dojo.byId("subheader");
        var editor = dojo.byId("editor");
        if (dojo.style(preview, "display") == "none") {
            dojo.style(editor, "display", "none");
            dojo.style(subheader, "display", "none");
            dojo.style(preview, "display", "block");

            var inlineIframe = dojo.create("iframe", {
                frameBorder: 0,
                src: url,
                style: "border:0; width:100%; height:100%; background-color: white; display:block"
            }, preview);

            var esc = dojo.connect(document, "onkeypress", function(e) {
                var key = e.keyCode || e.charCode;
                if (key == keys.Key.ESCAPE) {
                    preview.removeChild(inlineIframe);
                    dojo.style(preview, "display", "none");
                    dojo.style(subheader, "display", "block");
                    dojo.style(editor, "display", "block");
                    dojo.disconnect(esc);
                }
            });
        }
        return;
    }

    if (type == "iphone") {
        var centerpopup = dojo.byId("centerpopup");
        if (dojo.byId("iphoneIframe") == null) {
            var iphoneIframe = dojo.create("iframe", {
                id: "iphoneIframe",
                frameBorder: 0,
                src: url,
                style: "border:0; width:320px; height:460px; background-color: white; display:block"
            }, centerpopup);
            webpieces.showCenterPopup(centerpopup);
            var esc = dojo.connect(document, "onkeypress", function(e) {
                var key = e.keyCode || e.charCode;
                if (key == keys.Key.ESCAPE) {
                    centerpopup.removeChild(iphoneIframe);
                    webpieces.hideCenterPopup(centerpopup);
                    dojo.disconnect(esc);
                }
            });
        }
        return;
    }

    // The default is just to open a new window
    window.open(url);
};
