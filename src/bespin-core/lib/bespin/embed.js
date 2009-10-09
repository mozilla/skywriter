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

require("bespin/globals");

var bespin = require("bespin");
var util = require("bespin/util");
var plugins = require("bespin/plugins");
var builtins = require("bespin/builtins");
var component = require("bespin/editor/component");

// When we come to integrate the non embedded parts ...
// var init = require("bespin/page/editor/init");

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
    if (!element) {
        throw new Error("useBespin requires a element parameter to attach to");
    }

    if (util.isString(element)) {
        element = document.getElementById(element);
    }

    window.editorComponent = component.Component.create({
        container: element,
        language: "js",
        loadFromDiv: true,
        setOptions: { strictlines: 'on' }
    });

    // init.onLoad();
};
