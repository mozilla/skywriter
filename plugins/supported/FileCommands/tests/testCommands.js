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
        {name: "foo/bar/3.txt", contents: "thirdtext"},
        {name: "deeply/nested/directory/andAFile.txt", contents: "text file"}
    ]
});

var getNewRoot = function() {
    return fs.Filesystem.create({
        source: source
    });
};

var getEnv = function() {
    var root = getNewRoot();
    var buffer = EditSession.Buffer.create();
    
    var session = EditSession.EditSession.create({
        currentBuffer: buffer
    });
    var env = Environment.create({
        files: root,
        session: session
    });
    return env;
};

exports.testFilesCommand = function() {
    var env = getEnv();
    var request = Request.create();
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

exports.testOpenFileWithNoOpenFile = function() {
    var env = getEnv();
    var request = Request.create();
    var testpr = new Promise();
    request.promise.then(function() {
        var f = env.get("file");
        t.ok(!request.error, "Should not be in error state");
        t.equal(f.path, "/foo/bar/3.txt", "File should have been set");
        testpr.resolve();
    });
    
    FileCommands.openCommand(env, {path: "/foo/bar/3.txt"}, request);
};

exports.testFilesCommandDefaultsToRoot = function() {
    var env = getEnv();
    
    var testpr = new Promise();
    
    var request = Request.create();
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
    var env = getEnv();
    var buffer = env.get("buffer");
    buffer.changeFileOnly("foo/1.txt");
    
    var testpr = new Promise();
    
    var request = Request.create();
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

exports.testFilesListingInDirectoryRelativeToOpenFile = function() {
    var env = getEnv();
    var buffer = env.get("buffer");
    buffer.changeFileOnly("foo/1.txt");
    var testpr = new Promise();
    
    var request = Request.create();
    request.promise.then(function() {
        output = request.outputs.join("");
        t.ok(output.indexOf("3.txt<br/>") > -1, "3.txt should be in the output");
        testpr.resolve();
    });
    
    FileCommands.filesCommand(env, {path: "bar/"}, request);
    return testpr;
};

exports.testMakeDirectoryForNewDirectory = function() {
    var env = getEnv();
    var request = Request.create();
    var testpr = new Promise();
    var files = env.get("files");
    
    request.promise.then(function() {
        files.listDirectory("/foo/").then(function(contents) {
            t.equal(contents.length, 4, "should have four items in directory");
            t.equal(contents[3], "one/", "new directory should be last item");
            testpr.resolve();
        });
    }, function(error) {
        testpr.reject(error.message);
    });

    FileCommands.mkdirCommand(env, {path: "/foo/one/"}, request);
    
    return testpr;
};
