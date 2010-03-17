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
var console = require('bespin:console').console;
var Promise = require("bespin:promise").Promise;
var types = require("Types:types");

var hint = require("CommandLine:hint");

var r = require;

/**
 * If there isn't a typehint to define a hint UI component then we just use the
 * default - a simple text node containing the description.
 */
var createDefaultHint = function(description) {
    var parent = document.createElement("article");
    parent.innerHTML = description;

    return hint.Hint.create({
        element: parent,
        level: hint.Level.Info
    });
};

/**
 * resolve the passed promise by calling
 */
var getHintOrDefault = function(promise, input, assignment, ext, typeHint) {
    var hint;

    try {
        if (ext && typeof typeHint.getHint === "function") {
            hint = typeHint.getHint(input, assignment, ext);
        }
    }
    catch (ex) {
        console.error("Failed to get hint for ", ext, " reason: ", ex);
    }

    if (!hint) {
        hint = createDefaultHint(assignment.param.description);
    }

    promise.resolve(hint);
    return promise;
};

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
    var typeSpec = assignment.param.type;

    exports.getTypeHintExt(typeSpec).then(function(ext) {
        if (!ext) {
            return getHintOrDefault(promise, input, assignment);
        }

        ext.load().then(function(typeHint) {
            // We might need to resolve the typeSpec in a custom way
            if (typeHint.resolveTypeSpec) {
                typeHint.resolveTypeSpec(ext, typeSpec).then(function() {
                    getHintOrDefault(promise, input, assignment, ext, typeHint);
                }, function(ex) {
                    promise.reject(ex);
                });
            } else {
                // Nothing to resolve - just go
                getHintOrDefault(promise, input, assignment, ext, typeHint);
            }
        }, function(ex) {
            hint = createDefaultHint(assignment.param.description);
            promise.resolve(hint);
        });
    });

    return promise;
};

// Warning: This code is virtually cut and paste from Types:types.js
// It you change this, there are probably parallel changes to be made there
// There are 2 differences between the functions:
// - We lookup type|typehint in the catalog
// - There is a concept of a default typehint, where there is no similar
//   thing for types. This is sensible, because hints are optional nice
//   to have things. Not so for types.
// Whilst we could abstract out the changes, I'm not sure this simplifies
// already complex code

/**
 * @see Types:types.resolveSimpleType
 */
var resolveSimpleType = function(name) {
    var promise = new Promise();
    ext = catalog.getExtensionByKey("typehint", name);
    // It's not an error if the type isn't found. See above
    promise.resolve(ext);
    return promise;
};

/**
 * A deferred type is one where we hope to find out what the type is just
 * in time to use it. For example the 'set' command where the type of the 2nd
 * param is defined by the 1st param.
 */
var resolveDeferred = function(typeSpec) {
    // Deferred types are specified by the return from the pointer
    // function.
    var promise = new Promise();
    if (!typeSpec.pointer) {
        promise.reject(new Error("Missing deferred pointer"));
        return promise;
    }

    catalog.loadObjectForPropertyPath(typeSpec.pointer).then(function(obj) {
        obj(typeSpec).then(function(ext) {
            promise.resolve(ext);
        }, function(ex) {
            promise.reject(ex);
        });
    }, function(ex) {
        promise.reject(ex);
    });

    return promise;
};

/**
 * typeSpec one of:
 * "typename",
 * "typename:json" e.g. 'selection:["one", "two", "three"]'
 * { name:"typename", data:... } e.g. { name:"selection", data:["one", "two", "three"] }
 */
exports.getTypeHintExt = function(typeSpec) {
    if (typeof typeSpec === "string") {
        return resolveSimpleType(typeSpec);
    }

    if (typeof typeSpec === "object") {
        if (typeSpec.name === "deferred") {
             return resolveDeferred(typeSpec);
        } else {
            return resolveSimpleType(typeSpec.name);
        }
    }

    throw new Error("Unknown typeSpec type: " + typeof typeSpec);
};
