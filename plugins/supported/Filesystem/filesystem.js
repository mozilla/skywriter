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
var util = require("bespin:util/util");
var path = require("path");
var cliController = require("controller").cliController;

var NEW = exports.NEW = 0;
var LOADING = exports.LOADING = 1;
var READY = exports.READY = 2;

exports.Directory = SC.Object.extend({
    // the FileSource that is used for this directory
    source: null,
    
    // the parent of this directory, null if this is a root
    parent: null,
    
    // name of this directory -- does not include the parent segments
    name: null,
    
    // whether or not we have data for this directory
    status: NEW,
    
    init: function() {
        var source = this.get("source");
        if (typeof(source) == "string") {
            this.set("source", SC.objectForPropertyPath(source));
        }
    }
});

exports.File = SC.Object.extend({
    // the directory this belongs to
    directory: null,
    
    // name of this file, does not include directory
    name: null
});


/**
 * This abstracts the remote Web Service file system, and in the future local
 * file systems too.
 * It ties into the bespin.client.Server object for remote access.
 */
exports.FileSystemOld = SC.Object.extend({
    /** The name of the project that contains the users client side settings */
    userSettingsProject: "BespinSettings",

    /**
     * Create a new file in the file system.
     * @param project is the name of the project to create the file in
     * @param path is the full path to save the file into
     * @param onSuccess is a callback to fire if the file is created
     */
    newFile: function(project, path, onSuccess, onFailure) {
        var self = this;
        this.whenFileDoesNotExist(project, path, {
            execute: function() {
                if (editSession.shouldCollaborate()) {
                    editSession.startSession(project, path || "new.txt", onSuccess, onFailure);
                } else {
                    // alert the system that a path has changed
                    hub.publish("path:changed", {
                        project: project,
                        path: path
                    });

                    editSession.setReadOnlyIfNotMyProject(project);

                    onSuccess({
                        name: path,
                        content: "",
                        timestamp: new Date().getTime()
                    });
                }
            },
            elseFailed: function() {
                if (util.isFunction(onFailure)) {
                    onFailure({ responseText:"The file " + path + " already exists my friend." });
                }
                throw "The file " + path + " already exists my friend.";
            }
        });
    },

    /**
     * Retrieve the contents of a file (in the given project and path) so we can
     * perform some processing on it. Called by editFile() if collaboration is
     * turned off.
     * @param project is the name of the project that houses the file
     * @param path is the full path to load the file into
     * @param onSuccess is a callback to fire if the file is loaded
     */
    loadContents: function(project, path, onSuccess, onFailure) {
        server.loadFile(project, path, function(content) {
            if (/\n$/.test(content)) {
                content = content.substr(0, content.length - 1);
            }

            onSuccess({
                name: path,
                content: content,
                timestamp: new Date().getTime()
            });
        }, onFailure);
    },

    /**
     * Load the file in the given project so we can begin editing it.
     * This loads the file contents via collaboration, so the callback will not
     * know what the
     * @param project is the name of the project that houses the file
     * @param path is the full path to load the file into
     * @param onSuccess is a callback to fire if the file is loaded
     */
    editFile: function(project, path, onSuccess, onFailure) {
        if (editSession.shouldCollaborate()) {
            editSession.startSession(project, path, onSuccess, onFailure);
        } else {
            var localOnSuccess = function() {
                editSession.setReadOnlyIfNotMyProject(project);
                onSuccess.apply(null, arguments);
            };
            this.loadContents(project, path, localOnSuccess, onFailure);
        }
    },

    /**
     * Open a file and eval it in a given scope
     */
    evalFile: function(project, filename, scope) {
        scope = scope || defaultScope();

        if (!project || !filename) {
            throw "Please, I need a project and filename to evaulate";
        }

        this.loadContents(project, filename, function(file) {
            // wow, using with. crazy.
            with (scope) {
                try {
                    eval(file.content);
                } catch (e) {
                    throw "There is a error trying to run " + filename + " in project " + project + ": " + e;
                }
            }
        }, true);
    },

    /**
     * Return a JSON representation of the projects that the user has access too
     * @param callback is a callback that fires given the project list
     */
    projects: function(callback) {
        server.projects(callback);
    },

    /**
     * Return a JSON representation of the files at the root of the given project
     * @param callback is a callback that fires given the files
     */
    fileNames: function(project, callback) {
        server.list(project, "", callback);
    },

    /**
     * Save a file to the given project
     * @param project is the name of the project to save into
     * @param file is the file object that contains the path and content to save
     */
    saveFile: function(project, file, onSuccess, onFailure) {
        // Unix files should always have a trailing new-line; add if not present
        if (/\n$/.test(file.content)) {
            file.content += "\n";
        }

        server.saveFile(project, file.name, file.content, file.lastOp, {
            onSuccess: function() {
                console.log("File saved: " + project + " " + file.name);
                hub.publish("file:saved", { project: project, path: file.name });
                if (util.isFunction(onSuccess)) {
                    onSuccess();
                }
            },
            onFailure: onFailure
        });
    },

    /**
     * Create a directory
     * @param project is the name of the directory to create
     * @param path is the full path to the directory to create
     * @param onSuccess is the callback to fire if the make works
     * @param onFailure is the callback to fire if the make fails
     */
    makeDirectory: function(project, path, onSuccess, onFailure) {
        var publishOnSuccess = function(result) {
            hub.publish("directory:created", {
                project: project,
                path: path
            });
            onSuccess(result);
        };
        server.makeDirectory(project, path, publishOnSuccess, onFailure);
    },

    /**
     * Remove a directory
     * @param project is the name of the directory to remove
     * @param path is the full path to the directory to delete
     * @param onSuccess is the callback to fire if the remove works
     * @param onFailure is the callback to fire if the remove fails
     */
    removeDirectory: function(project, path, onSuccess, onFailure) {
        var publishOnSuccess = function(result) {
            hub.publish("directory:removed", {
                project: project,
                path: path
            });
            onSuccess(result);
        };
        server.removeFile(project, path, publishOnSuccess, onFailure);
    },

    /**
     * Remove the file from the file system
     * @param project is the name of the project to delete the file from
     * @param path is the full path to the file to delete
     * @param onSuccess is the callback to fire if the remove works
     * @param onFailure is the callback to fire if the remove fails
     */
    removeFile: function(project, path, onSuccess, onFailure) {
        var publishOnSuccess = function(result) {
            hub.publish("file:removed", {
                project: project,
                path: path
            });
            onSuccess(result);
        };
        server.removeFile(project, path, publishOnSuccess, onFailure);
    },

    /**
     * Close the open session for the file
     * @param project is the name of the project to close the file from
     * @param path is the full path to the file to close
     * @param callback is the callback to fire when closed
     */
    closeFile: function(project, path, callback) {
        server.closeFile(project, path, callback);
    },

    /**
     * Check to see if the file exists and then run the appropriate callback
     * @param project is the name of the project
     * @param path is the full path to the file
     * @param callbacks is the pair of callbacks:
     *   execute (file exists)
     *   elseFailed (file does not exist)
     */
    whenFileExists: function(project, path, callbacks) {
        var onSuccess = function(files) {
            var hasSome = files.some(function(file) {
                return file.name == path;
            });

            if (files && hasSome) {
                callbacks.execute();
            } else {
                if (callbacks["elseFailed"]) {
                    callbacks.elseFailed();
                }
            }
        };

        var onFailure = function(xhr) {
            if (callbacks["elseFailed"]) {
                callbacks.elseFailed(xhr);
            }
        };

        server.list(project, path.directory(path), onSuccess, onFailure);
    },

    /**
     * The opposite of exports.whenFileExists()
     * @param project is the name of the project
     * @param path is the full path to the file
     * @param callbacks is the pair of callbacks:
     *   execute (file does not exist)
     *   elseFailed (file exists)
     */
    whenFileDoesNotExist: function(project, path, callbacks) {
        var onSuccess = function(files) {
            var hasSome = files.some(function(file) {
                return (file.name == path);
            });

            if (!files || !hasSome) {
                callbacks.execute();
            } else {
                if (callbacks["elseFailed"]) {
                    callbacks.elseFailed();
                }
            }
        };

        var onFailure = function(xhr) {
            // the list failed which means it didn't exist
            callbacks.execute();
        };

        server.list(project, path.directory(path), onSuccess, onFailure);
    }
});


var _defaultScope = null;

/**
 * Return a default scope to be used for evaluation files
 */
var defaultScope = function() {
    if (_defaultScope) {
        return _defaultScope;
    }

    var _defaultScope = {
        include: function(file) {
            files.evalFile(files.userSettingsProject, file);
        },
        require: require,
        execute: function(cmd) {
            cliController.executeCommand(cmd);
        }
    };

    [ "editor", "files", "server" ].forEach(function(id) {
        _defaultScope.id = this[id];
    });

    return _defaultScope;
};
