/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the 'License'); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an 'AS IS' basis,
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
 * either the GNU General Public License Version 2 or later (the 'GPL'), or
 * the GNU Lesser General Public License Version 2.1 or later (the 'LGPL'),
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

require('sproutcore/runtime');
var ArrayUtils = require('utils/array');
var t = require('plugindev');

exports.testBinarySearch = function() {
    var compare = function(a, b) { return a - b; };
    t.equal(ArrayUtils.binarySearch([ 1, 2, 3, 4, 5 ], 0, compare), null,
        'the result of searching for 0 in [1..5] and null');
    t.equal(ArrayUtils.binarySearch([ 1, 2, 3, 4, 5 ], 1, compare), 0,
        'the result of searching for 1 in [1..5] and 0');
    t.equal(ArrayUtils.binarySearch([ 1, 2, 3, 4, 5 ], 2, compare), 1,
        'the result of searching for 2 in [1..5] and 1');
    t.equal(ArrayUtils.binarySearch([ 1, 2, 3, 4, 5 ], 3, compare), 2,
        'the result of searching for 3 in [1..5] and 2');
    t.equal(ArrayUtils.binarySearch([ 1, 2, 3, 4, 5 ], 4, compare), 3,
        'the result of searching for 4 in [1..5] and 3');
    t.equal(ArrayUtils.binarySearch([ 1, 2, 3, 4, 5 ], 5, compare), 4,
        'the result of searching for 5 in [1..5] and 4');
    t.equal(ArrayUtils.binarySearch([ 1, 2, 3, 4, 5 ], 6, compare), null,
        'the result of searching for 6 in [1..5] and null');
};

