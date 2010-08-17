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

var t = require('plugindev');
var Rect = require('utils/rect');

exports.testDistanceFromBounds = function() {
    t.equal(Rect._distanceFromBounds(1, 3, 5), -2,
        'the distance between 1 and [3,5], and -2');
    t.equal(Rect._distanceFromBounds(2, 2, 3), 0,
        'the distance between 2 and [2,3], and 0');
    t.equal(Rect._distanceFromBounds(5, 4, 6), 0,
        'the distance between 5 and [4,6], and 0');
    t.equal(Rect._distanceFromBounds(7, 4, 7), 0,
        'the distance between 7 and [4,7], and 0');
    t.equal(Rect._distanceFromBounds(1, -5, -2), 3,
        'the distance between 1 and [-5,-2], and 3');
};

exports.testMerge = function() {
    var resultSet = Rect.merge([
        { x: 0, y: 0, width: 1, height: 1 },
        { x: 2, y: 2, width: 1, height: 1 },
        { x: 0.5, y: 0.5, width: 2, height: 2 }
    ]);
    t.equal(resultSet.length, 1,
        'the number of rects in the union of [ (0,0) (1,1), (2,2) (1,1), ' +
        '(0,0) (3,3) ] and 1');
    t.deepEqual(resultSet[0], { x: 0, y: 0, width: 3, height: 3 },
        'the first rect in the union of [ (0,0) (1,1), (2,2) (1,1), ' +
        '(0,0) (3,3) ] and (0,0) (3,3)');

    resultSet = Rect.merge([
        { x: 0, y: 0, width: 1, height: 1 },
        { x: 1, y: 1, width: 1, height: 1 },
        { x: 2, y: 0, width: 1, height: 1 }
    ]);
    t.equal(resultSet.length, 3,
        'the number of rects in the result of unifying 3 non-overlapping ' +
        'rects and 3');
    t.deepEqual(resultSet[0], { x: 0, y: 0, width: 1, height: 1 },
        'the first rect in the result of unifying 3 non-overlapping rects ' +
        'and the original first rect');
    t.deepEqual(resultSet[1], { x: 1, y: 1, width: 1, height: 1 },
        'the second rect in the result of unifying 3 non-overlapping rects ' +
        'and the original second rect');
    t.deepEqual(resultSet[2], { x: 2, y: 0, width: 1, height: 1 },
        'the third rect in the result of unifying 3 non-overlapping rects ' +
        'and the original third rect');
};


exports.testOffsetFromRect = function() {
    var rect = { x: 0, y: 0, width: 1, height: 1 };
    t.deepEqual(Rect.offsetFromRect(rect, { x: -1, y: -1 }), { x: -1, y: -1 },
        'the offset from (-1,-1) to the unit square and (-1,-1)');
    t.deepEqual(Rect.offsetFromRect(rect, { x: 0, y: -1 }), { x: 0, y: -1 },
        'the offset from (0,-1) to the unit square and (0,-1)');
    t.deepEqual(Rect.offsetFromRect(rect, { x: 2, y: -1 }), { x: 1, y: -1 },
        'the offset from (2,-1) to the unit square and (1,-1)');
    t.deepEqual(Rect.offsetFromRect(rect, { x: -1, y: 0.5 }), { x: -1, y: 0 },
        'the offset from (-1,0.5) to the unit square and (-1,0)');
    t.deepEqual(Rect.offsetFromRect(rect, { x: 0.25, y: 1 }), { x: 0, y: 0 },
        'the offset from (0.25,1) to the unit square and (0,0)');
    t.deepEqual(Rect.offsetFromRect(rect, { x: 5, y: 0 }), { x: 4, y: 0 },
        'the offset from (5,0) to the unit square and (4,0)');
    t.deepEqual(Rect.offsetFromRect(rect, { x: -2, y: 2 }), { x: -2, y: 1 },
        'the offset from (-2,2) to the unit square and (-2,1)');
    t.deepEqual(Rect.offsetFromRect(rect, { x: 0.5, y: 3 }), { x: 0, y: 2 },
        'the offset from (0.5,3) to the unit square and (0,2)');
    t.deepEqual(Rect.offsetFromRect(rect, { x: 100, y: 2 }), { x: 99, y: 1 },
        'the offset from (100,2) to the unit square and (99,1)');
};

exports.testRectsIntersect = function() {
    t.ok(Rect.rectsIntersect({ x: 0, y: 0, width: 2, height: 2 },
        { x: 1, y: 1, width: 2, height: 2 }),
        '(0,0) (2,2) and (1,1) (3,3) intersect');
    t.ok(!Rect.rectsIntersect({ x: 0, y: 0, width: 1, height: 1 },
        { x: 0, y: 1, width: 1, height: 1 }),
        '(0,0) (1,1) and (0,1) (1,1) don\'t intersect');
    t.ok(!Rect.rectsIntersect({ x: 0, y: 0, width: 1, height: 1 },
        { x: 2, y: 2, width: 1, height: 1 }),
        '(0,0) (1,1) and (2,2) (3,3) don\'t intersect');
};

exports.testRectsSideBySide = function() {
    var unit = { x: 0, y: 0, width: 1, height: 1 };
    t.ok(!Rect.rectsSideBySide(unit, { x: -1, y: -1, width: 1, height: 1 }),
        '(0,0) (1,1) and (-1,1) and (0,0) are not side-by-side');
    t.ok( Rect.rectsSideBySide(unit, { x: 0,  y: -1, width: 1, height: 1 }),
        '(0,0) (1,1) and (0,-1) (1,0) are side-by-side');
    t.ok(!Rect.rectsSideBySide(unit, { x: 1,  y: -1, width: 1, height: 1 }),
        '(0,0) (1,1) and (1,-1) (2,0) are not side-by-side');
    t.ok( Rect.rectsSideBySide(unit, { x: -1, y: 0,  width: 1, height: 1 }),
        '(0,0) (1,1) and (-1,0) (0,1) are side-by-side');
    t.ok(!Rect.rectsSideBySide(unit, unit),
        '(0,0) (1,1) and (0,0) (1,1) are not side-by-side');
    t.ok( Rect.rectsSideBySide(unit, { x: 1,  y: 0,  width: 1, height: 1 }),
        '(0,0) (1,1) and (1,0) (2,1) are side-by-side');
    t.ok(!Rect.rectsSideBySide(unit, { x: -1, y: 1,  width: 1, height: 1 }),
        '(0,0) (1,1) and (-1,1) (0,2) are not side-by-side');
    t.ok( Rect.rectsSideBySide(unit, { x: 0,  y: 1,  width: 1, height: 1 }),
        '(0,0) (1,1) and (0,1) (1,2) are side-by-side');
    t.ok(!Rect.rectsSideBySide(unit, { x: 1,  y: 1,  width: 1, height: 1 }),
        '(0,0) (1,1) and (1,1) (2,2) are not side-by-side');
};

