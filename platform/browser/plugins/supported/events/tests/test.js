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
var Event = require('events').Event;

exports.testEventsAreCallable = function() {
    var evt = new Event();
    evt();
    t.ok(true, "events are callable");
};

exports.testAddingEvents = function() {
    var evt = new Event();
    var run1 = false, run2 = false, run3 = false;
    evt.add(function() { run1 = true; });
    evt.add(function() { run2 = true; });
    evt();
    t.ok(run1, "run1 handler was run");
    t.ok(run2, "run2 handler was run");

    run1 = false, run2 = false, run3 = false;
    evt.add(function() { run3 = true; });
    evt();
    t.ok(run1, "run1 handler was run");
    t.ok(run2, "run2 handler was run");
    t.ok(run3, "run3 handler was run");
};

exports.testRemovingEvents = function() {
    var evt = new Event();
    var ref = { hello: 'world' };
    var run1 = false, run2 = false, run3 = false;
    var callback1 = function() { run1 = true; };
    var callback2 = function() { run2 = true; };
    var callback3 = function() { run3 = true; };

    evt.add(callback1);
    evt.add(callback2);
    evt.remove(callback1);
    evt();
    t.equal(run1, false, "run1 handler was not run after removed");
    t.equal(run2, true, "run2 handler was run after run1 was removed");

    run1 = false, run2 = false, run3 = false;
    evt.add(callback3);
    evt.remove(callback2);
    evt.remove(callback3);
    evt();
    t.equal(run1, false, "run1 handler was not run after all callbacks were " +
        "removed");
    t.equal(run2, false, "run2 handler was not run after all callbacks were " +
        "removed");
    t.equal(run3, false, "run3 handler was not run after all callbacks were " +
        "removed");

    run1 = false, run2 = false, run3 = false;
    evt.add(ref, callback3);
    evt.remove(ref);
    evt();
    t.equal(run1, false, "run1 handler was not run after all callbacks were " +
        "removed");
    t.equal(run2, false, "run2 handler was not run after all callbacks were " +
        "removed");
    t.equal(run3, false, "run3 handler was not run after all callbacks were " +
        "removed");
};

