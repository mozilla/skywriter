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
 * 'files' completions helper
 */
exports.fileFindCompletions = function(query, callback) {
    findCompletionsHelper(query, callback, {
        matchFiles: false,
        matchDirectories: true
    });
};

/**
 * 'mkdir' command
 */
exports.mkdirCommand = function(instruction, givenPath) {
    if (!givenPath) {
        instruction.addParameterError("givenPath", "Value missing");
        return;
    }

    var info = parseArguments(givenPath);
    var path = info.path;
    var project = info.project || editSession.project;

    var onSuccess = instruction.link(function() {
        if (path == '') {
            editSession.setProject(project);
        }
        request.done('Successfully created directory \'/' +
                project + '/' + path + '\'');
    });

    var onFailure = instruction.link(function(xhr) {
        request.doneWithError('Unable to create directory \'/' +
                project + '/' + path + '\': ' + xhr.responseText);
    });

    files.makeDirectory(project, path, onSuccess, onFailure);
};

/**
 * 'save' command
 */
exports.saveCommand = function(env, args, request) {
    var buffer = env.get("buffer");
    buffer.save().then(function() {
        request.done("File saved");
    });
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
    buffer.changeFile(file).then(
        function() { 
            request.done();
        },
        function(error) {
            request.doneWithError("Unable to open the file (" +
                error.message + ")");
        }
    );
    request.async();
};

/**
 * 'open' completions helper
 */
exports.openFindCompletions = function(query, callback) {
    findCompletionsHelper(query, callback, {
        matchFiles: true,
        matchDirectories: true
    });
};

/**
 * 'revert' command
 */
exports.revertCommand = function(instruction, opts) {
    files.loadContents(editSession.project, editSession.path, function(file) {
        editor.insertDocument(file.content);
        // TODO: Something better than dumping us back at the top. We could
        // simply check that the old cursor position is valid for the new
        // file or we could do a fancy diff thing to guess the new position
        editor.moveCursor({ row: 0, col: 0 });
        editor.setSelection(null);
    });
};

/**
 * 'status' command
 */
exports.statusCommand = function(instruction) {
    request.done(editSession.getStatus());
};

/**
 * 'newfile' command
 */
exports.newfileCommand = function(instruction, filename) {
    var info = parseArguments(filename);
    editor.newFile(info.project, info.path);
};

/**
 * 'rm' command
 */
exports.rmCommand = function(instruction, filename) {
    var info = parseArguments(filename);
    var path = info.path;
    var project = info.project;

    var onSuccess = instruction.link(function() {
        if (editSession.checkSameFile(project, path)) {
            editor.clear(); // only clear if deleting the same file
        }

        request.done('Removed file: ' + filename, true);
    });

    var onFailure = instruction.link(function(xhr) {
        request.doneWithError("Wasn't able to remove <b>" + filename +
                "</b><br/><em>Error</em> (probably doesn't exist): " +
                xhr.responseText);
    });

    files.removeFile(project, path, onSuccess, onFailure);
};

/**
 * 'open' completions helper
 */
exports.rmFindCompletions = function(query, callback) {
    findCompletionsHelper(query, callback, {
        matchFiles: true,
        matchDirectories: true
    });
};

/**
 * 'clear' command
 */
exports.clearCommand = function(instruction) {
    editor.clear();
};

/**
 * Utility to convert bytes to megabytes
 */
var megabytes = function(bytes) {
    return (bytes / 1024 / 1024).toFixed(2);
};

/**
 * 'quota' command
 */
exports.quotaCommand = function(instruction) {
    var free = megabytes(editSession.quota - editSession.amountUsed);
    var output = "You have " + free +
                 " MB free space to put some great code!<br>" +
                 "Used " + megabytes(editSession.amountUsed) + " MB " +
                 "out of your " + megabytes(editSession.quota) + " MB quota.";
    request.done(output);
};

/**
 * 'rescan' command
 */
exports.rescanCommand = function(instruction, project) {
    if (!project) {
        project = editSession.project;
    }

    server.rescan(project, instruction, {
        onSuccess: instruction.link(function(response) {
            request.done(response);
        }),
        onFailure: instruction.link(function(xhr) {
            request.doneWithError(xhr.responseText);
        })
    });
};

/**
 * Utility to split out a given path as typed on the command line into a
 * structure. The idea is to allow us to pass the project and path into a call
 * to server.list(project, path, ...) and then filter the results based on the
 * filter. For example:
 * <ul>
 * <li>/bespin/docs/e = { project:'bespin', path:'docs/', filter:'e' }
 * <li>/bespin/docs/js/e = { project:'bespin', path:'docs/js/', filter:'e' }
 * <li>/bespin/docs/js/e/ = { project:'bespin', path:'docs/js/e/', filter:'' }
 * <li>/bespin/docs = { project:'bespin', path:'', filter:'docs' }
 * <li>/bespin = { project:'/', path:'', filter:'bespin' }
 * <li>fol = { project:'', path:'', filter:'fol' }
 * </ul>
 */
var parseArguments = function(givenPath, opts) {
    opts = opts || {};

    // Sort out the context
    var project = editSession.project;
    var path = editSession.path || "";
    var parts = path.split(/\//);
    parts.pop(); // Remove the current file
    path = parts.join("/");
    var filter = "";
    var projectPath = "";

    if (givenPath) {
        if (givenPath.charAt(0) === "/") {
            // Everything past the final / is used for filtering and isn't
            // passed to the server, and we ignore the initial /
            parts = givenPath.substr(1).split(/\//);
            filter = parts.pop();
            // Pull out the leading segment into the project
            project = parts.shift() || "";

            if (parts.length) {
                path = parts.join("/") + "/";
            } else {
                path = "";
            }

            // Both project and path could be "" at this point ...
            // This filename generation is lazy - it slaps '/' around and
            // then removes the dups. It's possible that we might be able
            // to calculate where they should go, but it's not always easy.
            // Same below
            projectPath = "/" + project + "/" + path;
            projectPath = projectPath.replace(/\/+/g, "/");
        } else {
            // Everything past the final / is used for filtering and isn't
            // passed to the server
            parts = givenPath.split(/\//);
            filter = parts.pop();
            var trimmedPath = parts.join("/");

            path = path + "/" + trimmedPath;

            projectPath = "";
        }
    }

    if (!opts.filter) {
        path = path + filter;
        filter = undefined;
    }

    return {
        project: project,
        path: path,
        filter: filter,
        projectPath: projectPath
    };
};

/**
 * A helper to enable commands to implement findCompletions.
 * <p>The parameters are like for findCompletions with the addition of an
 * options object which work as follows:<ul>
 * <li>options.matchDirectories should be true to include directories in the
 * results.
 * <li>options.matchFiles should be true to include files in the results. All
 * uses of this function will include one (or maybe both) of the above
 */
var findCompletionsHelper = function(query, callback, options) {
    var givenPath = query.action.join(" ");
    var list = exports._parseArguments(givenPath, {filter: true});
    var self = this;
    server.list(list.project, list.path, function(files) {
        var matches = files.filter(function(file) {
            // TODO: Perhaps we should have a better way of detecting a file?
            var isFile = (file.size !== undefined);
            if ((options.matchDirectories && isFile) &&
                (options.matchFiles && !isFile)) {
                return false;
            }
            return file.name.substr(0, list.filter.length) === list.filter;
        });
        if (matches.length == 1) {
            // Single match: go for autofill and hint
            query.autofill = query.prefix + list.projectPath + matches[0].name;
            query.hint = "Press return to " + query.autofill;
        } else if (matches.length == 0) {
            // No matches, cause an error
            query.error = "No matches";
        } else {
            // Multiple matches, present a list
            // TODO: Do we need to sort these.
            // matches.sort(function(a, b) { return a.localeCompare(b); });
            query.options = matches.map(function(match) {
                return match.name;
            });
        }

        callback(query);
    });
};
