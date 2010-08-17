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

var QuickMatcher = require('matcher:quick').QuickMatcher;
var t = require('plugindev');

exports.testQuickMatcher = function() {
    var matcher = new QuickMatcher('foo');
    matcher.addItems([
        { name:'foo' },
        { name:'foobar' },
        { name:'bar' },
        { name:'baz' },
        { name:'baAaz' }
    ]);

    var items;
    matcher.addListener({
        itemsAdded: function(addedItems) { items = addedItems; }
    });

    t.equal(items.length, 2, 'the number of matches when searching for ' +
        '\'foo\' and 2');
    t.equal(items[0], 'foo', 'the first match when searching for ' +
        '\'foo\' and \'foo\'');
    t.equal(items[1], 'foobar', 'the second match when searching for ' +
        '\'foo\' and \'foobar\'');

    matcher.set('query', 'ar');
    t.equal(items.length, 2, 'the number of matches when searching for ' +
        '\'ar\' and 2');
    t.equal(items[0], 'bar', 'the first match when searching for ' +
        '\'ar\' and \'bar\'');
    t.equal(items[1], 'foobar', 'the second match when searching for ' +
        '\'ar\' and \'foobar\'');

    matcher.set('query', 'bZ');
    t.equal(items.length, 2, 'the number of matches when searching for ' +
        '\'bZ\' and 2');
    t.equal(items[0], 'baz', 'the first match when searching for ' +
        '\'bZ\' and \'baz\'');
    t.equal(items[1], 'baAaz', 'the second match when searching for ' +
        '\'bZ\' and \'baAaz\'');
};
