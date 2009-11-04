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

require("bespin/util/globals");

var SC = require("sproutcore");
var bespin = require("bespin");
var util = require("bespin/util/util");
var settings = require("bespin/settings");
var plugins = require("bespin/plugins");
var builtins = require("bespin/builtins");
var editorMod = require("bespin/editor");

var EditorController = require('bespin/editor/controller').EditorController;

// When we come to integrate the non embedded parts ...
// var init = re quire("bespin/page/editor/init");
// And then call init.onLoad();

var catalog = plugins.Catalog.create();
catalog.load(builtins.metadata);
bespin.register("plugins", catalog);

// SC.LOG_BINDINGS = true;
// SC.LOG_OBSERVERS = true;

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
    var originalInnerHtml = element.innerHTML;

    var controller = EditorController.create({ container: element });
    SC.run(function() {
        bespin.register("editor", controller);

        var editorPane = SC.Pane.create({
            //
            // Contrary to SproutCore's ordinary model, the embedded control's
            // layout is pulled *from* the browser's rendering model and pushed
            // *to* SproutCore. Here we tell SproutCore to grab the browser's
            // computed dimensions for the control.
            //
            // Note that if we use StaticLayout for this then the scrolling
            // will get all screwed up, because SproutCore will give up trying
            // to determine position and size for any child controls of the
            // editor - but this information is needed for ScrollViews to work
            // properly.
            //
            layout: function(key, value) {
                var layout = {
                    top:    0,
                    left:   0,
                    width:  element.clientWidth,
                    height: element.clientHeight
                };
                console.log("pane layout: " + layout.toSource());
                return layout;
            }.property(),

            // And here we tell SproutCore to keep its paws off the element's
            // CSS (and also make the editor pane fill the enclosing element).
            layoutStyle: function(key, value) {
                return { width: '100%', height: '100%' };
            }.property().cacheable()
        });
        editorPane.appendChild(controller.ui, null);
        SC.$(element).css('position', 'relative');
        element.innerHTML = "";
        editorPane.appendTo(element);
        if (options.initialContent) {
            controller.model.insertDocument(options.initialContent);
        } else {
            controller.model.insertDocument(originalInnerHtml);
        }

        // Call controller.set on any settings
        if (options.settings) {
            for (var key in options.settings) {
                if (options.settings.hasOwnProperty(key)) {
                    controller.set(key, options.settings[key]);
                }
            }
        }

        // stealFocus makes us take focus on startup
        if (options.stealFocus) {
            controller.setFocus(true);
        }

        // Move to a given line if requested
        if (options.lineNumber) {
            controller.setLineNumber(options.lineNumber);
        }
    });

    return controller;
};
