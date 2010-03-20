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

var SC = require("sproutcore/runtime").SC;
var Promise = require("bespin:promise").Promise;
var t = require("PluginDev");
var util = require("bespin:util/util");
var pathUtil = require("path");

exports.DummyFileSource = SC.Object.extend({
    // populate this list of files
    // should be a list, each item an object with path
    // (ending in / for directories) and contents for files.
    files: null,
    
    // the list of requests made
    requests: null,
    
    // set this to check for this status on the next status-changing call
    checkStatus: null,
    
    init: function() {
        this.reset();
    },
    
    reset: function() {
        this.requests = [];
    },
    
    loadDirectory: function(directory, deep) {
        this.requests.push(["loadDirectory", arguments]);
        
        var checkStatus = this.get("checkStatus");
        if (checkStatus != null) {
            t.equal(directory.get("status"), checkStatus, 
                "loadDirectory: directory status not as expected");
            this.set("checkStatus", null);
        }
        
        var pr = new Promise();
        var matches = this._findMatching(directory.get("path"), deep);
        pr.resolve(matches);
        return pr;
    },
    
    loadContents: function(file) {
        this.requests.push(["loadContents", arguments]);
        var pr = new Promise();
        var matches = this._findMatching(file.get("path"));
        pr.resolve({file: file, contents: matches.contents});
        return pr;
    },

    saveContents: function(file, contents) {
        this.requests.push(["saveContents", arguments]);
        var pr = new Promise();
        var entry = this._findOrCreateFile(file.get("path"));
        entry.contents = contents;
        pr.resolve({file: file, contents: contents});
        return pr;
    },

    remove: function(pathObj) {
        this.requests.push(["remove", arguments]);
        var pr = new Promise();
        pr.resolve();
        return pr;
    },
    
    _findMatching: function(path, deep) {
        path = pathUtil.trimLeadingSlash(path);
        if (path == "" || pathUtil.isDir(path)) {
            return this._findInDirectory(path, deep);
        } else {
            return this._findFile(path);
        }
    },
    
    _findFile: function(path) {
        var f = this.files.findProperty("name", path);
        return f;
    },

    _findOrCreateFile: function(path) {
        path = pathUtil.trimLeadingSlash(path);

        var f = this._findFile(path);
        if (SC.none(f)) {
            f = {name: path, contents: ""};
            this.files.push(f);
        }

        return f;
    },
    
    _findInDirectory: function(path, deep) {
        path = path.slice(0, path.length - 1);
        var segments = path.split("/");
        if (path == "") {
            segments = [];
        }
        var matches = [];
        this.files.forEach(function(f) {
            var fSegments = f.name.split("/");
            for (var i = 0; i < segments.length; i++) {
                if (segments[i] != fSegments[i]) {
                    return;
                }
            }
            
            // If the search we're doing is for the directory
            // itself and the directory is listed in the
            // file list, we don't want to return the
            // directory itself (which would actually come back as
            // undefined).
            if (!fSegments[i]) {
                return;
            }

            var name;
            if (deep) {
                name = fSegments.slice(i).join("/");
            } else if (fSegments.length > segments.length + 1) {
                // it's a directory
                name = fSegments[i] + "/";
            } else {
                name = fSegments[i];
            }

            matches.push({ name: name });
        });
        return matches;
    }
});
