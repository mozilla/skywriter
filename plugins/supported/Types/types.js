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

var r = require;

/**
 * Convert some data from a string to another type as specified by
 * <tt>typeSpec</tt>.
 */
exports.fromString = function(stringVersion, typeSpec) {
    var promise = new Promise();

    try {
        exports.getTypeExt(typeSpec).then(function(typeExt) {
            typeExt.load(function(type) {
                var objectVersion = type.fromString(stringVersion, typeExt);
                promise.resolve(objectVersion);
            });
        }, function(ex) {
            promise.reject(ex);
        });
    } catch (ex) {
        promise.reject(ex);
    }

    return promise;
};

/**
 * Convert some data from an original type to a string as specified by
 * <tt>typeSpec</tt>.
 */
exports.toString = function(objectVersion, typeSpec) {
    var promise = new Promise();

    try {
        exports.getTypeExt(typeSpec).then(function(typeExt) {
            typeExt.load(function(type) {
                var stringVersion = type.toString(objectVersion, typeExt);
                promise.resolve(stringVersion);
            });
        }, function(ex) {
            promise.reject(ex);
        });
    } catch (ex) {
        promise.reject(ex);
    }

    return promise;
};

/**
 * Convert some data from an original type to a string as specified by
 * <tt>typeSpec</tt>.
 */
exports.isValid = function(originalVersion, typeSpec) {
    var promise = new Promise();

    try {
        exports.getTypeExt(typeSpec).then(function(typeExt) {
            typeExt.load(function(type) {
                var valid = type.isValid(originalVersion, typeExt);
                promise.resolve(valid);
            });
        }, function(ex) {
            promise.reject(ex);
        });
    } catch (ex) {
        promise.reject(ex);
    }

    return promise;
};

/**
 * 2 typeSpecs are considered equal if their simple names are the same.
 */
exports.equals = function(typeSpec1, typeSpec2) {
    return exports.getSimpleName(typeSpec1) == exports.getSimpleName(typeSpec2);
};

/**
 * Get the simple text-only, no-param version of a typeSpec.
 */
exports.getSimpleName = function(typeSpec) {
    if (!typeSpec) {
        throw new Error("null|undefined is not a valid typeSpec");
    }

    if (typeof typeSpec == "string") {
        return typeSpec;
    }

    if (typeof typeSpec == "object") {
        if (!typeSpec.name) {
            throw new Error("Missing name member to typeSpec");
        }

        return typeSpec.name;
    }

    throw new Error("Not a typeSpec: " + typeSpec);
};

/**
 * typeSpec one of:
 * "typename",
 * "typename:json" e.g. 'selection:["one", "two", "three"]'
 * { name:"typename", data:... } e.g. { name:"selection", data:["one", "two", "three"] }
 */
exports.getTypeExt = function(typeSpec) {
    // Warning: This code is virtually cut and paste from CommandLine:typehint.js
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
        var typeExt;
        if (typeof typeSpec === "string") {
            var parts = typeSpec.split(":");
            if (parts.length === 1) {
                // The type is just a simple type name
                typeExt = catalog.getExtensionByKey("type", typeSpec);
                if (typeExt) {
                    promise.resolve(typeExt);
                } else {
                    promise.reject(new Error("Unknown type: " + typeSpec));
                }
            } else {
                var name = parts.shift();
                var data = parts.join(":");

                if (data.substring(0, 1) == "[" || data.substring(0, 1) == "{") {
                    // JSON data is specified in the string. Yuck
                    typeExt = catalog.getExtensionByKey("type", name);
                    typeExt.data = JSON.parse(data);
                    promise.resolve(typeExt);
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
                            promise.reject(new Error("Module not found: " + data));
                        } else {
                            typeExt = catalog.getExtensionByKey("type", name);
                            typeExt.data = func();
                            promise.resolve(typeExt);
                        }
                    }, function(ex) {
                        promise.reject(ex);
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
                    typeExt = module[objName](typeSpec);
console.log("getTypeExt typeExt", typeExt);
                    promise.resolve(typeExt);
                }, function(ex) {
                    promise.reject(ex);
                });
            } else {
                // A type specified in an object, there is likely to be
                // some accompanying data (e.g. for selection) either directly
                // in typeSpec.data or to be fetched from a function pointed
                // at by typeSpec.pointer
                typeExt = catalog.getExtensionByKey("type", typeSpec.name);
                if (!typeExt) {
                    promise.reject(new Error("Unknown type: " + typeSpec.name));
                    return;
                }

                if (typeSpec.pointer) {
                    var parts = typeSpec.pointer.split("#");
                    var modName = parts.shift();
                    var objName = parts.join("#");

                    r.loader.async(modName).then(function() {
                        var module = r(modName);
                        typeExt.data = module[objName]();
                        promise.resolve(typeExt);
                    }, function(ex) {
                        promise.reject(ex);
                    });
                } else {
                    if (typeSpec.data) {
                        typeExt.data = typeSpec.data;
                    }

                    promise.resolve(typeExt);
                }
            }
        }
    } catch (ex) {
        promise.reject(ex);
    }

    return promise;
};

/**
 * Like getTypeExt() except that we don't support any asynchronous actions
 * ('deferred' types, and other types with data specified with a pointer).
 * @return The Type Extension, null the type was not found, or throw if the
 * type was illegally specified.
 */
exports.getTypeExtNow = function(typeSpec) {

    if (typeof typeSpec === "string") {
        var parts = typeSpec.split(":");
        if (parts.length === 1) {
            // The type is just a simple type name
            return catalog.getExtensionByKey("type", typeSpec);
        } else {
            var name = parts.shift();
            var data = parts.join(":");

            if (data.substring(0, 1) == "[" || data.substring(0, 1) == "{") {
                // JSON data is specified in the string. Yuck
                var typeExt = catalog.getExtensionByKey("type", name);
                typeExt.data = JSON.parse(data);
                return typeExt;
            }

            throw new Error("Non array/object data unsupported.");
        }
    }

    if (typeof typeSpec === "object") {
        if (typeSpec.name == "deferred") {
            throw new Error("deferred types not supported");
        }

        typeExt = catalog.getExtensionByKey("type", typeSpec.name);
        if (typeExt && typeSpec.data) {
            typeExt.data = typeSpec.data;
        }

        return typeExt;
    }
};
