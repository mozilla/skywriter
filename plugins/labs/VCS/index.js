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

var server = require("BespinServer").server;
var Promise = require("bespin:promise").Promise;

var kc = require("UserIdent:kc");
var util = require("bespin:util/util");
var project_m = require("Project");

/**
 * Add command.
 * Add the specified files on the next commit
 */
exports.add = function(env, args, request) {
    exports._performVCSCommandWithFiles("add", env, args, request);
};

/**
 * Commit command.
 * Commit all outstanding changes
 */
// exports.commands.addCommand({
//     "name": "vcs commit",
//     "params":
//     [
//         {
//             "name": "message",
//             "type": "text",
//             "description": "???"
//         }
//     ],
//     "aliases": [ "ci" ],
//     "description": "Commit to the local (in-bespin) repository",
//     execute: function(env, args, request) {
//         var doCommit = function(values) {
//             var project;
// 
//             var session = bespin.get("editSession");
//             if (session) {
//                 project = session.project;
//             }
// 
//             if (!project) {
//                 request.doneWithError("You need to pass in a project");
//                 return;
//             }
//             vcs(project,
//                 { command: [ "commit", "-m", values.message ] },
//                 request,
//                 exports._createStandardHandler(request));
//         };
// 
//         // for now, be a nagger and ask to save first using an ugly confirm()
//         if (bespin.get("editor").dirty) {
//             if (confirm("The file that is currently open has unsaved content. Save the file first, and then rerun the command?")) {
//                 bespin.get("editor").saveFile();
//             }
//         } else if (!args.message) {
//             exports.getInfoFromUser(request, doCommit, {getMessage: true});
//         } else {
//             doCommit(args.message);
//         }
//     }
// });

/**
 * Diff command.
 * Report on the changes between the working files and the repository
 */
exports.diff = function(env, args, request) {
    exports._performVCSCommandWithFiles("diff", env, args, request);
};

/**
 * Revert command.
 * Report on the changes between the working files and the repository
 */
exports.revert = function(env, args, request) {
    exports._performVCSCommandWithFiles("revert", env, args, request, {
        acceptAll: true
    }).then(function() {
        var buffer = env.get("buffer");
        buffer.reload();
    });
};


/**
 * Push command.
 * Push changes to the specified destination
 */
exports.push = function(env, args, request) {
    var file = env.get("file");
    if (!file) {
        request.doneWithError("There is no currently opened file.");
        return;
    }
    var parts = project_m.getProjectAndPath(file.get("path"));

    var project = parts[0];
    
    if (!project) {
        request.doneWithError("There is no active project.");
        return;
    }

    var sendRequest = function(kcpass) {
        var command = {
            command: ["push", "_BESPIN_PUSH"]
        };

        if (kcpass) {
            command.kcpass = kcpass;
        }

        var pr = vcs(project,command);
        exports._createStandardHandler(pr, request);
    };

    exports._getRemoteauth(project).then(function(remoteauth) {
        if (remoteauth == "both") {
            kc.getKeychainPassword().then(sendRequest);
        } else {
            sendRequest(undefined);
        }
    });
    
    request.async();
};

/**
 * Remove command.
 * Remove the specified files on the next commit
 */
// exports.commands.addCommand({
//     "name": "vcs remove",
//     "aliases": [ "rm" ],
//     "description": "Remove a file from version control (also deletes it)",
//     "params":
//     [
//         {
//             "name": "*" ,
//             "type": "text",
//             "description": ""
//         }
//     ],
//     "manual": "The files presented will be deleted and removed from version control.",
//     execute: function(env, args, request) {
//         exports._performVCSCommandWithFiles("remove", request, args,
//                 { acceptAll: false });
//     }
// });

/**
 * Resolved command.
 * Retry file merges from a merge or update
 */
// exports.commands.addCommand({
//     "name": "vcs resolved",
//     "params":
//     [
//         {
//             "name": "files" ,
//             "type": "[text]",
//             "description": "Use the current file, add -a for all files or add filenames"
//         }
//     ],
//     "aliases": [ "resolve" ],
//     "description": "Mark files as resolved",
//     "manual": "Without any options, the vcs resolved command will mark the currently selected file as resolved. If you pass in -a, the command will resolve <em>all</em> files. Finally, you can list files individually.",
//     execute: function(env, args, request) {
//         exports._performVCSCommandWithFiles("resolved", request, args);
//     }
// });

/**
 * Status command.
 * Show changed files under the working directory
 */
exports.status = function(env, args, request) {
    var file = env.get("file");
    if (!file) {
        request.doneWithError("There is no currently opened file.");
        return;
    }
    var parts = project_m.getProjectAndPath(file.get("path"));
    var project = parts[0];
    
    if (!project) {
        request.doneWithError("There is no active project.");
        return;
    }
    
    var pr = vcs(project, { command: [ "status" ] });
    pr = exports._createStandardHandler(pr, request);
    request.async();
};

/**
 * Log command.
 * Show changed files under the working directory
 */
exports.log = function(env, args, request) {
    var file = env.get("file");
    if (!file) {
        request.doneWithError("There is no currently opened file.");
        return;
    }
    var parts = project_m.getProjectAndPath(file.get("path"));
    var project = parts[0];
    
    if (!project) {
        request.doneWithError("There is no active project.");
        return;
    }
    
    var pr = vcs(project, { command: [ "log", parts[1] ] });
    pr = exports._createStandardHandler(pr, request);
    request.async();
};

/**
 * Update command.
 * Pull updates from the repository into the current working directory
 */
exports.update = function(env, args, request) {
    var file = env.get("file");
    if (!file) {
        request.doneWithError("There is no currently opened file.");
        return;
    }
    var parts = project_m.getProjectAndPath(file.get("path"));

    var project = parts[0];
    
    if (!project) {
        request.doneWithError("There is no active project.");
        return;
    }

    var sendRequest = function(kcpass) {
        var command = {
            command: ["update", "_BESPIN_REMOTE_URL"]
        };

        if (kcpass) {
            command.kcpass = kcpass;
        }

        var pr = vcs(project,command);
        exports._createStandardHandler(pr, request);
    };

    exports._getRemoteauth(project).then(function(remoteauth) {
        if (remoteauth == "both") {
            kc.getKeychainPassword().then(sendRequest);
        } else {
            sendRequest(undefined);
        }
    });
    
    request.async();
};

/**
 * Initialize an HG repository
 */
// exports.hgCommands.addCommand({
//     "name": "hg init",
//     "description": "initialize a new hg repository",
//     "manual": "This will create a new repository in this project.",
//     execute: function(env, args, request) {
//         var project;
// 
//         var session = bespin.get("editSession");
//         if (session) {
//             project = session.project;
//         }
// 
//         if (!project) {
//             request.doneWithError("You need to pass in a project");
//             return;
//         }
// 
//         vcs(project,
//             { command: ["hg", "init"] },
//             request,
//             exports._createStandardHandler(request));
//     }
// });

/**
 * Command store for the Subversion commands
 * (which are subcommands of the main 'svn' command)
 */
// exports.svnCommands = new command.Store(command.store, {
//     "name": "svn",
//     "description": "run a Subversion command"
// });

// exports.svnCommands.genericExecute = function(env, args, request) {
//     var project;
// 
//     var session = bespin.get("editSession");
//     if (session) {
//         project = session.project;
//     }
// 
//     if (!project) {
//         request.doneWithError("You need to be editing in a project");
//         return;
//     }
//     var command = args.varargs;
//     command.splice(0, 0, "svn", request.command.name);
//     if (request.command.keychain || request.command.prompting) {
//         var prompts;
//         if (request.command.prompting) {
//             prompts = request.command.prompting(command);
//         } else {
//             prompts = { getKeychain: true };
//         }
// 
//         exports.getInfoFromUser(request, function(values) {
//             var commandMsg = { command: command };
// 
//             if (values.message) {
//                 command.splice(2, 0, "-m", values.message);
//             }
// 
//             if (values.kcpass) {
//                 commandMsg.kcpass = values.kcpass;
//             }
// 
//             vcs(project,
//                 commandMsg,
//                 request,
//                 exports._createStandardHandler(request, { escape: true }));
//         }, prompts);
//     } else {
//         vcs(project,
//             { command: command },
//             request,
//             exports._createStandardHandler(request, { escape: true }));
//     }
// };

/**
 * Generic vcs remote command handler
 */
exports._performVCSCommandWithFiles = function(vcsCommand, env, args, request, 
                                               options) {
    options = options || { acceptAll: true };
    var project, path, command, pr, message;
    
    var file = env.get("file");
    if (!file) {
        message = "There is no currently opened file.";
        request.doneWithError();
        pr = new Promise();
        pr.reject({message: message});
        return pr;
    }
    var parts = project_m.getProjectAndPath(file.get("path"));
    
    project = parts[0];
    path = parts[1];

    if (!project) {
        message = "You need to be in a project to use this command";
        request.doneWithError(message);
        pr = new Promise();
        pr.reject({message: message});
        return pr;
    }

    if (args.files.length == 0) {
        if (!path) {
            var dasha = "";
            if (options.acceptAll) {
                dasha = ", or use -a for all files.";
            }
            message = "You must select a file to " + vcsCommand + dasha;
            pr = new Promise();
            pr.reject({message: message});
            request.doneWithError();
            return pr;
        }
        command = [vcsCommand, path];
    } else if (args.files == "-a" && options.acceptAll) {
        command = [vcsCommand];
    } else {
        command = [vcsCommand, args.files];
    }
    
    
    pr = vcs(project, { command: command });
    pr = exports._createStandardHandler(pr, request);
    
    request.async();
    return pr;
};

/**
 * The cache for <pre>exports._getRemoteauth</pre>
 * @see exports._getRemoteauth
 */
exports._remoteauthCache = {};


/**
 * Finds out if the given project requires remote authentication the values
 * returned are "", "both" (for read and write), "write" when only writes
 * require authentication the result is published as an object with project,
 * remoteauth values to vcs:remoteauthUpdate and sent to the callback.
 */
var remoteauth = function(project) {
    var pr = new Promise();
    var url = "/vcs/remoteauth/" + escape(project.name) + "/";
    server.request("GET", url, null).then(
        function(result) {
            exports._remoteauthCache[project.name] = result;
            pr.resolve(result);
        }
    );
    return pr;
};

/**
 * Looks in the cache or calls to the server to find out if the given project
 * requires remote authentication.
 */
exports._getRemoteauth = function(project) {
    var cached = exports._remoteauthCache[project];
    if (cached === undefined) {
        return remoteauth(project);
    }
    // work from cache
    var pr = new Promise();
    pr.resolve(cached);
    return pr;
};

/**
 * Catch publishes primarily from bespin.client.Server.remoteauth (below)
 */
// bespin.subscribe("vcs:remoteauthUpdate", function(event) {
//     exports._remoteauthCache[event.project] = event.remoteauth;
// });

/**
 * Most of the VCS commands just want to output to the CLI
 */
exports._createStandardHandler = function(requestpr, request, options) {
    options = options || {};
    
    var pr = new Promise();
    
    requestpr.then(function(response) {
        if (!response.success) {
            // If the server gets an exception, response is
            // a string with the error
            if (response.output === undefined) {
                response = { output: response, success: false };
            }
            
            SC.run(function() {
                request.doneWithError("<pre>" + response.output + "</pre>");
                pr.reject(response);
            });
        } else {
            var output = response.output;
            if (options.escape) {
                output = output.replace(/</g, "&lt;");
            }
            
            SC.run(function() {
                request.done("<pre>" + output + "</pre>");

                pr.resolve(response);
            });
        }
    }, function(error) {
        request.doneWithError(error.xhr.response);
    });
    
    return pr;
};

/**
 * Create an event handler to sort out the output if the user clicks cancel
 * in one of the popup dialogs
 */
exports._createCancelHandler = function() {
    return function() {
        request.doneWithError("Cancelled");
    };
};


/**
 * Run a Version Control System (VCS) command.
 * The command object should have a command attribute on it that is a list
 * of the arguments.
 * Commands that require authentication should also have kcpass, which is a
 * string containing the user's keychain password.
 */
var vcs = function(project, command, request, opts) {
    var url = "/vcs/command/" + project.name + "/";
    return server.requestDisconnected("POST", url, JSON.stringify(command), opts);
};

/**
 * Sets authentication for a project
 */
var setauth = function(project, form, opts) {
    var url = "/vcs/setauth/" + project + "/";
    bespin.get("server").request("POST", url, dojo.formToQuery(form), opts);
};

/**
 * Clone a remote repository
 */
var clone = function(data, request, opts) {
    bespin.get("server").requestDisconnected("POST", "/vcs/clone/", data, request, opts);
};

