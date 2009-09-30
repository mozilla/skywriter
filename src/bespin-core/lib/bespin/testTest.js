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

dojo.provide("bespin.testTest");

dojo.require("bespin.test");

bespin.test.addTests("test", {
    setup: function() {
        this.setupRun = true;
    },

    testSetup: function(test) {
        test.isTrue(this.setupRun);
    },

    testSimple: function(test) {
        test.isTrue(true);
        test.isFalse(false);
        test.isNull(null);
        test.isUndefined(undefined);
        test.isNaN(NaN);
        test.isEqual(42, 42);

        test.isNotNull(undefined);
        test.isNotNull(0);
        test.isNotNull("null");
        test.isNotNull(false);

        test.isNotUndefined(null);
        test.isNotUndefined(0);
        test.isNotUndefined("undefined");
        test.isNotUndefined(false);

        test.isNotNaN(null);
        test.isNotNaN(0);
        test.isNotNaN("NaN");
        test.isNotNaN(false);

        test.isNotEqual(42, 43);
        test.isNotEqual(0, "0");
    },

    testAsync: function(test) {
        setTimeout(test.link(function() {
            test.isTrue(true);
            test.isEqual([ "a" ], [ "a" ]);
        }), 10);
    },

    testFailures: function(test) {
        test.message("It is important that this test fails in exactly 11 places");

        setTimeout(test.link(function() {
            test.isNull(100, "#7");
            test.isNotNull(null, "#8");
        }), 10);

        setTimeout(test.link(function() {
            test.isNull(100, "#9");
        }), 20);

        setTimeout(test.createOnError(function() {
            test.fail("#10");
        }), 30);

        setTimeout(test.createOnError(function() {
            test.fail("#11");
        }), 40);

        // Verify methods to not stop execution
        test.isTrue(false, "#1");
        test.isFalse(true, "#2");
        test.isEqual(42, 43, "#3");
        test.isEqual("a", "aa", "#4");
        test.isEqual([ "a" ], [ "aa" ], "#5");

        // Fail does
        test.fail("Die Die Die", "#6");
    },

    testFailFast: function(test) {
        // Sometimes you want to carry on when a test fails
        test.failFast = true;

        test.fail("This should fail only once");
        test.fail("If this happens we are broken");
    },

    testSlowDeath: function(test) {
        test.message("This only works if we get a 'Delayed failure' message");
        setTimeout(test.createOnError(function() {
            test.message("Delayed failure");
        }), 1000);
    },

    testSlowPass: function(test) {
        setTimeout(test.link(function() {
            test.message("Delayed success");
        }), 1000);
    },

    testCommand: function(test) {
        test.command("testoutput wibble", "wibble");
    }
});

// ** {{{Command: echo}}} **
bespin.command.store.addCommand({
    name: 'testoutput',
    takes: ['message ...'],
    preview: 'A test echo command',
    // ** {{{execute}}}
    execute: function(instruction, args) {
        instruction.addOutput(args);
    }
});
