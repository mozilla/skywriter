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
var History = require('file_history').FileHistory;

exports.testHistory = function() {
    var mockStorage = {};
    var history = new History(mockStorage);

    t.equal(history.getRecent(100).length, 0, 'the length of a freshly ' +
        'created history object and zero');

    history.addPath('foo');
    history.addPath('bar');
    var paths = history.getRecent(10);
    t.equal(paths.length, 2, 'the length of the history object with two ' +
        'paths in it and 2');
    t.equal(paths[0], 'bar', 'the first path in the history object with ' +
        'two paths added to it and \"bar\"');
    t.equal(paths[1], 'foo', 'the second path in the history object with ' +
        'two paths added to it and \"foo\"');

    history.addPath('baz');
    history.addPath('bar');
    history.addPath('boo');
    paths = history.getRecent(10);
    t.equal(paths.length, 4, 'the length of the history object with four ' +
        'paths in it and 4');
    t.equal(paths[0], 'boo', 'the first path in the history object with ' +
        'four paths in it and \"boo\"');
    t.equal(paths[1], 'bar', 'the second path in the history object with ' +
        'four paths in it and \"bar\"');
    t.equal(paths[2], 'baz', 'the third path in the history object with ' +
        'four paths in it and \"baz\"');
    t.equal(paths[3], 'foo', 'the fourth path in the history object with ' +
        'four paths in it and \"foo\"');

    paths = history.getRecent(2);
    t.equal(paths.length, 2, 'the number of paths returned when requesting ' +
        'two paths from the history object with four paths in it and 2');
    t.equal(paths[0], 'boo', 'the first path in the list of paths returned ' +
        'when requesting two paths from the history object with four paths ' +
        'in it and \"boo\"');
    t.equal(paths[1], 'bar', 'the second path in the list of paths returned ' +
        'when requesting two paths from the history object with four paths ' +
        'in it and \"bar\"');
};

