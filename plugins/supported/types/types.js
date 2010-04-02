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

var catalog = require('bespin:plugins').catalog;
var console = require('bespin:console').console;
var Promise = require('bespin:promise').Promise;

/**
 * Get the simple text-only, no-param version of a typeSpec.
 */
exports.getSimpleName = function(typeSpec) {
    if (!typeSpec) {
        throw new Error('null|undefined is not a valid typeSpec');
    }

    if (typeof typeSpec == 'string') {
        return typeSpec;
    }

    if (typeof typeSpec == 'object') {
        if (!typeSpec.name) {
            throw new Error('Missing name member to typeSpec');
        }

        return typeSpec.name;
    }

    throw new Error('Not a typeSpec: ' + typeSpec);
};

/**
 * 2 typeSpecs are considered equal if their simple names are the same.
 */
exports.equals = function(typeSpec1, typeSpec2) {
    return exports.getSimpleName(typeSpec1) == exports.getSimpleName(typeSpec2);
};

/**
 * A deferred type is one where we hope to find out what the type is just
 * in time to use it. For example the 'set' command where the type of the 2nd
 * param is defined by the 1st param.
 * @param typeSpec An object type spec with name = 'deferred' and a pointer
 * which to call through catalog.loadObjectForPropertyPath (passing in the
 * original typeSpec as a parameter). This function is expected to return either
 * a new typeSpec, or a promise of a typeSpec.
 * @returns A promise which resolves to the new type spec from the pointer.
 */
exports.undeferTypeSpec = function(typeSpec) {
    // Deferred types are specified by the return from the pointer
    // function.
    var promise = new Promise();
    if (!typeSpec.pointer) {
        promise.reject(new Error('Missing deferred pointer'));
        return promise;
    }

    catalog.loadObjectForPropertyPath(typeSpec.pointer).then(function(obj) {
        var reply = obj(typeSpec);
        if (typeof reply.then === 'function') {
            reply.then(function(newTypeSpec) {
                promise.resolve(newTypeSpec);
            }, function(ex) {
                promise.reject(ex);
            });
        } else {
            promise.resolve(reply);
        }
    }, function(ex) {
        promise.reject(ex);
    });

    return promise;
};

// Warning: These next 2 functions are virtually cut and paste from
// command_line:typehint.js
// If you change this, there are probably parallel changes to be made there
// There are 2 differences between the functions:
// - We lookup type|typehint in the catalog
// - There is a concept of a default typehint, where there is no similar
//   thing for types. This is sensible, because hints are optional nice
//   to have things. Not so for types.
// Whilst we could abstract out the changes, I'm not sure this simplifies
// already complex code

/**
 * Given a string, look up the type extension in the catalog
 * @param name The type name. Object type specs are not allowed
 * @returns A promise that resolves to a type extension
 */
function resolveObjectType(typeSpec) {
    var promise = new Promise();
    var ext = catalog.getExtensionByKey('type', typeSpec.name);
    if (ext) {
        promise.resolve({ ext: ext, typeSpec: typeSpec });
    } else {
        promise.reject(new Error('Unknown type: ' + typeSpec.name));
    }
    return promise;
};

/**
 * Look-up a typeSpec and find a corresponding type extension. This function
 * does not attempt to load the type or go through the resolution process,
 * for that you probably want #resolveType()
 * @param typeSpec A string containing the type name or an object with a name
 * and other type parameters e.g. { name: 'selection', data: [ 'one', 'two' ] }
 * @return a promise that resolves to an object containing the resolved type
 * extension and the typeSpec used to resolve the type (which could be different
 * from the passed typeSpec if this was deferred). The object will be in the
 * form { ext:... typeSpec:... }
 */
function resolveTypeExt(typeSpec) {
    if (typeof typeSpec === 'string') {
        return resolveObjectType({ name: typeSpec });
    }

    if (typeof typeSpec === 'object') {
        if (typeSpec.name === 'deferred') {
            var promise = new Promise();
            exports.undeferTypeSpec(typeSpec).then(function(newTypeSpec) {
                resolveTypeExt(newTypeSpec).then(function(reply) {
                    promise.resolve(reply);
                }, function(ex) {
                    promise.reject(ex);
                });
            });
            return promise;
        } else {
            return resolveObjectType(typeSpec);
        }
    }

    throw new Error('Unknown typeSpec type: ' + typeof typeSpec);
};

/**
 * Do all the nastiness of: converting the typeSpec to an extension, then
 * asynchronously loading the extension to a type and then calling
 * resolveTypeSpec if the loaded type defines it.
 * @param typeSpec a string or object defining the type to resolve
 * @returns a promise which resolves to an object containing the type and type
 * extension as follows: { type:... ext:... }
 * @see #resolveTypeExt
 */
exports.resolveType = function(typeSpec) {
    var promise = new Promise();

    resolveTypeExt(typeSpec).then(function(data) {
        data.ext.load(function(type) {
            // We might need to resolve the typeSpec in a custom way
            if (typeof type.resolveTypeSpec === 'function') {
                type.resolveTypeSpec(data.ext, data.typeSpec).then(function() {
                    promise.resolve({ type: type, ext: data.ext });
                }, function(ex) {
                    promise.reject(ex);
                });
            } else {
                // Nothing to resolve - just go
                promise.resolve({ type: type, ext: data.ext });
            }
        });
    }, function(ex) {
        promise.reject(ex);
    });

    return promise;
};

/**
 * Convert some data from a string to another type as specified by
 * <tt>typeSpec</tt>.
 */
exports.fromString = function(stringVersion, typeSpec) {
    var promise = new Promise();
    exports.resolveType(typeSpec).then(function(typeData) {
        promise.resolve(typeData.type.fromString(stringVersion, typeData.ext));
    });
    return promise;
};

/**
 * Convert some data from an original type to a string as specified by
 * <tt>typeSpec</tt>.
 */
exports.toString = function(objectVersion, typeSpec) {
    var promise = new Promise();
    exports.resolveType(typeSpec).then(function(typeData) {
        promise.resolve(typeData.type.toString(objectVersion, typeData.ext));
    });
    return promise;
};

/**
 * Convert some data from an original type to a string as specified by
 * <tt>typeSpec</tt>.
 */
exports.isValid = function(originalVersion, typeSpec) {
    var promise = new Promise();
    exports.resolveType(typeSpec).then(function(typeData) {
        promise.resolve(typeData.type.isValid(originalVersion, typeData.ext));
    });
    return promise;
};
