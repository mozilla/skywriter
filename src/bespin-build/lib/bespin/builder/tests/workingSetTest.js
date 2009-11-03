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

var file = require("file");
var qunit = require("qunit");

var builder = require("bespin/builder");
var workingset = require("bespin/builder/workingset");
var throwsBuilderError = require("bespin/builder/tests/common").throwsBuilderError;

qunit.test("Get file contents", function() {
    var loader = builder._getLoader();
    
    var set = new workingset.WorkingSet(loader, []);
    
    throwsBuilderError(set._getFileContents.bind(set), [{file: "BADFILENAME"}],
        "file contents can only be retrieved for good files");
    file.write("GOODFILENAME", "Just some test data.\n");
    var contents = set._getFileContents({file: "GOODFILENAME"});
    qunit.equals(contents, "Just some test data.\n", "File contents not retrieved properly");
    file.remove("GOODFILENAME");
    
    throwsBuilderError(set._getFileContents.bind(set), ["non/existent/module"]);
    contents = set._getFileContents("bespin/builder/tests/commandTest");
    var fileStart = 'require.register({"bespin/builder/tests/commandTest":{"factory":function(require,exports,module,system,print){';
    qunit.equals(contents.indexOf(fileStart), 0, 
        "File header is missing or incorrect: "
        + contents.substring(0, fileStart.length));
    qunit.ok(contents.indexOf("MAGICAL STRING") > -1, 
        "Could not find MAGICAL STRING in the output");
});


qunit.test("Expand includes", function() {
    var loader = builder._getLoader();
    var createSet = function(loader, includes) {
        return new workingset.WorkingSet(loader, includes);
    };
    
    throwsBuilderError(createSet, [loader, [{moduleDir: "bogus/module"}]],
        "bad module name should result in an error");
        
    var set = new workingset.WorkingSet(loader, [{moduleDir: "bespin/boot"}, "bespin/debug"]);
    
    var includes = set.includes;
    qunit.ok(includes.length > 1, "expected many includes");
    var hubFound = false;
    var testsFound = false;
    var debugFound = false;
    
    for (var i = 0; i < includes.length; i++) {
        var filespec = includes[i];
        if (filespec == "bespin/util/hub") {
            hubFound = true;
        } else if (filespec == "bespin/tests/allTests") {
            testsFound = true;
        } else if (filespec == "bespin/debug") {
            debugFound = true;
        }
    }
    qunit.ok(hubFound, "Should have found bespin/util/hub module in the include list");
    qunit.ok(debugFound, "Should have found the debug module, which was included separately");
    qunit.ok(!testsFound, "Tests should not have been included");
});