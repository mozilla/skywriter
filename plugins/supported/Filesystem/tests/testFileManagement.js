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
var fixture = require("Filesystem:tests/fixture");
var Promise = require("bespin:promise").Promise;

var source = exports.source = fixture.DummyFileSource.create({
    files: [
        {name: "atTheTop.js", contents: "the top file"},
        {name: "anotherAtTheTop.js", contents: "another file"},
        {name: "foo/"},
        {name: "deeply/nested/directory/andAFile.txt", contents: "text file"}
    ]
});

var getNewRoot = function() {
    return fs.Directory.create({
        source: "Filesystem:tests/testFileManagement#source"
    });
};

var genericFailureHandler = function(error) {
    console.log(error);
    t.ok(false, "Async failed: " + error.message);
    t.start();
};

exports.testRootLoading = function() {
    source.reset();
    var root = getNewRoot();
    t.equal(null, root.get("parent"), "Parent should not be set on root");
    t.equal("/", root.get("name"), "Root's name is /");
    t.equal("/", root.get("path"), "Root's path is /");
    t.deepEqual([], root.get("files"), "No files now");
    t.deepEqual([], root.get("directories", "No directories yet"));
    t.equal(fs.NEW, root.get("status"), "status should be new now");
    t.equal(0, source.requests.length);
    
    source.set("checkStatus", fs.LOADING);
    var testpr = new Promise();
    
    root.load().then(function(dir) {
        t.equal(dir, root, "should have been passed in the root directory");
        t.equal(source.requests.length, 1, "should have made a request to the source");
        t.equal(dir.get("status"), fs.READY, "Directory should be ready");
        t.equal(dir.get("files").length, 2, "Should have two files");
        t.equal(dir.get("files")[0].name, "atTheTop.js", 
            "expected specific name");
        t.equal(dir.get("directories").length, 2, 
            "should have two directories");
        t.equal(dir.get("directories")[0].name, "foo/", 
            "first should be foo/");
        t.equal(dir.get("directories")[1].name, "deeply/", 
            "second should be deeply");
        t.equal(dir.get("contents").length, 4,
            "2 files + 2 directories = 4 items");
        
        root.load().then(function(dir) {
            t.equal(source.requests.length, 1, 
                "should not have loaded again, because it's already loaded");
            testpr.resolve();
        });
    }, genericFailureHandler);
    
    return testpr;
};

exports.testGetObject = function() {
    source.reset();
    var root = getNewRoot();
    var myDir = root.getObject("foo/bar/");
    t.equal(myDir.name, "bar/", "final object should be created correctly");
    t.equal(root.get("directories")[0].name, "foo/",
        "new directory should be created under root");
    t.equal(myDir.parent, root.get("directories")[0], 
        "same directory object in both places");
    var myFile = root.getObject("foo/bar/file.js");
    t.equal(myFile.get("directory"), myDir, 
        "file should be populated with the same directory object");
    t.equal(myFile.get("name"), "file.js");
    t.equal(myFile.get("dirname"), "/foo/bar/");
    t.equal(myFile.get("ext"), "js");
    
    var fooDir = root.getObject("foo/");
    t.equal(myDir.get("parent"), fooDir, 
        "should be able to retrieve the same directory");
    
    myDir = root.getObject("newtop/");
    t.equal(root.get("directories").length, 2,
        "should have two directories now");
    myFile = root.getObject("newone.txt");
    t.equal(root.get("files").length, 1, 
        "should have one file now");
};

exports.testSubdirLoading = function() {
    source.reset();
    var root = getNewRoot();
    var testpr = new Promise();
    root.loadPath("deeply/nested/").then(function(dir) {
        t.equal(dir.get("name"), "nested/");
        t.equal(dir.get("status"), fs.READY);
        t.equal(root.get("status"), fs.NEW);
        
        var obj = root.getObject("deeply/nested/notthere/");
        t.equal(obj, null, 
            "directory is loaded, so non-existent name should not be created");
        
        t.equal(dir.get("path"), "/deeply/nested/",
            "can get back our path");
        
        testpr.resolve();
    }, genericFailureHandler);
    
    return testpr;
};

exports.testDeepLoading = function() {
    source.reset();
    var root = getNewRoot();
    var testPromise = new Promise();
    root.load(true).then(function(dir) {
        t.equal(dir.get("status"), fs.READY, "directory should be ready");
        t.equal(dir.get("files").length, 2, "should have two files");
        t.equal(dir.get("directories").length, 2,
            "should have two directories");

        var subdir = dir.get("directories")[1];
        t.equal(subdir.name, "deeply/", "second should be deeply");
        t.equal(subdir.get("status"), fs.READY,
            "subdirectory should be ready");
        t.equal(subdir.get("directories").length, 1,
            "subdirectory should have one subdirectory pre-populated");

        var subsubdir = subdir.get("directories")[0];
        t.equal(subsubdir.name, "nested/",
            "subsubdirectory should be nested");
        t.equal(subsubdir.get("status"), fs.READY,
            "subsubdirectory should be ready");
        t.equal(subsubdir.get("directories").length, 1,
            "subsubdirectory should have one subdirectory");

        testPromise.resolve();
    });

    return testPromise;
};

exports.testContentRetrieval = function() {
    source.reset();
    var root = getNewRoot();
    
    var f = root.getObject("atTheTop.js");
    var testpr = new Promise();
    f.loadContents().then(function(result) {
        t.equal(result.file, f, "should get the same file in");
        t.equal(result.contents, "the top file", "Content should be as expected");
        testpr.resolve();
    });
    
    return testpr;
};

exports.testSendToMatcher = function() {
    var strings = [];
    var mockMatcher = SC.Object.create({
        addStrings: function(newStrings) {
            strings.push.apply(strings, newStrings);
        }
    });

    var testPromise = new Promise();

    source.reset();
    getNewRoot().load(true).then(function(dir) {
        dir.sendToMatcher(mockMatcher).then(function() {
            var expected = [
                "/atTheTop.js",
                "/anotherAtTheTop.js",
                "/foo/",
                "/deeply/",
                "/deeply/nested/",
                "/deeply/nested/directory/",
                "/deeply/nested/directory/andAFile.txt"
            ];

            t.deepEqual(strings, expected, "the strings sent to the " +
                "matcher and the deep hierarchy of files");

            testPromise.resolve();
        });
    });

    return testPromise;
};

