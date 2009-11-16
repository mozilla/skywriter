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

/**
 * This file provides an API for embedders to use. Its intent is to abstract
 * out all the complexity of internal APIs and provide something sane, simple
 * and easy to learn to the embedding user.
 */

require("util/globals");

var SC = require("sproutcore/runtime:package").SC;
var bespin = require("package");
var containerMod = require("util/container");
var util = require("util/util");

/**
 * Initialize a Bespin component on a given element.
 */
exports.useBespin = function(element, options) {
    options = options || {};

    if (util.isString(element)) {
        element = document.getElementById(element);
    }

    if (!element) {
        throw new Error("useBespin requires a element parameter to attach to");
    }

    // Creating the editor alters the components innerHTML
    var content = element.innerHTML;
    var editor;

    // The container allows us to keep multiple bespins separate, and constructs
    // objects according to a user controlled recipe.
    var container = containerMod.Container.create();

    // We want to move away from the singleton bespin.foo, but until we have ...
    bespin.container = container;

    SC.run(function() {
        container.register("container", element);
        editor = container.get("editor");

        var editorPane = SC.Pane.create({
            layout: editor.computeLayout(),

            // And here we tell SproutCore to keep its paws off the element's
            // CSS (and also make the editor pane fill the enclosing element).
            layoutStyle: function(key, value) {
                return { width: '100%', height: '100%' };
            }.property().cacheable()
        });
        editorPane.appendChild(editor.ui, null);
        SC.$(element).css('position', 'relative');
        element.innerHTML = "";
        editorPane.appendTo(element);

        if (options.initialContent) {
            content = options.initialContent;
        }
        editor.model.insertDocument(content);

        // Call editor.setSetting on any settings passed in options.settings
        if (options.settings) {
            for (var key in options.settings) {
                if (options.settings.hasOwnProperty(key)) {
                    editor.setSetting(key, options.settings[key]);
                }
            }
        }

        // stealFocus makes us take focus on startup
        if (options.stealFocus) {
            editor.setFocus(true);
        }

        // Move to a given line if requested
        if (options.lineNumber) {
            editor.setLineNumber(options.lineNumber);
        }
    });

    return editor;
};
