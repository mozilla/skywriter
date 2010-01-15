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

/**
 * @private
 *
 * Returns the distance between the given value and the given inclusive upper
 * and lower bounds, or 0 if the value lies between them.
 *
 * Exported so that the function can be unit tested.
 */
exports._distanceFromBounds = function(value, low, high) {
    if (value < low) {
        return value - low;
    }
    if (value >= high) {
        return value - high;
    }
    return 0;
};

/**
 * Merges the given rectangle with the given set and returns the resulting set
 * of non-overlapping rectangles.
 */
exports.addRectToSet = function(set, rect) {
    set = set.concat(rect);

    var modified;
    do {
        modified = false;
        var newSet = [];

        for (var i = 0; i < set.length; i++) {
            var rectA = set[i];
            newSet.push(rectA);
            for (var j = i+1; j < set.length; j++) {
                var rectB = set[j];
                if (!exports.rectsIntersect(rectA, rectB)) {
                    continue;
                }

                set.removeAt(j, 1);

                // There's room for optimization here...
                newSet[newSet.length - 1] = SC.unionRects(rectA, rectB);

                modified = true;
                break;
            }
        }

        set = newSet;
    } while (modified);

    return set;
};

/**
 * Returns the vector representing the shortest offset between the given
 * rectangle and the given point.
 */
exports.offsetFromRect = function(rect, point) {
    return {
        x: exports._distanceFromBounds(point.x, rect.x, SC.maxX(rect)),
        y: exports._distanceFromBounds(point.y, rect.y, SC.maxY(rect))
    };
};

/**
 * Returns true if the rectanges intersect or false otherwise. Adjacent
 * rectangles don't count; they must actually overlap some region.
 */
exports.rectsIntersect = function(a, b) {
    var intersection = SC.intersectRects(a, b);
    return intersection.width !== 0 && intersection.height !== 0;
};

