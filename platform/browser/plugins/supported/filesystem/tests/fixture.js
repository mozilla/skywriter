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

var Promise = require('bespin:promise').Promise;
var t = require('plugindev');
var util = require('bespin:util/util');
var pathUtil = require('path');

/**
 * @param files {file[]} Should be a list, each item an object with path
 * (ending in / for directories) and contents for files.
 * @param requests the list of requests made
 */
exports.DummyFileSource = function(files, requests) {
    this.files = files;
    this.requests = requests;

    // keep a shallow copy of the files list
    var originalFiles = [];
    this.files.forEach(function(f) {
        originalFiles.push({name: f.name, contents: f.contents});
    });
    this._originalFiles = originalFiles;
    this.reset();
};

exports.DummyFileSource.prototype = {
    reset: function() {
        this.requests = [];

        // restore the files list
        var files = [];
        this._originalFiles.forEach(function(f) {
            files.push({name: f.name, contents: f.contents});
        });
        this.files = files;
    },

    // Loads the complete file list
    loadAll: function() {
        this.requests.push(['loadAll']);
        console.log('loadAll called');

        var pr = new Promise();
        var result = [];
        this.get('files').forEach(function(f) {
            result.push(f.name);
        });
        pr.resolve(result);
        console.log('returning from loadAll');
        return pr;
    },

    loadContents: function(path) {
        this.requests.push(['loadContents', arguments]);
        var pr = new Promise();
        var matches = this._findMatching(path);
        pr.resolve(matches.contents);
        return pr;
    },

    saveContents: function(path, contents) {
        this.requests.push(['saveContents', arguments]);
        var pr = new Promise();
        var entry = this._findOrCreateFile(path);
        entry.contents = contents;
        pr.resolve();
        return pr;
    },

    remove: function(path) {
        this.requests.push(['remove', arguments]);
        var pr = new Promise();
        pr.resolve();
        return pr;
    },

    makeDirectory: function(path) {
        this.requests.push(['makeDirectory', arguments]);
        var pr = new Promise();
        this.files.push({name: path});
        pr.resolve(path);
        return pr;
    },

    _findMatching: function(path, deep) {
        path = pathUtil.trimLeadingSlash(path);
        if (path == '' || pathUtil.isDir(path)) {
            return this._findInDirectory(path, deep);
        } else {
            return this._findFile(path);
        }
    },

    _findFile: function(path) {
        var f = this.files.findProperty('name', path);
        return f;
    },

    _findOrCreateFile: function(path) {
        path = pathUtil.trimLeadingSlash(path);

        var f = this._findFile(path);
        if (util.none(f)) {
            f = {name: path, contents: ''};
            this.files.push(f);
        }

        return f;
    },

    _findInDirectory: function(path, deep) {
        path = path.slice(0, path.length - 1);
        var segments = path.split('/');
        if (path == '') {
            segments = [];
        }
        var matches = [];
        this.files.forEach(function(f) {
            var fSegments = f.name.split('/');
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
                name = fSegments.slice(i).join('/');
            } else if (fSegments.length > segments.length + 1) {
                // it's a directory
                name = fSegments[i] + '/';
            } else {
                name = fSegments[i];
            }

            matches.push({ name: name });
        });
        return matches;
    }
};
