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

var Hint = require('command_line:hint').Hint;
var Level = require('command_line:hint').Level;
var env = require('environment').env;

/*
 * TODO:
 * - When there is only one option, and it's the same as what has already been
 *   typed, then don't display it.
 * - keyboard shortcuts for UP/DOWN (hard)
 * - in conjunction with the matchers - find a better way to order the matches
 *   the current order doesn't make sense to the user.
 */

/**
 * Hacky way to prevent menu overload
 */
var MAX_ITEMS = 10;

/**
 * Something of a hack to allow activateItemAction() to function by storing
 * a global latest menu instance. There are probably race conditions associated
 * with this. Technically it's possible to have more than one menu displaying
 * at a time (although probably won't be in the future) and should actually
 * happen now
 */
var latestMenu;

/**
 * Fire a menu accelerator to select a menu item. To save creating a new
 * function for every numeric accelerator, we dig into the commandExt to find
 * a number for the key press and use that.
 */
exports.activateItemAction = function(args, request) {
    var key = request.commandExt.key;
    var index = parseInt(key.replace(/[A-Za-z_]/g, ''), 10);
    if (!latestMenu) {
        return;
    }
    var action = latestMenu._itemActions[index];
    action();
};

/**
 * This is like diff_match_patch.diff_commonPrefix(), however it is case
 * insensitive
 */
var commonPrefixIC = function(a, b) {
    var i = 0;
    while (true) {
        if (a.charAt(i).toLocaleLowerCase() !== b.charAt(i).toLocaleLowerCase()) {
            return i;
        }
        if (i >= a.length || i >= b.length) {
            return i;
        }
        i++;
    }
};

/**
 * A list of the accelerator names, counting from 1 not 0, so we ignore the
 * first character.
 */
var accelerators = '-1234567890';

/**
 * A really basic UI hint for when someone is entering something from a
 * set of items, for example boolean|selection.
 */
exports.Menu = function(input, assignment) {
    if (arguments[0] === 'subclassPrototype') {
        return;
    }

    this.input = input;
    this.assignment = assignment;

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

    // The items that we should be displaying
    this._items = [];

    // The longest string which is a prefix to all the _items.name. A value
    // of null means we have not setup a prefix (probably _items is empty).
    // A value of '' means there is no common prefix.
    this._commonPrefix = null;

    // A store of what to do one key-press of some numbered action, probably
    // via a keyboard accelerator
    this._itemActions = [];

    var argLen = this.assignment.value ? this.assignment.value.length : 0;
    var baseLen = this.input.typed.length - argLen;

    // When someone clicks on a link, this is what we prefix onto what they
    // clicked on to get the full input they were expecting
    this._prefix = this.input.typed.substring(0, baseLen);

    // The 'return value' of the menu - contains the DOM node to display
    this.hint = new Hint(Level.Incomplete, this._parent);

    // See notes for #latestMenu
    latestMenu = this;
};

/**
 * Create the clickable links
 */
exports.Menu.prototype.addItems = function(items) {
    var i = 1;
    var maybeTabMenuItem;
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

            this._itemActions[i] = function(ev) {
                var str = this._prefix + this._getFullName(item);
                env.commandLine.setInput(str);
            }.bind(this);

            if (i < accelerators.length) {
                var abbr = document.createElement('abbr');
                abbr.innerHTML = "ALT-" + accelerators[i];
                if (i === 1) {
                    maybeTabMenuItem = abbr;
                }
                link.appendChild(abbr);
                i++;
            }

            this._list.appendChild(link);

            link.addEventListener('mousedown', function(ev) {
                var str = this._prefix + this._getFullName(item);
                env.commandLine.setInput(str);
                // Prevent the mousedown event. Otherwise the focused commandLine
                // is blured.
                ev.preventDefault();
            }.bind(this), false);
        }

        if (this._items.length === 0) {
            this._parent.removeChild(this._notFound);
        }

        this._items.push(item);

    }.bind(this));

    var best = this._getBestCompletion();
    this.hint.completion = best.completion;

    if (best.isFirst && maybeTabMenuItem) {
        maybeTabMenuItem.innerHTML = 'TAB';
    }
};

/**
 * Find the best completion.
 * We'd most like to complete on a common prefix, however if one doesn't
 * exist then we go with the first item.
 */
exports.Menu.prototype._getBestCompletion = function() {
    if (this._items.length === 0) {
        return { completion: undefined, isFirst: false };
    }

    var isFirst = (this._items.length === 1);

    var longestPrefix = this._getFullName(this._items[0]);
    if (this._items.length > 1) {
        this._items.forEach(function(item) {
            if (longestPrefix.length > 0) {
                var name = this._getFullName(item);
                var len = commonPrefixIC(longestPrefix, name);
                if (len < longestPrefix.length) {
                    longestPrefix = longestPrefix.substring(0, len);
                }
            }
        }.bind(this));
    }

    // Use the first match if there is no better
    if (!longestPrefix || longestPrefix.length === 0) {
        longestPrefix = this._getFullName(this._items[0]);
        isFirst = true;
    }

    // The length of the argument so far
    var argLen = this.assignment.value ? this.assignment.value.length : 0;
    // What was typed, without the argument so far
    var prefix = this.input.typed.substring(0, this.input.typed.length - argLen);

    var completion = prefix + longestPrefix;

    // If we're fuzzy matching, prefix + longestPrefix might actually be
    // shorter than what we've already typed. In this case it's a useless
    // completion, so we revert to the first. Also, if the completion is
    // the same as what's typed, it's useless - revert to first.
    if (completion.indexOf(this.input.typed) != 0
            || completion === this.input.typed) {
        completion = prefix + this._getFullName(this._items[0]);
        isFirst = true;
    }

    return { completion: completion, isFirst: isFirst };
};

/**
 * If the item has a path in place of a description, then we need to
 * include this in our calculations that use the name
 */
exports.Menu.prototype._getFullName = function(item) {
    return (item.path || '') + item.name;
};

/**
 * A special menu that understands a Matcher and will add items from the matcher
 * into itself.
 */
exports.MatcherMenu = function(input, assignment, matcher, loaded) {
    exports.Menu.call(this, input, assignment);
    this.matcher = matcher;
    this.loaded = loaded;

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
};

exports.MatcherMenu.prototype = new exports.Menu('subclassPrototype');
