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

dojo.provide("bespin.social");


/**
 * Utility to take an string array of strings, and publish a ul list to the
 * instruction
 */
bespin.social.displayArray = function(instruction, titleNone, titleSome, array) {
    if (!array || array.length === 0) {
        instruction.addOutput(titleNone);
        return;
    }
    var message = titleSome;
    message += "<ul><li>" + array.join("</li><li>") + "</li></ul>";
    instruction.addOutput(message);
};

/**
 * Helper for when you have a command that needs to get a hold of it's params
 * as an array for processing.
 * TODO: I'm fairly sure there is a better way to do this knowing how command
 * line parsing works
 */
bespin.social.toArgArray = function(args) {
    if (args == null) {
        return [];
    }
    else {
        var spliten = args.split(" ");
        if (spliten.length == 1 && spliten[0] == "") {
            return [];
        }
        else {
            return spliten;
        }
    }
};

// =============================================================================

/**
 * Add a 'follow' command that gets and adds to out list of our followers
 */
bespin.command.store.addCommand({
    name: 'follow',
    takes: ['username ...'],
    preview: 'add to the list of users we are following, or (with no args) list the current set',
    completeText: 'username(s) of person(s) to follow',
    usage: "[username] ...<br><br><em>(username optional. Will list current followed users if not provided)</em>",
    execute: function(instruction, args) {
        var usernames = bespin.social.toArgArray(args);
        if (usernames.length === 0) {
            bespin.get('server').follow([], {
                evalJSON: true,
                onSuccess: function(followers) {
                    if (!followers || followers.length === 0) {
                        instruction.addOutput("You are not following anyone");
                        return;
                    }

                    var parent = bespin.social.displayFollowers(followers);
                    instruction.setElement(parent);
                },
                onFailure: function(xhr) {
                    instruction.addErrorOutput("Failed to retrieve followers: " + xhr.responseText);
                }
            });
        }
        else {
            bespin.get('server').follow(usernames, {
                evalJSON: true,
                onSuccess: function(followers) {
                    if (!followers || followers.length === 0) {
                        instruction.addOutput("You are not following anyone");
                        return;
                    }

                    // TODO: Rename this event
                    bespin.publish("project:created");

                    var parent = bespin.social.displayFollowers(followers);
                    instruction.setElement(parent);
                },
                onFailure: function(xhr) {
                    instruction.addErrorOutput("Failed to add follower: " + xhr.responseText);
                }
            });
        }
    }
});

/**
 * Extend bespin.client.Server with follow / followers methods
 */
dojo.extend(bespin.client.Server, {
    follow: function(usernames, opts) {
        this.request('POST', '/network/follow/', dojo.toJson(usernames), opts);
    },

    followers: function(opts) {
        this.request('GET', '/network/followers/', null, opts);
    }
});

/**
 * Utility to take an string array of follower names, and publish a
 * "Following: ..." message as a command line response.
 */
bespin.social.displayFollowers = function(followers) {
    var parent = dojo.create("div", {});
    dojo.create("div", { innerHTML: "You are following these users:" }, parent);
    var table = dojo.create("table", { }, parent);
    followers.forEach(function(follower) {
        var row = dojo.create("tr", { }, table);
        var cell = dojo.create("td", {}, row);
        dojo.create("img", {
            src: "/images/collab_icn_user.png",
            width: 16,
            height: 16
        }, cell);
        dojo.create("td", { innerHTML:follower }, row);
        // TODO: Add the users status information in here
        cell = dojo.create("td", { }, row);
        dojo.create("a", {
            innerHTML: "<small>(unfollow)</small>",
            onclick: function() {
                bespin.get("commandLine").executeCommand("unfollow " + follower);
            }
        }, cell);
    });
    return parent;
};

// =============================================================================

/**
 * Add an 'unfollow' command that removes from our list of our followers
 */
bespin.command.store.addCommand({
    name: 'unfollow',
    takes: ['username ...'],
    preview: 'remove from the list of users we are following',
    completeText: 'username(s) of person(s) to stop following',
    usage: "[username] ...<br><br><em>The username(s) to stop following</em>",
    execute: function(instruction, args) {
        var usernames = bespin.social.toArgArray(args);
        if (usernames.length === 0) {
            instruction.addErrorOutput('Please specify the users to cease following');
        }
        else {
            bespin.get('server').unfollow(usernames, {
                evalJSON: true,
                onSuccess: function(followers) {
                    if (!followers || followers.length === 0) {
                        instruction.addOutput("You are not following anyone");
                        return;
                    }

                    // TODO: Rename this event
                    bespin.publish("project:created");

                    var parent = bespin.social.displayFollowers(followers);
                    instruction.setElement(parent);
                },
                onFailure: function(xhr) {
                    instruction.addErrorOutput("Failed to remove follower: " + xhr.responseText);
                }
            });
        }
    }
});

/**
 * Extend bespin.client.Server with an unfollow method
 */
dojo.extend(bespin.client.Server, {
    unfollow: function(users, opts) {
        this.request('POST', '/network/unfollow/', dojo.toJson(users), opts);
    }
});

// =============================================================================

/**
 * Container for the group command
 */
if (!bespin.social.group) {
    bespin.social.group = {};
}

/**
 * Command store for the group commands
 * (which are subcommands of the main 'group' command)
 */
bespin.social.group.commands = new bespin.command.Store(bespin.command.store, {
    name: 'group',
    preview: 'Collect the people you follow into groups, and display the existing groups',
    completeText: 'subcommands: add, remove, list, help',
    subcommanddefault: 'help'
});

/**
 * Display sub-command help
 */
bespin.social.group.commands.addCommand({
    name: 'help',
    takes: ['search'],
    preview: 'show subcommands for group command',
    description: 'The <u>help</u> gives you access to the various subcommands in the group command space.<br/><br/>You can narrow the search of a command by adding an optional search params.<br/><br/>Finally, pass in the full name of a command and you can get the full description, which you just did to see this!',
    completeText: 'optionally, narrow down the search',
    execute: function(instruction, extra) {
        var output = this.parent.getHelp(extra);
        instruction.addOutput(output);
    }
});

/**
 * 'group list' subcommand.
 */
bespin.social.group.commands.addCommand({
    name: 'list',
    preview: 'List the current group and group members',
    takes: ['group'],
    completeText: 'An optional group name or leave blank to list groups',
    description: 'List the current group and group members.',
    execute: function(instruction, group) {
        if (!group) {
            // List all groups
            bespin.get('server').groupListAll({
                evalJSON: true,
                onSuccess: function(groups) {
                    if (!groups || groups.length === 0) {
                        instruction.addOutput("You have no groups");
                        return;
                    }

                    var parent = dojo.create("div", {});
                    dojo.create("div", { innerHTML: "You have the following groups:" }, parent);
                    var table = dojo.create("table", { }, parent);
                    groups.forEach(function(group) {
                        var row = dojo.create("tr", { }, table);
                        var cell = dojo.create("td", {}, row);
                        dojo.create("img", {
                            src: "/images/collab_icn_group.png",
                            width: 16,
                            height: 16
                        }, cell);
                        dojo.create("td", { innerHTML:group }, row);
                        // TODO: Add the users status information in here
                        cell = dojo.create("td", { }, row);
                        dojo.create("a", {
                            innerHTML: "<small>(remove)</small>",
                            onclick: function() {
                                instruction.commandLine.executeCommand("group remove " + group);
                            }
                        }, cell);
                        dojo.create("span", { innerHTML:" " }, cell);
                        dojo.create("a", {
                            innerHTML: "<small>(list)</small>",
                            onclick: function() {
                                instruction.commandLine.executeCommand("group list " + group);
                            }
                        }, cell);
                    });

                    instruction.setElement(parent);
                },
                onFailure: function(xhr) {
                    instruction.addErrorOutput("Failed to retrieve groups: " + xhr.responseText);
                }
            });
        } else {
            // List members in a group
            bespin.get('server').groupList(group, {
                evalJSON: true,
                onSuccess: function(members) {
                    if (!members || members.length === 0) {
                        instruction.addOutput(group + " has no members.");
                        return;
                    }

                    var parent = dojo.create("div", {});
                    dojo.create("div", { innerHTML: "Members of " + group + ":" }, parent);
                    var table = dojo.create("table", { }, parent);
                    members.forEach(function(member) {
                        var row = dojo.create("tr", { }, table);
                        var cell = dojo.create("td", {}, row);
                        dojo.create("img", {
                            src: "/images/collab_icn_user.png",
                            width: 16,
                            height: 16
                        }, cell);
                        dojo.create("td", { innerHTML:member }, row);
                        // TODO: Add the users status information in here
                        cell = dojo.create("td", { }, row);
                        dojo.create("a", {
                            innerHTML: "<small>(ungroup)</small>",
                            onclick: function() {
                                instruction.commandLine.executeCommand("group remove " + group + " " + member);
                            }
                        }, cell);
                    });

                    instruction.setElement(parent);
                },
                onFailure: function(xhr) {
                    instruction.addErrorOutput("Failed to retrieve group members: " + xhr.responseText);
                }
            });
        }
    }
});

/**
 * 'group add' subcommand.
 */
bespin.social.group.commands.addCommand({
    name: 'add',
    preview: 'Add members to a new or existing group',
    takes: [ 'group', 'member ...' ],
    completeText: 'A group name followed by a list of members to add',
    description: 'Add members to a new or existing group',
    execute: function(instruction, args) {
        var group = args.pieces.shift();
        var members = args.pieces;
        bespin.get('server').groupAdd(group, members, {
            onSuccess: function(data) {
                instruction.addOutput("Added to group '" + group + "': " + members.join(", "));
            },
            onFailure: function(xhr) {
                instruction.addErrorOutput("Failed to add to group members. Maybe due to: " + xhr.responseText);
            }
        });
    }
});

/**
 * 'group remove' subcommand.
 */
bespin.social.group.commands.addCommand({
    name: 'remove',
    preview: 'Remove members from an existing group (and remove group if empty)',
    takes: [ 'group', 'member ...' ],
    completeText: 'A group name followed by a list of members to remove',
    description: 'Remove members from an existing group (and remove group if empty)',
    execute: function(instruction, args) {
        var group = args.pieces.shift();
        var members = args.pieces;
        if (members.length === 1 && members[0] === "all") {
            bespin.get('server').groupRemoveAll(group, {
                onSuccess: function(data) {
                    instruction.addOutput("Removed group " + group);
                },
                onFailure: function(xhr) {
                    instruction.addErrorOutput("Failed to retrieve group members. Maybe due to: " + xhr.responseText);
                }
            });
        } else {
            // Remove members from a group
            bespin.get('server').groupRemove(group, members, {
                onSuccess: function(data) {
                    instruction.addOutput("Removed from group '" + group + "': " + members.join(", "));
                },
                onFailure: function(xhr) {
                    instruction.addErrorOutput("Failed to remove to group members. Maybe due to: " + xhr.responseText);
                }
            });
        }
    }
});

/**
 * Extend bespin.client.Server with group* methods
 */
dojo.extend(bespin.client.Server, {
    /**
     * Get a list of the users the current user is following
     */
    groupListAll: function(opts) {
        this.request('GET', '/group/list/all/', null, opts);
    },

    /**
     * Get a list of the users the current user is following
     */
    groupList: function(group, opts) {
        this.request('GET', '/group/list/' + group + '/', null, opts);
    },

    /**
     * Get a list of the users the current user is following
     */
    groupRemove: function(group, users, opts) {
        this.request('POST', '/group/remove/' + group + '/', dojo.toJson(users), opts);
    },

    /**
     * Get a list of the users the current user is following
     */
    groupRemoveAll: function(group, opts) {
        this.request('POST', '/group/remove/all/' + group + '/', null, opts);
    },

    /**
     * Get a list of the users the current user is following
     */
    groupAdd: function(group, users, opts) {
        this.request('POST', '/group/add/' + group + '/', dojo.toJson(users), opts);
    }
});

// =============================================================================

/**
 * Container for the share commands and functions
 */
bespin.social.share = {
    /**
     * Command store for the share commands
     * (which are subcommands of the main 'share' command)
     */
    commands: new bespin.command.Store(bespin.command.store, {
        name: 'share',
        preview: 'Manage the projects that you share to other users',
        completeText: 'subcommands: add, remove, list, help',
        subcommanddefault: 'help'
    })
};

/**
 * Display sub-command help
 */
bespin.social.share.commands.addCommand({
    name: 'help',
    takes: ['search'],
    preview: 'show subcommands for share command',
    description: 'The <u>help</u> gives you access to the various subcommands in the share command space.<br/><br/>You can narrow the search of a command by adding an optional search params.<br/><br/>Finally, pass in the full name of a command and you can get the full description, which you just did to see this!',
    completeText: 'optionally, narrow down the search',
    execute: function(instruction, extra) {
        var output = this.parent.getHelp(extra);
        instruction.addOutput(output);
    }
});

/**
 * 'share list' sub-command.
 */
bespin.social.share.commands.addCommand({
    name: 'list',
    preview: 'List the current shared projects',
    description: 'List the current shared projects.',
    takes: ['project'],
    completeText: 'An optional project name or leave blank to list shared projects',
    execute: function(instruction, args) {
        var self = this;
        bespin.get('server').shareListAll({
            evalJSON: true,
            onSuccess: function(shares) {
                // Filter by project name if we have one
                if (args.project && args.project != "") {
                    shares = shares.filter(function(share) {
                        return share.project == project;
                    });
                }

                instruction.setElement(self.createShareDisplayElement(shares));
            },
            onFailure: function(xhr) {
                instruction.addErrorOutput("Failed to list project shares: " + xhr.responseText);
            }
        });
    },

    /**
     * Helper function to create a tabular display of shared projects
     */
    createShareDisplayElement: function(shares) {
        if (shares.length === 0) {
            return dojo.create("div", {
                innerHTML:"You are not sharing any projects"
            });
        }

        var parent = dojo.create("div", { });
        dojo.create("div", { innerHTML: "You have the following shared projects:" }, parent);
        var table = dojo.create("table", { }, parent);

        var lastProject = "";
        shares.forEach(function(share) {
            var row = dojo.create("tr", { }, table);

            if (share.project !== lastProject) {
                var cell = dojo.create("th", { }, row);
                dojo.create("img", {
                    src: "/images/collab_icn_project.png",
                    width: 16,
                    height: 16
                }, cell);

                dojo.create("th", { innerHTML:share.project }, row);
            } else {
                dojo.create("th", { }, row);
                dojo.create("th", { }, row);
            }

            var withWhom;
            if (share.type == "everyone") {
                withWhom = "with everyone";
            }
            else if (share.type == "group") {
                withWhom = "with the group " + share.recipient;
            }
            else {
                withWhom = "with " + share.recipient;
            }
            cell = dojo.create("td", { innerHTML:withWhom }, row);

            var edit = share.edit ? "Editable" : "Read-only";
            cell = dojo.create("td", { innerHTML:edit }, row);

            // TODO: loadany needs adding here when we add the feature in

            cell = dojo.create("td", { }, row);
            dojo.create("a", {
                innerHTML: "<small>(unshare)</small>",
                onclick: function() {
                    bespin.get("commandLine").executeCommand("share remove " + share.project);
                }
            }, cell);
        });

        return parent;
    }
});

/**
 * 'share remove' sub-command.
 */
bespin.social.share.commands.addCommand({
    name: 'remove',
    preview: 'Remove a share from the current shared projects',
    description: 'Remove a share from the current shared projects.',
    takes: ['project', 'member'],
    completeText: 'A project name and a optional user or group (or leave blank for all users and groups)',
    execute: function(instruction, args) {
        if (!args.project || args.project == "") {
            instruction.addErrorOutput('Missing project.<br/>Syntax: share remove project [{user}|{group}|everyone]');
        }

        if (!args.member || args.member == "") {
            bespin.get('server').shareRemoveAll(args.project, {
                onSuccess: function(data) {
                    instruction.addOutput("All sharing removed from " + args.project);
                },
                onFailure: function(xhr) {
                    instruction.addErrorOutput("Failed to remove sharing permissions. Maybe due to: " + xhr.responseText);
                }
            });
        } else {
            bespin.get('server').shareRemove(args.project, args.member, {
                onSuccess: function(data) {
                    instruction.addOutput("Removed sharing permission from " + args.member + " to " + args.project);
                },
                onFailure: function(xhr) {
                    instruction.addErrorOutput("Failed to remove sharing permission. Maybe due to: " + xhr.responseText);
                }
            });
        }
    }
});

/**
 * 'share add' sub-command.
 */
bespin.social.share.commands.addCommand({
    name: 'add',
    preview: 'Add a share to the current shared projects',
    description: 'Add a share to the current shared projects.',
    takes: ['project', 'member', 'permission'],
    completeText: 'A project name or leave blank to list shared projects',
    execute: function(instruction, args) {
        if (!args.project || args.project == "") {
            instruction.addErrorOutput('Missing project.<br/>Syntax: share add project {user}|{group}|everyone [edit]');
        }

        if (!args.member || args.member == "") {
            instruction.addErrorOutput('Missing user/group.<br/>Syntax: share add project {user}|{group}|everyone [edit]');
        }

        bespin.get('server').shareAdd(args.project, args.member, args.permission || "", {
            onSuccess: function(data) {
                instruction.addOutput("Adding sharing permission for " + args.member + " to " + args.project);
            },
            onFailure: function(xhr) {
                instruction.addErrorOutput("Failed to add sharing permission. Maybe due to: " + xhr.responseText);
            }
        });
    }
});

/**
 * Extensions to bespin.client.Server to add share* methods
 */
dojo.extend(bespin.client.Server, {
    /**
     * List all project shares
     */
    shareListAll: function(opts) {
        this.request('GET', '/share/list/all/', null, opts);
    },

    /**
     * List sharing for a given project
     */
    shareListProject: function(project, opts) {
        this.request('GET', '/share/list/' + project + '/', null, opts);
    },

    /**
     * List sharing for a given project and member
     */
    shareListProjectMember: function(project, member, opts) {
        this.request('GET', '/share/list/' + project + '/' + member + '/', null, opts);
    },

    /**
     * Remove all sharing from a project
     */
    shareRemoveAll: function(project, opts) {
        this.request('POST', '/share/remove/' + project + '/all/', null, opts);
    },

    /**
     * Remove project sharing from a given member
     */
    shareRemove: function(project, member, opts) {
        this.request('POST', '/share/remove/' + project + '/' + member + '/', null, opts);
    },

    /**
     * Add a member to the sharing list for a project
     */
    shareAdd: function(project, member, options, opts) {
        this.request('POST', '/share/add/' + project + '/' + member + '/', dojo.toJson(options), opts);
    }
});

// =============================================================================

/**
 * Add a 'viewme' command to allow people to screencast
 *
bespin.command.store.addCommand({
    name: 'viewme',
    preview: 'List and alter user\'s ability to see what I\'m working on',
    execute: function(instruction, args) {
        args = bespin.social.toArgArray(args);

        if (args.length === 0) {
            // === List all the members with view settings on me ===
            // i.e. 'viewme'
            bespin.get('server').viewmeListAll({
                onSuccess: function(data) {
                    instruction.addOutput("All view settings: " + data);
                },
                onFailure: function(xhr) {
                    instruction.addErrorOutput("Failed to retrieve view settings. Maybe due to: " + xhr.responseText);
                }
            });
        }
        else if (args.length === 1) {
            // === List the view settings for a given member ===
            // i.e. 'viewme {user|group}'
            var member = args[0];
            bespin.get('server').viewmeList(member, {
                onSuccess: function(data) {
                    instruction.addOutput("View settings for " + member + ": " + data);
                },
                onFailure: function(xhr) {
                    instruction.addErrorOutput("Failed to retrieve view settings. Maybe due to: " + xhr.responseText);
                }
            });
        }
        else if (args.length === 2) {
            if (args[1] != 'false' && args[1] != 'true' && args[1] != 'default') {
                this._syntaxError('Valid viewme settings are {true|false|deafult}');
            }
            else {
                // === Alter the view setting for a given member ===
                var member = args[0];
                var value = args[1];
                bespin.get('server').viewmeSet(member, value, {
                    onSuccess: function(data) {
                        instruction.addOutput("Changed view settings for " + member);
                    },
                    onFailure: function(xhr) {
                        instruction.addErrorOutput("Failed to change view setttings. Maybe due to: " + xhr.responseText);
                    }
                });
            }
        }
        else {
            this._syntaxError('Too many arguments. Maximum 2 arguments to \'viewme\' command.');
        }
    },
    _syntaxError: function(message) {
        instruction.addErrorOutput('Syntax error - viewme ({user}|{group}|everyone) (true|false|default)');
    }
});
// */

/**
 * Extensions to bespin.client.Server to add viewme* commands
 *
dojo.extend(bespin.client.Server, {
    // List all the members with view settings on me
    viewmeListAll: function(opts) {
        this.request('GET', '/viewme/list/all/', null, opts);
    },

    // List the view settings for a given member
    viewmeList: function(member, opts) {
        this.request('GET', '/viewme/list/' + member + '/', null, opts);
    },

    // Alter the view setting for a given member
    viewmeSet: function(member, value, opts) {
        this.request('POST', '/viewme/set/' + member + '/' + value + '/', null, opts);
    }
});
*/
