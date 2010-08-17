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

var t = require('plugindev');
var fs = require('filesystem');
var DummyFileSource = require('filesystem:tests/fixture').DummyFileSource;
var console = require('bespin:console').console;
var Promise = require('bespin:promise').Promise;

var source = new DummyFileSource([
    { name: 'atTheTop.js', contents: 'the top file' },
    { name: 'anotherAtTheTop.js', contents: 'another file' },
    { name: 'foo/' },
    { name: 'deeply/nested/directory/andAFile.txt', contents: 'text file' }
]);

var getNewRoot = function() {
    return fs.Filesystem.create({
        source: 'filesystem:tests/testFileManagement#source'
    });
};

var genericFailureHandler = function(error) {
    console.log(error);
    t.ok(false, 'Async failed: ' + error.message);
    t.start();
};

exports.testPrefixSearch = function() {
    var i;
    var ps = fs._prefixSearch;
    var arr = [];
    t.equal(ps(arr, 'hello'), null, 'Expected null for empty array');
    arr = ['hello'];
    t.equal(ps(arr, 'hello'), 0, 'Simple case: one matching element');
    arr = ['hello/there'];
    t.equal(ps(arr, 'hello'), 0, 'Prefix case: one element');
    arr = [];
    for (i = 0; i < 10; i++) {
        arr.push('hello/' + i);
    }
    t.equal(ps(arr, 'hello'), 0, 'all match');

    arr = [];
    for (i = 0; i < 9; i++) {
        arr.push('abracadabra/' + i);
    }
    arr.push('hello/10');
    t.equal(ps(arr, 'hello'), 9, 'last match');

    arr = [];
    for (i = 0; i < 99; i++) {
        arr.push('abracadabra/' + i);
    }
    arr.splice(49, 0, 'hello/49');
    t.equal(ps(arr, 'hello'), 49, 'middle match');

    arr.splice(45, 4, 'hello/45', 'hello/46', 'hello/47', 'hello/48');
    t.equal(ps(arr, 'hello'), 45, 'middle match with more');
};

exports.testDirectoryListing = function() {
    source.reset();
    var root = getNewRoot();
    var testpr = new Promise();

    root.listDirectory('/').then(function(results) {
        t.equal(results.length, 4, 'Expected 4 items');
        t.deepEqual(results, ['anotherAtTheTop.js', 'atTheTop.js', 'deeply/',
                             'foo/']);
        testpr.resolve();
    });

    t.deepEqual(source.requests[0], ['loadAll']);

    return testpr;
};

exports.testFileContents = function() {
    source.reset();
    var root = getNewRoot();
    var testpr = new Promise();

    root.loadContents('atTheTop.js').then(function(contents) {
        t.equal(contents, 'the top file');
        testpr.resolve();
    });
    return testpr;
};

exports.testDirectoryCreation = function() {
    source.reset();
    var root = getNewRoot();
    var testpr = new Promise();
    root.makeDirectory('acme/insurance').then(function() {
        t.equal(root._files[0], 'acme/insurance/');
        testpr.resolve();
    });
    return testpr;
};

exports.testPathRemoval = function() {
    source.reset();
    var root = getNewRoot();
    var testpr = new Promise();
    root.remove('atTheTop.js').then(function() {
        t.equal(root._files.length, 3, 'file should be removed from filesystem');
        t.equal(root._files[1], 'deeply/nested/directory/andAFile.txt');
        t.equal(source.requests[0][0], 'remove');
        testpr.resolve();
    });
    return testpr;
};

exports.testFileAbstraction = function() {
    source.reset();
    var root = getNewRoot();
    var testpr = new Promise();
    var file = root.getFile('deeply/nested/directory/andAFile.txt');
    t.equal(file.extension(), 'txt');
    t.equal(file.parentdir(), 'deeply/nested/directory/', 'parentdir is the root for this file');
    file.loadContents().then(function(contents) {
        t.equal(contents, 'text file');

        file.saveContents('New data').then(function() {
            // there will be a loadAll at the end, so we do -2
            var request = source.requests[source.requests.length-2];
            t.equal(request[0], 'saveContents');
            t.equal(request[1][0], 'deeply/nested/directory/andAFile.txt');
            t.equal(request[1][1], 'New data');
            file.exists().then(function(exists) {
                t.ok(exists, 'File should exist');
                var badfile = root.getFile('no/such/file.txt');
                badfile.exists().then(function(exists) {
                    t.ok(!exists, 'badfile should not exist');
                    testpr.resolve();
                });
            });
        });
    });
    return testpr;
};
