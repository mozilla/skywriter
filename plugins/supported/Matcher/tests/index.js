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

var SC = require('sproutcore/runtime').SC;
var Matcher = require('Matcher').Matcher;
var t = require('PluginDev');

var MockMatcher = Matcher.extend({
    scores: null,

    match: function(query, str) {
        return this.get('scores')[str];
    }
});

exports.testAddingStrings = function() {
    var matcher = MockMatcher.create({ scores: { foo: 1, bar: 2, baz: 3 } });

    var notified;
    matcher.addDelegate(SC.Object.create({
        matcherUpdatedItems: function() { notified = true; }
    }));

    notified = false;
    matcher.addItem("foo");
    t.ok(notified, "the matcher notified its delegates upon adding \"foo\"");
    var items = matcher.get('items');
    t.equal(items.length, 1, "the length of the matcher's list of items " +
        "after adding \"foo\" and 1");
    t.equal(items[0].str, "foo", "the text of the matcher's first item " +
        "after adding \"foo\" and \"foo\"");
    t.equal(items[0].score, 1, "the score of the matcher's first item after " +
        "adding \"foo\" and 1");

    notified = false;
    matcher.addItems("bar baz".w());
    t.ok(notified, "the matcher notified its delegates upon adding \"bar\" " +
        "and \"baz\"");
    items = matcher.get('items');
    t.equal(items.length, 3, "the length of the matcher's list of items " +
        "after adding \"bar\" and \"baz\"; and 3");
    t.equal(items[0].str, "baz", "the text of the matcher's first item " +
        "after adding \"bar\" and \"baz\"; and \"baz\"");
    t.equal(items[0].score, 3, "the score of the matcher's first item after " +
        "adding \"bar\" and \"baz\"; and 3");
    t.equal(items[1].str, "bar", "the text of the matcher's second item " +
        "after adding \"bar\" and \"baz\"; and \"bar\"");
    t.equal(items[1].score, 2, "the score of the matcher's second item " +
        "after adding \"bar\" and \"baz\"; and 2");
    t.equal(items[2].str, "foo", "the text of the matcher's third item " +
        "after adding \"bar\" and \"baz\"; and \"foo\"");
    t.equal(items[2].score, 1, "the score of the matcher's third item after " +
        "adding \"bar\" and \"baz\"; and 1");
};

exports.testGettingMatches = function() {
    var matcher = MockMatcher.create({ scores: { foo: 1, bar: 0 } });

    matcher.addItems("foo bar".w());

    matcher.addListener({
        itemsAdded: function(matches) {
            t.equal(matches.length, 1, "the length of the list of matches and 1");
            t.equal(matches[0].str, "foo", "the text of the first matched item and " +
                "\"foo\"");
            t.equal(matches[0].score, 1, "the score of the first matched item and 1");
        }
    });
};

exports.testQueryUpdating = function() {
    var matcher = Matcher.create({
        query: "boo",
        match: function(query, str) {
            return query === str ? 1 : 0;
        }
    });

    var notified;
    matcher.addDelegate(SC.Object.create({
        matcherUpdatedItems: function() { notified = true; }
    }));

    matcher.addItems("foo bar baz".w());
    var matches = matcher.getMatches();
    t.equal(matches.length, 0, "the length of the list of matches with the " +
        "query \"boo\" and 0");

    notified = false;
    matcher.set('query', "baz");
    t.ok(notified, "the matcher notified its delegates upon changing the " +
        "query");
    matches = matcher.getMatches();
    t.equal(matches.length, 1, "the length of the list of matches with the " +
        "query \"baz\" and 1");
    t.equal(matches[0].str, "baz", "the text of the matched item with the " +
        "query \"baz\" and \"baz\"");
    t.equal(matches[0].score, 1, "the score of the matched item with the " +
        "query \"baz\" and 1");
};

