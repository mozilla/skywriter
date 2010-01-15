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

"define metadata";
({
    "depends": ["BespinServer"]
});
"end";

var core_test = require("core_test");
var test = require("core_test:system/test");
var server = require("BespinServer").server;
var pluginCatalog = require("bespin:plugins").catalog;

// Transfer names from core_test so that this is the
// test interface used by plugins.

var testNames = ["test", "ok", "equal", "notEqual", "deepEqual",
    "strictEqual", "throws", "start", "stop"];

testNames.forEach(function(name) {
    exports[name] = core_test[name];
});

/*
* Reloads the named plugin, calling the callback when it's complete.
*/
exports.reload = function(pluginName, callback) {
    pluginCatalog.plugins[pluginName].reload(callback);
};

/*
* runs the test in the fully qualified named testmodule.
* For example, to run the test in tests/myTestModule in the Foo plugin,
* you would run runTest("Foo:tests/myTestModule")
*
* The test module's plugin is reloaded before running.
*/
exports.runTest = function(testmodule) {
    var pluginName = testmodule.split(":", 1)[0];
    if (!pluginName) {
        pluginName = testmodule;
    }
    exports.reload(pluginName, function() {
        core_test.module(testmodule);
        var mod = require(testmodule);
        // run the tests, logging to the console
        test.run(mod, console);
    });
};

exports.tempTest = function(testmodule) {
    var pluginName = testmodule.split(":", 1)[0];
    if (!pluginName) {
        pluginName = testmodule;
    }
    pluginCatalog.loadPlugin(pluginName, function() {
        core_test.module(testmodule);
        var mod = require(testmodule);
        // run the tests, logging to the console
        test.run(mod, console);
    });
};
