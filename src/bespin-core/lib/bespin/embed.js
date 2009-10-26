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

exports.useBespin = function(element, options) {
    // Creating the editor alters the components innerHTML
    var originalInnerHtml = element.innerHTML;
    
    var controller = EditorController.create({});
    bespin.register("editor", controller);
    
    var editorPane = SC.Pane.create({
        layout: {centerX: 0, centerY: 0, width: 300, height: 300},
        childViews: ['editorView'],
        editorView: controller.ui
    });
    SC.$(element).css('position', 'relative');
    element.innerHTML = "";
    editorPane.appendTo(element);
    if (options.initialContent) {
        controller.model.insertDocument(options.initialContent);
    } else {
        controller.model.insertDocument(originalInnerHtml);
    }
    return controller;
};



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
exports.useBespin2 = function(element, options) {
    options = options || {};

    if (util.isString(element)) {
        element = document.getElementById(element);
    }

    if (!element) {
        throw new Error("useBespin requires a element parameter to attach to");
    }

    // Creating the editor alters the components innerHTML
    var originalInnerHtml = element.innerHTML;

    var editorComponent = exports.Component.create({ element: element });

    // The initial content defaults to the contents of the div, but you can
    // override with the 'initialContent' option
    if (options.initialContent) {
        editorComponent.setContent(options.initialContent);
    } else {
        editorComponent.setContent(originalInnerHtml);
    }

    // Call editorComponent.set on any settings
    if (options.settings) {
        for (var key in options.settings) {
            if (options.settings.hasOwnProperty(key)) {
                editorComponent.set(key, options.settings[key]);
            }
        }
    }

    // stealFocus makes us take focus on startup
    if (options.stealFocus) {
        editorComponent.setFocus(true);
    }

    // Move to a given line if requested
    if (options.lineNumber) {
        editorComponent.setLineNumber(options.lineNumber);
    }

    return editorComponent;
};

/**
 * This is a component that you can use to embed the Bespin Editor component
 * anywhere you wish.
 * There are a set of options that you pass in, as well as the container element
 * @param loadfromdiv Take the innerHTML from the given div and load it into
 * the editor
 * @param content Feed the editor the string as the initial content (loadfromdiv
 * trumps this)
 * @param language The given syntax highlighter language to turn on (not people
 * language!)
 * @param dontstealfocus by default the component will steal focus when it
 * loads, but you can change that by setting this to true
 */
exports.Component = SC.Object.extend({
    element: null,

    /**
     * Takes a container element, and the set of options for the component which
     * include those noted above.
     */
    init: function() {
        this.editor = bespin.register('editor', editorMod.API.create({ container: this.element }));

        // Use in memory settings here instead of saving to the server which is default. Potentially use Cookie settings
        bespin.register('settings', settings.Core.create({ store: settings.InMemory }));
    },

    /**
     * Returns the contents of the editor
     */
    getContent: function() {
        return bespin.get("editor").model.getDocument();
    },

    /**
     * Takes the content and inserts it fresh into the document
     */
    setContent: function(content) {
        return bespin.get("editor").model.insertDocument(content);
    },

    /**
     * If you pass in true, focus will be set on the editor, if false, it will
     * not.
     */
    setFocus: function(bool) {
        return bespin.get("editor").setFocus(bool);
    },

    /**
     * Pass in the line number to jump to (and refresh)
     */
    setLineNumber: function(linenum) {
        bespin.get("editor").moveAndCenter(linenum);
    },

    /**
     * Talk to the Bespin settings structure and pass in the key/value
     */
    set: function(key, value) {
        bespin.get("settings").set(key, value);
    },

    /**
     * Track changes in the document
     */
    onchange: function(callback) {
        bespin.subscribe("editor:document:changed", callback);
    },

    /**
     * Execute a given command
     */
    executeCommand: function(command) {
        try {
            bespin.get("commandLine").executeCommand(command);
        } catch (e) {
            // catch the command prompt errors
        }
    },

    /**
     * Disposes the editor as best as possible, clearing resources, clipboard
     * helpers, and the like.
     */
    dispose: function() {
        bespin.get("editor").dispose();
    }
});
