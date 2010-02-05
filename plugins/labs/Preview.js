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

"define metadata";
({
    "depends": [ ],
    "provides": [
        {
            "ep": "choice",
            "name": "preview",
            "description": "Add a setting to alter how previews are displayed",
            "type": "text",
            "defaultValue": "window"
        },
        {
            "ep": "command",
            "name": "preview",
            "params":
            [
                {
                    "name": "filename" ,
                    "type": "text",
                    "description": "the filename to view or use the current file",
                    "defaultValue": null
                }
            ],
            "description": "view the file in a new browser window",
            "withKey": "CMD B",
            "pointer": "#previewCommand"
        }
    ]
});
"end";

var path = require("bespin:util/path");
var catalog = require("bespin:plugin").catalog;

var editSession = catalog.getObject("editSession");
var settings = catalog.getObject("settings");
var editor = catalog.getObject("editor");

/**
 * TODO: What is the key code for escape?
 */
var ESCAPE = -1;

/**
 * The preview command
 */
exports.previewCommand = function(env, args, request) {
    exports.show(args.filename);
    request.done();
};

/**
 * Hack to make sure we're not going to fail to load
 */
var dojo = {
    connect: function() {
        throw "Find an alternative for dojo.connect()";
    },
    disconnect: function() {
        throw "Find an alternative for dojo.disconnect()";
    },
    style: function() {
        throw "Find an alternative for dojo.style()";
    },
    create: function() {
        throw "Find an alternative for dojo.create()";
    }
};

/**
 * Preview the given file in a browser context
 */
exports.show = function(filename, project, type) {
    // Provide defaults
    var filename = filename || editSession.path;
    var project = project || editSession.project;
    var type = type || settings.get("preview");

    var url = path.combine("preview/at", project, filename);

    if (!settings || !filename) {
        // TODO: Warn in some way?
        return;
    }

    // Make sure to save the file first
    // TODO: add onSuccess/onFailure
    editor.saveFile(null, filename);

    if (type == "inline") {
        var preview = document.getElementById("preview");
        var subheader = document.getElementById("subheader");
        var editor = document.getElementById("editor");
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
                if (key == ESCAPE) {
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
        var centerpopup = document.getElementById("centerpopup");
        if (document.getElementById("iphoneIframe") === null) {
            var iphoneIframe = dojo.create("iframe", {
                id: "iphoneIframe",
                frameBorder: 0,
                src: url,
                style: "border:0; width:320px; height:460px; background-color: white; display:block"
            }, centerpopup);
            // webpieces.showCenterPopup(centerpopup);
            var esc = dojo.connect(document, "onkeypress", function(e) {
                var key = e.keyCode || e.charCode;
                if (key == ESCAPE) {
                    centerpopup.removeChild(iphoneIframe);
                    // webpieces.hideCenterPopup(centerpopup);
                    dojo.disconnect(esc);
                }
            });
        }
        return;
    }

    // The default is just to open a new window
    window.open(url);
};
