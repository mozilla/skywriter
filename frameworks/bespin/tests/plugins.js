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

"import core_test";
var SC = require('sproutcore/runtime:package').SC;
var plugins = require("plugins");

module("plugins");

test("extension points are created as needed", function() {
    var catalog = plugins.Catalog.create();
    var ep = catalog.getExtensionPoint("foobar!");
    equals("foobar!", ep.get("name"), "Expected name to be set properly");
    equals(ep, catalog.get("points")['foobar!'], 
        "Expected ep to be saved in catalog");
});

test("can retrieve list of extensions directly", function() {
    var catalog = plugins.Catalog.create();
    // we know for sure that there are "extensionpoint" extensions
    // defined, because they are defined in builtins.
    var extensions = catalog.getExtensions("extensionpoint");
    ok(extensions.length > 0, "Expected extension points to be there");
});

test("can retrieve an extension by key", function() {
    var catalog = plugins.Catalog.create();
    var ext = catalog.getExtensionByKey("extensionpoint", "startup");
    equals("startup", ext.get("name"), 
        "Name should be startup, since that's what we looked up");
    equals("plugins#startupHandler", ext.get("activate"),
        "activation handler pointer should be set");
});

plan.run();
