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
var Promise = require("promise").Promise;
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
    
    loadDirectory: function(directory) {
        this.requests.push(["loadDirectory", arguments]);
        
        var checkStatus = this.get("checkStatus");
        if (checkStatus != null) {
            t.equal(directory.get("status"), checkStatus, 
                "loadDirectory: directory status not as expected");
            this.set("checkStatus", null);
        }
        
        var pr = new Promise();
        var matches = this._findMatching(directory.get("path"));
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
    
    _findMatching: function(path) {
        path = pathUtil.trimLeadingSlash(path);
        if (pathUtil.isDir(path)) {
            return this._findInDirectory(path);
        } else {
            return this._findFile(path);
        }
    },
    
    _findFile: function(path) {
        var f = this.files.findProperty("name", path);
        return f;
    },
    
    _findInDirectory: function(path) {
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
            
            // is this a directory?
            if (fSegments.length > segments.length + 1) {
                matches.push({name: fSegments[i] + "/"});
            } else {
                matches.push({name: fSegments[i]});
            }
        });
        return matches;
    }
});
