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

var bespin = require("bespin");
var util = require("bespin/util");
var defaultScope = require("bespin/events").defaultScope;
var directory = require("bespin/util/path").directory;
var SC = require("sproutcore");

/**
 * This abstracts the remote Web Service file system, and in the future local
 * file systems too.
 * It ties into the bespin.client.Server object for remote access.
 */
exports.FileSystem = SC.Object.extend({
    server: bespin.get('server'),

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
                var session = bespin.get('editSession');
                if (session.shouldCollaborate()) {
                    session.startSession(project, path || "new.txt", onSuccess, onFailure);
                } else {
                    // alert the system that a path has changed
                    bespin.publish("path:changed", {
                        project: project,
                        path: path
                    });

                    session.setReadOnlyIfNotMyProject(project);

                    onSuccess({
                        name: path,
                        content: "",
                        timestamp: new Date().getTime()
                    });
                }
            },
            elseFailed: function() {
                if (util.isFunction(onFailure)) {
                    onFailure({ responseText:'The file ' + path + ' already exists my friend.' });
                }
                bespin.get("commandLine").addErrorOutput('The file ' + path + ' already exists my friend.');
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
        this.server.loadFile(project, path, function(content) {
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
        var session = bespin.get('editSession');
        if (session.shouldCollaborate()) {
            session.startSession(project, path, onSuccess, onFailure);
        } else {
            var localOnSuccess = function() {
                session.setReadOnlyIfNotMyProject(project);
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
            bespin.get('commandLine').addErrorOutput("Please, I need a project and filename to evaulate");
            return;
        }

        this.loadContents(project, filename, function(file) {
            // wow, using with. crazy.
            with (scope) {
                try {
                    eval(file.content);
                } catch (e) {
                    var html = "There is a error trying to run " + filename + " in project " + project + ":<br>" + e;
                    bespin.get('commandLine').addErrorOutput(html);
                }
            }
        }, true);
    },

    /**
     * Return a JSON representation of the projects that the user has access too
     * @param callback is a callback that fires given the project list
     */
    projects: function(callback) {
        this.server.projects(callback);
    },

    /**
     * Return a JSON representation of the files at the root of the given project
     * @param callback is a callback that fires given the files
     */
    fileNames: function(project, callback) {
        this.server.list(project, '', callback);
    },

    /**
     * Save a file to the given project
     * @param project is the name of the project to save into
     * @param file is the file object that contains the path and content to save
     */
    saveFile: function(project, file, onSuccess, onFailure) {
        // Unix files should always have a trailing new-line; add if not present
        if (/\n$/.test(file.content)){file.content += "\n";}

        this.server.saveFile(project, file.name, file.content, file.lastOp, {
            onSuccess: function() {
                console.log("File saved: " + project + " " + file.name);
                bespin.publish("file:saved", { project: project, path: file.name });
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
            bespin.publish("directory:created", {
                project: project,
                path: path
            });
            onSuccess(result);
        };
        this.server.makeDirectory(project, path, publishOnSuccess, onFailure);
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
            bespin.publish("directory:removed", {
                project: project,
                path: path
            });
            onSuccess(result);
        };
        this.server.removeFile(project, path, publishOnSuccess, onFailure);
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
            bespin.publish("file:removed", {
                project: project,
                path: path
            });
            onSuccess(result);
        };
        this.server.removeFile(project, path, publishOnSuccess, onFailure);
    },

    /**
     * Close the open session for the file
     * @param project is the name of the project to close the file from
     * @param path is the full path to the file to close
     * @param callback is the callback to fire when closed
     */
    closeFile: function(project, path, callback) {
        this.server.closeFile(project, path, callback);
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
            var hasSome = dojo.some(files, function(file) {
                return file.name == path;
            });

            if (files && hasSome) {
                callbacks.execute();
            } else {
                if (callbacks['elseFailed']) {
                    callbacks.elseFailed();
                }
            }
        };

        var onFailure = function(xhr) {
            if (callbacks['elseFailed']) {
                callbacks.elseFailed(xhr);
            }
        };

        this.server.list(project, directory(path), onSuccess, onFailure);
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
            var hasSome = dojo.some(files, function(file) {
                return (file.name == path);
            });

            if (!files || !hasSome) {
                callbacks.execute();
            } else {
                if (callbacks['elseFailed']) {
                    callbacks.elseFailed();
                }
            }
        };

        var onFailure = function(xhr) {
            // the list failed which means it didn't exist
            callbacks.execute();
        };

        this.server.list(project, directory(path), onSuccess, onFailure);
    }
});
