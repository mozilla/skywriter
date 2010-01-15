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

exports.testAddPositions = function() {
    t.deepEqual(Range.addPositions({ row: 0, column: 0 },
        { row: 0, column: 0 }), { row: 0, column: 0 }, "0,0 + 0,0 and 0,0");
    t.deepEqual(Range.addPositions({ row: 1, column: 0 },
        { row: 2, column: 0 }), { row: 3, column: 0 }, "1,0 + 2,0 and 3,0");
    t.deepEqual(Range.addPositions({ row: 0, column: 1 },
        { row: 0, column: 1 }), { row: 0, column: 2 }, "0,1 + 0,1 and 0,2");
    t.deepEqual(Range.addPositions({ row: 1, column: 2 },
        { row: -1, column: -2 }), { row: 0, column: 0 },
        "1,2 + -1,-2 and 0,0");
};

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

exports.testMaxPosition = function() {
    t.deepEqual(Range.maxPosition({ row: 0, column: 0 },
        { row: 0, column: 0 }), { row: 0, column: 0 }, "max(0,0 0,0) = 0,0");
    t.deepEqual(Range.maxPosition({ row: 0, column: 0 },
        { row: 1, column: 0 }), { row: 1, column: 0 }, "max(0,0 1,0) = 1,0");
    t.deepEqual(Range.maxPosition({ row: 0, column: 0 },
        { row: 0, column: 1 }), { row: 0, column: 1 }, "max(0,0 0,1) = 0,1");
    t.deepEqual(Range.maxPosition({ row: 1, column: 0 },
        { row: 0, column: 0 }), { row: 1, column: 0 }, "max(1,0 0,0) = 1,0");
    t.deepEqual(Range.maxPosition({ row: 0, column: 1 },
        { row: 0, column: 0 }), { row: 0, column: 1 }, "max(0,1 0,0) = 0,1");
};

exports.testUnionRanges = function() {
    t.deepEqual(Range.unionRanges({
            start:  { row: 1, column: 2 },
            end:    { row: 3, column: 4 },
        }, {
            start:  { row: 5, column: 6 },
            end:    { row: 7, column: 8 }
        }), {
            start:  { row: 1, column: 2 },
            end:    { row: 7, column: 8 }
        }, "[ 1,2 3,4 ] union [ 5,6 7,8 ] = [ 1,2 7,8 ]");
    t.deepEqual(Range.unionRanges({
            start:  { row: 4, column: 4 },
            end:    { row: 5, column: 5 }
        }, {
            start:  { row: 3, column: 3 },
            end:    { row: 4, column: 5 }
        }), {
            start:  { row: 3, column: 3 },
            end:    { row: 5, column: 5 }
        }, "[ 4,4 5,5 ] union [ 3,3 4,5 ] = [ 3,3 5,5 ]");
};

