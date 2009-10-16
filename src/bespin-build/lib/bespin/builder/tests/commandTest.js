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

// Tests for the command line interface parts

var file = require("file");
var qunit = require("qunit");

var builder = require("bespin/builder");

var FAKEPROFILE = new file.Path(module.path).dirname().join("fakeprofile.json");

qunit.test("Profile loading", function() {
    qunit.ok(FAKEPROFILE.exists(), "Expected the testing profile file to exist (fakeprofile.json)");
    qunit.ok(FAKEPROFILE.isFile(), "Expected to find a file at " + FAKEPROFILE);
    try {
        builder.loadProfile("BADFILENAME!!!");
        qunit.ok(false, "Expected an exception for a bad filename");
    } catch (e) {
    }
    var profile = builder.loadProfile(FAKEPROFILE);
    qunit.equals(1, profile.length);
    qunit.equals("foo", profile[0].output);
});