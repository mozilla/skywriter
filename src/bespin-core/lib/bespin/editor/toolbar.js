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
var editor = require("bespin/page/editor");
var SC = require("sproutcore");

/**
 * The editor has the notion of a toolbar which are components that can drive
 * the editor from outside of itself. Such examples are collaboration views,
 * file browser, undo/redo, cut/copy/paste and more.
 */
exports.Toolbar = SC.Object.extend({
    DEFAULT_TOOLBAR: [
        "collaboration",
        "filepopup",
        "commandline",
        "target_browsers",
        "save",
        "close",
        "preview",
        "fontsize"
    ],

    showCollab: false,
    showFiles: false,
    showTarget: false,

    showCollabHotCounter: 0,

    editor: bespin.get('editor'),
    opts: {},

    init: function() {
        if (this.opts.setupDefault) {
            this.setupDefault();
        }

        bespin.publish("toolbar:init", { toolbar: this });
    },

    setup: function(type, el, callback) {
        if (dojo.isFunction(callback)) {
            // add the component first
            this.addComponent(type, callback);
        }
        if (dojo.isFunction(this.components[type])) {
            this.components[type](this, el);
        }
    },

    /*
     * Go through the default list and try to hitch onto the DOM element
     */
    setupDefault: function() {
        var self = this;
        this.DEFAULT_TOOLBAR.forEach(function(item) {
            var item_el = dojo.byId("toolbar_" + item);
            if (item_el) {
                self.setup(item, item_el);
            }
        });
    },

    addComponent: function(type, callback) {
        this.components[type] = callback;
    },

    // -- INITIAL COMPONENTS

    components: {
        collaboration: function(toolbar, el) {
            var collab = dojo.byId(el) || dojo.byId("toolbar_collaboration");
            dojo.connect(collab, 'click', function() {
                toolbar.showCollab = !toolbar.showCollab;
                editor.recalcLayout();
            });
        },

        filepopup: function(toolbar, el) {
            var filepopup = dojo.byId(el) || dojo.byId("toolbar_popup");

            dojo.connect(filepopup, 'click', function() {
                toolbar.editor.ui.actions.focusFileBrowser();
            });

            dojo.connect(filepopup, 'mouseover', function() {
                filepopup.style.cursor = "pointer";
                filepopup.src = "images/icn_filepopup_on.png";
            });

            dojo.connect(filepopup, 'mouseout', function() {
                filepopup.style.cursor = "default";
                filepopup.src = "images/icn_filepopup.png";
            });
        },

        commandline: function(toolbar, el) {
            var commandline = dojo.byId(el) || dojo.byId("toolbar_commandline");

            dojo.connect(commandline, 'click', function() {
                toolbar.editor.ui.actions.focusCommandline();
            });

            dojo.connect(commandline, 'mouseover', function() {
                commandline.style.cursor = "pointer";
                commandline.src = "images/icn_command_on.png";
            });

            dojo.connect(commandline, 'mouseout', function() {
                commandline.style.cursor = "default";
                commandline.src = "images/icn_command.png";
            });
        },

        target_browsers: function(toolbar, el) {
            var target = dojo.byId(el) || dojo.byId("toolbar_target_browsers");
            dojo.connect(target, 'click', function() {
                toolbar._showTarget = !toolbar._showTarget;
                target.src = "images/" + ( (toolbar._showTarget) ? "icn_target_on.png" : "icn_target_off.png" );
                editor.recalcLayout();
            });
            dojo.connect(target, 'mouseover', function() {
                target.style.cursor = "pointer";
                target.src = "images/icn_target_on.png";
            });
            dojo.connect(target, 'mouseout', function() {
                target.style.cursor = "default";
                target.src = "images/icn_target_off.png";
            });
        },

        save: function(toolbar, el) {
            var save = dojo.byId(el) || dojo.byId("toolbar_save");
            dojo.connect(save, 'mouseover', function() {
                save.src = "images/icn_save_on.png";
            });

            dojo.connect(save, 'mouseout', function() {
                save.src = "images/icn_save.png";
            });

            dojo.connect(save, 'click', function() {
                bespin.get("editor").saveFile();
            });
        },

        close: function(toolbar, el) {
            var close = dojo.byId(el) || dojo.byId("toolbar_close");
            dojo.connect(close, 'mouseover', function() {
                close.src = "images/icn_close_on.png";
            });

            dojo.connect(close, 'mouseout', function() {
                close.src = "images/icn_close.png";
            });

            dojo.connect(close, 'click', function() {
                bespin.get("commandLine").executeCommand("closefile", true);
            });
        },

        undo: function(toolbar, el) {
            var undo = dojo.byId(el) || dojo.byId("toolbar_undo");
            dojo.connect(undo, 'mouseover', function() {
                undo.src = "images/icn_undo_on.png";
            });

            dojo.connect(undo, 'mouseout', function() {
                undo.src = "images/icn_undo.png";
            });

            dojo.connect(undo, 'click', function() {
                toolbar.editor.ui.actions.undo();
            });
        },

        redo: function(toolbar, el) {
            var redo = dojo.byId(el) || dojo.byId("toolbar_undo");

            dojo.connect(redo, 'mouseover', function() {
                redo.src = "images/icn_redo_on.png";
            });

            dojo.connect(redo, 'mouseout', function() {
                redo.src = "images/icn_redo.png";
            });

            dojo.connect(redo, 'click', function() {
                toolbar.editor.ui.actions.redo();
            });
        },

        preview: function(toolbar, el) {
            var preview = dojo.byId(el) || dojo.byId("toolbar_preview");

            dojo.connect(preview, 'mouseover', function() {
                preview.src = "images/icn_preview_on.png";
            });

            dojo.connect(preview, 'mouseout', function() {
                preview.src = "images/icn_preview.png";
            });

            dojo.connect(preview, 'click', function() {
                // Defaults to current
                bespin.preview.show();
            });
        },

        fontsize: function(toolbar, el) {
            var fontsize = dojo.byId(el) || dojo.byId("toolbar_fontsize");

            dojo.connect(fontsize, 'mouseover', function() {
                fontsize.src = "images/icn_fontsize_on.png";
            });

            dojo.connect(fontsize, 'mouseout', function() {
                fontsize.src = "images/icn_fontsize.png";
            });

            // Change the font size between the small, medium, and large settings
            (function() {
                var currentFontSize = 2;
                var fontSizes = {
                    1: 8,  // small
                    2: 10, // medium
                    3: 14  // large
                };

                dojo.connect(fontsize, 'click', function() {
                    currentFontSize = (currentFontSize > 2) ? 1 : currentFontSize + 1;
                    bespin.publish("settings:set:fontsize", [{ value: fontSizes[currentFontSize] }]);
                });
            })();
        }
    }
});
