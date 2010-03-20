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
 * Presents the user with a dialog requesting their keychain password.
 * If they click the submit button, the password is sent to the callback.
 * If they do not, the callback is not called.
 */
exports.getInfoFromUser = function(request, callback, opts) {
    var kcpass;
    opts = opts || {};

    // If the password is cached and the caller doesn't
    // need a message entered, then we can return right away.
    if (exports._keychainpw && !opts.getMessage) {
        callback({kcpass: exports._keychainpw});
        return;
    }

    var saveform = function(e) {
        var values = {};
        if (opts.getKeychain) {
            values.kcpass = kcpass.value;
            exports._justSetKeychainpw = true;
            exports._keychainpw = kcpass.value;
        }

        if (opts.getMessage) {
            values.message = messagefield.value;
        }

        callback(values);
        util.stopEvent(e);
        return false;
    };

    var vcsauth = dojo.create("form", { onsubmit: saveform });
    var table = dojo.create("table", { }, vcsauth);

    var tr, td;

    var focus = null;

    if (opts.getKeychain) {
        // if we already have the password, we don't need to prompt
        // for it!
        if (exports._keychainpw) {
            kcpass = {value: exports._keychainpw};
        } else {
            tr = dojo.create("tr", { }, table);
            dojo.create("td", { innerHTML: "Keychain password: " }, tr);
            td = dojo.create("td", { }, tr);
            kcpass = dojo.create("input", { type: "password" }, td);
            dojo.create("span", {
                style: "padding-left:5px; color:#f88;",
                innerHTML: opts.errmsg || ""
            }, td);

            focus = kcpass;
        }
    }

    if (opts.getMessage) {
        tr = dojo.create("tr", {}, table);
        td = dojo.create("td", {colspan: "2",
            innerHTML: "Commit message:"}, tr);

        tr = dojo.create("tr", {}, table);
        td = dojo.create("td", {colspan: "2"}, tr);
        var messagefield = dojo.create("textarea", {rows: 5, cols: 65}, td);

        if (!focus) { focus = messagefield; }
    }

    tr = dojo.create("tr", { }, table);
    dojo.create("td", { innerHTML: "&nbsp;" }, tr);
    td = dojo.create("td", { }, tr);

    dojo.create("input", {
        type: "button",
        value: "Submit",
        onclick: saveform
    }, td);

    dojo.create("input", {
        type: "button",
        value: "Cancel",
        onclick: exports._createCancelHandler()
    }, td);

    request.add(vcsauth);

    if (focus) {
        focus.focus();
    }
};

/**
 * Add command.
 * Add the specified files on the next commit
 */
// exports.commands.addCommand({
//     "name": "vcs add",
//     "description": "Adds missing files to the project",
//     "params":
//     [
//         {
//             "name": "files",
//             "type": "[text]",
//             "description": "Use the current file, add -a for all files or add filenames"
//         }
//     ],
//     "manual": "Without any options, the vcs add command will add the currently selected file. If you pass in -a, the command will add <em>all</em> files. Finally, you can list files individually.",
//     execute: function(env, args, request) {
//         exports._performVCSCommandWithFiles("add", request, args);
//     }
// });

/**
 * Clone command.
 * Create a copy of an existing repository in a new directory
 */
// exports.commands.addCommand({
//     "name": "vcs clone",
//     "params":
//     [
//         {
//             "name": "url",
//             "type": "text",
//             "description": "???"
//         }
//     ],
//     "aliases": [ "checkout" ],
//     "description": "checkout or clone the project into a new Bespin project",
//     /**
//      * Display the clone dialog to allow the user to fill out additional details
//      * to the clone process
//      */
//     execute: function(env, args, request) {
//         var url = args.url || "";
// 
//         var form = dojo.create("form", {
//             onsubmit: function(e) {
//                 util.stopEvent(e);
//                 var data = dojo.formToObject(form);
// 
//                 var newProjectName = data.dest;
// 
//                 if (data.vcs == "svn") {
//                     delete data.vcsuser;
//                 } else {
//                     var currentVcsUser = bespin.get("settings").get("vcsuser");
//                     if (!data.vcsuser || data.vcsuser == currentVcsUser) {
//                         delete data.vcsuser;
//                     }
//                 }
// 
//                 // prune out unnecessary values
//                 if (data.remoteauth == "") {
//                     delete data.push;
//                     delete data.authtype;
//                     delete data.username;
//                     delete data.password;
//                 } else {
//                     if (data.authtype == "ssh") {
//                         delete data.password;
//                     }
//                 }
//                 data = util.objectToQuery(data);
//                 var outer = dojo.create("div", {});
//                 var throbber = dojo.create("img",
//                     {src: "/images/throbber.gif"}, outer);
//                 var status = dojo.create("span", {innerHTML: "Working..."},
//                             outer);
//                 request.add(outer);
//                 clone(data, request, exports._createStandardHandler(request, {
//                     onSuccess: function() {
//                         bespin.publish("project:created", { project: newProjectName });
//                     },
//                     onPartial: function(output) {
//                         status.innerHTML = output;
//                     }
//                 }));
//             },
//             method: "POST"
//         });
// 
//         var setUserfields = function() {
//             var newval = authtypeField.value;
//             if (newval == "ssh") {
//                 dojo.query("tr.userfields").style("display", "none");
//             } else {
//                 dojo.query("tr.userfields").style("display", "table-row");
//             }
//         };
// 
//         var table = dojo.create("table", {}, form);
//         var tbody = dojo.create("tbody", {}, table);
//         var row = dojo.create("tr", {}, tbody);
//         var cell = dojo.create("th", {colspan: "2",
//             innerHTML: "Add Project from Source Control?"}, row);
// 
//         row = dojo.create("tr", {}, tbody);
//         cell = dojo.create("td", {innerHTML: "URL:"}, row);
//         cell = dojo.create("td", {}, row);
// 
//         // vcs_source
//         var sourceField = dojo.create("input", {type: "text", name: "source", value: url,
//             style: "width: 85%"}, cell);
// 
//         row = dojo.create("tr", {}, tbody);
//         cell = dojo.create("td", {innerHTML: "Project name:"}, row);
//         cell = dojo.create("td", {}, row);
//         cell.innerHTML = "<input type='text' name='dest' value=''> (defaults to last part of URL path)";
// 
//         row = dojo.create("tr", {}, tbody);
//         cell = dojo.create("td", {innerHTML: "VCS Type:"}, row);
//         cell = dojo.create("td", {}, row);
//         // vcs
//         var select = dojo.create("select", {
//             name: "vcs",
//             onchange: function(e) {
//                 if (this.value == "svn") {
//                     dojo.style(vcsUserRow, "display", "none");
//                 } else {
//                     dojo.style(vcsUserRow, "display", "table-row");
//                 }
//             }
//         }, cell);
//         var vcsField = select;
//         dojo.create("option", {value: "svn", innerHTML: "Subversion (svn)"}, select);
//         dojo.create("option", {value: "hg", innerHTML: "Mercurial (hg)"}, select);
// 
//         // VCS User
//         row = dojo.create("tr", {
//             style: "display: none"
//         }, tbody);
//         var vcsUserRow = row;
//         cell = dojo.create("td", {innerHTML: "VCS User:"}, row);
//         cell = dojo.create("td", {}, row);
//         var vcsUser = dojo.create("input", {
//             name: "vcsuser",
//             value: bespin.get("settings").get("vcsuser") || ""
//         }, cell);
// 
//         row = dojo.create("tr", {}, tbody);
//         cell = dojo.create("td", {innerHTML: "Authentication:"}, row);
//         cell = dojo.create("td", {}, row);
// 
//         // remoteauth
//         select = dojo.create("select", {
//             name: "remoteauth",
//             onchange: function(e) {
//                 var newval = this.value;
//                 if (newval == "") {
//                     dojo.query("tr.authfields").style("display", "none");
//                 } else {
//                     dojo.query("tr.authfields").style("display", "table-row");
//                     if (authtypeField.value == "ssh") {
//                         dojo.query("tr.userfields").style("display", "none");
//                     }
//                 }
//                 if (vcsField.value == "svn") {
//                     dojo.style(pushRow, "display", "none");
//                     authtypeField.value = "password";
//                     setUserfields();
//                     dojo.style(authtypeRow, "display", "none");
//                 } else {
//                     dojo.style(authtypeRow, "display", "table-row");
//                 }
//                 setTimeout(function() { kcpassField.focus(); }, 10);
//             }}, cell);
//         dojo.create("option", {value: "",
//             innerHTML: "None (read-only access to the remote repo)"}, select);
//         dojo.create("option", {value: "write",
//             innerHTML: "Only for writing"}, select);
//         dojo.create("option", {value: "both",
//             innerHTML: "For reading and writing"}, select);
// 
//         row = dojo.create("tr", {style: "display: none",
//             className: "authfields"}, tbody);
//         cell = dojo.create("td", {innerHTML: "Keychain password:"}, row);
//         cell = dojo.create("td", {}, row);
// 
//         // kcpass
//         var kcpassField = dojo.create("input", {
//             type: "password",
//             name: "kcpass"
//         }, cell);
// 
//         // push_row
//         var pushRow = row = dojo.create("tr", {style: "display:none", className: "authfields"}, tbody);
//         dojo.create("td", {innerHTML: "Push to URL"}, row);
//         cell = dojo.create("td", {}, row);
//         // pushfield
//         var pushField = dojo.create("input", {
//             type: "text",
//             name: "push",
//             style: "width:85%",
//             value: url
//         }, cell);
// 
//         // authtype_row
//         var authtypeRow = row = dojo.create("tr", {
//             style: "display: none",
//             className: "authfields"
//         }, tbody);
//         cell = dojo.create("td", {innerHTML: "Authentication type"}, row);
//         cell = dojo.create("td", {}, row);
// 
//         // authtype
//         var authtypeField = select = dojo.create("select", {
//             name: "authtype",
//             onchange: setUserfields
//         }, cell);
//         dojo.create("option", {value: "ssh", innerHTML: "SSH"}, select);
//         dojo.create("option", {
//             value: "password",
//             innerHTML: "Username/Password"
//         }, select);
// 
//         // username_row
//         row = dojo.create("tr", {style: "display:none",
//             className: "authfields"}, tbody);
//         dojo.create("td", {innerHTML: "Username"}, row);
//         cell = dojo.create("td", {}, row);
// 
//         // usernamefield
//         var usernameField = dojo.create("input", {
//             type: "text",
//             name: "username"
//         }, cell);
// 
//         // password_row
//         row = dojo.create("tr", {
//             style: "display:none",
//             className: "authfields userfields"
//         }, tbody);
//         dojo.create("td", { innerHTML: "Password" }, row);
//         cell = dojo.create("td", {}, row);
//         dojo.create("input", { type: "password", name: "password" }, cell);
//         row = dojo.create("tr", {}, tbody);
//         dojo.create("td", { innerHTML: "&nbsp;" }, row);
//         cell = dojo.create("td", {}, row);
//         // vcsauthsubmit
//         dojo.create("input", { type: "submit", value: "Ok" }, cell);
// 
//         // vcsauthcancel
//         dojo.create("input", {
//             type: "button",
//             value: "Cancel",
//             onclick: exports._createCancelHandler()
//         }, cell);
// 
//         request.add(form);
// 
//         sourceField.focus();
//     }
// });

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
// exports.commands.addCommand({
//     "name": "vcs diff",
//     "description": "Display the differences in the checkout out files",
//     "params":
//     [
//         {
//             "name": "files",
//             "type": "[text]",
//             "description": "Use the current file, add -a for all files or add filenames"
//         }
//     ],
//     "manual": "Without any options, the vcs diff command will diff the currently selected file against the repository copy. If you pass in -a, the command will diff <em>all</em> files. Finally, you can list files to diff individually.",
//     execute: function(env, args, request) {
//         exports._performVCSCommandWithFiles("diff", request, args);
//     }
// });

/**
 * Revert command.
 * Report on the changes between the working files and the repository
 */
// exports.commands.addCommand({
//     "name": "vcs revert",
//     "description": "Revert files back to their checked-in state",
//     "params":
//     [
//         {
//             "name": "files",
//             "type": "[text]",
//             "description": "Use the current file, add -a for all files or add filenames"
//         }
//     ],
//     "manual": "Without any options, the vcs revert command will revert the currently selected file against the repository copy. If you pass in -a, the command will revert <em>all</em> files. Finally, you can list files to revert individually. No backups are kept!",
//     execute: function(env, args, request) {
//         exports._performVCSCommandWithFiles("revert", request, args, {
//             acceptAll: true,
//             onSuccess: function() {
//                 // null means leave the same
//                 editor.openFile(null, null, { reload:true });
//             }
//         });
//     }
// });

/**
 * Retrieve an SSH public key for authentication use
 */
exports.getkey = function(env, args, request) {
    if (args.password == "") {
        args.password = undefined;
    }
    
    var pr = kc.getKeychainPassword().then(function(kcpass) {
        var pr;
        
        var url = "/vcs/getkey/";
        if (kcpass == null) {
            pr = server.request("POST", url, null);
        } else {
            var params = "kcpass=" + escape(kcpass);
            pr = server.request("POST", url, params);
        }
        
        pr.then(function(key) {
            request.done("Your SSH public key that Bespin can use for remote repository authentication:<br/>" + key);
        }, function(error) {
            if (error.status == "401") {
                kc.clearPassword();
                request.doneWithError("Incorrect keychain password!");
            } else {
                request.doneWithError("Error from server: " + error.message);
            }
        });
        
    }, function() {
        request.done("Canceled");
    });
};


/**
 * Push command.
 * Push changes to the specified destination
 */
// exports.commands.addCommand({
//     "name": "vcs push",
//     "description": "push to the remote repository",
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
//         exports.getInfoFromUser(request, function(values) {
//             vcs(project,
//                 { command: ["push", "_BESPIN_PUSH"], kcpass: values.kcpass },
//                 request,
//                 exports._createStandardHandler(request));
//         }, {getKeychain: true});
//     }
// });

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
// exports.commands.addCommand({
//     "name": "status",
//     "aliases": [ "st" ],
//     "description": "Display the status of the repository files.",
//     "manual": "Shows the current state of the files in the repository<br>M for modified, ? for unknown (you may need to add), R for removed, ! for files that are deleted but not removed",
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
//             { command: ["status"] },
//             request,
//             exports._createStandardHandler(request));
//     }
// });

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
    var pr = vcs(parts[0], { command: [ "log", parts[1] ] });
    pr = exports._createStandardHandler(pr, request);
    request.async();
};

/**
 * Update command.
 * Pull updates from the repository into the current working directory
 */
// exports.commands.addCommand({
//     "name": "update",
//     "aliases": [ "up", "co" ],
//     "description": "Update your working copy from the remote repository",
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
//         var sendRequest = function(values) {
//             var command = {
//                 command: ["update", "_BESPIN_REMOTE_URL"]
//             };
// 
//             if (values !== undefined) {
//                 command.kcpass = values.kcpass;
//             }
// 
//             vcs(project,
//                 command,
//                 request,
//                 exports._createStandardHandler(request));
//         };
// 
//         exports._getRemoteauth(project, function(remoteauth) {
//             console.log("remote auth is: " + remoteauth);
//             if (remoteauth == "both") {
//                 exports.getInfoFromUser(request, sendRequest,
//                         {getKeychain: true});
//             } else {
//                 sendRequest(undefined);
//             }
//         });
// 
//     }
// });

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
exports._performVCSCommandWithFiles = function(vcsCommand, request, args, options) {
    options = options || { acceptAll: true };
    var project;
    var path;
    var command;

    var session = bespin.get("editSession");
    if (session) {
        project = session.project;
        path = session.path;
    }

    if (!project) {
        request.doneWithError("You need to pass in a project");
        return;
    }

    if (args.varargs.length == 0) {
        if (!path) {
            var dasha = "";
            if (options.acceptAll) {
                dasha = ", or use -a for all files.";
            }
            request.doneWithError("You must select a file to " + vcsCommand + dasha);
            return;
        }
        command = [vcsCommand, path];
    } else if (args.varargs[0] == "-a" && options.acceptAll) {
        command = [vcsCommand];
    } else {
        command = [vcsCommand].concat(args.varargs);
    }

    var handlerOptions = {};
    if (options.onSuccess) {
        handlerOptions.onSuccess = options.onSuccess;
    }

    vcs(project,
        { command: command },
        request,
        exports._createStandardHandler(request, handlerOptions));
};

/**
 * The cache for <pre>exports._getRemoteauth</pre>
 * @see exports._getRemoteauth
 */
exports._remoteauthCache = {};

/**
 * Looks in the cache or calls to the server to find out if the given project
 * requires remote authentication.
 * The result is published at vcs:remoteauth:project
 */
exports._getRemoteauth = function(project, callback) {
    var cached = exports._remoteauthCache[project];
    if (cached === undefined) {
        remoteauth(project, callback);
        return;
    }
    // work from cache
    callback(cached);
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

            request.doneWithError("<pre>" + response.output + "</pre>");
            pr.reject(response);
        } else {
            var output = response.output;
            if (options.escape) {
                output = output.replace(/</g, "&lt;");
            }
            request.done("<pre>" + output + "</pre>");

            pr.resolve(response);
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
 * Extension to bespin.client.Server
 */

/**
 * Finds out if the given project requires remote authentication the values
 * returned are "", "both" (for read and write), "write" when only writes
 * require authentication the result is published as an object with project,
 * remoteauth values to vcs:remoteauthUpdate and sent to the callback.
 */
var remoteauth = function(project, callback) {
    var url = "/vcs/remoteauth/" + escape(project) + "/";
    bespin.get("server").request("GET", url, null, {
        onSuccess: function(result) {
            var event = {
                project: project,
                remoteauth: result
            };
            bespin.publish("vcs:remoteauthUpdate", event);
            callback(result);
        }
    });
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
 * Retrieves the user's SSH public key that can be used for VCS functions
 */
var getkey = function(kcpass, opts) {
};

/**
 * Clone a remote repository
 */
var clone = function(data, request, opts) {
    bespin.get("server").requestDisconnected("POST", "/vcs/clone/", data, request, opts);
};

