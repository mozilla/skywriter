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

var t = require('plugindev');
var DummyFileSource = require('filesystem:tests/fixture').DummyFileSource;
var fs = require('filesystem');
var editsession = require('edit_session');
var Promise = require('bespin:promise').Promise;

var source = new DummyFileSource([
    {name: 'atTheTop.js', contents: 'the top file'},
    {name: 'anotherAtTheTop.js', contents: 'another file'},
    {name: 'foo/'},
    {name: 'deeply/nested/directory/andAFile.txt', contents: 'text file'}
]);

exports.testBufferFileChange = function() {
    var root = fs.Filesystem.create({
        source: source
    });
    var buffer = editsession.Buffer.create();
    t.ok(buffer.get('model') != null,
        'Model should be set to a TextStorage by default');
    t.ok(buffer.untitled(), 'Buffer should initially be untitled');
    var f = root.getFile('atTheTop.js');
    buffer.changeFileOnly(f);
    t.ok(!buffer.untitled(), 'Buffer should no longer be untitled');
    t.equal('', buffer.get('model').getValue(), 'Should be empty now');
    buffer.changeFileOnly(null);
    t.ok(buffer.untitled(), 'Buffer should be untitled again');
    buffer.set('file', f);
    var pr = new Promise();
    setTimeout(function() {
        var newtext = buffer.get('model').getValue();
        t.equal(newtext, 'the top file', 'Expected file contents to be loaded');

        // now we want to reset the buffer.
        buffer.changeFile(null);
        t.ok(buffer.untitled(), 'Buffer should be untitled again');
        newtext = buffer.get('model').getValue();
        t.equal(newtext, '', 'editor text should be empty');
        pr.resolve();
    }, 1);
    return pr;
};

exports.testBufferFileChangeWithCallback = function() {
    var root = fs.Filesystem.create({
        source: source
    });
    var buffer = editsession.Buffer.create();
    var f = root.getFile('atTheTop.js');
    var pr = buffer.changeFile(f);
    var testpr = pr.then(function(b) {
        t.equal(b, buffer, 'should have gotten the buffer object in');
        t.equal(b.get('model').getValue(), 'the top file', 'contents should be loaded');
        if (testpr != undefined) {
            testpr.resolve();
        }
    });
    return testpr;
};

exports.testBufferSaving = function() {
    source.reset();
    var testpr = new Promise();
    var root = fs.Filesystem.create({ source: source });
    var buffer = editsession.Buffer.create();
    var model = buffer.get('model');
    model.setValue('foobar');
    t.equal(model.getValue(), 'foobar', 'the value stored in ' +
        'the model and the string that was just written to it');

    var file1 = root.getFile('bar.txt');
    file1.exists().then(function(exists) {
        t.ok(!exists, 'file should not be there now');
        buffer.saveAs(file1).then(function() {
            var request = source.requests.pop();
            t.equal(request[0], 'saveContents');
            t.equal(request[1][0], 'bar.txt');
            t.equal(request[1][1], 'foobar');

            file1.exists().then(function(exists) {
                t.ok(exists, 'file should now exist');
                testpr.resolve();
            });
        });
    });

    return testpr;
};
