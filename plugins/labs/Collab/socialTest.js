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

var test = require("bespin/test");
var social = require("bespin/social");

test.addTests("social", {
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
