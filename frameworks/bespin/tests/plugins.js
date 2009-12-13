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

var SC = require('sproutcore/runtime').SC;
var plugins = require("plugins");
var t = require("core_test");

t.module("plugins");

t.test("extension points are created as needed", function() {
    var catalog = plugins.Catalog.create();
    var ep = catalog.getExtensionPoint("foobar!");
    t.equals("foobar!", ep.get("name"), "Expected name to be set properly");
    t.equals(ep, catalog.get("points")['foobar!'], 
        "Expected ep to be saved in catalog");
});

t.test("can retrieve list of extensions directly", function() {
    var catalog = plugins.Catalog.create();
    // we know for sure that there are "extensionpoint" extensions
    // defined, because they are defined in builtins.
    var extensions = catalog.getExtensions("extensionpoint");
    t.ok(extensions.length > 0, "Expected extension points to be there");
});

t.test("can retrieve an extension by key", function() {
    var catalog = plugins.Catalog.create();
    var ext = catalog.getExtensionByKey("extensionpoint", "startup");
    t.equals("startup", ext.get("name"), 
        "Name should be startup, since that's what we looked up");
    t.equals("plugins#startupHandler", ext.get("register"),
        "activation handler pointer should be set");
});

t.test("can set a handler for an extension point", function() {
    var catalog = plugins.Catalog.create();
    catalog.load({
        TestPlugin: {
            provides: [
                {
                    ep: "extensionhandler",
                    name: "startup",
                    register: "foo#bar"
                }
            ]
        }
    });
    var ep = catalog.getExtensionPoint("startup");
    t.equals(ep.handlers.length, 2);
});

t.test("activation/deactivation handlers are called", function() {
    exports.loadedCount = 0;
    exports.unregisterdCount = 0;
    
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
                    register: "tests/plugins#myfunc",
                    unregister: "tests/plugins#defunc"
                },
                {
                    ep: "icecream",
                    name: "Americone Dream"
                }
            ]
        }
    });
    t.equals(exports.loadedCount, 2, "Expected both plugins to be registerd");
    catalog._unregister(catalog.plugins["bespin"]);
    t.equals(exports.unregisterdCount, 2, "Expected both to be unregisterd");
});

t.test("can retrieve factory objects from the catalog", function() {
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
    t.equals(obj, exports.factoryObj);
    
    obj = catalog.getObject("itsAClass");
    t.equals(obj.name, "The Factory Class");
    
    var obj2 = catalog.getObject("itsAClass");
    t.ok(obj === obj2, "should get the same object back -- these are singletons");
    
    obj = catalog.getObject("traditionalClass");
    t.equals(obj.name, "traditional");
    
    obj = catalog.getObject("simpleFunction");
    t.equals(obj.name, "just arbitrary");
});

t.test("can find dependents of a plugin", function() {
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
    t.deepEqual(dependents, {}, "for icecream");
    
    dependents = {};
    catalog._findDependents('sun', pluginList, dependents);
    t.deepEqual(dependents, {
        electricity: true, freezer: true, icecream: true
    }, "for sun");
    
    dependents = {};
    catalog._findDependents('other', pluginList, dependents);
    t.deepEqual(dependents, {}, "for other");
});

exports.loadedCount = 0;
exports.unregisterdCount = 0;

exports.myfunc = function(ext) {
    console.log("Called from: ");
    console.log(ext);
    console.log(arguments.callee.caller);
    exports.loadedCount++;
};

exports.defunc = function(ext) {
    exports.unregisterdCount++;
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

exports.testNumber = 1;

MyObserver = SC.Object.extend({
    catalog: null,
    callback: null,
    currentval: 0,
    
    makeConnection: function() {
        var self = this;
        var ext = this.get("catalog").getExtensions("testpoint");
        ext[0].observe("bespin", function(obj) {
            console.log("setting testpoint value to ", obj);
            self.set("currentval", obj);
            self.get("callback")();
        });
    }
});

// this test needs to use the async mechanism when it arrives.
t.test("plugins can observe an extension", function() {
    var catalog = plugins.Catalog.create();
    catalog.load({
        bespin: {
            provides: [
                {
                    ep: "extensionpoint",
                    name: "testpoint"
                },
                {
                    ep: "testpoint",
                    pointer: "tests/plugins#testNumber"
                }
            ]
        }
    });
    
    var ob = MyObserver.create({
        catalog: catalog,
        callback: function() {
            console.log("checking result 1");
            t.equal(ob.get("currentval"), 1);
            var observers = catalog.plugins.bespin._getObservers();
            console.log(observers);
            t.equal(observers.testpoint[0].plugin, "bespin");
            t.ok(observers.testpoint[0].callback, "Expected function to be set");
            t.start();
        }
    });
    
    ob.makeConnection();
    t.stop(1000);
});

t.plan.run();
