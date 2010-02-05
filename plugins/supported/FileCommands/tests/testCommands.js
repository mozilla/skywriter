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

var t = require("PluginDev");

var fs = require("Filesystem");
var DummyFileSource = require("Filesystem:tests/fixture").DummyFileSource;
var Environment = require("Canon:tests/fixture").MockEnvironment;
var Request = require("Canon:tests/fixture").MockRequest;
var FileCommands = require("FileCommands");
var EditSession = require("EditSession");
var Promise = require("bespin:promise").Promise;

var source = exports.source = DummyFileSource.create({
    files: [
        {name: "atTheTop.js", contents: "the top file"},
        {name: "anotherAtTheTop.js", contents: "another file"},
        {name: "foo/"},
        {name: "foo/1.txt", contents: "firsttext"},
        {name: "foo/2.txt", contents: "secondtext"},
        {name: "deeply/nested/directory/andAFile.txt", contents: "text file"}
    ]
});

var getNewRoot = function() {
    return fs.Directory.create({
        source: source
    });
};

exports.testFilesCommand = function() {
    var root = getNewRoot();
    var env = Environment.create({
        files: root
    });
    request = Request.create();
    var testpr = new Promise();
    request.promise.then(function() {
        output = request.outputs.join("");
        t.ok(output.indexOf("foo/<br/>") > -1, "foo/ should be in output");
        t.ok(output.indexOf("atTheTop.js<br/>") > -1, 
            "atTheTop.js should be in output");
        testpr.resolve();
    });
    
    FileCommands.filesCommand(env, {path: "/"}, request);
    
    return testpr;
};

exports.testFilesCommandDefaultsToRoot = function() {
    var root = getNewRoot();
    var buffer = EditSession.Buffer.create();
    var session = EditSession.EditSession.create({
        currentBuffer: buffer
    });
    var env = Environment.create({
        files: root,
        session: session
    });
    
    var testpr = new Promise();
    
    request = Request.create();
    request.promise.then(function() {
        output = request.outputs.join("");
        t.ok(output.indexOf("foo/<br/>") > -1, "foo/ should be in output");
        t.ok(output.indexOf("atTheTop.js<br/>") > -1, 
            "atTheTop.js should be in output");
        testpr.resolve();
    });
    
    FileCommands.filesCommand(env, {path: null}, request);
    return testpr;
};

exports.testFilesAreRelativeToCurrentOpenFile = function() {
    var root = getNewRoot();
    var buffer = EditSession.Buffer.create();
    buffer.changeFileOnly(root.getObject("foo/1.txt"));
    
    var session = EditSession.EditSession.create({
        currentBuffer: buffer
    });
    var env = Environment.create({
        files: root,
        session: session
    });
    
    var testpr = new Promise();
    
    request = Request.create();
    request.promise.then(function() {
        output = request.outputs.join("");
        t.ok(output.indexOf("1.txt<br/>") > -1, "1.txt should be in the output");
        t.ok(output.indexOf("2.txt<br/>") > -1, 
            "2.txt should be in output");
        testpr.resolve();
    });
    
    FileCommands.filesCommand(env, {path: null}, request);
    return testpr;
};
