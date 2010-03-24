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

var pathUtil = require("Filesystem:path");
var cliController = require("CommandLine:controller").cliController;

/*
 * Creates a path based on the current open file, if there is
 * no leading slash.
 */
var getCompletePath = function(env, path) {
    var session = env.get("session");
    return session.getCompletePath(path);
};

/**
 * 'files' command
 */
exports.filesCommand = function(env, args, request) {
    var path = args.path;

    path = getCompletePath(env, path);

    if (!pathUtil.isDir(path)) {
        path += "/";
    }

    request.async();
    env.get("files").loadPath(path).then(function(dir) {
        var files = "";
        var contents = dir.get("contents");
        for (var x = 0; x < contents.length; x++) {
            files += contents[x].get("name") + "<br/>";
        }
        request.done(files);

    }, function(error) {
        request.doneWithError(error.message);
    });
};

/**
 * 'mkdir' command
 */
exports.mkdirCommand = function(env, args, request) {
    var path = args.path;
    
    path = getCompletePath(env, path);
    request.async();
    
    var files = env.get("files");
    files.makeDirectory(path).then(function() {
        request.done("Directory " + path + " created.");
    }, function(error) {
        request.doneWithError("Unable to make directory " + path + ": " 
                              + error.message);
    });
};

/**
 * 'save' command
 */
exports.saveCommand = function(env, args, request) {
    var buffer = env.get("buffer");
    if (buffer.untitled()) {
        cliController.prompt("saveas ");
        request.done("The current buffer is untitled. Please enter a name.");
        return;
    }

    buffer.save().then(function() { request.done("Saved"); },
        function(error) {
            request.doneWithError("Unable to save: " + error.message);
        }
    );
    request.async();
};

/**
 * 'save as' command
 */
exports.saveAsCommand = function(env, args, request) {
    var path = getCompletePath(env, args.path).substring(1);
    var dirPath = pathUtil.directory(path), filename = pathUtil.basename(path);

    var saveToDirectory = function(dir) {
        env.get("buffer").saveAs(dir, filename).then(function() {
                request.done("Saved to '" + path + "'");
            }, function(err) {
                request.doneWithError("Save failed (" + err.message + ")");
            });
    };

    var files = env.get('files');
    if (dirPath === "") {
        // TODO: revisit this?
        request.doneWithError("Files cannot be saved at the root directory: " +
            "create a subdirectory for them first");
    } else {
        files.loadObject(dirPath).then(saveToDirectory, function(err) {
            request.doneWithError("Couldn't load target directory '" +
                dirPath + "' (" + err.message + ")");
        });
    }

    request.async();
};

/**
 * 'open' command
 */
exports.openCommand = function(env, args, request) {
    var files = env.get("files");
    var buffer = env.get("buffer");

    var path = args.path;
    path = getCompletePath(env, path);

    // TODO: handle line number in args
    var file = files.getObject(path);
    request.async();
    buffer.changeFile(file).then(
        function() {
            request.done();
        },
        function(error) {
            request.doneWithError("Unable to open the file (" +
                error.message + ")");
        }
    );
};

/**
 * 'revert' command
 * TODO: Delete or correct
        {
            "ep": "command",
            "name": "revert",
            "description": "revert the file to the last saved version",
            "pointer": "#revertCommand"
        },
 */
exports.revertCommand = function(env, args, request) {
    files.loadContents(editSession.project, editSession.path, function(file) {
        editor.insertDocument(file.content);
        // TODO: Something better than dumping us back at the top. We could
        // simply check that the old cursor position is valid for the new
        // file or we could do a fancy diff thing to guess the new position
        editor.moveCursor({ row: 0, col: 0 });
        editor.setSelection(null);
    });
};

exports.newfileCommand = function(env, args, request) {
    var buffer = env.get("buffer");
    buffer.set("file", null);
};

/**
 * 'rm' command
 */
exports.rmCommand = function(env, args, request) {
    var files = env.get("files");
    var buffer = env.get("buffer");

    var path = args.path;
    path = getCompletePath(env, path);

    var pathObject = files.getObject(path);
    pathObject.remove().then(function() {
        request.done(path + " deleted.");
    }, function(error) {
        request.doneWithError("Unable to delete (" + error.message + ")");
    });
    request.async();
};
