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

// ---plugin.json---
var metadata =
{
    "provides":
    [
        {
            "ep": "command",
            "name": "follow",
            "takes": [ "username ..." ],
            "preview": "add to the list of users we are following, or (with no args) list the current set",
            "completeText": "username(s) of person(s) to follow",
            "usage": "[username] ...<br><br><em>(username optional. Will list current followed users if not provided)</em>",
            "pointer": "social#followCommand"
        },
        {
            "ep": "command",
            "name": "unfollow",
            "takes": [ "username ..." ],
            "preview": "remove from the list of users we are following",
            "completeText": "username(s) of person(s) to stop following",
            "usage": "[username] ...<br><br><em>The username(s) to stop following</em>",
            "pointer": "social#unfollowCommand"
        },
        {
            "ep": "command",
            "name": "group",
            "preview": "Collect the people you follow into groups, and display the existing groups",
            "completeText": "subcommands: add, remove, list, help"
        },
        {
            "ep": "command",
            "parent": "group",
            "name": "help",
            "takes": [ "search" ],
            "preview": "show subcommands for group command",
            "completeText": "optionally, narrow down the search",
            "usage": "The <u>help</u> gives you access to the various subcommands in the group command space.<br/><br/>You can narrow the search of a command by adding an optional search params.<br/><br/>Finally, pass in the full name of a command and you can get the full description, which you just did to see this!",
            "pointer": ""
        },
        {
            "ep": "command",
            "parent": "group",
            "name": "list",
            "takes": [ "group" ],
            "preview": "List the current group and group members",
            "completeText": "An optional group name or leave blank to list groups",
            "usage": "List the current group and group members.",
            "pointer": "social#groupListCommand"
        },
        {
            "ep": "command",
            "parent": "group",
            "name": "add",
            "takes": [ "group", "'member ..." ],
            "preview": "Add members to a new or existing group",
            "completeText": "A group name followed by a list of members to add",
            "usage": "Add members to a new or existing group",
            "pointer": "social#groupAddCommand"
        },
        {
            "ep": "command",
            "parent": "group",
            "name": "remove",
            "takes": [ "group", "member ..." ],
            "preview": "Remove members from an existing group (and remove group if empty)",
            "completeText": "A group name followed by a list of members to remove",
            "usage": "Remove members from an existing group (and remove group if empty)",
            "pointer": "social#groupRemoveCommand"
        },
        {
            "ep": "command",
            "name": "share",
            "preview": "Manage the projects that you share to other users",
            "completeText": "subcommands: add, remove, list, help"
        },
        {
            "ep": "command",
            "parent": "share",
            "name": "help",
            "takes": [ "search" ],
            "preview": "show subcommands for share command",
            "completeText": "optionally, narrow down the search",
            "usage": "The <u>help</u> gives you access to the various subcommands in the share command space.<br/><br/>You can narrow the search of a command by adding an optional search params.<br/><br/>Finally, pass in the full name of a command and you can get the full description, which you just did to see this!",
            "pointer": "social#shareHelpCommand"
        },
        {
            "ep": "command",
            "parent": "share",
            "name": "list",
            "takes": [ "project" ],
            "preview": "List the current shared projects",
            "completeText": "An optional project name or leave blank to list shared projects",
            "usage": "List the current shared projects.",
            "pointer": "social#shareListCommand"
        },
        {
            "ep": "command",
            "parent": "share",
            "name": "remove",
            "takes": [ "project", "member" ],
            "preview": "Remove a share from the current shared projects",
            "completeText": "A project name and a optional user or group (or leave blank for all users and groups)",
            "usage": "Remove a share from the current shared projects.",
            "pointer": "social#shareRemoveCommand"
        },
        {
            "ep": "command",
            "parent": "share",
            "name": "add",
            "takes": [ "project", "member", "permission" ],
            "preview": "Add a share to the current shared projects",
            "completeText": "A project name or leave blank to list shared projects",
            "usage": "Add a share to the current shared projects.",
            "pointer": "social#shareAddCommand"
        }
    ]
};
// ---

/*
        {
            "ep": "command",
            "name": "viewme",
            "preview": "List and alter user\'s ability to see what I\'m working on",
            "pointer": "social#viewmeCommand"
        },
*/

var bespin = require("bespin");
var command = require("bespin/command");
var server = require("bespin/client/server");

/**
 * Utility to take an string array of strings, and publish a ul list to the
 * instruction
 */
exports.displayArray = function(instruction, titleNone, titleSome, array) {
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
function toArgArray(args) {
    if (args === null) {
        return [];
    }
    else {
        var spliten = args.split(" ");
        if (spliten.length === 1 && spliten[0] === "") {
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
exports.followCommand = function(instruction, args) {
    var usernames = toArgArray(args);
    if (usernames.length === 0) {
        follow([], {
            evalJSON: true,
            onSuccess: function(followers) {
                if (!followers || followers.length === 0) {
                    instruction.addOutput("You are not following anyone");
                    return;
                }

                var parent = exports.displayFollowers(followers);
                instruction.setElement(parent);
            },
            onFailure: function(xhr) {
                instruction.addErrorOutput("Failed to retrieve followers: " + xhr.responseText);
            }
        });
    }
    else {
        follow(usernames, {
            evalJSON: true,
            onSuccess: function(followers) {
                if (!followers || followers.length === 0) {
                    instruction.addOutput("You are not following anyone");
                    return;
                }

                // TODO: Rename this event
                bespin.publish("project:created");

                var parent = exports.displayFollowers(followers);
                instruction.setElement(parent);
            },
            onFailure: function(xhr) {
                instruction.addErrorOutput("Failed to add follower: " + xhr.responseText);
            }
        });
    }
};

/**
 * Extend bespin.client.Server with follow / followers methods
 */
function follow(usernames, opts) {
    var body = JSON.stringify(usernames);
    bespin.get('server').request('POST', '/network/follow/', body, opts);
};

/**
 * Utility to take an string array of follower names, and publish a
 * "Following: ..." message as a command line response.
 */
exports.displayFollowers = function(followers) {
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
                command.executeCommand("unfollow " + follower);
            }
        }, cell);
    });
    return parent;
};

// =============================================================================

/**
 * Add an 'unfollow' command that removes from our list of our followers
 */
exports.unfollowCommand = function(instruction, args) {
    var usernames = toArgArray(args);
    if (usernames.length === 0) {
        instruction.addErrorOutput('Please specify the users to cease following');
    }
    else {
        unfollow(usernames, {
            evalJSON: true,
            onSuccess: function(followers) {
                if (!followers || followers.length === 0) {
                    instruction.addOutput("You are not following anyone");
                    return;
                }

                // TODO: Rename this event
                bespin.publish("project:created");

                var parent = exports.displayFollowers(followers);
                instruction.setElement(parent);
            },
            onFailure: function(xhr) {
                instruction.addErrorOutput("Failed to remove follower: " + xhr.responseText);
            }
        });
    }
};

/**
 * Extend bespin.client.Server with an unfollow method
 */
function unfollow(users, opts) {
    bespin.get('server').request('POST', '/network/unfollow/', JSON.stringify(users), opts);
};

// =============================================================================

/**
 * Display sub-command help
 */
exports.groupHelpCommand = function(instruction, extra) {
    var output = this.parent.getHelp(extra);
    instruction.addOutput(output);
};

/**
 * 'group list' subcommand.
 */
exports.groupListCommand = function(instruction, group) {
    if (!group) {
        // List all groups
        groupListAll({
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
                            command.executeCommand("group remove " + group);
                        }
                    }, cell);
                    dojo.create("span", { innerHTML:" " }, cell);
                    dojo.create("a", {
                        innerHTML: "<small>(list)</small>",
                        onclick: function() {
                            command.executeCommand("group list " + group);
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
        groupList(group, {
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
                            command.executeCommand("group remove " + group + " " + member);
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
};

/**
 * 'group add' subcommand.
 */
exports.groupAddCommand = function(instruction, args) {
    var group = args.pieces.shift();
    var members = args.pieces;
    groupAdd(group, members, {
        onSuccess: function(data) {
            instruction.addOutput("Added to group '" + group + "': " + members.join(", "));
        },
        onFailure: function(xhr) {
            instruction.addErrorOutput("Failed to add to group members. Maybe due to: " + xhr.responseText);
        }
    });
};

/**
 * 'group remove' subcommand.
 */
export.groupRemoveCommand = function(instruction, args) {
    var group = args.pieces.shift();
    var members = args.pieces;
    if (members.length === 1 && members[0] === "all") {
        groupRemoveAll(group, {
            onSuccess: function(data) {
                instruction.addOutput("Removed group " + group);
            },
            onFailure: function(xhr) {
                instruction.addErrorOutput("Failed to retrieve group members. Maybe due to: " + xhr.responseText);
            }
        });
    } else {
        // Remove members from a group
        groupRemove(group, members, {
            onSuccess: function(data) {
                instruction.addOutput("Removed from group '" + group + "': " + members.join(", "));
            },
            onFailure: function(xhr) {
                instruction.addErrorOutput("Failed to remove to group members. Maybe due to: " + xhr.responseText);
            }
        });
    }
};

/**
 * Get a list of the users the current user is following
 */
function groupListAll(opts) {
    bespin.get('server').request('GET', '/group/list/all/', null, opts);
};

/**
 * Get a list of the users the current user is following
 */
function groupList(group, opts) {
    var url = '/group/list/' + group + '/';
    bespin.get('server').request('GET', url, null, opts);
};

/**
 * Get a list of the users the current user is following
 */
function groupRemove(group, users, opts) {
    var url = '/group/remove/' + group + '/';
    bespin.get('server').request('POST', url, JSON.stringify(users), opts);
};

/**
 * Get a list of the users the current user is following
 */
function groupRemoveAll(group, opts) {
    var url = '/group/remove/all/' + group + '/';
    bespin.get('server').request('POST', url, null, opts);
};

/**
 * Get a list of the users the current user is following
 */
function groupAdd(group, users, opts) {
    var url = '/group/add/' + group + '/';
    bespin.get('server').request('POST', url, JSON.stringify(users), opts);
};

// =============================================================================

/**
 * Display sub-command help
 */
exports.shareHelpCommand = function(instruction, extra) {
    var output = this.parent.getHelp(extra);
    instruction.addOutput(output);
};

/**
 * 'share list' sub-command.
 */
exports.shareAddCommand = function(instruction, args) {
    var self = this;
    shareListAll({
        evalJSON: true,
        onSuccess: function(shares) {
            // Filter by project name if we have one
            if (args.project && args.project != "") {
                shares = shares.filter(function(share) {
                    return share.project == project;
                });
            }

            instruction.setElement(createShareDisplayElement(shares));
        },
        onFailure: function(xhr) {
            instruction.addErrorOutput("Failed to list project shares: " + xhr.responseText);
        }
    });
};

/**
 * Helper function to create a tabular display of shared projects
 */
var createShareDisplayElement = function(shares) {
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
                command.executeCommand("share remove " + share.project);
            }
        }, cell);
    });

    return parent;
};

/**
 * 'share remove' sub-command.
 */
exports.shareAddCommand = function(instruction, args) {
    if (!args.project || args.project == "") {
        instruction.addErrorOutput('Missing project.<br/>Syntax: share remove project [{user}|{group}|everyone]');
    }

    if (!args.member || args.member == "") {
        shareRemoveAll(args.project, {
            onSuccess: function(data) {
                instruction.addOutput("All sharing removed from " + args.project);
            },
            onFailure: function(xhr) {
                instruction.addErrorOutput("Failed to remove sharing permissions. Maybe due to: " + xhr.responseText);
            }
        });
    } else {
        shareRemove(args.project, args.member, {
            onSuccess: function(data) {
                instruction.addOutput("Removed sharing permission from " + args.member + " to " + args.project);
            },
            onFailure: function(xhr) {
                instruction.addErrorOutput("Failed to remove sharing permission. Maybe due to: " + xhr.responseText);
            }
        });
    }
};

/**
 * 'share add' sub-command.
 */
exports.shareAddCommand = function(instruction, args) {
    if (!args.project || args.project == "") {
        instruction.addErrorOutput('Missing project.<br/>Syntax: share add project {user}|{group}|everyone [edit]');
    }

    if (!args.member || args.member == "") {
        instruction.addErrorOutput('Missing user/group.<br/>Syntax: share add project {user}|{group}|everyone [edit]');
    }

    shareAdd(args.project, args.member, args.permission || "", {
        onSuccess: function(data) {
            instruction.addOutput("Adding sharing permission for " + args.member + " to " + args.project);
        },
        onFailure: function(xhr) {
            instruction.addErrorOutput("Failed to add sharing permission. Maybe due to: " + xhr.responseText);
        }
    });
};

/**
 * List all project shares
 */
function shareListAll(opts) {
    bespin.get('server').request('GET', '/share/list/all/', null, opts);
};

/**
 * List sharing for a given project
 */
function shareListProject(project, opts) {
    var url = '/share/list/' + project + '/';
    bespin.get('server').request('GET', url, null, opts);
};

/**
 * List sharing for a given project and member
 */
function shareListProjectMember(project, member, opts) {
    var url = '/share/list/' + project + '/' + member + '/';
    bespin.get('server').request('GET', url, null, opts);
};

/**
 * Remove all sharing from a project
 */
function shareRemoveAll(project, opts) {
    var url = '/share/remove/' + project + '/all/';
    bespin.get('server').request('POST', url, null, opts);
};

/**
 * Remove project sharing from a given member
 */
function shareRemove(project, member, opts) {
    var url = '/share/remove/' + project + '/' + member + '/';
    bespin.get('server').request('POST', url, null, opts);
};

/**
 * Add a member to the sharing list for a project
 */
function shareAdd(project, member, options, opts) {
    var url = '/share/add/' + project + '/' + member + '/';
    bespin.get('server').request('POST', url, JSON.stringify(options), opts);
};

// =============================================================================

/**
 * Add a 'viewme' command to allow people to screencast
 *
exports.viewmeCommand = function(instruction, args) {
    args = toArgArray(args);

    if (args.length === 0) {
        // === List all the members with view settings on me ===
        // i.e. 'viewme'
        viewmeListAll({
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
        viewmeList(member, {
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
            _syntaxError('Valid viewme settings are {true|false|deafult}');
        }
        else {
            // === Alter the view setting for a given member ===
            var member = args[0];
            var value = args[1];
            viewmeSet(member, value, {
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
        _syntaxError('Too many arguments. Maximum 2 arguments to \'viewme\' command.');
    }
};

var _syntaxError: function(message) {
    instruction.addErrorOutput('Syntax error - viewme ({user}|{group}|everyone) (true|false|default)');
};
// */

/**
 * List all the members with view settings on me
 *
function viewmeListAll(opts) {
    bespin.get('server').request('GET', '/viewme/list/all/', null, opts);
};

/**
 * List the view settings for a given member
 *
function viewmeList(member, opts) {
    var url = '/viewme/list/' + member + '/';
    bespin.get('server').request('GET', url, null, opts);
};

/**
 * Alter the view setting for a given member
 *
function viewmeSet(member, value, opts) {
    var url = '/viewme/set/' + member + '/' + value + '/';
    bespin.get('server').request('POST', url, null, opts);
};
*/
