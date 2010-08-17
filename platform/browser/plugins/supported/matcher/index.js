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

/**
 * We ignore items whose score is more than <tt>excludeScoreMargin</tt> off
 * the <tt>maxScore</tt>.
 */
var excludeScoreMargin = 500;

/**
 * Base class for matching strategies.
 * @param query {string} The string that we match against.
 * This is the only member of a matcher that should be observed.
 * @constructor
 */
exports.Matcher = function(query) {
    if (arguments[0] === 'subclassPrototype') {
        return;
    }

    this._query = query;

    // Looks something like [ { item:{ name:'...' }, score:N }, ... ]
    this._scoredItems = [];

    // List of objects to be notified of changes.
    this._listeners = [];

    // We ignore items that are way off the pace. This is the pace.
    this._maxScore = null;
};

Object.defineProperties(exports.Matcher.prototype, {
    query: {
        get: function() {
            return this._query;
        },

        set: function(value) {
            this._query = value;
            var addedItems = [];
            this._scoredItems.forEach(function(scoredItem) {
                scoredItem.score = this.score(this._query, scoredItem.item);
                if (scoredItem.score > 0) {
                    addedItems.push(scoredItem.item);
                }
            }, this);

            this._callListeners('itemsCleared');
            this._callListeners('itemsAdded', addedItems);
        }
    },

    /**
     * Add a single item to be considered by this matcher
     */
    addItem: {
        value: function(item) {
            this.addItems([ item ]);
        }
    },

    /**
     * Add multiple items to be considered by this matcher.
     */
    addItems: {
        value: function(items) {
            var addedScoredItems = [];
            var maxScoreChanged = false;

            items.forEach(function(item) {
                var scoredItem = {
                    score: this.score(this._query, item),
                    item: item
                };
                if (scoredItem.score > 0) {
                    addedScoredItems.push(scoredItem);
                }
                if (scoredItem.score > this._maxScore) {
                    this._maxScore = scoredItem.score;
                    maxScoreChanged = true;
                }
                this._scoredItems.push(scoredItem);
            }, this);

            var itemsRemoved = false;
            if (maxScoreChanged) {
                // The max score has changed - this could mean that existing
                // entries are no longer relevant. Check
                this._scoredItems.forEach(function(scoredItem) {
                    if (scoredItem.score + excludeScoreMargin < this._maxScore) {
                        itemsRemoved = true;
                    }
                });
            }

            // TODO: There is a bug here in that listeners will not know how to
            // slot these matches into the previously notified matches (we're not
            // passing the score on).
            var sorter = function(a, b) {
                return b.score - a.score;
            };
            this._scoredItems.sort(sorter);
            addedScoredItems.sort(sorter);

            var scoredItems;
            if (itemsRemoved) {
                this._callListeners('itemsCleared');
                scoredItems = this._scoredItems;
            } else {
                scoredItems = addedScoredItems;
            }

            var addedItems = [];
            scoredItems.forEach(function(scoredItem) {
                if (scoredItem.score + excludeScoreMargin > this._maxScore) {
                    addedItems.push(scoredItem.item);
                }
            }.bind(this));
            this._callListeners('itemsAdded', addedItems);
        }
    },

    addListener: {
        value: function(listener) {
            this._listeners.push(listener);

            var items = [];
            this._scoredItems.forEach(function(scoredItem) {
                if (scoredItem.score > 0) {
                    items.push(scoredItem.item);
                }
            }, this);

            if (typeof listener.itemsAdded === 'function') {
                listener.itemsAdded(items);
            }
        }
    },

    _callListeners: {
        value: function() {
            var args = Array.prototype.slice.call(arguments);
            var method = args.shift();
            this._listeners.forEach(function(listener) {
                if (typeof listener[method] === 'function') {
                    listener[method].apply(null, args);
                }
            });
        }
    }
});
