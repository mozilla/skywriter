/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an 'AS IS' basis,
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

var SC = require('sproutcore/runtime').SC;
var diff_match_patch = require('diff').diff_match_patch;

var cliController = require('command_line:controller').cliController;
var Hint = require('command_line:hint').Hint;
var Level = require('command_line:hint').Level;

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

    /**
     * Generated command_line:hint.Hint
     */
    hint: undefined,

    /**
     * DOM nodes
     */
    _parent: undefined,
    _list: undefined,
    _notFound: undefined,

    /**
     * When someone clicks on a link, this is what we prefix onto what they
     * clicked on to get the full input they were expecting
     */
    _prefix: undefined,

    /**
     * The items that we should be displaying
     */
    _items: undefined,

    /**
     * The longest string which is a prefix to all the _items.name. A value
     * of null means we have not setup a prefix (probably _items is empty).
     * A value of '' means there is no common prefix.
     */
    _commonPrefix: undefined,

    /**
     *
     */
    init: function() {
        // The list of items
        this._parent = document.createElement('div');
        this._parent.setAttribute('class', 'cmd_menu');

        // We start by saying 'not found' and remove it when we find something
        this._notFound = document.createElement('div');
        this._notFound.setAttribute('class', 'cmd_error');
        this._notFound.innerHTML = 'No matches for \'' + this.input.typed + '\'';
        this._parent.appendChild(this._notFound);

        this._list = document.createElement('ul');
        this._parent.appendChild(this._list);

        this._items = [];
        this._commonPrefix = null;

        var argLen = this.assignment.value ? this.assignment.value.length : 0;
        var baseLen = this.input.typed.length - argLen;
        this._prefix = this.input.typed.substring(0, baseLen);

        this.hint = Hint.create({
            element: this._parent,
            level: Level.Incomplete,
            completion: undefined
        });
    },

    /**
     * Create the clickable links
     */
    addItems: function(items) {
        items.forEach(function(item) {
            // Create the UI component
            if (this._items.length < MAX_ITEMS) {
                var link = document.createElement('li');
                link.appendChild(document.createTextNode(item.name));

                if (item.description || item.path) {
                    var dfn = document.createElement('dfn');
                    var desc = item.description || item.path;
                    dfn.appendChild(document.createTextNode(desc));
                    link.appendChild(dfn);
                }

                this._list.appendChild(link);

                link.addEventListener('mousedown', function(ev) {
                    SC.run(function() {
                        var str = this._prefix + this._getFullName(item);
                        cliController.set('input', str);
                    }.bind(this));
                }.bind(this), false);

            }

            if (this._items.length === 0) {
                this._parent.removeChild(this._notFound);
            }

            this._items.push(item);

        }.bind(this));

        this.hint.completion = this._getBestCompletion();
    },

    /**
     * Find the best completion.
     * We'd most like to complete on a common prefix, however if one doesn't
     * exist then we go with the first item.
     */
    _getBestCompletion: function() {
        if (this._items.length === 0) {
            return undefined;
        }

        var longestPrefix = this._getFullName(this._items[0]);
        if (this._items.length > 1) {
            this._items.forEach(function(item) {
                if (longestPrefix.length > 0) {
                    var name = this._getFullName(item);
                    var len = diff.diff_commonPrefix(longestPrefix, name);
                    if (len < longestPrefix.length) {
                        longestPrefix = longestPrefix.substring(0, len);
                    }
                }
            }.bind(this));
        }

        // Use the first match if there is no better
        if (!longestPrefix || longestPrefix.length === 0) {
            longestPrefix = this._getFullName(this._items[0]);
        }

        // The length of the argument so far
        var argLen = this.assignment.value ? this.assignment.value.length : 0;
        // What was typed, without the argument so far
        var prefix = this.input.typed.substring(0, this.input.typed.length - argLen);

        return prefix + longestPrefix;
    },

    /**
     * If the item has a path in place of a description, then we need to
     * include this in our calculations that use the name
     */
    _getFullName: function(item) {
        return (item.path || '') + item.name;
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
        this.matcher.addListener({
            itemsAdded: function(addedItems) {
                this.addItems(addedItems);
            }.bind(this),

            itemsCleared: function() {
                this.clearItems();
            }.bind(this)
        });

        if (this.loaded) {
            this.loaded.then(function() {
                this._isLoaded = true;
            }.bind(this));
            this._isLoaded = false;
        } else {
            this._isLoaded = true;
        }
    }
});
