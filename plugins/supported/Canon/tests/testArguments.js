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

var arg = require("arguments");
var t = require("PluginDev");

var testType = function(type, method, context, value) {
    var typeObj = arg[type];
    return typeObj[method].call(context, value);
};

exports.testStringType = function() {
    t.equal(testType("string", "convert", {}, "Foo"), "Foo", 
        "string conversion does nothing");
};

exports.testIntegerType = function() {
    t.equal(testType("integer", "convert", {}, "10"), 10);
};
