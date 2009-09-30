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

dojo.provide("bespin.socialTest");

dojo.require("bespin.social");
dojo.require("bespin.test");

bespin.test.addTests("social", {
    setup: function() {
        this.server = bespin.get("server");
        this.originalServerFollowers = this.server.followers;
        this.originalServerUnfollow = this.server.unfollow;
        this.originalServerGroupListAll = this.server.groupListAll;
    },

    testFollow: function(test) {
        this.server.followers = function(opts) {
            opts.onSuccess("[ ]");
        };
        test.command("follow", "You are not following anyone");

        this.server.followers = function(opts) {
            opts.onSuccess("[ 'joe', 'fred' ]");
        };
        test.command("follow", [ "You are following these users", "joe", "fred", "unfollow" ]);

        this.server.followers = function(opts) {
            opts.onFailure({ responseText:"ERR" });
        };
        test.command("follow", "Failed to retrieve followers: ERR");
    },

    testGroupHelp: function(test) {
        test.command("group help", [ "Available Commands", "add", "help", "list", "remove" ]);
    },

    testGroupList: function(test) {
        this.server.groupListAll = function(opts) {
            opts.onSuccess([ 'homies' ]);
        };
        test.command("group list", [ "You have the following groups", "homies", "remove" ]);

        this.server.groupListAll = function(opts) {
            opts.onFailure({ responseText:"ERR" });
        };
        test.command("follow", "Failed to retrieve groups: ERR");
    },

    testUnfollow: function(test) {
        this.server.unfollow = function(usernames, opts) {
            opts.onSuccess("[ ]");
        };
        test.command("unfollow fred", "You are not following anyone");
    },

    tearDown: function() {
        this.server.followers = this.originalServerFollowers;
        this.server.unfollow = this.originalServerUnfollow;
        this.server.groupListAll = this.originalServerGroupListAll;
    }
});
