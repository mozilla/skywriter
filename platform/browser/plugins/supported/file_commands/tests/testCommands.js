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
var EnvironmentTrait = require('canon:tests/fixture').MockEnvironment;
var MockRequest = require('canon:tests/fixture').MockRequest;
var file_commands = require('file_commands');
var edit_session = require('edit_session');
var Promise = require('bespin:promise').Promise;

var source = new DummyFileSource([
    {name: 'atTheTop.js', contents: 'the top file'},
    {name: 'anotherAtTheTop.js', contents: 'another file'},
    {name: 'foo/'},
    {name: 'foo/1.txt', contents: 'firsttext'},
    {name: 'foo/2.txt', contents: 'secondtext'},
    {name: 'foo/bar/3.txt', contents: 'thirdtext'},
    {name: 'deeply/nested/directory/andAFile.txt', contents: 'text file'}
]);

var getNewRoot = function() {
    return fs.Filesystem.create({
        source: source
    });
};

var getEnv = function() {
    var root = getNewRoot();
    var buffer = edit_session.Buffer.create();

    var session = new edit_session.EditSession(buffer);

    var env = Environment.create({
        files: root,
        session: session
    });
    return env;
};

exports.testFilesCommand = function() {
    var env = getEnv();
    var request = new MockRequest();
    var testpr = new Promise();
    request.promise.then(function() {
        output = request.outputs.join('');
        t.ok(output.indexOf('foo/<br/>') > -1, 'foo/ should be in output');
        t.ok(output.indexOf('atTheTop.js<br/>') > -1,
            'atTheTop.js should be in output');
        testpr.resolve();
    });

    file_commands.filesCommand({path: '/'}, request);

    return testpr;
};

exports.testOpenFileWithNoOpenFile = function() {
    var env = getEnv();
    var request = new MockRequest();
    var testpr = new Promise();
    request.promise.then(function() {
        var f = env.file;
        t.ok(!request.error, 'Should not be in error state');
        t.equal(f.path, '/foo/bar/3.txt', 'File should have been set');
        testpr.resolve();
    });

    file_commands.openCommand({path: '/foo/bar/3.txt'}, request);
};

exports.testFilesCommandDefaultsToRoot = function() {
    var env = getEnv();

    var testpr = new Promise();

    var request = new MockRequest();
    request.promise.then(function() {
        output = request.outputs.join('');
        t.ok(output.indexOf('foo/<br/>') > -1, 'foo/ should be in output');
        t.ok(output.indexOf('atTheTop.js<br/>') > -1,
            'atTheTop.js should be in output');
        testpr.resolve();
    });

    file_commands.filesCommand({path: null}, request);
    return testpr;
};

exports.testFilesAreRelativeToCurrentOpenFile = function() {
    var env = getEnv();
    var buffer = env.buffer;
    var files = env.files;
    buffer.changeFileOnly(files.getFile('foo/1.txt'));

    var testpr = new Promise();

    var request = new MockRequest();
    request.promise.then(function() {
        output = request.outputs.join('');
        t.ok(output.indexOf('1.txt<br/>') > -1, '1.txt should be in the output');
        t.ok(output.indexOf('2.txt<br/>') > -1,
            '2.txt should be in output');
        testpr.resolve();
    });

    file_commands.filesCommand({path: null}, request);
    return testpr;
};

exports.testFilesListingInDirectoryRelativeToOpenFile = function() {
    var env = getEnv();
    var buffer = env.buffer;
    var files = env.files;
    buffer.changeFileOnly(files.getFile('foo/1.txt'));
    var testpr = new Promise();

    var request = new MockRequest();
    request.promise.then(function() {
        output = request.outputs.join('');
        t.ok(output.indexOf('3.txt<br/>') > -1, '3.txt should be in the output');
        testpr.resolve();
    });

    file_commands.filesCommand({path: 'bar/'}, request);
    return testpr;
};

exports.testMakeDirectoryForNewDirectory = function() {
    var env = getEnv();
    var request = new MockRequest();
    var testpr = new Promise();
    var files = env.files;

    request.promise.then(function() {
        files.listDirectory('/foo/').then(function(contents) {
            t.equal(contents.length, 4, 'should have four items in directory');
            t.equal(contents[3], 'one/', 'new directory should be last item');
            testpr.resolve();
        });
    }, function(error) {
        testpr.reject(error.message);
    });

    file_commands.mkdirCommand({path: '/foo/one/'}, request);

    return testpr;
};
