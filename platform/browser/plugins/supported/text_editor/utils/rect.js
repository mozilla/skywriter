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
 * Merges the rectangles in a given set and returns the resulting set of non-
 * overlapping rectanlges.
 */
exports.merge = function(set) {
    var modified;
    do {
        modified = false;
        var newSet = [];

        for (var i = 0; i < set.length; i++) {
            var rectA = set[i];
            newSet.push(rectA);
            for (var j = i+1; j < set.length; j++) {
                var rectB = set[j];
                if (exports.rectsSideBySide(rectA, rectB) ||
                                        exports.rectsIntersect(rectA, rectB)) {
                    set.splice(j, 1);

                    // There's room for optimization here...
                    newSet[newSet.length - 1] = exports.unionRects(rectA, rectB);

                    modified = true;
                    break;
                }
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
        x: exports._distanceFromBounds(point.x, rect.x, exports.maxX(rect)),
        y: exports._distanceFromBounds(point.y, rect.y, exports.maxY(rect))
    };
};

/**
 * Returns true if the rectanges intersect or false otherwise. Adjacent
 * rectangles don't count; they must actually overlap some region.
 */
exports.rectsIntersect = function(a, b) {
    var intersection = exports.intersectRects(a, b);
    return intersection.width !== 0 && intersection.height !== 0;
};

/**
 * Checks if two rects lay side by side. Returns true if this is true.
 * For example:
 *      +------------+---------------+
 *      |    A       |       B       |
 *      +------------+---------------+
 * will be true, but if B is only one pixel shifted up,
 * then it would return false.
 */
exports.rectsSideBySide = function(a, b) {
    if (a.x == b.x && a.width == b.width) {
        if (a.y < b.y) {
            return (a.y + a.height) == b.y;
        } else {
            return (b.y + b.height) == a.y;
        }
    } else if (a.y == b.y && a.height == b.height) {
        if (a.x < b.x) {
            return (a.x + a.width) == b.x;
        } else {
            return (b.x + b.width) == a.x;
        }
    }
    return false;
};

// extracted from SproutCore
exports.intersectRects = function(r1, r2) {
  // find all four edges
  var ret = {
    x: Math.max(exports.minX(r1), exports.minX(r2)),
    y: Math.max(exports.minY(r1), exports.minY(r2)),
    width: Math.min(exports.maxX(r1), exports.maxX(r2)),
    height: Math.min(exports.maxY(r1), exports.maxY(r2))
  } ;

  // convert edges to w/h
  ret.width = Math.max(0, ret.width - ret.x) ;
  ret.height = Math.max(0, ret.height - ret.y) ;
  return ret ;
};

/** Return the left edge of the frame */
exports.minX = function(frame) {
  return frame.x || 0;
};

/** Return the right edge of the frame. */
exports.maxX = function(frame) {
  return (frame.x || 0) + (frame.width || 0);
};

/** Return the top edge of the frame */
exports.minY = function(frame) {
  return frame.y || 0 ;
};

/** Return the bottom edge of the frame */
exports.maxY = function(frame) {
  return (frame.y || 0) + (frame.height || 0) ;
};

/** Check if the given point is inside the rect. */
exports.pointInRect = function(point, f) {
    return  (point.x >= exports.minX(f)) &&
            (point.y >= exports.minY(f)) &&
            (point.x <= exports.maxX(f)) &&
            (point.y <= exports.maxY(f)) ;
};

/** Returns the union between two rectangles

  @param r1 {Rect} The first rect
  @param r2 {Rect} The second rect
  @returns {Rect} The union rect.
*/
exports.unionRects = function(r1, r2) {
  // find all four edges
  var ret = {
    x: Math.min(exports.minX(r1), exports.minX(r2)),
    y: Math.min(exports.minY(r1), exports.minY(r2)),
    width: Math.max(exports.maxX(r1), exports.maxX(r2)),
    height: Math.max(exports.maxY(r1), exports.maxY(r2))
  } ;

  // convert edges to w/h
  ret.width = Math.max(0, ret.width - ret.x) ;
  ret.height = Math.max(0, ret.height - ret.y) ;
  return ret ;
};

/** Return true if the two frames match.  You can also pass only points or sizes.

  @param r1 {Rect} the first rect
  @param r2 {Rect} the second rect
  @param delta {Float} an optional delta that allows for rects that do not match exactly. Defaults to 0.1
  @returns {Boolean} true if rects match
 */
exports.rectsEqual = function(r1, r2, delta) {
    if (!r1 || !r2) return (r1 == r2) ;
    if (!delta && delta !== 0) delta = 0.1;
    if ((r1.y != r2.y) && (Math.abs(r1.y - r2.y) > delta)) return false ;
    if ((r1.x != r2.x) && (Math.abs(r1.x - r2.x) > delta)) return false ;
    if ((r1.width != r2.width) && (Math.abs(r1.width - r2.width) > delta)) return false ;
    if ((r1.height != r2.height) && (Math.abs(r1.height - r2.height) > delta)) return false ;
    return true ;
};
