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

var t = require('PluginDev');
var DummyFileSource = require('Filesystem:tests/fixture').DummyFileSource;
var m_filesystem = require('Filesystem');
var m_project = require('Project');

var source = DummyFileSource.create({
    files: [
        { name: "Proj1/foo.js",     contents: "foo" },
        { name: "Proj1/bar/baz.js", contents: "baz" }
    ]
});

exports.testCompletePath = function() {
    var root = m_filesystem.Directory.create({ source: source });
    var proj1 = m_project.Project.create({
        directory:  root.getObject("Proj1/")
    });

    var finished, results;
    var createResults = function() {
        finished = false;
        results = m_project.AsyncResults.create();
        results.get('finished').then(function() { finished = true; });
    };

    createResults();
    proj1.completePath("js", false, results);
    t.ok(finished, "completing 'js' sans directories finished successfully");
    t.deepEqual(results.get('results'), "/Proj1/foo.js /Proj1/bar/baz.js".w(),
        "the result of completing 'js' sans directories and (/Proj1/foo.js, " +
        "/Proj1/bar/baz.js)");

    createResults();
    proj1.completePath("js", true, results);
    t.ok(finished, "completing 'js' including directories finished " +
        "successfully");
    t.deepEqual(results.get('results'), "/Proj1/foo.js /Proj1/bar/baz.js".w(),
        "the result of completing 'js' including directories and " +
        "(/Proj1/foo.js, /Proj1/bar/baz.js)");

    createResults();
    proj1.completePath("bar", false, results);
    t.ok(finished, "completing 'bar' sans directories finished successfully");
    t.deepEqual(results.get('results'), "/Proj1/bar/baz.js".w(),
        "the result of completing 'bar' sans directories and " +
        "(/Proj1/bar/baz.js)");

    createResults();
    proj1.completePath("bar", true, results);
    t.ok(finished, "completing 'bar' including directories finished " +
        "successfully");
    t.deepEqual(results.get('results'), "/Proj1/bar/ /Proj1/bar/baz.js".w(),
        "the result of completing 'bar' including directories and " +
        "(/Proj1/bar/ /Proj1/bar/baz.js)");
};

