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

var SC = require('sproutcore/runtime').SC;
var Promise = require('bespin:promise').Promise;
var m_promise = require('bespin:promise');

exports.AsyncResults = SC.Object.extend({
    /**
     * A promise that resolves when the results have finished coming in.
     */
    finished: null,

    /**
     * A user-supplied callback that executes when new results come in.
     */
    progress: null,

    /**
     * The list of results.
     */
    results: null,

    init: function() {
        this.set('finished', new Promise());
        this.set('results', []);
    },

    push: function(newResult) {
        this.get('results').push(newResult);

        var progress = this.get('progress');
        if (!SC.none(progress)) {
            progress(this);
        }
    }
});

exports.Project = SC.Object.extend({
    _enumeratePaths: function(root, includeDirs, predicate, results) {
        var promise = new Promise();
        root.load().then(function() {
            root.get('files').forEach(function(file) {
                var path = file.get('path');
                if (predicate(path)) {
                    results.push(path);
                }
            });

            var subdirs = root.get('directories');

            var subpromises = subdirs.map(function(subdir) {
                var path = subdir.get('path');
                if (includeDirs && predicate(path)) {
                    results.push(path);
                }

                return this._enumeratePaths(subdir, includeDirs, predicate,
                    results);
            }.bind(this));

            if (subpromises.length === 0) {
                promise.resolve();
            } else {
                m_promise.group(subpromises).then(function() {
                    promise.resolve();
                });
            }
        }.bind(this));

        return promise;
    },

    directory: null,

    /**
     * Fills in the user-supplied AsyncResults object with the paths in the
     * current project that match the given substring.
     *
     * @param fragment{string} The substring to search for in each path.
     * @param includeDirs{bool} Whether directories should be included. If
     *        false, the search will still be performed recursively, but only
     *        actual files will be returned as search results.
     * @param results{AsyncResults} An object that receives the results.
     */
    completePath: function(fragment, includeDirs, results) {
        var directory = this.get('directory');
        var promise = this._enumeratePaths(directory, includeDirs,
            function(path) { return path.indexOf(fragment) !== -1; }, results);
        promise.then(function() { results.get('finished').resolve(); });
    }
});

