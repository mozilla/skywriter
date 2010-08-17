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
var types = require('types:types');

var Hint = require('command_line:hint').Hint;
var Level = require('command_line:hint').Level;

/**
 * If there isn't a typehint to define a hint UI component then we just use the
 * default - a simple text node containing the description.
 */
function createDefaultHint(description) {
    var parent = document.createElement('article');
    parent.innerHTML = description;

    return new Hint(Level.Info, parent);
};

/**
 * resolve the passed promise by calling
 */
function getHintOrDefault(promise, input, assignment, ext, typeHint) {
    var hint;

    try {
        if (ext && typeof typeHint.getHint === 'function') {
            hint = typeHint.getHint(input, assignment, ext);
        }
    }
    catch (ex) {
        console.error('Failed to get hint for ', ext, ' reason: ', ex);
    }

    if (!hint) {
        hint = createDefaultHint(assignment.param.description);
    }

    promise.resolve(hint);
    return promise;
};

// Warning: These next 2 functions are virtually cut and paste from
// types:type.js
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
function resolveObjectTypeHint(typeSpec) {
    var promise = new Promise();
    var ext = catalog.getExtensionByKey('typehint', typeSpec.name);
    promise.resolve({ ext: ext, typeSpec: typeSpec });
    return promise;
};

/**
 * Look-up a typeSpec and find a corresponding typehint extension. This function
 * does not attempt to load the typehint or go through the resolution process,
 * for that you probably want #resolveType()
 * @param typeSpec A string containing the type name or an object with a name
 * and other type parameters e.g. { name: 'selection', data: [ 'one', 'two' ] }
 * @return a promise that resolves to an object containing the resolved typehint
 * extension and the typeSpec used to resolve the type (which could be different
 * from the passed typeSpec if this was deferred). The object will be in the
 * form { ext:... typeSpec:... }
 */
function resolveTypeHintExt(typeSpec) {
    if (typeof typeSpec === 'string') {
        return resolveObjectTypeHint({ name: typeSpec });
    }

    if (typeof typeSpec === 'object') {
        if (typeSpec.name === 'deferred') {
            var promise = new Promise();
            types.undeferTypeSpec(typeSpec).then(function(newTypeSpec) {
                resolveTypeHintExt(newTypeSpec).then(function(reply) {
                    promise.resolve(reply);
                }, function(ex) {
                    promise.reject(ex);
                });
            });
            return promise;
        } else {
            return resolveObjectTypeHint(typeSpec);
        }
    }

    throw new Error('Unknown typeSpec type: ' + typeof typeSpec);
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

    resolveTypeHintExt(typeSpec).then(function(data) {
        if (!data.ext) {
            return getHintOrDefault(promise, input, assignment);
        }

        data.ext.load().then(function(typeHint) {
            // We might need to resolve the typeSpec in a custom way
            if (typeof typeHint.resolveTypeSpec === 'function') {
                typeHint.resolveTypeSpec(data.ext, data.typeSpec).then(function() {
                    getHintOrDefault(promise, input, assignment, data.ext, typeHint);
                }, function(ex) {
                    promise.reject(ex);
                });
            } else {
                // Nothing to resolve - just go
                getHintOrDefault(promise, input, assignment, data.ext, typeHint);
            }
        }, function(ex) {
            hint = createDefaultHint(assignment.param.description);
            promise.resolve(hint);
        });
    });

    return promise;
};
