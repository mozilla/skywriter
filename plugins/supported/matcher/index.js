/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the 'License'); you may not use this file except in compliance with
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
 * either the GNU General Public License Version 2 or later (the 'GPL'), or
 * the GNU Lesser General Public License Version 2.1 or later (the 'LGPL'),
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

/**
 * @class
 * Base class for matching strategies.
 */
exports.Matcher = SC.Object.extend({
    /**
     * The string that we match against.
     * This is the only member of a matcher that should be observed.
     */
    query: null,

    /**
     * @private
     * List of objects to be notified of changes.
     */
    _listeners: null,

    /**
     * @private
     * Looks something like [ { item:{ name:'...' }, score:N }, ... ]
     */
    _scoredItems: null,

    init: function() {
        this._scoredItems = [];
        this._listeners = [];
    },

    addItem: function(item) {
        this.addItems([ item ]);
    },

    /**
     * All additions should go through this method
     */
    addItems: function(items) {
        var query = this.get('query');
        var addedScoredItems = [];

        items.forEach(function(item) {
            var scoredItem = {
                score: this.match(query, item.name),
                item: item
            };
            if (scoredItem.score > 0) {
                addedScoredItems.push(scoredItem);
            }
            this._scoredItems.push(scoredItem);
        }, this);

        var sorter = function(a, b) {
            return b.score - a.score;
        };
        this._scoredItems.sort(sorter);
        addedScoredItems.sort(sorter);

        var addedItems = addedScoredItems.map(function(addedScoredItem) {
            return addedScoredItem.item;
        });

        this._callListeners('itemsAdded', addedItems);
    },

    addListener: function(listener) {
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
    },

    _queryChanged: function() {
        var query = this.get('query');

        var addedItems = [];
        this._scoredItems.forEach(function(scoredItem) {
            scoredItem.score = this.match(query, scoredItem.item.name);
            if (scoredItem.score > 0) {
                addedItems.push(scoredItem.item);
            }
        }, this);

        this._callListeners('itemsCleared');
        this._callListeners('itemsAdded', addedItems);
    }.observes('query'),

    _callListeners: function() {
        var args = Array.prototype.slice.call(arguments);
        var method = args.shift();
        this._listeners.forEach(function(listener) {
            if (typeof listener[method] === 'function') {
                listener[method].apply(null, args);
            }
        });
    }
});
