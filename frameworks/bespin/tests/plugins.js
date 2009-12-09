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

"import package core_test";
var SC = require('sproutcore/runtime').SC;
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

test("can set a handler for an extension point", function() {
    var catalog = plugins.Catalog.create();
    catalog.load({
        TestPlugin: {
            provides: [
                {
                    ep: "extensionhandler",
                    name: "startup",
                    activate: "foo#bar"
                }
            ]
        }
    });
    var ep = catalog.getExtensionPoint("startup");
    equals(ep.handlers.length, 2);
});

test("activation/deactivation handlers are called", function() {
    exports.loadedCount = 0;
    exports.deactivatedCount = 0;
    
    var catalog = plugins.Catalog.create();
    catalog.load({
        bespin: {
            provides: [
                {
                    ep: "icecream",
                    name: "chunky monkey"
                },
                {
                    ep: "extensionpoint",
                    name: "icecream"
                },
                {
                    ep: "extensionhandler",
                    name: "icecream",
                    activate: "tests/plugins#myfunc",
                    deactivate: "tests/plugins#defunc"
                },
                {
                    ep: "icecream",
                    name: "Americone Dream"
                }
            ]
        }
    });
    equals(exports.loadedCount, 2, "Expected both plugins to be activated");
    catalog._deactivate(catalog.plugins["bespin"]);
    equals(exports.deactivatedCount, 2, "Expected both to be deactivated");
});

test("can retrieve factory objects from the catalog", function() {
    var catalog = plugins.Catalog.create();
    catalog.load({
        bespin: {
            provides: [
                {
                    ep: "factory",
                    name: "testing",
                    pointer: "tests/plugins#factoryObj",
                    action: "value"
                },
                {
                    ep: "factory",
                    name: "itsAClass",
                    pointer: "tests/plugins#factoryClass",
                    action: "create"
                },
                {
                    ep: "factory",
                    name: "traditionalClass",
                    pointer: "tests/plugins#traditionalClass",
                    action: "new"
                },
                {
                    ep: "factory",
                    name: "simpleFunction",
                    pointer: "tests/plugins#simpleFunction",
                    action: "call"
                }
            ]
        }
    });
    
    var obj = catalog.getObject("testing");
    equals(obj, exports.factoryObj);
    
    obj = catalog.getObject("itsAClass");
    equals(obj.name, "The Factory Class");
    
    var obj2 = catalog.getObject("itsAClass");
    ok(obj === obj2, "should get the same object back -- these are singletons");
    
    obj = catalog.getObject("traditionalClass");
    equals(obj.name, "traditional");
    
    obj = catalog.getObject("simpleFunction");
    equals(obj.name, "just arbitrary");
});

test("can find dependents of a plugin", function() {
    var catalog = plugins.Catalog.create();
    catalog.plugins = {
        icecream: {
            depends: ['freezer', 'milk']
        },
        milk: {
            depends: ['cow']
        },
        cow: {},
        freezer: {
            depends: ['ge', 'electricity']
        },
        ge: {},
        electricity: {
            depends: ['sun']
        },
        sun: {},
        other: {}
    };
    var dependents = {};
    var pluginList = ['icecream', 'milk', 'freezer', 'ge', 
        'electricity', 'cow', 'sun', 'other'];
    catalog._findDependents('icecream', pluginList, dependents);
    deepEqual(dependents, {}, "for icecream");
    
    dependents = {};
    catalog._findDependents('sun', pluginList, dependents);
    deepEqual(dependents, {
        electricity: true, freezer: true, icecream: true
    }, "for sun");
    
    dependents = {};
    catalog._findDependents('other', pluginList, dependents);
    deepEqual(dependents, {}, "for other");
});

exports.loadedCount = 0;
exports.deactivatedCount = 0;

exports.myfunc = function(ext) {
    console.log("Called from: ");
    console.log(ext);
    console.log(arguments.callee.caller);
    exports.loadedCount++;
};

exports.defunc = function(ext) {
    exports.deactivatedCount++;
};

exports.factoryObj = {
    name: "The Factory Object"
};

exports.factoryClass = SC.Object.extend({
    name: "The Factory Class"
});

exports.traditionalClass = function() {
    this.name = "traditional";
};

exports.simpleFunction = function() {
    return {
        name: "just arbitrary"
    };
};

plan.run();
