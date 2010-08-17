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

var catalog = require('bespin:plugins').catalog;
var pathUtil = require('filesystem:path');
var env = require('environment').env;

var Buffer = require('text_editor:models/buffer').Buffer;
var Promise = require('bespin:promise').Promise;

/*
 * Creates a path based on the current working directory and the passed 'path'.
 * This is also deals with '..' within the path and '/' at the beginning.
 */
exports.getCompletePath = function(path) {
    var ret;
    path = path || '';

    if (path[0] == '/') {
        ret = path.substring(1);
    } else {
        ret = (env.workingDir || '') + (path || '');
    }

    // If the path ends with '..', then add a / at the end
    if (ret.substr(-2) == '..') {
        ret += '/';
    }

    // Replace the '..' parts
    var parts = ret.split('/');
    var i = 0;
    while (i < parts.length) {
        if (parts[i] == '..') {
            if (i != 0) {
                parts.splice(i - 1, 2);
                i -= 2;
            } else {
                parts.splice(0, 1);
            }
        } else {
            i ++;
        }
    }

    return parts.join('/');
};

/**
 * 'files' command
 */
exports.filesCommand = function(args, request) {
    var path = args.path;

    path = exports.getCompletePath(path);

    if (path && !pathUtil.isDir(path)) {
        path += '/';
    }

    request.async();
    env.files.listDirectory(path).then(function(contents) {
        var files = '';
        for (var x = 0; x < contents.length; x++) {
            files += contents[x] + '<br/>';
        }
        request.done(files);

    }, function(error) {
        request.doneWithError(error.message);
    });
};

/**
 * 'mkdir' command
 */
exports.mkdirCommand = function(args, request) {
    var path = args.path;

    path = exports.getCompletePath(path);
    request.async();

    var files = env.files;
    files.makeDirectory(path).then(function() {
        request.done('Directory ' + path + ' created.');
    }, function(error) {
        request.doneWithError('Unable to make directory ' + path + ': '
                              + error.message);
    });
};

/**
 * 'save' command
 */
exports.saveCommand = function(args, request) {
    var buffer = env.buffer;
    if (buffer.untitled()) {
        env.commandLine.setInput('saveas ');
        request.done('The current buffer is untitled. Please enter a name.');
        return;
    }

    buffer.save().then(function() { request.done('Saved'); },
        function(error) {
            request.doneWithError('Unable to save: ' + error.message);
        }
    );
    request.async();
};

/**
 * 'save as' command
 */
exports.saveAsCommand = function(args, request) {
    var files = env.files;
    var path = exports.getCompletePath(args.path);

    var newFile = files.getFile(path);
    env.buffer.saveAs(newFile).then(function() {
        request.done('Saved to \'' + path + '\'');
    }, function(err) {
        request.doneWithError('Save failed (' + err.message + ')');
    });

    request.async();
};

/**
 * 'open' command
 */
exports.openCommand = function(args, request) {
    if (!('path' in args)) {
        env.commandLine.setInput('open ');
        return;
    }

    var files = env.files;
    var editor = env.editor;
    var path = exports.getCompletePath(args.path);

    // TODO: handle line number in args
    request.async();
    var file = files.getFile(path);

    var loadPromise = new Promise();
    var buffer;

    // Create a new buffer based that is bound to 'file'.
    // TODO: After editor reshape: EditorSession should track buffer instances.
    buffer = new Buffer(file);
    buffer.loadPromise.then(
        function() {
            // Set the buffer of the current editorView after it's loaded.
            editor.buffer = buffer;
            request.done();
        },
        function(error) {
            request.doneWithError('Unable to open the file (' +
                error.message + ')');
        }
    );
};

/**
 * 'revert' command
 */
exports.revertCommand = function(args, request) {
    request.async();
    var buffer = env.buffer;
    buffer.reload().then(function() {
        request.done('File reverted');
    }, function(error) {
        request.doneWithError(error.message);
    });
};

/**
 * 'newfile' command
 */
exports.newfileCommand = function(args, request) {
    env.editor.buffer = new Buffer();
};

/**
 * 'rm' command
 */
exports.rmCommand = function(args, request) {
    var files = env.files;
    var buffer = env.buffer;

    var path = args.path;
    path = exports.getCompletePath(path);

    files.remove(path).then(function() {
        request.done(path + ' deleted.');
    }, function(error) {
        request.doneWithError('Unable to delete (' + error.message + ')');
    });
    request.async();
};

/**
 * 'cd' command
 */
exports.cdCommand = function(args, request) {
    var workingDir = args.workingDir || '';
    if (workingDir != '' && workingDir.substr(-1) != '/') {
        workingDir += '/';
    }
    env.workingDir = exports.getCompletePath(workingDir);
    request.done('/' + env.workingDir);
}

/**
 * 'pwd' command
 */
exports.pwdCommand = function(args, request) {
    request.done('/' + (env.workingDir || ''));
}
