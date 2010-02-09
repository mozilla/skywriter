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

var r = require;

/**
 * Asynchronously find a UI component to match a typeSpec
 */
exports.getHint = function(typeData) {
    var promise = new Promise();
    var hintEle;

    exports.getTypeExt(typeData.type).then(function(typeExt) {
        if (!typeExt) {
            hintEle = createDefaultHint(typeData.description);
            promise.resolve(hintEle);
            return promise;
        }

        typeExt.load(function(type) {
            if (typeof type.getHint === "function") {
                hintEle = type.getHint(typeData.description, typeExt);
            } else {
                hintEle = createDefaultHint(typeData.description);
            }
            promise.resolve(hintEle);
        });
    });

    return promise;
};

/**
 * If there isn't a typehint to define a hint UI component then we just use the
 * default - a simple text node containing the description.
 */
var createDefaultHint = function(description) {
    return document.createTextNode(description);
};

/**
 * typeSpec one of:
 * "typename",
 * "typename:json" e.g. 'selection:["one", "two", "three"]'
 * { name:"typename", data:... } e.g. { name:"selection", data:["one", "two", "three"] }
 */
exports.getTypeExt = function(typeSpec) {
    var promise = new Promise();

    var typeExt;
    if (typeof typeSpec === "string") {
        var parts = typeSpec.split(":");
        if (parts.length === 1) {
            typeExt = catalog.getExtensionByKey("typehint", typeSpec);
            promise.resolve(typeExt);
        } else {
            typeExt = catalog.getExtensionByKey("typehint", parts.shift());
            var data = parts.join(":");
            if (data.substring(0, 1) == "[" || data.substring(0, 1) == "{") {
                typeExt.data = JSON.parse(data);
                promise.resolve(typeExt);
            } else {
                var parts = data.split("#");
                var modName = parts.shift();
                var objName = parts.join("#");

                r.loader.async(modName).then(function() {
                    var module = r(modName);
                    typeExt.data = module[objName]();
                    promise.resolve(typeExt);
                });
            }
        }
    } else if (typeof typeSpec === "object") {
        typeExt = catalog.getExtensionByKey("typehint", typeSpec.name);
        typeExt.data = typeSpec.data;
        promise.resolve(typeExt);
    }

    return promise;
};
