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

var t = require("PluginDev");
var DummyFileSource = require("Filesystem:tests/fixture").DummyFileSource;
var fs = require("Filesystem");
var TextStorage = require("Editor:models/textstorage").TextStorage;
var editsession = require("EditSession");

var source = DummyFileSource.create({
    files: [
        {name: "atTheTop.js", contents: "the top file"},
        {name: "anotherAtTheTop.js", contents: "another file"},
        {name: "foo/"},
        {name: "deeply/nested/directory/andAFile.txt", contents: "text file"}
    ]
});

exports.testBufferFileChange = function() {
    var root = fs.Directory.create({
        source: source
    });
    var buffer = editsession.Buffer.create();
    t.ok(buffer.get("model") != null, 
        "Model should be set to a TextStorage by default");
    f = root.getObject("atTheTop.js");
    t.ok(SC.instanceOf(f, fs.File), "Should have gotten a file object");
    buffer.changeFileOnly(f);
    t.equal("", buffer.get("model").get("value"), "Should be empty now");
    buffer.changeFileOnly(null);
    buffer.set("file", f);
    setTimeout(function() {
        var newtext = buffer.get("model").get("value");
        t.equal(newtext, "the top file", "Expected file contents to be loaded");
        t.start();
    }, 1);
    t.stop();
};

exports.testBufferFileChangeWithCallback = function() {
    var root = fs.Directory.create({
        source: source
    });
    var buffer = editsession.Buffer.create();
    f = root.getObject("atTheTop.js");
    var pr = buffer.changeFile(f);
    pr.then(function(b) {
        t.equal(b, buffer, "should have gotten the buffer object in");
        t.equal(b.get("model").get("value"), "the top file", "contents should be loaded");
        t.start();
    });
    t.stop();
};
