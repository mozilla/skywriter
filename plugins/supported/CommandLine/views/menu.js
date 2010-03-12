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

var SC = require("sproutcore/runtime").SC;
var diff_match_patch = require("Diff").diff_match_patch;

var cliController = require("controller").cliController;
var hint = require("hint");

var diff = new diff_match_patch();

/**
 * A really basic UI hint for when someone is entering something from a
 * set of options, for example boolean|selection.
 */
exports.optionHint = function(input, assignment, typeExt, data) {
    var filter = assignment.value;

    // How many matches do we have?
    var matches = [];
    data.forEach(function(option) {
        if (!filter || option.name.substring(0, filter.length) == filter) {
            matches.push(option);
        }
    }.bind(this));

    // We create a list of options in all cases
    var parent = document.createElement("div");
    parent.setAttribute("class", "cmd_menu");
    var list = document.createElement("ul");
    parent.appendChild(list);

    // When someone clicks on a link, this is what we prefix onto what they
    // clicked on to get the full input they were expecting
    var prefix = input.typed.substring(0, input.typed.length - filter.length);

    if (matches.length === 0) {

        if (data.length > 10) {
            // Too many options to display menu right now
            var warn = document.createElement("article");
            warn.innerHTML = "No matches for '" + filter + "'";
            return hint.Hint.create({
                element: warn,
                level: hint.Level.Error
            });
        }

        var warn = document.createElement("div");
        warn.innerHTML = "No matches for '" + filter + "'";
        warn.className = "cmd_title cmd_error";

        parent.insertBefore(warn, list);
        data.forEach(function(option) {
            var link = createListOption(prefix, option);
            list.appendChild(link);
        });

        // So this is an error - nothing matches
        // TODO: suggest typo fixes?
        return hint.Hint.create({
            element: parent,
            level: hint.Level.Error
        });
    }

    var commonPrefix = matches[0].name;

    matches.forEach(function(option) {
        var link = createListOption(prefix, option);
        list.appendChild(link);

        // Find the longest common prefix for completion
        if (commonPrefix.length > 0) {
            var len = diff.diff_commonPrefix(commonPrefix, option.name);
            if (len < commonPrefix.length) {
                commonPrefix = commonPrefix.substring(0, len);
            }
        }
    }.bind(this));

    if (commonPrefix.length === 0) {
        commonPrefix = undefined;
    } else {
        commonPrefix = commonPrefix.substring(filter.length, commonPrefix.length);
    }

    // If there is only one match, then the completion must complete to that
    // so it's safe to add a " " to the end.
    if (matches.length == 1) {
        commonPrefix = commonPrefix + " ";
    }

    return hint.Hint.create({
        element: parent,
        level: hint.Level.Incomplete,
        completion: commonPrefix
    });
};

/**
 * Create the clickable link
 */
var createListOption = function(prefix, option) {
    var link = document.createElement("li");
    link.appendChild(document.createTextNode(option.name));

    link.addEventListener("click", function(ev) {
        SC.run(function() {
            cliController.set("input", prefix + option.name + " ");
        });
    }, false);

    if (option.description) {
        var dfn = document.createElement("dfn");
        dfn.appendChild(document.createTextNode(option.description));
        link.appendChild(dfn);
    }

    return link;
};
