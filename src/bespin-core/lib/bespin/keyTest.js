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


var tester = require("bespin.test");

tester.addTests("key", {
    testPie: function(test) {
        var escapeKeyDown = document.createEvent();

        // TODO: Find a better way to simulate a key-press
        var event = document.createEvent("KeyboardEvent");
        event.initKeyEvent("onkeypress", true, true, window, false/*ctrl*/, false/*alt*/, false/*shift*/, false/*meta*/, bespin.util.keys.Key.ESCAPE, 5);
        var canceled = !document.dispatchEvent(event);

        // TODO: Find a way to test the results of the key-press!
    }
});
