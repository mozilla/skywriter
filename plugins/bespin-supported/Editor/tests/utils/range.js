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

require('sproutcore/runtime');
var t = require('PluginDev');
var Range = require('utils/range');

exports.testComparePositions = function() {
    t.equal(Range.comparePositions({ row: 0, column: 0 },
        { row: 0, column: 0 }), 0, "0,0 = 0,0");
    t.ok(Range.comparePositions({ row: 0, column: 0 },
        { row: 1, column: 0 }) < 0, "0,0 < 1,0");
    t.ok(Range.comparePositions({ row: 0, column: 0 },
        { row: 0, column: 1 }) < 0, "0,0 < 0,1");
    t.ok(Range.comparePositions({ row: 1, column: 0 },
        { row: 0, column: 0 }) > 0, "1,0 > 0,0");
    t.ok(Range.comparePositions({ row: 0, column: 1 },
        { row: 0, column: 0 }) > 0, "0,1 > 0,0");
};

exports.testExtendRange = function() {
    t.deepEqual(Range.extendRange({
            start:  { row: 1, column: 2 },
            end:    { row: 3, column: 4 }
        }, { row: 5, column: 6 }), {
            start:  { row: 1, column: 2 },
            end:    { row: 8, column: 10 }
        }, "[ 1,2 3,4 ] extended by 5,6 = [ 1,2 8,10 ]");
    t.deepEqual(Range.extendRange({
            start:  { row: 7, column: 8 },
            end:    { row: 9, column: 10 }
        }, { row: 0, column: 0 }), {
            start:  { row: 7, column: 8 },
            end:    { row: 9, column: 10 }
        }, "[ 7,8 9,10 ] extended by 0,0 remains the same");
};

