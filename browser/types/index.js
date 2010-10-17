require.def(['require', 'exports', 'module',
    'skywriter/plugins'
], function(require, exports, module,
    plugins
) {

/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is
 * Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

exports.init = function() {
    var catalog = plugins.catalog;
    catalog.addExtensionPoint("type", {
        "description":
            "Commands can accept various arguments that the user enters or that are automatically supplied by the environment. Those arguments have types that define how they are supplied or completed. The pointer points to an object with methods convert(str value) and getDefault(). Both functions have `this` set to the command's `takes` parameter. If getDefault is not defined, the default on the command's `takes` is used, if there is one. The object can have a noInput property that is set to true to reflect that this type is provided directly by the system. getDefault must be defined in that case.",
        "indexOn": "name"
    });
    catalog.connect("type", module.id, {
        "name": "text",
        "description": "Text that the user needs to enter.",
        "pointer": "basic#text"
    });
    catalog.connect("type", module.id, {
        "name": "number",
        "description": "A JavaScript number",
        "pointer": "basic#number"
    });
    catalog.connect("type", module.id, {
        "name": "boolean",
        "description": "A true/false value",
        "pointer": "basic#bool"
    });
    catalog.connect("type", module.id, {
        "name": "object",
        "description": "An object that converts via JavaScript",
        "pointer": "basic#object"
    });
    catalog.connect("type", module.id, {
        "name": "selection",
        "description":
            "A string that is constrained to be one of a number of pre-defined values",
        "pointer": "basic#selection"
    });
    catalog.connect("type", module.id, {
        "name": "deferred",
        "description":
            "A type which we don't understand from the outset, but which we hope context can help us with"
    });
};

exports.deinit = function() {
    catalog.disconnectAll(module.id);
    catalog.removeExtensionPoint("type");
};

exports.init = function() {
    var catalog = plugins.catalog;
    catalog.addExtensionPoint("type", {
        "description":
            "Commands can accept various arguments that the user enters or that are automatically supplied by the environment. Those arguments have types that define how they are supplied or completed. The pointer points to an object with methods convert(str value) and getDefault(). Both functions have `this` set to the command's `takes` parameter. If getDefault is not defined, the default on the command's `takes` is used, if there is one. The object can have a noInput property that is set to true to reflect that this type is provided directly by the system. getDefault must be defined in that case.",
        "indexOn": "name"
    });
    catalog.connect("type", module.id, {
        "name": "text",
        "description": "Text that the user needs to enter.",
        "pointer": "basic#text"
    });
    catalog.connect("type", module.id, {
        "name": "number",
        "description": "A JavaScript number",
        "pointer": "basic#number"
    });
    catalog.connect("type", module.id, {
        "name": "boolean",
        "description": "A true/false value",
        "pointer": "basic#bool"
    });
    catalog.connect("type", module.id, {
        "name": "object",
        "description": "An object that converts via JavaScript",
        "pointer": "basic#object"
    });
    catalog.connect("type", module.id, {
        "name": "selection",
        "description":
            "A string that is constrained to be one of a number of pre-defined values",
        "pointer": "basic#selection"
    });
    catalog.connect("type", module.id, {
        "name": "deferred",
        "description":
            "A type which we don't understand from the outset, but which we hope context can help us with"
    });
};

exports.deinit = function() {
    catalog.disconnectAll(module.id);
    catalog.removeExtensionPoint("type");
};

exports.init = function() {
    var catalog = plugins.catalog;
    catalog.addExtensionPoint("type", {
        "description":
            "Commands can accept various arguments that the user enters or that are automatically supplied by the environment. Those arguments have types that define how they are supplied or completed. The pointer points to an object with methods convert(str value) and getDefault(). Both functions have `this` set to the command's `takes` parameter. If getDefault is not defined, the default on the command's `takes` is used, if there is one. The object can have a noInput property that is set to true to reflect that this type is provided directly by the system. getDefault must be defined in that case.",
        "indexOn": "name"
    });
    catalog.connect("type", module.id, {
        "name": "text",
        "description": "Text that the user needs to enter.",
        "pointer": "basic#text"
    });
    catalog.connect("type", module.id, {
        "name": "number",
        "description": "A JavaScript number",
        "pointer": "basic#number"
    });
    catalog.connect("type", module.id, {
        "name": "boolean",
        "description": "A true/false value",
        "pointer": "basic#bool"
    });
    catalog.connect("type", module.id, {
        "name": "object",
        "description": "An object that converts via JavaScript",
        "pointer": "basic#object"
    });
    catalog.connect("type", module.id, {
        "name": "selection",
        "description":
            "A string that is constrained to be one of a number of pre-defined values",
        "pointer": "basic#selection"
    });
    catalog.connect("type", module.id, {
        "name": "deferred",
        "description":
            "A type which we don't understand from the outset, but which we hope context can help us with"
    });
};

exports.deinit = function() {
    catalog.disconnectAll(module.id);
    catalog.removeExtensionPoint("type");
};
});