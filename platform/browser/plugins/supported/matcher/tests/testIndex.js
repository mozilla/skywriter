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

var Matcher = require('matcher').Matcher;
var t = require('plugindev');

/**
 * Performs simple prefix matching.
 */
var MockMatcher = function(scores) {
    this.scores = scores;
};

MockMatcher.prototype = new Matcher('subclassPrototype');

MockMatcher.prototype.score = function(query, item) {
    return this.scores[item.name];
};

exports.testAddingStrings = function() {
    var matcher = new MockMatcher({ scores: { foo: 1, bar: 2, baz: 3 } });

    var items1 = null;
    var cleared1 = 0;
    matcher.addListener({
        itemsAdded: function(addedItems) {
            items1 = addedItems;
        },
        itemsCleared: function() {
            cleared1++;
        }
    });

    matcher.addItem({ name: 'foo' });
    t.equal(items1.length, 1, 'the length of the matcher\'s list of items ' +
        'after adding \"foo\"; and 1');
    t.equal(items1[0], 'foo', 'the text of the matcher\'s first item ' +
        'after adding \"foo\" and \"foo\"');

    matcher.addItems([ { name: 'bar' }, { name: 'baz' } ]);

    t.equal(items1.length, 2, 'the length of the matcher\'s list of items ' +
        'after adding \"bar\" and \"baz\"; and 2');
    t.equal(items1[0], 'baz', 'the text of the matcher\'s first item ' +
        'after adding \"bar\" and \"baz\"; and \"baz\"');
    t.equal(items1[1], 'bar', 'the text of the matcher\'s second item ' +
        'after adding \"bar\" and \"baz\"; and \"bar\"');

    // Matchers added after the date get the whole list
    var items2 = null;
    var cleared2 = 0;
    matcher.addListener({
        itemsAdded: function(addedItems) {
            items2 = addedItems;
        },
        itemsCleared: function() {
            cleared2++;
        }
    });

    t.equal(items2.length, 3, 'the length of the matcher\'s list of ' +
        'items after adding \"foo\"; and 3');
    t.equal(items2[0], 'baz', 'the text of the matcher\'s first item ' +
        'after adding \"bar\" and \"baz\"; and \"baz\"');
    t.equal(items2[1], 'bar', 'the text of the matcher\'s second item ' +
        'after adding \"bar\" and \"baz\"; and \"bar\"');
    t.equal(items2[2], 'foo', 'the text of the matcher\'s first item ' +
        'after adding \"foo\" and \"foo\"');

    t.equal(cleared1, 0, "itemsCleared (1) called too early");
    t.equal(cleared2, 0, "itemsCleared (2) called too early");

    matcher.set('query', 'wibble');

    t.equal(cleared1, 1, "itemsCleared (1) not called properly");
    t.equal(cleared2, 1, "itemsCleared (2) not called properly");

    t.equal(items1.length, 3, 'the length of the matcher\'s list of ' +
        'items after adding \"foo\"; and 3');
    t.equal(items1[0], 'baz', 'the text of the matcher\'s first item ' +
        'after adding \"bar\" and \"baz\"; and \"baz\"');
    t.equal(items1[1], 'bar', 'the text of the matcher\'s second item ' +
        'after adding \"bar\" and \"baz\"; and \"bar\"');
    t.equal(items1[2], 'foo', 'the text of the matcher\'s first item ' +
        'after adding \"foo\" and \"foo\"');

    t.equal(items2.length, 3, 'the length of the matcher\'s list of ' +
        'items after adding \"foo\"; and 3');
    t.equal(items2[0], 'baz', 'the text of the matcher\'s first item ' +
        'after adding \"bar\" and \"baz\"; and \"baz\"');
    t.equal(items2[1], 'bar', 'the text of the matcher\'s second item ' +
        'after adding \"bar\" and \"baz\"; and \"bar\"');
    t.equal(items2[2], 'foo', 'the text of the matcher\'s first item ' +
        'after adding \"foo\" and \"foo\"');
};
