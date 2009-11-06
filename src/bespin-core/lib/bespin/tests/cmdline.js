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

var QUnit = require("qunit").QUnit;


exports.main = function(args) {
    print("Bespin Unit Tests\n");
    var console = {
        log: function() {},
        debug: function() {}
    };

    global.console = console;

    var errors = [];

    var currentTest = "";

    QUnit.done = function(failures, total) {
        print("\n");
        for (var i = 0; i < errors.length; i++) {
            var item = errors[i];
            print(item.name + ": " + item.message);
        }

        print(total + " tests, " + failures + " failed.");
        errors = [];
    };

    QUnit.testStart = function(name) {
        currentTest = name;
    };

    QUnit.log = function(result, message) {
        if (result) {
            system.stdout.write(".");
        } else {
            system.stdout.write("F");
            errors.push({name: currentTest, message:message});
        }
        system.stdout.flush();
    };

    require("bespin/tests/allTests");
};
