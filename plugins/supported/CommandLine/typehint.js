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

var catalog = require("bespin:plugins").catalog;
var Promise = require("bespin:promise").Promise;
var types = require("Types:types");

var hint = require("hint");

var r = require;

/**
 * Asynchronously find a UI component to match a typeSpec
 * @param input i.e. an instance of input#Input
 * @param assignment The last argument that we are hinting. Specifically it must
 * be an object with the following shape:
 * <tt>{ param: { type:.., description:... }, value:... }</tt>
 * Where:
 * <ul>
 * <li>value - Data typed for this parameter so far, by which the hint can be
 * customized, for example by reducing the options in a selection
 * <li>param - Structure like a param field from command meta-data:
 * <li>param.type - The data type for validation
 * <li>param.description - Description of the field for help purposes
 * </ul>
 * @return An object containing hint data { element:.., completion:... }
 * where <tt>element</tt> is a string / dom node / sc component and
 * <tt>completion</tt> (if set) is a string containing the only possible
 * outcome.
 * @see input#Input.assign() and input#Input.getAssignmentForLastArg()
 */
exports.getHint = function(input, assignment) {
    var promise = new Promise();

    exports.getTypeHintExt(assignment.param.type).then(function(typeHintExt) {
        if (!typeHintExt) {
            promise.resolve(createDefaultHint(assignment.param.description));
            return promise;
        }

        typeHintExt.load().then(function(typeHint) {
            var hint;
            if (typeof typeHint.getHint === "function") {
                hint = typeHint.getHint(input, assignment, typeHintExt);
            } else {
                hint = createDefaultHint(assignment.param.description);
            }
            promise.resolve(hint);
        }, function(ex) {
            hint = createDefaultHint(assignment.param.description);
        });
    });

    return promise;
};

/**
 * If there isn't a typehint to define a hint UI component then we just use the
 * default - a simple text node containing the description.
 */
var createDefaultHint = function(description) {
    return hint.Hint.create({
        element: document.createTextNode(description),
        level: hint.Level.Info
    });
};

/**
 * typeSpec one of:
 * "typename",
 * "typename:json" e.g. 'selection:["one", "two", "three"]'
 * { name:"typename", data:... } e.g. { name:"selection", data:["one", "two", "three"] }
 */
exports.getTypeHintExt = function(typeSpec) {
    // Warning: This code is virtually cut and paste from Types:types.js
    // It you change this, there are probably parallel changes to be made there
    // There are 2 differences between the functions:
    // - We lookup type|typehint in the catalog
    // - There is a concept of a default typehint, where there is no similar
    //   thing for types. This is sensible, because hints are optional nice
    //   to have things. Not so for types.
    // Whilst we could abstract out the changes, I'm not sure this simplifies
    // already complex code
    var promise = new Promise();

    try {
        var typeHintExt;
        if (typeof typeSpec === "string") {
            var parts = typeSpec.split(":");
            if (parts.length === 1) {
                // The type is just a simple type name
                typeHintExt = catalog.getExtensionByKey("typehint", typeSpec);
                // It's not an error if the type isn't found. See above
                promise.resolve(typeHintExt);
            } else {
                var name = parts.shift();
                var data = parts.join(":");

                if (data.substring(0, 1) == "[" || data.substring(0, 1) == "{") {
                    // JSON data is specified in the string. Yuck
                    typeHintExt = catalog.getExtensionByKey("typehint", name);
                    typeHintExt.data = JSON.parse(data);
                    promise.resolve(typeHintExt);
                } else {
                    // If we don't have embedded JSON, we should have a pointer
                    var parts = data.split("#");
                    var modName = parts.shift();
                    var objName = parts.join("#");

                    // A pointer to something to fetch the data element
                    r.loader.async(modName).then(function() {
                        var module = r(modName);
                        var func = module[objName];
                        if (!func) {
                            console.error("Module not found: ", data);
                            promise.resolve(null);
                        } else {
                            typeHintExt = catalog.getExtensionByKey("typehint", name);
                            typeHintExt.data = func();
                            promise.resolve(typeHintExt);
                        }
                    }, function(ex) {
                        console.error("Error resolving typeSpec (1):", typeSpec, ex);
                        promise.resolve(null);
                    });
                }
            }
        } else if (typeof typeSpec === "object") {
             if (typeSpec.name == "deferred") {
                // Deferred types are specified by the return from the pointer
                // function.
                if (!typeSpec.pointer) {
                    promise.reject(new Error("Missing deferred pointer"));
                    return;
                }

                var parts = typeSpec.pointer.split("#");
                var modName = parts.shift();
                var objName = parts.join("#");

                r.loader.async(modName).then(function() {
                    var module = r(modName);
                    typeHintExt = module[objName](typeSpec);
                    promise.resolve(typeHintExt);
                }, function(ex) {
                    promise.reject(ex);
                });
            } else {
                // A type specified in an object, there is likely to be
                // some accompanying data (e.g. for selection) either directly
                // in typeSpec.data or to be fetched from a function pointed
                // at by typeSpec.pointer
                typeHintExt = catalog.getExtensionByKey("typehint", typeSpec.name);
                if (!typeHintExt) {
                    promise.resolve(null);
                    return;
                }

                if (typeSpec.pointer) {
                    var parts = typeSpec.pointer.split("#");
                    var modName = parts.shift();
                    var objName = parts.join("#");

                    r.loader.async(modName).then(function() {
                        var module = r(modName);
                        typeHintExt.data = module[objName]();
                        promise.resolve(typeHintExt);
                    }, function(ex) {
                        console.error("Error resolving typeSpec (2):", typeSpec, ex);
                        promise.resolve(null);
                    });
                } else {
                    if (typeSpec.data) {
                        typeHintExt.data = typeSpec.data;
                    }

                    promise.resolve(typeHintExt);
                }
            }
        }
    } catch (ex) {
        console.error("Error resolving typeSpec (3):", typeSpec, ex);
        promise.resolve(null);
    }

    return promise;
};
