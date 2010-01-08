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
var canon = require("CommandLine:canon");
var util = require("bespin:util/util");
var path = require("bespin:util/path");
var diff_match_patch = require("Diff");

var DIFF_EQUAL = diff_match_patch.DIFF_EQUAL;
var DIFF_DELETE = diff_match_patch.DIFF_DELETE;
var DIFF_INSERT = diff_match_patch.DIFF_INSERT;


/**
 * 'files' command
 */
canon.rootCanon.addCommand({
    name: 'files',
    aliases: ['ls', 'list'],
    takes: ['path'],
    preview: 'show files',
    completeText: 'list files relative to current file, or start with /projectname',
    execute: function(instruction, givenPath) {
        var list = exports._parseArguments(givenPath, {filter: true});
        bespin.get('server').list(list.project, list.path, function(filenames) {
            var files = "";
            for (var x = 0; x < filenames.length; x++) {
                files += filenames[x].name + "<br/>";
            }
            instruction.addOutput(files);
        });
    },
    findCompletions: function(query, callback) {
        exports._findCompletionsHelper(query, callback, {
            matchFiles: false,
            matchDirectories: true
        });
    }
});

/**
 * 'mkdir' command
 */
canon.rootCanon.addCommand({
    name: 'mkdir',
    takes: ['path'],
    preview: 'create a new directory, use a leading / to create a directory in a different project',
    usage: '[path]',
    execute: function(instruction, givenPath) {
        if (!givenPath) {
            instruction.addUsageOutput(this);
            return;
        }

        var editSession = bespin.get('editSession');

        var info = exports._parseArguments(givenPath);
        var path = info.path;
        var project = info.project || editSession.project;

        var onSuccess = instruction.link(function() {
            if (path == ''){editSession.setProject(project);}
            instruction.addOutput('Successfully created directory \'/' + project + '/' + path + '\'');
            instruction.unlink();
        });

        var onFailure = instruction.link(function(xhr) {
            instruction.addErrorOutput('Unable to create directory \'/' + project + '/' + path + '\': ' + xhr.responseText);
            instruction.unlink();
        });

        bespin.get('files').makeDirectory(project, path, onSuccess, onFailure);
    }
});

/**
 * 'save' command
 */
canon.rootCanon.addCommand({
    name: 'save',
    takes: ['filename'],
    preview: 'save the current contents',
    completeText: 'add the filename to save as, or use the current file',
    withKey: "CMD S",
    execute: function(instruction, filename) {
        // TODO: use onSuccess/onFail to report to the instruction
        bespin.get("editor").saveFile(null, filename);
    }
});

/**
 * 'open' command
 */
canon.rootCanon.addCommand({
    name: 'open',
    aliases: ['load'],
    takes: ['path', 'line'],
    preview: 'load up the contents of the file',
    completeText: 'add the filename to open',
    execute: function(instruction, opts) {
        var info = exports._parseArguments(opts.path);
        bespin.get("editor").openFile(info.project, info.path, { line: opts.line });
        bespin.publish("ui:escape", {});
    },
    findCompletions: function(query, callback) {
        exports._findCompletionsHelper(query, callback, {
            matchFiles: true,
            matchDirectories: true
        });
    }
});

/**
 * 'revert' command
 */
canon.rootCanon.addCommand({
    name: 'revert',
    preview: 'revert the file to the last saved version',
    execute: function(instruction, opts) {
        var session = bespin.get('editSession');
        bespin.get('files').loadContents(session.project, session.path, function(file) {
            var editor = bespin.get('editor');
            editor.model.insertDocument(file.content);
            // TODO: Something better than dumping us back at the top. We could
            // simply check that the old cursor position is valid for the new
            // file or we could do a fancy diff thing to guess the new position
            editor.moveCursor({ row: 0, col: 0 });
            editor.setSelection(null);
            bespin.publish("ui:escape", {});
        });
    }
});

/**
 * 'status' command
 */
canon.rootCanon.addCommand({
    name: 'status',
    preview: 'get info on the current project and file',
    execute: function(instruction) {
        instruction.addOutput(bespin.get('editSession').getStatus());
    }
});

/**
 * 'newfile' command
 */
canon.rootCanon.addCommand({
    name: 'newfile',
    //aliases: ['new'],
    takes: ['filename'],
    preview: 'create a new buffer for file',
    completeText: 'optionally, you can specify a full path including project by starting the filename with "/"',
    withKey: "CTRL SHIFT N",
    execute: function(instruction, filename) {
        var info = exports._parseArguments(filename);

        bespin.get("editor").newFile(info.project, info.path);
        bespin.publish("ui:escape", {});
    }
});

/**
 * 'rm' command
 */
canon.rootCanon.addCommand({
    name: 'rm',
    aliases: ['remove', 'del'],
    takes: ['filename'],
    preview: 'remove the file',
    completeText: 'add the filename to remove, give a full path starting with '/' to delete from a different project. To delete a directory end the path in a '/'',
    execute: function(instruction, filename) {
        var info = exports._parseArguments(filename);
        var path = info.path;
        var project = info.project;

        var onSuccess = instruction.link(function() {
            if (bespin.get('editSession').checkSameFile(project, path)) {
                bespin.get("editor").model.clear(); // only clear if deleting the same file
            }

            instruction.addOutput('Removed file: ' + filename, true);
            instruction.unlink();
        });

        var onFailure = instruction.link(function(xhr) {
            instruction.addErrorOutput("Wasn't able to remove the file <b>" + filename + "</b><br/><em>Error</em> (probably doesn't exist): " + xhr.responseText);
            instruction.unlink();
        });

        bespin.get('files').removeFile(project, path, onSuccess, onFailure);
    },

    findCompletions: function(query, callback) {
        exports._findCompletionsHelper(query, callback, {
            matchFiles: true,
            matchDirectories: true
        });
    }
});

/**
 * 'clear' command
 */
canon.rootCanon.addCommand({
    name: 'clear',
    aliases: ['cls'],
    preview: 'clear the file',
    execute: function(instruction) {
        bespin.get("editor").model.clear();
    }
});

/**
 * 'quota' command
 */
canon.rootCanon.addCommand({
    name: 'quota',
    preview: 'show your quota info',
    megabytes: function(bytes) {
        return (bytes / 1024 / 1024).toFixed(2);
    },
    execute: function(instruction) {
        var es = bespin.get('editSession');
        var output = "You have " + this.megabytes(es.quota - es.amountUsed) +
                     " MB free space to put some great code!<br>" +
                     "Used " + this.megabytes(es.amountUsed) + " MB " +
                     "out of your " + this.megabytes(es.quota) + " MB quota.";
        instruction.addOutput(output);
    }
});

/**
 * 'rescan' command
 */
canon.rootCanon.addCommand({
    name: 'rescan',
    takes: ['project'],
    preview: 'update the project catalog of files used by quick open',
    execute: function(instruction, project) {
        if (!project) {
            var session = bespin.get('editSession');
            if (session) {
                project = editSession.project;
            }
        }

        bespin.get("server").rescan(project, instruction, {
            onSuccess: instruction.link(function(response) {
                instruction.addOutput(response);
                instruction.unlink();
            }),
            onFailure: instruction.link(function(xhr) {
                instruction.addErrorOutput(xhr.responseText);
                instruction.unlink();
            })
        });
    }
});

// delta is something like: [[0,"readme.txt\nreadme.txt\n\n"],[-1,"\n411:39f6f1fe17bf"]]
// which means keep the first section, remove the latter
// we need to loop over this creating a list of start-change-offset
// and end-change-offset pairs, which we can turn into
// start/end-change-row/col using the utils in session.js
// we then tweak the editor paint to paint a background
// based on these offsets
// and then do this on a mouseover with hidden command

/**
 * 'timemachine' command
 */
canon.rootCanon.addCommand({
    name: 'timemachine',
    takes: ['revision'],
    preview: 'look at older versions of the current file',
    completeText: 'No-arguments: display list of older versions, add revision to compare with a specific version',
    execute: function(instruction, revision) {
        var self = this;
        if (!revision) {
            revision = "on";
        }

        var editor = bespin.get('editor');
        var session = bespin.get("editSession");

        var url;
        if (revision == "on") {
            url = path.combine('/history/at', session.project, session.path);
            bespin.get("server").request('GET', url, null, {
                evalJSON: true,
                onSuccess: instruction.link(function(history) {
                    instruction.setElement(self.historyToElement(history));
                    instruction.unlink();
                }),
                onFailure: instruction.link(function(xhr) {
                    instruction.addErrorOutput(xhr.responseText);
                    instruction.unlink();
                })
            });
        } else if (revision == "off") {
            editor.setReadOnly(self.prevROState);
            self.prevROState = undefined;

            editor.model.insertDocument(self.nowText);
            self.nowText = undefined;

            session.continueSession();
            self.inTimeMachine = false;
            instruction.unlink();
        } else {
            // This is where we need to do a diff and patch in to the editor
            // display
            url = path.combine('/file/at', session.project, session.path);
            url += "?revision=" + revision;
            bespin.get("server").request('GET', url, null, {
                onSuccess: instruction.link(function(older) {

                    if (!self.inTimeMachine) {
                        self.nowText = editor.model.getDocument();
                        session.pauseSession();

                        self.prevROState = editor.readonly;
                        editor.setReadOnly(true);
                    }
                    self.inTimeMachine = true;

                    editor.model.insertDocument(older);

                    var dmp = new diff_match_patch();

                    var delta = dmp.diff_main(self.nowText, older);

                    // dmp.diff_cleanupSemantic(delta);
                    var offset = 0;
                    var changes = [];
                    delta.forEach(function(region) {
                        switch (region[0]) {
                        case DIFF_EQUAL:
                            offset += region[1].length;
                            break;
                        case DIFF_INSERT:
                            var end = offset + region[1].length;
                            changes.push({
                                type: DIFF_INSERT,
                                start: session.convertOffsetToRowCol(offset),
                                end: session.convertOffsetToRowCol(end)
                            });
                            offset = end;
                            console.log("insert", region[1].length, " chars");
                            break;
                        case DIFF_DELETE:
                            changes.push({
                                type: DIFF_DELETE,
                                start: session.convertOffsetToRowCol(offset),
                                end: session.convertOffsetToRowCol(offset)
                            });
                            console.log("delete", region[1].length, " chars");
                            break;
                        default:
                            console.error("delta region with unknown type");
                        }
                    });

                    editor.ui.setChanges(changes);

                    bespin.publish("ui:escape", {});
                    instruction.unlink();
                }),
                onFailure: instruction.link(function(xhr) {
                    instruction.addErrorOutput(xhr.responseText);
                    instruction.unlink();
                })
            });
        }
    },
    historyToElement: function(history) {
        var table = dojo.create("table", { });
        history.forEach(function(entry) {
            var row = dojo.create("tr", { }, table);

            dojo.create("td", {
                innerHTML: util.formatDate(new Date(entry.date * 1000))
            }, row);
            var cell = dojo.create("td", { }, row);
            dojo.create("a", {
                innerHTML: "Overlay",
                onclick: function() {
                    cliController.executeCommand("timemachine " + entry.id);
                }
            }, cell);
            dojo.create("td", { innerHTML: entry.description }, row);
        });
        return table;
    }
});

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
exports._parseArguments = function(givenPath, opts) {
    opts = opts || {};

    var session = bespin.get("editSession");

    // Sort out the context
    var project = session.project;
    var path = session.path || "";
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

    return { project:project, path:path, filter:filter, projectPath:projectPath };
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
exports._findCompletionsHelper = function(query, callback, options) {
    var givenPath = query.action.join(" ");
    var list = exports._parseArguments(givenPath, {filter: true});
    var self = this;
    bespin.get('server').list(list.project, list.path, function(files) {
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
