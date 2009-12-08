"export package main";

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

var didRun = false;

var bespin = require("bespin");
var containerMod = require("bespin:util/container");
var EditorController = require("bespin:editor/controller").EditorController;
var catalog = require("bespin:plugins").catalog;
var view = require("view");

var PLUGIN_METADATA_URL = "/server/plugin/register/defaults";

main = function() {
    if (didRun) {
        return;
    }
    didRun = true;

    // The container allows us to keep multiple bespins separate, and constructs
    // objects according to a user controlled recipe.
    console.log("Bespin is starting up.");

    // We would like to create a container here, something like this:
    //   var container = containerMod.Container.create();
    // However until we've got rid of the singleton 'bespin' we cant do that
    var container = bespin._container;

    SC.run(function() {
        view.app.getPath("mainPage.mainPane").append();

        // Tell the container about the element that we run inside
        var element = view.app.getPath("mainPage.mainPane.layer");
        container.register("container", element);

        // TODO: the stuff that follows is messy. in SC terms, an EditorView should actually
        // be created in the mainPane directly via a "design" call, not created by
        // the controller.
        // We could also say editor = container.get("editor"); which would allow
        // users to customize how the editor is built, but see above
        var editor = EditorController.create();
        container.register("editor", editor);

        editor.model.insertDocument("Welcome to Bespin.");
        view.app.getPath("mainPage.mainPane").appendChild(editor.dockView);

        // Load the plugin metadata for all of the system default plugins
        catalog.loadMetadata(PLUGIN_METADATA_URL, function(sender, response) {
            if (response.isError) {
                throw "failed to load plugin metadata: " +
                    response.errorObject;
            }
        });
    });
};
