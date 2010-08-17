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

var PrefixMatcher = require('matcher:prefix').PrefixMatcher;
var t = require('plugindev');

exports.testPrefixMatching = function() {
    var matcher = new PrefixMatcher('b');
    matcher.addItems([
        { name:'foo' },
        { name:'foobar' },
        { name:'bar' }
    ]);

    var items;
    matcher.addListener({
        itemsAdded: function(addedItems) { items = addedItems; }
    });

    t.equal(items.length, 1, 'the length of the list of matches when ' +
        'searching for \"b\" and 1');
    t.equal(items[0].item, 'bar', 'the text of the first matched item when ' +
        'searching for \"b\" and \"foo\"');

    matcher.set('query', 'FOO');
    t.equal(items.length, 2, 'the length of the list of matches when ' +
        'searching for \"FOO\" and 2');
    t.equal(items[0].item, 'foo', 'the text of the first matched item when ' +
        'searching for \"FOO\" and \"foo\"');
    t.equal(items[1].item, 'foobar', 'the text of the second matched item ' +
        'when searching for \"FOO\" and \"foobar\"');
};
