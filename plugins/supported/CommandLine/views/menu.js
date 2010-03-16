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

var cliController = require("CommandLine:controller").cliController;
var Hint = require("CommandLine:hint").Hint;
var Level = require("CommandLine:hint").Level;

var diff = new diff_match_patch();

/**
 *
 */
exports.filter = function(filter, items) {
    // How many matches do we have?
    var matches = [];
    items.forEach(function(item) {
        if (!filter || item.name.substring(0, filter.length) == filter) {
            matches.push(item);
        }
    }.bind(this));

    if (matches.length === 0) {
        matches = items;
    }

    return matches;
};

/**
 * Hacky way to prevent menu overload
 */
var MAX_ITEMS = 10;

/**
 * A really basic UI hint for when someone is entering something from a
 * set of items, for example boolean|selection.
 */
exports.Menu = SC.Object.extend({
    input: undefined,
    assignment: undefined,
    typeExt: undefined,

    hint: undefined,

    _items: undefined,
    _parent: undefined,
    _list: undefined,
    _prefix: undefined,
    _commonPrefix: undefined,

    /**
     *
     */
    init: function() {
        // The list of items
        this._parent = document.createElement("div");
        this._parent.setAttribute("class", "cmd_menu");
        this._list = document.createElement("ul");
        this._parent.appendChild(this._list);

        this._items = [];

        // When someone clicks on a link, this is what we prefix onto what they
        // clicked on to get the full input they were expecting
        var baseLen = this.input.typed.length - this.assignment.value.length;
        this._prefix = this.input.typed.substring(0, baseLen);

        this.hint = Hint.create({
            element: this._parent,
            level: Level.Incomplete,
            completion: undefined
        });
    },

    /**
     * Create the clickable link
     */
    addItems: function(items) {
        items.forEach(function(item) {
            // Create the UI component
            if (this._items.length < MAX_ITEMS) {
                var link = document.createElement("li");
                link.appendChild(document.createTextNode(item.name));

                link.addEventListener("click", function(ev) {
                    SC.run(function() {
                        cliController.set("input", this._prefix + item.name + " ");
                    }.bind(this));
                }.bind(this), false);

                if (item.description) {
                    var dfn = document.createElement("dfn");
                    dfn.appendChild(document.createTextNode(item.description));
                    link.appendChild(dfn);
                }

                this._list.appendChild(link);
            }

            // Work out if there is a common prefix between all the matches
            // (not just the ones that we are displaying)
            if (this._items.length === 0) {
                this._commonPrefix = item.name;
            }
            // Find the longest common prefix for completion
            if (this._commonPrefix.length > 0) {
                var len = diff.diff_commonPrefix(this._commonPrefix, item.name);
                if (len < this._commonPrefix.length) {
                    this._commonPrefix = this._commonPrefix.substring(0, len);
                }
            }

            this._items.push(item);

        }.bind(this));

        var completion = this._commonPrefix;
        if (!completion || completion.length === 0) {
            completion = undefined;
        } else {
            completion = completion.substring(this.assignment.value.length, completion.length);
        }

        // If there is only one match, then the completion must complete to that
        // so it's safe to add a " " to the end.
        if (this._items.length == 1) {
            completion = completion + " ";
        }

        this.hint.completion = completion;
    }
});

/**
 * A special menu that understands a Matcher and will add items from the matcher
 * into itself.
 */
exports.MatcherMenu = exports.Menu.extend({
    matcher: undefined,
    loaded: undefined,

    _isLoaded: undefined,

    init: function() {
        this.superclass();
        this.matcher.addDelegate({
            matcherUpdatedItems: function() {
                console.log("matcherUpdatedItems");
            }
        });

        if (this.loaded) {
            this.loaded.then(function() {
                this._isLoaded = true;
            }.bind(this));
            this._isLoaded = false;
        } else {
            this._isLoaded = true;
        }

        this.addItems(this.matcher.getMatches());
    }
});
