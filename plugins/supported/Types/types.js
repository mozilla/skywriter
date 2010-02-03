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
var Promise = require("Promise:core/promise").Promise;

/**
 * Convert some data from a string to another type as specified by
 * <tt>typeSpec</tt>.
 * TODO: convert to promise
 */
exports.fromString = function(typeSpec, stringVersion, onConvert) {
    var typeExt = getTypeExt(typeSpec);
    typeExt.load(function(type) {
        var originalVersion = type.fromString(stringVersion, typeExt);
        onConvert(originalVersion);
    });
};

/**
 * Convert some data from an original type to a string as specified by
 * <tt>typeSpec</tt>.
 * TODO: convert to promise
 */
exports.toString = function(typeSpec, originalVersion, onConvert) {
    var typeExt = getTypeExt(typeSpec);
    typeExt.load(function(type) {
        var stringVersion = type.toString(originalVersion, typeExt);
        onConvert(stringVersion);
    });
};

/**
 * Convert some data from an original type to a string as specified by
 * <tt>typeSpec</tt>.
 * TODO: convert to promise
 */
exports.isValid = function(typeSpec, originalVersion, onValidated) {
    var typeExt = getTypeExt(typeSpec);
    typeExt.load(function(type) {
        var valid = type.isValid(originalVersion, typeExt);
        onValidated(valid);
    });
};

/**
 * Asynchronously find a UI component to match a typeSpec
 */
exports.getHint = function(typeSpec, description) {
    var promise = new Promise();
    var typeExt = getTypeExt(typeSpec);
    typeExt.load(function(type) {
        if (typeof type.getHint === "function") {
            var hint = type.getHint(description, typeExt);
            promise.resolve(hint);
        } else {
            // If the type doesn't define a hint UI component then we just
            // use the default - a simple text node containing the description.
            var node = document.createTextNode(description);
            promise.resolve(node);
        }
    });
    return promise;
};

/**
 * typeSpec one of:
 * "typename",
 * "typename:json" e.g. 'selection:["one", "two", "three"]'
 * { name:"typename", data:... } e.g. { name:"selection", data:["one", "two", "three"] }
 */
var getTypeExt = function(typeSpec) {
    var typeExt;
    if (typeof typeSpec === "string") {
        var parts = typeSpec.split(":");
        if (parts.length === 1) {
            typeExt = catalog.getExtensionByKey("type", typeSpec);
        } else {
            typeExt = catalog.getExtensionByKey("type", parts.shift());
            typeExt.data = JSON.parse(parts.join(":"));
        }
    } else if (typeof typeSpec === "object") {
        typeExt = catalog.getExtensionByKey("type", typeSpec.name);
        typeExt.data = typeSpec.data;
    }
    return typeExt;
};
