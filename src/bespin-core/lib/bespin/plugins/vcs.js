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

/**
 * Command store for the VCS commands
 * (which are subcommands of the main 'vcs' command)
 */
exports.commands = new bespin.command.Store(bespin.command.store, {
    name: 'vcs',
    preview: 'run a version control command',
    completeText: 'subcommands: add, clone, commit, diff, getkey, help, push, remove, resolved, update',
    subcommanddefault: 'help'
});

/**
 * Display sub-command help
 */
exports.commands.addCommand({
    name: 'help',
    takes: ['search'],
    preview: 'show commands for vcs subcommand',
    description: 'The <u>help</u> gives you access to the various commands in the vcs subcommand space.<br/><br/>You can narrow the search of a command by adding an optional search params.<br/><br/>Finally, pass in the full name of a command and you can get the full description, which you just did to see this!',
    completeText: 'optionally, narrow down the search',
    execute: function(instruction, extra) {
        var output = this.parent.getHelp(extra, {
            suffix: "For more information about Bespin's VCS support see the <a href='https://wiki.mozilla.org/Labs/Bespin/UserGuide#VCS_Commands' target='_blank'>VCS section of the user guide</a>."
        });
        instruction.addOutput(output);
    }
});

/**
 * Presents the user with a dialog requesting their keychain password.
 * If they click the submit button, the password is sent to the callback.
 * If they do not, the callback is not called.
 */
exports.getInfoFromUser = function(instruction, callback, opts) {
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
        instruction.unlink();
        dojo.stopEvent(e);
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
            var kcpass = {value: exports._keychainpw};
        } else {
            tr = dojo.create("tr", { }, table);
            dojo.create("td", { innerHTML: "Keychain password: " }, tr);
            td = dojo.create("td", { }, tr);
            var kcpass = dojo.create("input", { type: "password" }, td);
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
        onclick: exports._createCancelHandler(instruction)
    }, td);

    instruction.setElement(vcsauth);

    if (focus) {
        focus.focus();
    }
};

/**
 * Add command.
 * Add the specified files on the next commit
 */
exports.commands.addCommand({
    name: 'add',
    preview: 'Adds missing files to the project',
    takes: ['*'],
    completeText: 'Use the current file, add -a for all files or add filenames',
    description: 'Without any options, the vcs add command will add the currently selected file. If you pass in -a, the command will add <em>all</em> files. Finally, you can list files individually.',
    execute: function(instruction, args) {
        exports._performVCSCommandWithFiles("add", instruction, args);
    }
});

/**
 * Clone command.
 * Create a copy of an existing repository in a new directory
 */
exports.commands.addCommand({
    name: 'clone',
    takes: ['url'],
    aliases: ['checkout'],
    preview: 'checkout or clone the project into a new Bespin project',
    /**
     * Display the clone dialog to allow the user to fill out additional details
     * to the clone process
     */
    execute: function(instruction, url) {
        url = url || "";

        var form = dojo.create('form', {
            onsubmit: function(e) {
                dojo.stopEvent(e);
                var data = dojo.formToObject(form);

                instruction.addOutput("");

                var newProjectName = data.dest;

                if (data.vcs == "svn") {
                    delete data.vcsuser;
                } else {
                    var currentVcsUser = bespin.get("settings").get("vcsuser");
                    if (!data.vcsuser || data.vcsuser == currentVcsUser) {
                        delete data.vcsuser;
                    }
                }

                // prune out unnecessary values
                if (data.remoteauth == "") {
                    delete data.push;
                    delete data.authtype;
                    delete data.username;
                    delete data.password;
                } else {
                    if (data.authtype == "ssh") {
                        delete data.password;
                    }
                }
                data = dojo.objectToQuery(data);
                var outer = dojo.create("div", {});
                var throbber = dojo.create("img",
                    {src: "/images/throbber.gif"}, outer);
                var status = dojo.create("span", {innerHTML: "Working..."},
                            outer);
                instruction.setElement(outer);
                clone(data, instruction, exports._createStandardHandler(instruction, {
                    onSuccess: function() {
                        bespin.publish("project:created", {project: newProjectName});
                    },
                    onPartial: function(output) {
                        status.innerHTML = output;
                    }
                }));
            },
            method: "POST"
        });

        var setUserfields = function() {
            var newval = authtypeField.value;
            if (newval == "ssh") {
                dojo.query("tr.userfields").style("display", "none");
            } else {
                dojo.query("tr.userfields").style("display", "table-row");
            }
        };

        var table = dojo.create("table", {}, form);
        var tbody = dojo.create("tbody", {}, table);
        var row = dojo.create("tr", {}, tbody);
        var cell = dojo.create("th", {colspan: "2",
            innerHTML: "Add Project from Source Control?"}, row);

        row = dojo.create("tr", {}, tbody);
        cell = dojo.create("td", {innerHTML: "URL:"}, row);
        cell = dojo.create("td", {}, row);

        // vcs_source
        var sourceField = dojo.create("input", {type: "text", name: "source", value: url,
            style: "width: 85%"}, cell);

        row = dojo.create("tr", {}, tbody);
        cell = dojo.create("td", {innerHTML: "Project name:"}, row);
        cell = dojo.create("td", {}, row);
        cell.innerHTML = '<input type="text" name="dest" value=""> (defaults to last part of URL path)';

        row = dojo.create("tr", {}, tbody);
        cell = dojo.create("td", {innerHTML: "VCS Type:"}, row);
        cell = dojo.create("td", {}, row);
        // vcs
        var vcsField = select = dojo.create("select", {name:"vcs",
            onchange: function(e) {
                if (this.value == "svn") {
                    dojo.style(vcsUserRow, "display", "none");
                } else {
                    dojo.style(vcsUserRow, "display", "table-row");
                }
            }
        }, cell);
        dojo.create("option", {value: "svn", innerHTML: "Subversion (svn)"}, select);
        dojo.create("option", {value: "hg", innerHTML: "Mercurial (hg)"}, select);

        // VCS User
        var vcsUserRow = row = dojo.create("tr", {
            style: "display: none"
        }, tbody);
        cell = dojo.create("td", {innerHTML: "VCS User:"}, row);
        cell = dojo.create("td", {}, row);
        var vcsUser = dojo.create("input", {
            name: "vcsuser",
            value: bespin.get("settings").get("vcsuser") || ""
        }, cell);

        row = dojo.create("tr", {}, tbody);
        cell = dojo.create("td", {innerHTML: "Authentication:"}, row);
        cell = dojo.create("td", {}, row);

        // remoteauth
        select = dojo.create("select", {name: "remoteauth",
            onchange: function(e) {
                var newval = this.value;
                if (newval == "") {
                    dojo.query("tr.authfields").style("display", "none");
                } else {
                    dojo.query("tr.authfields").style("display", "table-row");
                    if (authtypeField.value == "ssh") {
                        dojo.query("tr.userfields").style("display", "none");
                    }
                }
                if (vcsField.value == "svn") {
                    dojo.style(pushRow, "display", "none");
                    authtypeField.value = "password";
                    setUserfields();
                    dojo.style(authtypeRow, "display", "none");
                } else {
                    dojo.style(authtypeRow, "display", "table-row");
                }
                setTimeout(function() { kcpassField.focus(); }, 10);
            }}, cell);
        dojo.create("option", {value: "",
            innerHTML: "None (read-only access to the remote repo)"}, select);
        dojo.create("option", {value: "write",
            innerHTML: "Only for writing"}, select);
        dojo.create("option", {value: "both",
            innerHTML: "For reading and writing"}, select);

        row = dojo.create("tr", {style: "display: none",
            className: "authfields"}, tbody);
        cell = dojo.create("td", {innerHTML: "Keychain password:"}, row);
        cell = dojo.create("td", {}, row);

        // kcpass
        var kcpassField = dojo.create("input", {type: "password", name: "kcpass"}, cell);

        // push_row
        var pushRow = row = dojo.create("tr", {style: "display:none", className: "authfields"}, tbody);
        dojo.create("td", {innerHTML: "Push to URL"}, row);
        cell = dojo.create("td", {}, row);
        // pushfield
        var pushField = dojo.create("input", {type: "text", name: "push",
            style: "width:85%", value: url}, cell);

        // authtype_row
        var authtypeRow = row = dojo.create("tr", {style: "display: none", className: "authfields"}, tbody);
        cell = dojo.create("td", {innerHTML: "Authentication type"}, row);
        cell = dojo.create("td", {}, row);

        // authtype
        var authtypeField = select = dojo.create("select", {name: "authtype",
            onchange: setUserfields}, cell);
        dojo.create("option", {value: "ssh", innerHTML: "SSH"}, select);
        dojo.create("option", {value: "password",
            innerHTML: "Username/Password"}, select);

        // username_row
        row = dojo.create("tr", {style: "display:none",
            className: "authfields"}, tbody);
        dojo.create("td", {innerHTML: "Username"}, row);
        cell = dojo.create("td", {}, row);

        // usernamefield
        var usernameField = dojo.create("input", {type: "text", name: "username"}, cell);

        // password_row
        row = dojo.create("tr", {
            style: "display:none",
            className: "authfields userfields"
        }, tbody);
        dojo.create("td", {innerHTML: "Password"}, row);
        cell = dojo.create("td", {}, row);
        dojo.create("input", {type: "password", name: "password"}, cell);
        row = dojo.create("tr", {}, tbody);
        dojo.create("td", {innerHTML: "&nbsp;"}, row);
        cell = dojo.create("td", {}, row);
        // vcsauthsubmit
        dojo.create("input", {type: "submit", value: "Ok"}, cell);

        // vcsauthcancel
        dojo.create("input", {
            type: "button",
            value: "Cancel",
            onclick: exports._createCancelHandler(instruction)
        }, cell);

        instruction.setElement(form);

        sourceField.focus();
    }
});

/**
 * Commit command.
 * Commit all outstanding changes
 */
exports.commands.addCommand({
    name: 'commit',
    takes: ['message'],
    aliases: [ 'ci' ],
    preview: 'Commit to the local (in-bespin) repository',
    execute: function(instruction, message) {
        var doCommit = function(values) {
            var project;

            bespin.withComponent('editSession', function(editSession) {
                project = editSession.project;
            });

            if (!project) {
                instruction.addErrorOutput("You need to pass in a project");
                return;
            }
            vcs(project,
                { command: [ 'commit', '-m', values.message ] },
                instruction,
                exports._createStandardHandler(instruction));
        };

        // for now, be a nagger and ask to save first using an ugly confirm()
        if (bespin.get("editor").dirty) {
            if (confirm("The file that is currently open has unsaved content. Save the file first, and then rerun the command?")) {
                bespin.get("editor").saveFile();
            }
        } else if (!message) {
            exports.getInfoFromUser(instruction, doCommit, {getMessage: true});
        } else {
            doCommit(message);
        }
    }
});

/**
 * Diff command.
 * Report on the changes between the working files and the repository
 */
exports.commands.addCommand({
    name: 'diff',
    preview: 'Display the differences in the checkout out files',
    takes: ['*'],
    completeText: 'Use the current file, add -a for all files or add filenames',
    description: 'Without any options, the vcs diff command will diff the currently selected file against the repository copy. If you pass in -a, the command will diff <em>all</em> files. Finally, you can list files to diff individually.',
    execute: function(instruction, args) {
        exports._performVCSCommandWithFiles("diff", instruction, args);
    }
});

/**
 * Revert command.
 * Report on the changes between the working files and the repository
 */
exports.commands.addCommand({
    name: 'revert',
    preview: 'Revert files back to their checked-in state',
    takes: ['*'],
    completeText: 'Use the current file, add -a for all files or add filenames',
    description: 'Without any options, the vcs revert command will revert the currently selected file against the repository copy. If you pass in -a, the command will revert <em>all</em> files. Finally, you can list files to revert individually. No backups are kept!',
    execute: function(instruction, args) {
        exports._performVCSCommandWithFiles("revert", instruction, args, {
            acceptAll: true,
            onSuccess: function() {
                // null means leave the same
                editor.openFile(null, null, { reload:true });
            }
        });
    }
});

/**
 * Retrieve an SSH public key for authentication use
 */
exports.getkey = {
    name: 'getkey',
    takes: [ 'password' ],
    completeText: 'Recommended: Don\'t pass in a password, put it in the following dialog',
    preview: 'Get your SSH public key that Bespin can use for remote repository authentication. (May prompt for your keychain password)',
    execute: function(instruction, kcpass) {
        if (kcpass == '') {
            kcpass = undefined;
        }
        getkey(kcpass, {
            onSuccess: function(key) {
                var parent = dojo.create("div", {
                    innerHTML: "SSH public key that Bespin can use for remote repository authentication:<br/>"
                });
                var textarea = dojo.create("textarea", {
                    style: "width:400px; height:100px; overflow:auto;",
                    innerHTML: key,
                    readonly: true
                }, parent);
                instruction.setElement(parent);
                textarea.select();
            },

            /**
             * Retrieve the user's SSH public key using their keychain password.
             * This is required if they have not already set up a public key.
             */
            on401: function(xhr) {
                // If kcpass is non-empty then this is due to a rejected password
                var errmsg = (!kcpass || kcpass === "") ? "" : "Wrong password";
                exports.getInfoFromUser(instruction, function(values) {
                    exports.getkey.execute(instruction, values.kcpass);
                }, { errmsg: errmsg, getKeychain: true });
            },

            onFailure: function(xhr) {
                instruction.addErrorOutput("getkey failed: " + xhr.response);
            }
        });
    }
};

exports.commands.addCommand(exports.getkey);

/**
 * Push command.
 * Push changes to the specified destination
 */
exports.commands.addCommand({
    name: 'push',
    preview: 'push to the remote repository',
    execute: function(instruction, args) {
        var project;

        bespin.withComponent('editSession', function(editSession) {
            project = editSession.project;
        });

        if (!project) {
            instruction.addErrorOutput("You need to pass in a project");
            return;
        }

        exports.getInfoFromUser(instruction, function(values) {
            vcs(project,
                { command: ['push', '_BESPIN_PUSH'], kcpass: values.kcpass },
                instruction,
                exports._createStandardHandler(instruction));
        }, {getKeychain: true});
    }
});

/**
 * Remove command.
 * Remove the specified files on the next commit
 */
exports.commands.addCommand({
    name: 'remove',
    aliases: [ 'rm' ],
    preview: 'Remove a file from version control (also deletes it)',
    takes: ['*'],
    description: 'The files presented will be deleted and removed from version control.',
    execute: function(instruction, args) {
    exports._performVCSCommandWithFiles("remove", instruction, args,
            { acceptAll: false });
    }
});

/**
 * Resolved command.
 * Retry file merges from a merge or update
 */
exports.commands.addCommand({
    name: 'resolved',
    takes: ['*'],
    aliases: [ 'resolve' ],
    preview: 'Mark files as resolved',
    completeText: 'Use the current file, add -a for all files or add filenames',
    description: 'Without any options, the vcs resolved command will mark the currently selected file as resolved. If you pass in -a, the command will resolve <em>all</em> files. Finally, you can list files individually.',
    execute: function(instruction, args) {
        exports._performVCSCommandWithFiles("resolved", instruction, args);
    }
});

/**
 * Status command.
 * Show changed files under the working directory
 */
exports.commands.addCommand({
    name: 'status',
    aliases: [ 'st' ],
    preview: 'Display the status of the repository files.',
    description: 'Shows the current state of the files in the repository<br>M for modified, ? for unknown (you may need to add), R for removed, ! for files that are deleted but not removed',
    execute: function(instruction, args) {
        var project;

        bespin.withComponent('editSession', function(editSession) {
            project = editSession.project;
        });

        if (!project) {
            instruction.addErrorOutput("You need to pass in a project");
            return;
        }

        vcs(project,
            { command: ['status'] },
            instruction,
            exports._createStandardHandler(instruction));
    }
});

/**
 * Log command.
 * Show changed files under the working directory
 */
exports.commands.addCommand({
    name: 'log',
    preview: 'Display the changes to the current file.',
    description: '',
    execute: function(instruction, args) {
        var session = bespin.get("editSession");
        vcs(session.project,
            { command: [ 'log', session.path ] },
            instruction,
            exports._createStandardHandler(instruction, { acceptAll: true }));
    }
});

/**
 * Update command.
 * Pull updates from the repository into the current working directory
 */
exports.commands.addCommand({
    name: 'update',
    aliases: [ 'up', 'co' ],
    preview: 'Update your working copy from the remote repository',
    execute: function(instruction) {
        var project;

        bespin.withComponent('editSession', function(editSession) {
            project = editSession.project;
        });

        if (!project) {
            instruction.addErrorOutput("You need to pass in a project");
            return;
        }

        var sendRequest = function(values) {
            var command = {
                command: ['update', '_BESPIN_REMOTE_URL']
            };

            if (values !== undefined) {
                command.kcpass = values.kcpass;
            }

            vcs(project,
                command,
                instruction,
                exports._createStandardHandler(instruction));
        };

        exports._getRemoteauth(project, function(remoteauth) {
            console.log("remote auth is: " + remoteauth);
            if (remoteauth == "both") {
                exports.getInfoFromUser(instruction, sendRequest,
                        {getKeychain: true});
            } else {
                sendRequest(undefined);
            }
        });

    }
});

/**
 * Command store for the Mercurial commands
 * (which are subcommands of the main 'hg' command)
 */
exports.hgCommands = new bespin.command.Store(bespin.command.store, {
    name: 'hg',
    preview: 'run a Mercurial command',
    subcommanddefault: 'help'
});

/**
 * Display sub-command help
 */
exports.hgCommands.addCommand({
    name: 'help',
    takes: ['search'],
    preview: 'show commands for hg subcommand',
    description: 'The <u>help</u> gives you access to the various commands in the hg subcommand space.<br/><br/>You can narrow the search of a command by adding an optional search params.<br/><br/>Finally, pass in the full name of a command and you can get the full description, which you just did to see this!',
    completeText: 'optionally, narrow down the search',
    execute: function(instruction, extra) {
        var output = this.parent.getHelp(extra);
        instruction.addOutput(output);
    }
});

/**
 * Initialize an HG repository
 */
exports.hgCommands.addCommand({
    name: 'init',
    preview: 'initialize a new hg repository',
    description: 'This will create a new repository in this project.',
    execute: function(instruction) {
        var project;

        bespin.withComponent('editSession', function(editSession) {
            project = editSession.project;
        });

        if (!project) {
            instruction.addErrorOutput("You need to pass in a project");
            return;
        }

        vcs(project,
            { command: ['hg', 'init'] },
            instruction,
            exports._createStandardHandler(instruction));
    }
});

/**
 * Command store for the Subversion commands
 * (which are subcommands of the main 'svn' command)
 */
exports.svnCommands = new bespin.command.Store(bespin.command.store, {
    name: 'svn',
    preview: 'run a Subversion command',
    subcommanddefault: 'help'
});

/**
 * Display sub-command help
 */
exports.svnCommands.addCommand({
    name: 'help',
    takes: ['search'],
    preview: 'show commands for svn subcommand',
    description: 'The <u>help</u> gives you access to the various commands in the svn subcommand space.<br/><br/>You can narrow the search of a command by adding an optional search params.<br/><br/>Finally, pass in the full name of a command and you can get the full description, which you just did to see this!',
    completeText: 'optionally, narrow down the search',
    execute: function(instruction, extra) {
        var output = this.parent.getHelp(extra);
        instruction.addOutput(output);
    }
});

exports.svnCommands.genericExecute = function(instruction, args) {
    var project;

    bespin.withComponent('editSession', function(editSession) {
        project = editSession.project;
    });

    if (!project) {
        instruction.addErrorOutput("You need to be editing in a project");
        return;
    }
    var command = args.varargs;
    command.splice(0, 0, "svn", instruction.command.name);
    if (instruction.command.keychain || instruction.command.prompting) {
        var prompts;
        if (instruction.command.prompting) {
            prompts = instruction.command.prompting(command);
        } else {
            prompts = { getKeychain: true };
        }

        exports.getInfoFromUser(instruction, function(values) {
            var commandMsg = { command: command };

            if (values.message) {
                command.splice(2, 0, "-m", values.message);
            }

            if (values.kcpass) {
                commandMsg.kcpass = values.kcpass;
            }

            vcs(project,
                commandMsg,
                instruction,
                exports._createStandardHandler(instruction, { escape: true }));
        }, prompts);
    } else {
        vcs(project,
            { command: command },
            instruction,
            exports._createStandardHandler(instruction, { escape: true }));
    }
};

/**
 * Generic vcs remote command handler
 */
exports._performVCSCommandWithFiles = function(vcsCommand, instruction, args, options) {
    options = options || { acceptAll: true };
    var project;
    var path;

    bespin.withComponent('editSession', function(editSession) {
        project = editSession.project;
        path = editSession.path;
    });

    if (!project) {
        instruction.addErrorOutput("You need to pass in a project");
        return;
    }

    if (args.varargs.length == 0) {
        if (!path) {
            var dasha = "";
            if (options.acceptAll) {
                dasha = ", or use -a for all files.";
            }
            instruction.addErrorOutput("You must select a file to " + vcsCommand + dasha);
            return;
        }
        var command = [vcsCommand, path];
    } else if (args.varargs[0] == "-a" && options.acceptAll) {
        var command = [vcsCommand];
    } else {
        var command = [vcsCommand].concat(args.varargs);
    }

    var handlerOptions = {};
    if (options.onSuccess) {
        handlerOptions.onSuccess = options.onSuccess;
    }

    vcs(project,
        { command: command },
        instruction,
        exports._createStandardHandler(instruction, handlerOptions));
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
bespin.subscribe("vcs:remoteauthUpdate", function(event) {
    exports._remoteauthCache[event.project] = event.remoteauth;
});

/**
 * Most of the VCS commands just want to output to the CLI
 */
exports._createStandardHandler = function(instruction, options) {
    options = options || {};
    return {
        onPartial: options.onPartial,
        onSuccess: instruction.link(function(response) {
            if (!response.success) {
                // if the keychain password was just set,
                // it's possible there was an error with that,
                // so remove the cached one.
                if (exports._justSetKeychainpw) {
                    delete exports._keychainpw;
                    delete exports._justSetKeychainpw;
                }

                // If the server gets an exception, response is
                // a string with the error
                if (response.output === undefined) {
                    response = { output: response, success: false };
                }

                instruction.addErrorOutput("<pre>" + response.output + "</pre>");
                instruction.unlink();
                if (options.onFailure) {
                    console.log("Calling other onfailure");
                    options.onFailure(response);
                }
            } else {
                if (exports._justSetKeychainpw) {
                    delete exports._justSetKeychainpw;
                }

                var output = response.output;
                if (options.escape) {
                    output = output.replace(/</g, "&lt;");
                }
                instruction.addOutput("<pre>" + output + "</pre>");
                instruction.unlink();
                if (options.onSuccess) {
                    console.log("Calling other onsuccess");
                    options.onSuccess(response);
                }
            }
        }),
        onFailure: instruction.link(function(xhr) {
            instruction.addErrorOutput(xhr.response);
            instruction.unlink();
        })
    };
};

/**
 * Create an event handler to sort out the output if the user clicks cancel
 * in one of the popup dialogs
 */
exports._createCancelHandler = function(instruction) {
    return instruction.link(function() {
        instruction.addErrorOutput("Cancelled");
        instruction.unlink();
    });
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
    var url = '/vcs/remoteauth/' + escape(project) + '/';
    bespin.get('server').request('GET', url, null, {
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
var vcs = function(project, command, instruction, opts) {
    var url = '/vcs/command/' + project + '/';
    bespin.get('server').requestDisconnected('POST', url, JSON.stringify(command), instruction, opts);
};

/**
 * Sets authentication for a project
 */
var setauth = function(project, form, opts) {
    var url = '/vcs/setauth/' + project + '/';
    bespin.get('server').request('POST', url, dojo.formToQuery(form), opts);
};

/**
 * Retrieves the user's SSH public key that can be used for VCS functions
 */
var getkey = function(kcpass, opts) {
    var url = '/vcs/getkey/';
    if (kcpass == null) {
        bespin.get('server').request('POST', url, null, opts);
    } else {
        var params = "kcpass=" + escape(kcpass);
        bespin.get('server').request('POST', url, params, opts);
    }
};

/**
 * Clone a remote repository
 */
var clone = function(data, instruction, opts) {
    bespin.get('server').requestDisconnected('POST', '/vcs/clone/', data, instruction, opts);
};

/* PASTEHERE: VCS commands that are generated by paver generate_vcs */
exports.svnCommands.addCommand({
    name: 'add',
    takes: ['*'],
    preview: 'add: Put files and directories under version control, schedulingthem for addition to repository',
    description:         "usage: svn add [--help] [--quiet] [--changelist CHANGELIST] [--depth\n" +
        "               {empty,files,immediates,infinity}] [--force] [--no-ignore]\n" +
        "               [--auto-props] [--no-auto-props] [--parents]\n" +
        "               [files [files ...]]\n" +
        "\n" +
        "add: Put files and directories under version control, scheduling\n" +
        "them for addition to repository.  They will be added in next commit.\n" +
        "\n" +
        "positional arguments:\n" +
        "  files                 list of files to operate on\n" +
        "\n" +
        "optional arguments:\n" +
        "  --help, -h            show this message and exit\n" +
        "  --quiet, -q           print nothing, or only summary information\n" +
        "  --changelist CHANGELIST, --cl CHANGELIST\n" +
        "                        operate only on members of changelist ARG\n" +
        "  --depth {empty,files,immediates,infinity}\n" +
        "                        limit operation by depth ARG ('empty', 'files',\n" +
        "                        'immediates', or 'infinity')\n" +
        "  --force               force operation to run\n" +
        "  --no-ignore           disregard default and svn:ignore property ignores\n" +
        "  --auto-props          enable automatic properties\n" +
        "  --no-auto-props       disable automatic properties\n" +
        "  --parents             add intermediate parents\n" +
        "\n",
    execute: exports.svnCommands.genericExecute
});

exports.svnCommands.addCommand({
    name: 'merge',
    takes: ['*'],
    keychain: true,
    preview: 'Apply the differences between two sources to a working copy path',
    description:         "usage: svn merge [--help] [--revision REVISION] [--quiet] [--changelist\n" +
        "                 CHANGELIST] [--depth {empty,files,immediates,infinity}]\n" +
        "                 [--force] [--accept {base,working,mine-full,theirs-full}]\n" +
        "                 [--change CHANGE] [--dry-run] [--record-only] [--ignore-\n" +
        "                 ancestry IGNORE_ANCESTRY] [--reintegrate]\n" +
        "                 paths [paths ...]\n" +
        "\n" +
        "Apply the differences between two sources to a working copy path.\n" +
        "\n" +
        "usage: 1. merge sourceURL1[@N] sourceURL2[@M] [WCPATH]\n" +
        "       2. merge sourceWCPATH1@N sourceWCPATH2@M [WCPATH]\n" +
        "       3. merge [-c M[,N...] | -r N:M ...] SOURCE[@REV] [WCPATH]\n" +
        "\n" +
        "  1. In the first form, the source URLs are specified at revisions\n" +
        "     N and M.  These are the two sources to be compared.  The revisions\n" +
        "     default to HEAD if omitted.\n" +
        "\n" +
        "  2. In the second form, the URLs corresponding to the source working\n" +
        "     copy paths define the sources to be compared.  The revisions must\n" +
        "     be specified.\n" +
        "\n" +
        "  3. In the third form, SOURCE can be either a URL or a working copy\n" +
        "     path (in which case its corresponding URL is used).  SOURCE (in\n" +
        "     revision REV) is compared as it existed between revisions N and M\n" +
        "     for each revision range provided.  If REV is not specified, HEAD\n" +
        "     is assumed.  '-c M' is equivalent to '-r <M-1>:M', and '-c -M'\n" +
        "     does the reverse: '-r M:<M-1>'.  If no revision ranges are\n" +
        "     specified, the default range of 0:REV is used.  Multiple '-c'\n" +
        "     and/or '-r' instances may be specified, and mixing of forward\n" +
        "     and reverse ranges is allowed.\n" +
        "\n" +
        "  WCPATH is the working copy path that will receive the changes.\n" +
        "  If WCPATH is omitted, a default value of '.' is assumed, unless\n" +
        "  the sources have identical basenames that match a file within '.':\n" +
        "  in which case, the differences will be applied to that file.\n" +
        "\n" +
        "  NOTE:  Subversion will only record metadata to track the merge\n" +
        "  if the two sources are on the same line of history -- if the\n" +
        "  first source is an ancestor of the second, or vice-versa.  This is\n" +
        "  guaranteed to be the case when using the third form listed above.\n" +
        "  The --ignore-ancestry option overrides this, forcing Subversion to\n" +
        "  regard the sources as unrelated and not to track the merge.\n" +
        "\n" +
        "positional arguments:\n" +
        "  paths\n" +
        "\n" +
        "optional arguments:\n" +
        "  --help, -h            show this message and exit\n" +
        "  --revision REVISION, -r REVISION\n" +
        "                        ARG (some commands also take ARG1:ARG2 range) A\n" +
        "                        revision argument can be one of: NUMBER revision\n" +
        "                        number '{' DATE '}' revision at start of the date\n" +
        "                        'HEAD' latest in repository 'BASE' base rev of item's\n" +
        "                        working copy 'COMMITTED' last commit at or before BASE\n" +
        "                        'PREV' revision just before COMMITTED\n" +
        "  --quiet, -q           print nothing, or only summary information\n" +
        "  --changelist CHANGELIST, --cl CHANGELIST\n" +
        "                        operate only on members of changelist ARG\n" +
        "  --depth {empty,files,immediates,infinity}\n" +
        "                        limit operation by depth ARG ('empty', 'files',\n" +
        "                        'immediates', or 'infinity')\n" +
        "  --force               force operation to run\n" +
        "  --accept {base,working,mine-full,theirs-full}\n" +
        "                        specify automatic conflict resolution source\n" +
        "  --change CHANGE, -c CHANGE\n" +
        "                        the change made by revision ARG (like -r ARG-1:ARG) If\n" +
        "                        ARG is negative this is like -r ARG:ARG-1\n" +
        "  --dry-run             try operation but make no changes\n" +
        "  --record-only         mark revisions as merged (use with -r)\n" +
        "  --ignore-ancestry IGNORE_ANCESTRY\n" +
        "                        ignore ancestry when calculating merges\n" +
        "  --reintegrate         lump-merge all of source URL's unmerged changes\n" +
        "\n",
    execute: exports.svnCommands.genericExecute
});

exports.svnCommands.addCommand({
    name: 'blame',
    takes: ['*'],
    aliases: ['praise', 'annotate', 'ann'],
    keychain: true,
    preview: 'blame (praise, annotate, ann): Output the content of specified files with revision and author information in-line',
    description:         "usage: svn blame [--help] [--revision REVISION] [--quiet] [--verbose]\n" +
        "                 [--changelist CHANGELIST] [--depth\n" +
        "                 {empty,files,immediates,infinity}] [--xml] [--incremental]\n" +
        "                 [--force] [--use-merge-history]\n" +
        "                 [files [files ...]]\n" +
        "\n" +
        "blame (praise, annotate, ann): Output the content of specified files with revision and author information in-line.\n" +
        "\n" +
        "positional arguments:\n" +
        "  files                 list of files to operate on\n" +
        "\n" +
        "optional arguments:\n" +
        "  --help, -h            show this message and exit\n" +
        "  --revision REVISION, -r REVISION\n" +
        "                        ARG (some commands also take ARG1:ARG2 range) A\n" +
        "                        revision argument can be one of: NUMBER revision\n" +
        "                        number '{' DATE '}' revision at start of the date\n" +
        "                        'HEAD' latest in repository 'BASE' base rev of item's\n" +
        "                        working copy 'COMMITTED' last commit at or before BASE\n" +
        "                        'PREV' revision just before COMMITTED\n" +
        "  --quiet, -q           print nothing, or only summary information\n" +
        "  --verbose, -v         print extra information\n" +
        "  --changelist CHANGELIST, --cl CHANGELIST\n" +
        "                        operate only on members of changelist ARG\n" +
        "  --depth {empty,files,immediates,infinity}\n" +
        "                        limit operation by depth ARG ('empty', 'files',\n" +
        "                        'immediates', or 'infinity')\n" +
        "  --xml                 output in XML\n" +
        "  --incremental         give output suitable for concatenation\n" +
        "  --force               force operation to run\n" +
        "  --use-merge-history, -g\n" +
        "                        use/display additional information from merge history\n" +
        "\n",
    execute: exports.svnCommands.genericExecute
});

exports.svnCommands.addCommand({
    name: 'copy',
    takes: ['*'],
    aliases: ['cp'],
    prompting: function(command) {
        var dst = command[command.length - 1];
        var lastsrc = command[command.length - 2];

        // if dst is a URL, that means we need keychain and message
        if (dst.indexOf("://")) {
            return {getKeychain: true, getMessage: true};
        }

        // if we have a URL source, we do need to prompt for keychain.
        if (lastsrc.indexOf("://")) {
            return {getKeychain: true};
        }

        return null;
    },
    preview: 'copy (cp): Duplicate something in working copy or repository, remembering history',
    description:         "usage: svn copy [--help] [--revision REVISION] [--quiet] [--message MESSAGE]\n" +
        "                [--parents] [--with-revprop WITH_REVPROP]\n" +
        "                src [src ...] dst\n" +
        "\n" +
        "copy (cp): Duplicate something in working copy or repository, remembering history.\n" +
        "\n" +
        "When copying multiple sources, they will be added as children of DST,\n" +
        "which must be a directory.\n" +
        "\n" +
        "  SRC and DST can each be either a working copy (WC) path or URL:\n" +
        "    WC  -> WC:   copy and schedule for addition (with history)\n" +
        "    WC  -> URL:  immediately commit a copy of WC to URL\n" +
        "    URL -> WC:   check out URL into WC, schedule for addition\n" +
        "    URL -> URL:  complete server-side copy;  used to branch and tag\n" +
        "  All the SRCs must be of the same type.\n" +
        "\n" +
        "WARNING: For compatibility with previous versions of Subversion,\n" +
        "copies performed using two working copy paths (WC -> WC) will not\n" +
        "contact the repository.  As such, they may not, by default, be able\n" +
        "to propagate merge tracking information from the source of the copy\n" +
        "to the destination.\n" +
        "\n" +
        "positional arguments:\n" +
        "  src                   source file(s) or URL\n" +
        "  dst                   destination file, url or directory\n" +
        "\n" +
        "optional arguments:\n" +
        "  --help, -h            show this message and exit\n" +
        "  --revision REVISION, -r REVISION\n" +
        "                        ARG (some commands also take ARG1:ARG2 range) A\n" +
        "                        revision argument can be one of: NUMBER revision\n" +
        "                        number '{' DATE '}' revision at start of the date\n" +
        "                        'HEAD' latest in repository 'BASE' base rev of item's\n" +
        "                        working copy 'COMMITTED' last commit at or before BASE\n" +
        "                        'PREV' revision just before COMMITTED\n" +
        "  --quiet, -q           print nothing, or only summary information\n" +
        "  --message MESSAGE, -m MESSAGE\n" +
        "                        specify log message\n" +
        "  --parents             make intermediate directories\n" +
        "  --with-revprop WITH_REVPROP\n" +
        "                        set revision property WITH_REVPROP in new revision\n" +
        "                        using the name[=value] format\n" +
        "\n",
    execute: exports.svnCommands.genericExecute
});

exports.svnCommands.addCommand({
    name: 'delete',
    takes: ['*'],
    aliases: ['del', 'remove', 'rm'],
    keychain: true,
    preview: 'Remove files and directories from version control',
    description:         "usage: svn delete [--help] [--quiet] [--message MESSAGE] [--force] [--keep-\n" +
        "                  local]\n" +
        "                  PATH_OR_URL [PATH_OR_URL ...]\n" +
        "\n" +
        "Remove files and directories from version control.\n" +
        "\n" +
        "usage: 1. delete PATH...\n" +
        "       2. delete URL...\n" +
        "\n" +
        "  1. Each item specified by a PATH is scheduled for deletion upon\n" +
        "    the next commit.  Files, and directories that have not been\n" +
        "    committed, are immediately removed from the working copy\n" +
        "    unless the --keep-local option is given.\n" +
        "    PATHs that are, or contain, unversioned or modified items will\n" +
        "    not be removed unless the --force option is given.\n" +
        "\n" +
        "  2. Each item specified by a URL is deleted from the repository\n" +
        "    via an immediate commit.\n" +
        "\n" +
        "positional arguments:\n" +
        "  PATH_OR_URL\n" +
        "\n" +
        "optional arguments:\n" +
        "  --help, -h            show this message and exit\n" +
        "  --quiet, -q           print nothing, or only summary information\n" +
        "  --message MESSAGE, -m MESSAGE\n" +
        "                        specify log message\n" +
        "  --force               force operation to run\n" +
        "  --keep-local          keep path in working copy\n" +
        "\n",
    execute: exports.svnCommands.genericExecute
});

exports.svnCommands.addCommand({
    name: 'switch',
    takes: ['*'],
    aliases: ['sw'],
    keychain: true,
    preview: 'Update the working copy to a different URL',
    description:         "usage: svn switch [--help] [--revision REVISION] [--quiet] [--depth\n" +
        "                  {empty,files,immediates,infinity}] [--force] [--accept\n" +
        "                  {base,working,mine-full,theirs-full}] [--relocate FROM]\n" +
        "                  [--ignore-externals]\n" +
        "                  url [path]\n" +
        "\n" +
        "Update the working copy to a different URL.\n" +
        "\n" +
        "usage: 1. switch URL[@PEGREV] [PATH]\n" +
        "       2. switch --relocate FROM TO [PATH...]\n" +
        "\n" +
        "  1. Update the working copy to mirror a new URL within the repository.\n" +
        "     This behaviour is similar to 'svn update', and is the way to\n" +
        "     move a working copy to a branch or tag within the same repository.\n" +
        "     If specified, PEGREV determines in which revision the target is first\n" +
        "     looked up.\n" +
        "\n" +
        "     If --force is used, unversioned obstructing paths in the working\n" +
        "     copy do not automatically cause a failure if the switch attempts to\n" +
        "     add the same path.  If the obstructing path is the same type (file\n" +
        "     or directory) as the corresponding path in the repository it becomes\n" +
        "     versioned but its contents are left 'as-is' in the working copy.\n" +
        "     This means that an obstructing directory's unversioned children may\n" +
        "     also obstruct and become versioned.  For files, any content differences\n" +
        "     between the obstruction and the repository are treated like a local\n" +
        "     modification to the working copy.  All properties from the repository\n" +
        "     are applied to the obstructing path.\n" +
        "\n" +
        "     Use the --set-depth option to set a new working copy depth on the\n" +
        "     targets of this operation.  Currently, the depth of a working copy\n" +
        "     directory can only be increased (telescoped more deeply); you cannot\n" +
        "     make a directory more shallow.\n" +
        "\n" +
        "  2. Rewrite working copy URL metadata to reflect a syntactic change only.\n" +
        "     This is used when repository's root URL changes (such as a scheme\n" +
        "     or hostname change) but your working copy still reflects the same\n" +
        "     directory within the same repository.\n" +
        "\n" +
        "positional arguments:\n" +
        "  url\n" +
        "  path\n" +
        "\n" +
        "optional arguments:\n" +
        "  --help, -h            show this message and exit\n" +
        "  --revision REVISION, -r REVISION\n" +
        "                        ARG (some commands also take ARG1:ARG2 range) A\n" +
        "                        revision argument can be one of: NUMBER revision\n" +
        "                        number '{' DATE '}' revision at start of the date\n" +
        "                        'HEAD' latest in repository 'BASE' base rev of item's\n" +
        "                        working copy 'COMMITTED' last commit at or before BASE\n" +
        "                        'PREV' revision just before COMMITTED\n" +
        "  --quiet, -q           print nothing, or only summary information\n" +
        "  --depth {empty,files,immediates,infinity}\n" +
        "                        limit operation by depth ARG ('empty', 'files',\n" +
        "                        'immediates', or 'infinity')\n" +
        "  --force               force operation to run\n" +
        "  --accept {base,working,mine-full,theirs-full}\n" +
        "                        specify automatic conflict resolution source\n" +
        "  --relocate FROM       relocate via URL-rewriting\n" +
        "  --ignore-externals    ignore externals definitions\n" +
        "\n",
    execute: exports.svnCommands.genericExecute
});

exports.svnCommands.addCommand({
    name: 'move',
    takes: ['*'],
    aliases: ['mv', 'rename', 'ren'],
    keychain: true,
    preview: 'Move and/or rename something in working copy or repository',
    description:         "usage: svn move [--help] [--quiet] [--message MESSAGE] [--force] [--parents]\n" +
        "                [--with-revprop WITH_REVPROP]\n" +
        "                src [src ...] dst\n" +
        "\n" +
        "Move and/or rename something in working copy or repository.\n" +
        "\n" +
        "When moving multiple sources, they will be added as children of DST,\n" +
        "which must be a directory.\n" +
        "\n" +
        "  Note:  this subcommand is equivalent to a 'copy' and 'delete'.\n" +
        "  Note:  the --revision option has no use and is deprecated.\n" +
        "\n" +
        "  SRC and DST can both be working copy (WC) paths or URLs:\n" +
        "    WC  -> WC:   move and schedule for addition (with history)\n" +
        "    URL -> URL:  complete server-side rename.\n" +
        "  All the SRCs must be of the same type.\n" +
        "\n" +
        "positional arguments:\n" +
        "  src                   source file(s) or URL(s)\n" +
        "  dst                   destination file, url or directory\n" +
        "\n" +
        "optional arguments:\n" +
        "  --help, -h            show this message and exit\n" +
        "  --quiet, -q           print nothing, or only summary information\n" +
        "  --message MESSAGE, -m MESSAGE\n" +
        "                        specify log message\n" +
        "  --force               force operation to run\n" +
        "  --parents             make intermediate directories\n" +
        "  --with-revprop WITH_REVPROP\n" +
        "                        set revision property WITH_REVPROP in new revision\n" +
        "                        using the name[=value] format\n" +
        "\n",
    execute: exports.svnCommands.genericExecute
});

exports.svnCommands.addCommand({
    name: 'commit',
    takes: ['*'],
    aliases: ['ci'],
    prompting: function(command) {
        if (bespin.util.include(command, "-m")) {
            return {getKeychain: true};
        }
        return {getKeychain: true, getMessage: true};
    },
    preview: 'commit (ci): Send changes from your working copy to the repository',
    description:         "usage: svn commit [--help] [--quiet] [--message MESSAGE] [--changelist\n" +
        "                  CHANGELIST] [--depth {empty,files,immediates,infinity}]\n" +
        "                  [--no-unlock] [--with-revprop WITH_REVPROP] [--keep-\n" +
        "                  changelists]\n" +
        "                  [files [files ...]]\n" +
        "\n" +
        "commit (ci): Send changes from your working copy to the repository.\n" +
        "\n" +
        "positional arguments:\n" +
        "  files                 list of files to operate on\n" +
        "\n" +
        "optional arguments:\n" +
        "  --help, -h            show this message and exit\n" +
        "  --quiet, -q           print nothing, or only summary information\n" +
        "  --message MESSAGE, -m MESSAGE\n" +
        "                        specify log message\n" +
        "  --changelist CHANGELIST, --cl CHANGELIST\n" +
        "                        operate only on members of changelist ARG\n" +
        "  --depth {empty,files,immediates,infinity}\n" +
        "                        limit operation by depth ARG ('empty', 'files',\n" +
        "                        'immediates', or 'infinity')\n" +
        "  --no-unlock           don't unlock the targets\n" +
        "  --with-revprop WITH_REVPROP\n" +
        "                        set revision property ARG in new revision using the\n" +
        "                        name[=value] format\n" +
        "  --keep-changelists    don't delete changelists after commit\n" +
        "\n",
    execute: exports.svnCommands.genericExecute
});

exports.svnCommands.addCommand({
    name: 'cleanup',
    takes: ['*'],
    preview: 'cleanup: Recursively clean up the working copy, removing locks, resuming unfinished operations, etc',
    description:         "usage: svn cleanup [--help] [files [files ...]]\n" +
        "\n" +
        "cleanup: Recursively clean up the working copy, removing locks, resuming unfinished operations, etc.\n" +
        "\n" +
        "positional arguments:\n" +
        "  files       list of files to operate on\n" +
        "\n" +
        "optional arguments:\n" +
        "  --help, -h  show this message and exit\n" +
        "\n",
    execute: exports.svnCommands.genericExecute
});

exports.svnCommands.addCommand({
    name: 'propset',
    takes: ['*'],
    aliases: ['pset', 'ps'],
    preview: 'Set the value of a property on files, dirs, or revisions',
    description:         "usage: svn propset [--help] [--quiet] [--changelist CHANGELIST] [--depth\n" +
        "                   {empty,files,immediates,infinity}] [--force]\n" +
        "                   propname propval path [path ...]\n" +
        "\n" +
        "Set the value of a property on files, dirs, or revisions.\n" +
        "\n" +
        "  Note: svn recognizes the following special versioned properties\n" +
        "  but will store any arbitrary properties set:\n" +
        "    svn:ignore     - A newline separated list of file patterns to ignore.\n" +
        "    svn:keywords   - Keywords to be expanded.  Valid keywords are:\n" +
        "      URL, HeadURL             - The URL for the head version of the object.\n" +
        "      Author, LastChangedBy    - The last person to modify the file.\n" +
        "      Date, LastChangedDate    - The date/time the object was last modified.\n" +
        "      Rev, Revision,           - The last revision the object changed.\n" +
        "      LastChangedRevision\n" +
        "      Id                       - A compressed summary of the previous\n" +
        "                                   4 keywords.\n" +
        "    svn:executable - If present, make the file executable.  Use\n" +
        "      'svn propdel svn:executable PATH...' to clear.\n" +
        "    svn:eol-style  - One of 'native', 'LF', 'CR', 'CRLF'.\n" +
        "    svn:mime-type  - The mimetype of the file.  Used to determine\n" +
        "      whether to merge the file, and how to serve it from Apache.\n" +
        "      A mimetype beginning with 'text/' (or an absent mimetype) is\n" +
        "      treated as text.  Anything else is treated as binary.\n" +
        "    svn:externals  - A newline separated list of module specifiers,\n" +
        "      each of which consists of a relative directory path, optional\n" +
        "      revision flags and an URL.  The ordering of the three elements\n" +
        "      implements different behavior.  Subversion 1.4 and earlier only\n" +
        "      support the following formats and the URLs cannot have peg\n" +
        "      revisions:\n" +
        "        foo             http://example.com/repos/zig\n" +
        "        foo/bar -r 1234 http://example.com/repos/zag\n" +
        "      Subversion 1.5 and greater support the above formats and the\n" +
        "      following formats where the URLs may have peg revisions:\n" +
        "                http://example.com/repos/zig foo\n" +
        "        -r 1234 http://example.com/repos/zig foo/bar\n" +
        "      Relative URLs are supported in Subversion 1.5 and greater for\n" +
        "      all above formats and are indicated by starting the URL with one\n" +
        "      of the following strings\n" +
        "        ../  to the parent directory of the extracted external\n" +
        "        ^/   to the repository root\n" +
        "        //   to the scheme\n" +
        "        /    to the server root\n" +
        "      The ambiguous format 'relative_path relative_path' is taken as\n" +
        "      'relative_url relative_path' with peg revision support.\n" +
        "    svn:needs-lock - If present, indicates that the file should be locked\n" +
        "      before it is modified.  Makes the working copy file read-only\n" +
        "      when it is not locked.  Use 'svn propdel svn:needs-lock PATH...'\n" +
        "      to clear.\n" +
        "\n" +
        "  The svn:keywords, svn:executable, svn:eol-style, svn:mime-type and\n" +
        "  svn:needs-lock properties cannot be set on a directory.  A non-recursive\n" +
        "  attempt will fail, and a recursive attempt will set the property\n" +
        "  only on the file children of the directory.\n" +
        "\n" +
        "positional arguments:\n" +
        "  propname\n" +
        "  propval\n" +
        "  path\n" +
        "\n" +
        "optional arguments:\n" +
        "  --help, -h            show this message and exit\n" +
        "  --quiet, -q           print nothing, or only summary information\n" +
        "  --changelist CHANGELIST, --cl CHANGELIST\n" +
        "                        operate only on members of changelist ARG\n" +
        "  --depth {empty,files,immediates,infinity}\n" +
        "                        limit operation by depth ARG ('empty', 'files',\n" +
        "                        'immediates', or 'infinity')\n" +
        "  --force               force operation to run\n" +
        "\n",
    execute: exports.svnCommands.genericExecute
});

exports.svnCommands.addCommand({
    name: 'update',
    takes: ['*'],
    aliases: ['up'],
    keychain: true,
    preview: 'update (up): Bring changes from the repository into the working copy',
    description:         "usage: svn update [--help] [--revision REVISION] [--quiet] [--changelist\n" +
        "                  CHANGELIST] [--depth {empty,files,immediates,infinity}]\n" +
        "                  [--force] [--set-depth {empty,files,immediates,infinity}]\n" +
        "                  [--ignore-externals] [--accept {postpone,base,mine-full\n" +
        "                  ,theirs-full}]\n" +
        "                  [files [files ...]]\n" +
        "\n" +
        "update (up): Bring changes from the repository into the working copy.\n" +
        "        \n" +
        "    If no revision given, bring working copy up-to-date with HEAD rev.\n" +
        "    Else synchronize working copy to revision given by -r.\n" +
        "\n" +
        "    For each updated item a line will start with a character reporting the\n" +
        "    action taken.  These characters have the following meaning:\n" +
        "\n" +
        "      A  Added\n" +
        "      D  Deleted\n" +
        "      U  Updated\n" +
        "      C  Conflict\n" +
        "      G  Merged\n" +
        "      E  Existed\n" +
        "\n" +
        "    A character in the first column signifies an update to the actual file,\n" +
        "    while updates to the file's properties are shown in the second column.\n" +
        "    A 'B' in the third column signifies that the lock for the file has\n" +
        "    been broken or stolen.\n" +
        "\n" +
        "    If --force is used, unversioned obstructing paths in the working\n" +
        "    copy do not automatically cause a failure if the update attempts to\n" +
        "    add the same path.  If the obstructing path is the same type (file\n" +
        "    or directory) as the corresponding path in the repository it becomes\n" +
        "    versioned but its contents are left 'as-is' in the working copy.\n" +
        "    This means that an obstructing directory's unversioned children may\n" +
        "    also obstruct and become versioned.  For files, any content differences\n" +
        "    between the obstruction and the repository are treated like a local\n" +
        "    modification to the working copy.  All properties from the repository\n" +
        "    are applied to the obstructing path.  Obstructing paths are reported\n" +
        "    in the first column with code 'E'.\n" +
        "\n" +
        "    Use the --set-depth option to set a new working copy depth on the\n" +
        "    targets of this operation.  Currently, the depth of a working copy\n" +
        "    directory can only be increased (telescoped more deeply); you cannot\n" +
        "    make a directory more shallow.\n" +
        "\n" +
        "positional arguments:\n" +
        "  files                 list of files to operate on\n" +
        "\n" +
        "optional arguments:\n" +
        "  --help, -h            show this message and exit\n" +
        "  --revision REVISION, -r REVISION\n" +
        "                        ARG (some commands also take ARG1:ARG2 range) A\n" +
        "                        revision argument can be one of: NUMBER revision\n" +
        "                        number '{' DATE '}' revision at start of the date\n" +
        "                        'HEAD' latest in repository 'BASE' base rev of item's\n" +
        "                        working copy 'COMMITTED' last commit at or before BASE\n" +
        "                        'PREV' revision just before COMMITTED\n" +
        "  --quiet, -q           print nothing, or only summary information\n" +
        "  --changelist CHANGELIST, --cl CHANGELIST\n" +
        "                        operate only on members of changelist ARG\n" +
        "  --depth {empty,files,immediates,infinity}\n" +
        "                        limit operation by depth ARG ('empty', 'files',\n" +
        "                        'immediates', or 'infinity')\n" +
        "  --force               force operation to run\n" +
        "  --set-depth {empty,files,immediates,infinity}\n" +
        "                        set new working copy depth\n" +
        "  --ignore-externals    ignore externals definitions\n" +
        "  --accept {postpone,base,mine-full,theirs-full}\n" +
        "                        specify automatic conflict resolution action\n" +
        "\n",
    execute: exports.svnCommands.genericExecute
});

exports.svnCommands.addCommand({
    name: 'revert',
    takes: ['*'],
    preview: 'revert: Restore pristine working copy file (undo most local edits)',
    description:         "usage: svn revert [--help] [--quiet] [--changelist CHANGELIST] [--depth\n" +
        "                  {empty,files,immediates,infinity}] [--recursive]\n" +
        "                  [files [files ...]]\n" +
        "\n" +
        "revert: Restore pristine working copy file (undo most local edits).\n" +
        "\n" +
        "positional arguments:\n" +
        "  files                 list of files to operate on\n" +
        "\n" +
        "optional arguments:\n" +
        "  --help, -h            show this message and exit\n" +
        "  --quiet, -q           print nothing, or only summary information\n" +
        "  --changelist CHANGELIST, --cl CHANGELIST\n" +
        "                        operate only on members of changelist ARG\n" +
        "  --depth {empty,files,immediates,infinity}\n" +
        "                        limit operation by depth ARG ('empty', 'files',\n" +
        "                        'immediates', or 'infinity')\n" +
        "  --recursive, -R       descend recursively, same as --depth=infinity\n" +
        "\n",
    execute: exports.svnCommands.genericExecute
});

exports.svnCommands.addCommand({
    name: 'log',
    takes: ['*'],
    keychain: true,
    preview: 'log: Show the log messages for a set of revision(s) and/or file(s)',
    description:         "usage: svn log [--help] [--revision REVISION] [--quiet] [--verbose]\n" +
        "               [--changelist CHANGELIST] [--depth\n" +
        "               {empty,files,immediates,infinity}] [--xml] [--incremental]\n" +
        "               [--use-merge-history] [--change CHANGE] [--stop-on-copy]\n" +
        "               [--limit LIMIT] [--with-all-revprops] [--with-revprop\n" +
        "               WITH_REVPROP]\n" +
        "               [files [files ...]]\n" +
        "\n" +
        "log: Show the log messages for a set of revision(s) and/or file(s).\n" +
        "\n" +
        "  1. Print the log messages for a local PATH (default: '.').\n" +
        "     The default revision range is BASE:1.\n" +
        "\n" +
        "  2. Print the log messages for the PATHs (default: '.') under URL.\n" +
        "     If specified, REV determines in which revision the URL is first\n" +
        "     looked up, and the default revision range is REV:1; otherwise,\n" +
        "     the URL is looked up in HEAD, and the default revision range is\n" +
        "     HEAD:1.\n" +
        "\n" +
        "  With -v, also print all affected paths with each log message.\n" +
        "  With -q, don't print the log message body itself (note that this is\n" +
        "  compatible with -v).\n" +
        "\n" +
        "  Each log message is printed just once, even if more than one of the\n" +
        "  affected paths for that revision were explicitly requested.  Logs\n" +
        "  follow copy history by default.  Use --stop-on-copy to disable this\n" +
        "  behavior, which can be useful for determining branchpoints.\n" +
        "\n" +
        "  Examples:\n" +
        "    svn log\n" +
        "    svn log foo.c\n" +
        "\n" +
        "positional arguments:\n" +
        "  files                 list of files to operate on\n" +
        "\n" +
        "optional arguments:\n" +
        "  --help, -h            show this message and exit\n" +
        "  --revision REVISION, -r REVISION\n" +
        "                        ARG (some commands also take ARG1:ARG2 range) A\n" +
        "                        revision argument can be one of: NUMBER revision\n" +
        "                        number '{' DATE '}' revision at start of the date\n" +
        "                        'HEAD' latest in repository 'BASE' base rev of item's\n" +
        "                        working copy 'COMMITTED' last commit at or before BASE\n" +
        "                        'PREV' revision just before COMMITTED\n" +
        "  --quiet, -q           print nothing, or only summary information\n" +
        "  --verbose, -v         print extra information\n" +
        "  --changelist CHANGELIST, --cl CHANGELIST\n" +
        "                        operate only on members of changelist ARG\n" +
        "  --depth {empty,files,immediates,infinity}\n" +
        "                        limit operation by depth ARG ('empty', 'files',\n" +
        "                        'immediates', or 'infinity')\n" +
        "  --xml                 output in XML\n" +
        "  --incremental         give output suitable for concatenation\n" +
        "  --use-merge-history, -g\n" +
        "                        use/display additional information from merge history\n" +
        "  --change CHANGE, -c CHANGE\n" +
        "                        the change made by CHANGE\n" +
        "  --stop-on-copy        do not cross copies while traversing history\n" +
        "  --limit LIMIT, -l LIMIT\n" +
        "                        maximum number of log entries\n" +
        "  --with-all-revprops   retrieve all revision properties\n" +
        "  --with-revprop WITH_REVPROP\n" +
        "                        retrieve revision property WITH_REVPROP\n" +
        "\n",
    execute: exports.svnCommands.genericExecute
});

exports.svnCommands.addCommand({
    name: 'cat',
    takes: ['*'],
    keychain: true,
    preview: 'Output the content of specified files or URLs',
    description:         "usage: svn cat [--help] [--revision REVISION] targets [targets ...]\n" +
        "\n" +
        "Output the content of specified files or URLs.\n" +
        "\n" +
        "usage: cat TARGET[@REV]...\n" +
        "\n" +
        "  If specified, REV determines in which revision the target is first\n" +
        "  looked up.\n" +
        "\n" +
        "positional arguments:\n" +
        "  targets\n" +
        "\n" +
        "optional arguments:\n" +
        "  --help, -h            show this message and exit\n" +
        "  --revision REVISION, -r REVISION\n" +
        "                        ARG (some commands also take ARG1:ARG2 range) A\n" +
        "                        revision argument can be one of: NUMBER revision\n" +
        "                        number '{' DATE '}' revision at start of the date\n" +
        "                        'HEAD' latest in repository 'BASE' base rev of item's\n" +
        "                        working copy 'COMMITTED' last commit at or before BASE\n" +
        "                        'PREV' revision just before COMMITTED\n" +
        "\n",
    execute: exports.svnCommands.genericExecute
});

exports.svnCommands.addCommand({
    name: 'info',
    takes: ['*'],
    preview: 'info: Display information about a local or remote item',
    description:         "usage: svn info [--help] [--revision REVISION] [--quiet] [--changelist\n" +
        "                CHANGELIST] [--depth {empty,files,immediates,infinity}]\n" +
        "                [--xml] [--incremental]\n" +
        "                [files [files ...]]\n" +
        "\n" +
        "info: Display information about a local or remote item.\n" +
        "\n" +
        "    Print information about the paths given.\n" +
        "\n" +
        "positional arguments:\n" +
        "  files                 list of files to operate on\n" +
        "\n" +
        "optional arguments:\n" +
        "  --help, -h            show this message and exit\n" +
        "  --revision REVISION, -r REVISION\n" +
        "                        ARG (some commands also take ARG1:ARG2 range) A\n" +
        "                        revision argument can be one of: NUMBER revision\n" +
        "                        number '{' DATE '}' revision at start of the date\n" +
        "                        'HEAD' latest in repository 'BASE' base rev of item's\n" +
        "                        working copy 'COMMITTED' last commit at or before BASE\n" +
        "                        'PREV' revision just before COMMITTED\n" +
        "  --quiet, -q           print nothing, or only summary information\n" +
        "  --changelist CHANGELIST, --cl CHANGELIST\n" +
        "                        operate only on members of changelist ARG\n" +
        "  --depth {empty,files,immediates,infinity}\n" +
        "                        limit operation by depth ARG ('empty', 'files',\n" +
        "                        'immediates', or 'infinity')\n" +
        "  --xml                 output in XML\n" +
        "  --incremental         give output suitable for concatenation\n" +
        "\n",
    execute: exports.svnCommands.genericExecute
});

exports.svnCommands.addCommand({
    name: 'propget',
    takes: ['*'],
    aliases: ['pg', 'pget'],
    preview: 'Print the value of a property on files, dirs, or revisions',
    description:         "usage: svn propget [--help] [--revision REVISION] [--changelist CHANGELIST]\n" +
        "                   [--depth {empty,files,immediates,infinity}] [--strict]\n" +
        "                   [--xml]\n" +
        "                   propname [files [files ...]]\n" +
        "\n" +
        "Print the value of a property on files, dirs, or revisions.\n" +
        "\n" +
        "  By default, this subcommand will add an extra newline to the end\n" +
        "  of the property values so that the output looks pretty.  Also,\n" +
        "  whenever there are multiple paths involved, each property value\n" +
        "  is prefixed with the path with which it is associated.  Use\n" +
        "  the --strict option to disable these beautifications (useful,\n" +
        "  for example, when redirecting binary property values to a file).\n" +
        "\n" +
        "positional arguments:\n" +
        "  propname\n" +
        "  files                 list of files to operate on\n" +
        "\n" +
        "optional arguments:\n" +
        "  --help, -h            show this message and exit\n" +
        "  --revision REVISION, -r REVISION\n" +
        "                        ARG (some commands also take ARG1:ARG2 range) A\n" +
        "                        revision argument can be one of: NUMBER revision\n" +
        "                        number '{' DATE '}' revision at start of the date\n" +
        "                        'HEAD' latest in repository 'BASE' base rev of item's\n" +
        "                        working copy 'COMMITTED' last commit at or before BASE\n" +
        "                        'PREV' revision just before COMMITTED\n" +
        "  --changelist CHANGELIST, --cl CHANGELIST\n" +
        "                        operate only on members of changelist ARG\n" +
        "  --depth {empty,files,immediates,infinity}\n" +
        "                        limit operation by depth ARG ('empty', 'files',\n" +
        "                        'immediates', or 'infinity')\n" +
        "  --strict              use strict semantics\n" +
        "  --xml                 output in XML\n" +
        "\n",
    execute: exports.svnCommands.genericExecute
});

exports.svnCommands.addCommand({
    name: 'proplist',
    takes: ['*'],
    aliases: ['plist', 'pl'],
    preview: 'List all properties on files, dirs, or revisions',
    description:         "usage: svn proplist [--help] [--quiet] [--verbose] [--changelist CHANGELIST]\n" +
        "                    [--depth {empty,files,immediates,infinity}] [--xml]\n" +
        "                    [files [files ...]]\n" +
        "\n" +
        "List all properties on files, dirs, or revisions.\n" +
        "\n" +
        "positional arguments:\n" +
        "  files                 list of files to operate on\n" +
        "\n" +
        "optional arguments:\n" +
        "  --help, -h            show this message and exit\n" +
        "  --quiet, -q           print nothing, or only summary information\n" +
        "  --verbose, -v         print extra information\n" +
        "  --changelist CHANGELIST, --cl CHANGELIST\n" +
        "                        operate only on members of changelist ARG\n" +
        "  --depth {empty,files,immediates,infinity}\n" +
        "                        limit operation by depth ARG ('empty', 'files',\n" +
        "                        'immediates', or 'infinity')\n" +
        "  --xml                 output in XML\n" +
        "\n",
    execute: exports.svnCommands.genericExecute
});

exports.svnCommands.addCommand({
    name: 'status',
    takes: ['*'],
    aliases: ['st', 'stat'],
    preview: 'Print the status of working copy files and directories',
    description:         "usage: svn status [--help] [--quiet] [--verbose] [--changelist CHANGELIST]\n" +
        "                  [--depth {empty,files,immediates,infinity}] [--xml]\n" +
        "                  [--incremental] [--show-updates] [--ignore-externals]\n" +
        "                  [files [files ...]]\n" +
        "\n" +
        "Print the status of working copy files and directories.\n" +
        "\n" +
        "  With no args, print only locally modified items (no network access).\n" +
        "  With -q, print only summary information about locally modified items.\n" +
        "  With -u, add working revision and server out-of-date information.\n" +
        "  With -v, print full revision information on every item.\n" +
        "\n" +
        "  The first six columns in the output are each one character wide:\n" +
        "    First column: Says if item was added, deleted, or otherwise changed\n" +
        "      ' ' no modifications\n" +
        "      'A' Added\n" +
        "      'C' Conflicted\n" +
        "      'D' Deleted\n" +
        "      'I' Ignored\n" +
        "      'M' Modified\n" +
        "      'R' Replaced\n" +
        "      'X' item is unversioned, but is used by an externals definition\n" +
        "      '?' item is not under version control\n" +
        "      '!' item is missing (removed by non-svn command) or incomplete\n" +
        "      '~' versioned item obstructed by some item of a different kind\n" +
        "    Second column: Modifications of a file's or directory's properties\n" +
        "      ' ' no modifications\n" +
        "      'C' Conflicted\n" +
        "      'M' Modified\n" +
        "    Third column: Whether the working copy directory is locked\n" +
        "      ' ' not locked\n" +
        "      'L' locked\n" +
        "    Fourth column: Scheduled commit will contain addition-with-history\n" +
        "      ' ' no history scheduled with commit\n" +
        "      '+' history scheduled with commit\n" +
        "    Fifth column: Whether the item is switched relative to its parent\n" +
        "      ' ' normal\n" +
        "      'S' switched\n" +
        "    Sixth column: Repository lock token\n" +
        "      (without -u)\n" +
        "      ' ' no lock token\n" +
        "      'K' lock token present\n" +
        "      (with -u)\n" +
        "      ' ' not locked in repository, no lock token\n" +
        "      'K' locked in repository, lock toKen present\n" +
        "      'O' locked in repository, lock token in some Other working copy\n" +
        "      'T' locked in repository, lock token present but sTolen\n" +
        "      'B' not locked in repository, lock token present but Broken\n" +
        "\n" +
        "  The out-of-date information appears in the eighth column (with -u):\n" +
        "      '*' a newer revision exists on the server\n" +
        "      ' ' the working copy is up to date\n" +
        "\n" +
        "  Remaining fields are variable width and delimited by spaces:\n" +
        "    The working revision (with -u or -v)\n" +
        "    The last committed revision and last committed author (with -v)\n" +
        "    The working copy path is always the final field, so it can\n" +
        "      include spaces.\n" +
        "\n" +
        "  Example output:\n" +
        "    svn status wc\n" +
        "     M     wc/bar.c\n" +
        "    A  +   wc/qax.c\n" +
        "\n" +
        "    svn status -u wc\n" +
        "     M           965    wc/bar.c\n" +
        "           *     965    wc/foo.c\n" +
        "    A  +         965    wc/qax.c\n" +
        "    Status against revision:   981\n" +
        "\n" +
        "    svn status --show-updates --verbose wc\n" +
        "     M           965       938 kfogel       wc/bar.c\n" +
        "           *     965       922 sussman      wc/foo.c\n" +
        "    A  +         965       687 joe          wc/qax.c\n" +
        "                 965       687 joe          wc/zig.c\n" +
        "    Status against revision:   981\n" +
        "\n" +
        "positional arguments:\n" +
        "  files                 list of files to operate on\n" +
        "\n" +
        "optional arguments:\n" +
        "  --help, -h            show this message and exit\n" +
        "  --quiet, -q           print nothing, or only summary information\n" +
        "  --verbose, -v         print extra information\n" +
        "  --changelist CHANGELIST, --cl CHANGELIST\n" +
        "                        operate only on members of changelist ARG\n" +
        "  --depth {empty,files,immediates,infinity}\n" +
        "                        limit operation by depth ARG ('empty', 'files',\n" +
        "                        'immediates', or 'infinity')\n" +
        "  --xml                 output in XML\n" +
        "  --incremental         give output suitable for concatenation\n" +
        "  --show-updates, -u    display update information\n" +
        "  --ignore-externals    ignore externals definitions\n" +
        "\n",
    execute: exports.svnCommands.genericExecute
});

exports.svnCommands.addCommand({
    name: 'mkdir',
    takes: ['*'],
    keychain: true,
    preview: 'Create a new directory under version control',
    description:         "usage: svn mkdir [--help] [--quiet] [--message MESSAGE] [--changelist\n" +
        "                 CHANGELIST] [--parents]\n" +
        "                 path [path ...]\n" +
        "\n" +
        "Create a new directory under version control.\n" +
        "\n" +
        "  Create version controlled directories.\n" +
        "\n" +
        "  1. Each directory specified by a working copy PATH is created locally\n" +
        "    and scheduled for addition upon the next commit.\n" +
        "\n" +
        "  2. Each directory specified by a URL is created in the repository via\n" +
        "    an immediate commit.\n" +
        "\n" +
        "  In both cases, all the intermediate directories must already exist,\n" +
        "  unless the --parents option is given.\n" +
        "\n" +
        "positional arguments:\n" +
        "  path                  URL or file path to create\n" +
        "\n" +
        "optional arguments:\n" +
        "  --help, -h            show this message and exit\n" +
        "  --quiet, -q           print nothing, or only summary information\n" +
        "  --message MESSAGE, -m MESSAGE\n" +
        "                        specify log message\n" +
        "  --changelist CHANGELIST, --cl CHANGELIST\n" +
        "                        operate only on members of changelist ARG\n" +
        "  --parents             make intermediate directories\n" +
        "\n",
    execute: exports.svnCommands.genericExecute
});

exports.svnCommands.addCommand({
    name: 'propdel',
    takes: ['*'],
    aliases: ['pdel', 'pd'],
    preview: 'Remove a property from files, dirs, or revisions',
    description:         "usage: svn propdel [--help] [--quiet] [--changelist CHANGELIST] [--depth\n" +
        "                   {empty,files,immediates,infinity}]\n" +
        "                   propname [files [files ...]]\n" +
        "\n" +
        "Remove a property from files, dirs, or revisions.\n" +
        "\n" +
        "positional arguments:\n" +
        "  propname\n" +
        "  files                 list of files to operate on\n" +
        "\n" +
        "optional arguments:\n" +
        "  --help, -h            show this message and exit\n" +
        "  --quiet, -q           print nothing, or only summary information\n" +
        "  --changelist CHANGELIST, --cl CHANGELIST\n" +
        "                        operate only on members of changelist ARG\n" +
        "  --depth {empty,files,immediates,infinity}\n" +
        "                        limit operation by depth ARG ('empty', 'files',\n" +
        "                        'immediates', or 'infinity')\n" +
        "\n",
    execute: exports.svnCommands.genericExecute
});

exports.svnCommands.addCommand({
    name: 'resolve',
    takes: ['*'],
    preview: 'Resolve conflicts on working copy files or directories',
    description:         "usage: svn resolve [--help] [--quiet] [--changelist CHANGELIST] [--depth\n" +
        "                   {empty,files,immediates,infinity}] [--accept {base,working\n" +
        "                   ,mine-full,theirs-full}]\n" +
        "                   [files [files ...]]\n" +
        "\n" +
        "Resolve conflicts on working copy files or directories. (--accept is required)\n" +
        "\n" +
        "positional arguments:\n" +
        "  files                 list of files to operate on\n" +
        "\n" +
        "optional arguments:\n" +
        "  --help, -h            show this message and exit\n" +
        "  --quiet, -q           print nothing, or only summary information\n" +
        "  --changelist CHANGELIST, --cl CHANGELIST\n" +
        "                        operate only on members of changelist ARG\n" +
        "  --depth {empty,files,immediates,infinity}\n" +
        "                        limit operation by depth ARG ('empty', 'files',\n" +
        "                        'immediates', or 'infinity')\n" +
        "  --accept {base,working,mine-full,theirs-full}\n" +
        "                        specify automatic conflict resolution source\n" +
        "\n",
    execute: exports.svnCommands.genericExecute
});
