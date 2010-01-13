/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

var SC = require('sproutcore/runtime').SC;
var Patch = require('Patch:utils/patch').Patch;
var TextStorage = require('Editor:models/textstorage').TextStorage;
var t = require('PluginDev');

exports.testApply = function() {
    var storage = TextStorage.create();
    storage.insertCharacters({ row: 0, column: 0 },
        "A\nB\nC\nD\nE\nF\nG\nH\nI\nJ\nK\n");

    var patch = Patch.create({
        hunks: [
            {
                oldRange: { start: 1, end: 4 },
                newRange: { start: 1, end: 2 },
                operations: [
                    { op: ' ', line: "B" },
                    { op: '-', line: "C" },
                    { op: '-', line: "D" },
                    { op: ' ', line: "E" }
                ]
            },
            {
                oldRange: { start: 8, end: 9 },
                newRange: { start: 6, end: 11 },
                operations: [
                    { op: ' ', line: "I" },
                    { op: '+', line: "I" },
                    { op: '+', line: "I" },
                    { op: ' ', line: "J" }
                ]
            }
        ]
    });

    patch.applyTo(storage);
    t.equal(storage.get('value'), "A\nB\nE\nF\nG\nH\nI\nI\nI\nJ\nK\n",
        "the actual value of the storage after the patch and the expected " +
        "value of the storage after the patch");

    patch.reverse().applyTo(storage);
    t.equal(storage.get('value'), "A\nB\nC\nD\nE\nF\nG\nH\nI\nJ\nK\n",
        "the actual value of the storage after undoing the patch and the " +
        "original value of the storage");
};

