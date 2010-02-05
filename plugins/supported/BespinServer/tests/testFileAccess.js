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
var SC = require("sproutcore/runtime").SC;
var Promise = require("Promise").Promise;
var filesource = require("filesource");

var DummyServer = SC.Object.extend({
    request: function(method, url, payload, options) {
        this.method = method;
        this.url = url;
        this.payload = payload;
        this.options = options;
        
        var pr = new Promise();
        if (this.get("responseData")) {
            pr.resolve(this.get("responseData"));
        }
        return pr;
    }
});

exports.testLoadDirectory = function() {
    var server = DummyServer.create({
        responseData: [
            {name: "foo.js"}
        ]
    });
    var source = filesource.BespinFileSource.create({
        server: server
    });
    
    var root = fs.Directory.create({
        source: source
    });
    
    var pr = source.loadDirectory(root);
    t.ok(typeof(pr.then) == "function", "expected to get Promise back");
    t.equal(server.method, "GET");
    t.equal(server.url, "/file/list/");
    var testpr = new Promise();
    pr.then(function(data) {
        t.equal(data[0].name, "foo.js", "expected dummy data passed through");
        testpr.resolve();
    });
    return testpr;
};

exports.testLoadContents = function() {
    var server = DummyServer.create({
        responseData: "This is the exciting data in the file."
    });
    var source = filesource.BespinFileSource.create({
        server: server
    });
    
    var root = fs.Directory.create({
        source: source
    });
    
    var f = root.getObject("myfile.txt");
    
    var pr = source.loadContents(f);
    t.ok(typeof(pr.then) == "function", "expected to get Promise back");
    t.equal(server.method, "GET");
    t.equal(server.url, "/file/at/myfile.txt");
    var testpr = new Promise();
    pr.then(function(data) {
        t.equal(data.file, f, "expected same file back");
        t.equal(data.contents, "This is the exciting data in the file.");
        testpr.resolve();
    });
    return testpr;
};

exports.testSaveContents = function() {
    var server = DummyServer.create({
    });
    var source = filesource.BespinFileSource.create({
        server: server
    });
    
    var root = fs.Directory.create({
        source: source
    });
    
    var f = root.getObject("myfile.txt");
    
    var pr = source.saveContents(f, "new file contents here");
    t.ok(typeof(pr.then) == "function", "expected to get Promise back");
    t.equal(server.method, "PUT");
    t.equal(server.payload, "new file contents here");
    t.equal(server.url, "/file/at/myfile.txt");
};
