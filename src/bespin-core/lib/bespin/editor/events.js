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

var bespin = require("bespin");

/**
 * Handle custom events aimed at, and for the editor
 */
exports.Events = SC.Object.extend({
    init: function(editor) {
        /**
         * When a file is opened successfully change the project and file status
         * area, then change the window title, and change the URL hash area
         */
        bespin.subscribe("editor:openfile:opensuccess", function(event) {
            var project = event.project || bespin.get('editSession').project;
            var filename = event.file.name;

            try {
                // reset the state of the editor based on saved cookie
                var data = dojo.cookie('viewData_' + project + '_' + filename.split('/').join('_'));
                if (data) {
                    bespin.get('editor').resetView(dojo.fromJson(data));
                } else {
                    bespin.get('editor').basicView();
                }
            } catch (e) {
                console.log("Error setting in the view: ", e);
            }

            document.title = filename + ' - editing with Bespin';

            bespin.publish("url:change", { project: project, path: filename });
        });

        /**
         * Observe a urlchange event and then... change the location hash
         */
        bespin.subscribe("url:change", function(event) {
            var hashArguments = dojo.queryToObject(location.hash.substring(1));
            hashArguments.project = event.project;
            hashArguments.path    = event.path;

            // window.location.hash = dojo.objectToQuery() is not doing the right thing...
            var pairs = [];
            for (var name in hashArguments) {
                var value = hashArguments[name];
                pairs.push(name + '=' + value);
            }
            window.location.hash = pairs.join("&");
        });

        /**
         * Observe a request for session status
         * This should kick in when the user uses the back button, otherwise
         * editor.openFile will check and see that the current file is the same
         * as the file from the urlbar
         */
        bespin.subscribe("url:changed", function(event) {
            editor.openFile(null, event.now.get('path'));
        });

        /**
         * If the command line is in focus, unset focus from the editor
         */
        bespin.subscribe("cmdline:focus", function(event) {
            editor.setFocus(false);
        });

        /**
         * If the command line is blurred, take control in the editor
         */
        bespin.subscribe("cmdline:blur", function(event) {
            editor.setFocus(true);
        });

        /**
         * Track whether a file is dirty (hasn't been saved)
         */
        bespin.subscribe("editor:document:changed", function(event) {
            bespin.publish("editor:dirty");
        });

        /**
         *
         */
        bespin.subscribe("editor:dirty", function(event) {
            editor.dirty = true;
        });

        /**
         *
         */
        bespin.subscribe("editor:clean", function(event) {
            editor.dirty = false;
        });
    }
});
