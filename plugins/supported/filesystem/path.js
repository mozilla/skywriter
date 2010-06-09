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

var util = require('bespin:util/util');

/**
 * Take the given arguments and combine them with one path separator:
 * <pre>
 * combine('foo', 'bar') -&gt; foo/bar
 * combine(' foo/', '/bar  ') -&gt; foo/bar
 * </pre>
 */
exports.combine = function() {
    // clone to a true array
    var args = Array.prototype.slice.call(arguments);

    var path = args.join('/');
    path = path.replace(/\/\/+/g, '/');
    path = path.replace(/^\s+|\s+$/g, '');
    return path;
};

/**
 * Given a <code>path</code> return the directory
 * <li>directory('/path/to/directory/file.txt') -&gt; /path/to/directory/
 * <li>directory('/path/to/directory/') -&gt; /path/to/directory/
 * <li>directory('foo.txt') -&gt; ''
 */
exports.directory = function(path) {
    var match = /^(.*?\/)[^\/]*$/.exec(path);
    return match === null ? '' : match[1];
};

/**
 * Given a <code>path</code> make sure that it returns as a directory
 * (As in, ends with a '/')
 * <pre>
 * makeDirectory('/path/to/directory') -&gt; /path/to/directory/
 * makeDirectory('/path/to/directory/') -&gt; /path/to/directory/
 * </pre>
 */
exports.makeDirectory = function(path) {
    if (!((/\/$/).test(path))) {
        path += '/';
    }
    return path;
};

/**
 * Take the given arguments and combine them with one path separator and
 * then make sure that you end up with a directory
 * <pre>
 * combine('foo', 'bar') -&gt; foo/bar/
 * combine(' foo/', '/bar  ') -&gt; foo/bar/
 * </pre>
 */
exports.combineAsDirectory = function() {
    return this.makeDirectory(this.combine.apply(this, arguments));
};

/**
 * This function doubles down and calls <code>combine</code> and then
 * escapes the output
 */
exports.escape = function() {
    return escape(this.combine.apply(this, arguments));
};

/**
 *
 */
exports.trimLeadingSlash = function(path) {
    if (path.indexOf('/') == 0) {
        path = path.substring(1, path.length);
    }
    return path;
};

exports.hasLeadingSlash = function(path) {
    return path.indexOf('/') == 0;
};

/**
 * This function returns a file type based on the extension
 * (foo.html -&gt; html)
 */
exports.fileType = function(path) {
    if (path.indexOf('.') >= 0) {
        var split = path.split('.');
        if (split.length > 1) {
            return split[split.length - 1];
        }
    }
    return null;
};

/*
* Returns true if the path points to a directory (ends with a /).
*/
exports.isDir = function(path) {
    return util.endsWith(path, '/');
};

/*
 * compute the basename of a path:
 * /foo/bar/ -> ''
 * /foo/bar/baz.js -> 'baz.js'
 */
exports.basename = function(path) {
    var lastSlash = path.lastIndexOf('/');
    if (lastSlash == -1) {
        return path;
    }
    var afterSlash = path.substring(lastSlash+1);
    return afterSlash;
};

/*
 * splits the path from the extension, returning a 2 element array
 * '/foo/bar/' -> ['/foo/bar', '']
 * '/foo/bar/baz.js' -> ['/foo/bar/baz', 'js']
 */
exports.splitext = function(path) {
    var lastDot = path.lastIndexOf('.');
    if (lastDot == -1) {
        return [path, ''];
    }
    var before = path.substring(0, lastDot);
    var after = path.substring(lastDot+1);
    return [before, after];
};

/*
 * figures out the parent directory
 * '' -&gt; ''
 * '/' -&gt; ''
 * '/foo/bar/' -&gt; '/foo/'
 * '/foo/bar/baz.txt' -&gt; '/foo/bar/'
 */
exports.parentdir = function(path) {
    if (path == '' || path == '/') {
        return '';
    }

    if (exports.isDir(path)) {
        path = path.substring(0, path.length-1);
    }
    slash = path.lastIndexOf('/');
    path = path.substring(0, slash+1);
    return path;
};
