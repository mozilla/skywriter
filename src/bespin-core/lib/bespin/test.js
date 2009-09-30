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

dojo.provide("bespin.test");

dojo.require("bespin.util.util");

/**
 * Add a 'test' command'
 */
bespin.command.store.addCommand({
    name: 'test',
    takes: ['suite'],
    preview: 'run a test suite or suites',
    completeText: 'suite name, or \'all\' to run all tests, or press return to list tests.',
    execute: function(instruction, suite) {
        if (!suite) {
            if (bespin.util.isEmpty(bespin.test._knownTests)) {
                instruction.addOutput("No test suites registered. See bespin.test.addTests() to add them.");
            } else {
                var msg = "Available test targets: all";
                for (var name in bespin.test._knownTests) {
                    msg += ", " + name;
                }
                instruction.addOutput(msg);
            }
        } else if (suite == "all") {
            var tests = [];
            for (var name in bespin.test._knownTests) {
                tests.push(name);
            }
            bespin.test.run(instruction, tests);
        } else {
            if (bespin.test._knownTests[suite]) {
                bespin.test.run(instruction, [suite]);
            } else {
                instruction.addErrorOutput("No test suite called: " + suite);
            }
        }
    }
});

/**
 * The bespin.test object is used in setting up test suites, creating the UI
 * and doing all the thinking except for actually running the tests
 */
dojo.mixin(bespin.test, {
    /**
     * Add a named test suite to the list of available tests
     * @param name The new test suite name
     * @param container Object containing setup|teardown|test* methods
     */
    addTests: function(name, container) {
        if (name == "all") throw new Error("Test suites can't be called 'all'");
        this._knownTests[name] = container;
    },

    /**
     * Run the named test suites
     * @param names An array of test suite names
     */
    run: function(instruction, suiteNames) {
        console.log("bespin.test.run", suiteNames);

        var table = dojo.create("table");
        instruction.setElement(table);

        var tbody = dojo.create("tbody", {}, table);

        var row = dojo.create("tr", {}, tbody);
        dojo.create("th", { innerHTML: "Test Name" }, row);
        dojo.create("th", { innerHTML: "Results" }, row);
        dojo.create("th", { innerHTML: "Action" }, row);
        dojo.create("th", { innerHTML: "Notes" }, row);

        var self = this;
        suiteNames.forEach(function(suiteName) {
            row = dojo.create("tr", {}, tbody);
            dojo.create("th", { innerHTML: suiteName }, row);
            dojo.create("td", { }, row); // 'Action' column
            var suiteResultsTd = dojo.create("td", { }, row);
            var suiteNotesTd = dojo.create("td", { }, row);

            var suite = self._knownTests[suiteName];

            // Call setup
            var setupOk = true;
            if (suite.setup) {
                try {
                    suite.setup();
                }
                catch (e) {
                    console.error(suiteName + ".setup(): ", e);
                    var message = suiteName + ".setup() failed: " + e.toString();
                    suiteNotesTd.innerHTML = message;
                    setupOk = false;
                }
            }

            if (setupOk) {
                // Run the tests
                for (var testName in suite) {
                    var test = suite[testName];
                    if (testName.match(/test/) && typeof test == "function") {
                        row = dojo.create("tr", {}, tbody);
                        dojo.create("td", {
                            innerHTML: self._addSpaces(testName),
                            style: "padding-left:30px;"
                        }, row);
                        var actionTd = dojo.create("td", { }, row);
                        var resultsTd = dojo.create("td", {
                            style: "padding:0 3px;"
                        }, row);
                        var notesTd = dojo.create("td", { }, row);

                        var assert = new bespin.test.Assert(suiteName, suite, testName, test, resultsTd, notesTd);

                        dojo.create("button", {
                            innerHTML: "Run",
                            onclick: (function(assert) {
                                return function() {
                                    assert._reset();
                                    assert._runTest();
                                };
                            })(assert)
                        }, actionTd);

                        // Run an individual test
                        assert._runTest();
                    }
                }

                // Tear Down
                if (suite.tearDown) {
                    try {
                        suite.tearDown();
                    } catch (e) {
                        console.error(suiteName + ".tearDown(): ", e);
                        var message = "tearDown() failed: " + e.toString();
                        suiteNotesTd.innerHTML = message;
                    }
                }
            }
        });
    },

    /**
     * Format a function name for display
     */
    _addSpaces: function(testName) {
        testName = testName.replace(/^test/g, "");
        testName = testName.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
        testName = testName.replace(/([a-zA-Z])([0-9])/g, "$1 $2");
        return testName;
    },

    /**
     * @private
     * Registered tests are stored in here
     */
    _knownTests: {}
});

/**
 * Statuses are opaque values to denote how a test is progressing
 * No really they are opaque - you can't see all that stuff.
 * These are not the values that you are looking for.
 */
bespin.test.Status = {
    none:  { ord:0, attr: { style: { color:"#000", backgroundColor:"#eee" }, innerHTML:"-" } },
    exec:  { ord:1, attr: { style: { color:"#fff", backgroundColor:"#888" }, innerHTML:"Exec" } },
    async: { ord:2, attr: { style: { color:"#000", backgroundColor:"#ffa" }, innerHTML:"Wait" } },
    pass:  { ord:3, attr: { style: { color:"#000", backgroundColor:"#8f8" }, innerHTML:"Pass" } },
    fail:  { ord:4, attr: { style: { color:"#fff", backgroundColor:"#f00" }, innerHTML:"Fail" } }
};

/**
 * Test helper that's passed to the test functions.
 * Anything that starts with a _ may be changed without notice in the future
 */
dojo.declare("bespin.test.Assert", null, {
    constructor: function(suiteName, suite, testName, test, resultsTd, notesTd) {
        this._suiteName = suiteName;
        this._suite = suite;
        this._test = test;
        this._testName = testName;
        this._resultsTd = resultsTd;
        this._notesTd = notesTd;
        this._outstanding = 0;
        this._start = new Date().getTime();

        this.failFast = false;
        this.status = bespin.test.Status.none;
    },

    isTrue: function(value, message) {
        if (!value) this._fail("isTrue", arguments);
    },
    isFalse: function(value, message) {
        if (value) this._fail("isFalse", arguments);
    },
    isNull: function(value, message) {
        if (value !== null) this._fail("isNull", arguments);
    },
    isNotNull: function(value, message) {
        if (value === null) this._fail("isNotNull", arguments);
    },
    isUndefined: function(value, message) {
        if (value !== undefined) this._fail("isUndefined", arguments);
    },
    isNotUndefined: function(value, message) {
        if (value === undefined) this._fail("isNotUndefined", arguments);
    },
    isNaN: function(value, message) {
        if (!isNaN(value)) this._fail("isNaN", arguments);
    },
    isNotNaN: function(value, message) {
        if (isNaN(value)) this. _fail("isNotNaN", arguments);
    },
    isEqual: function(expected, actual, message) {
        if (!this._isEqual(expected, actual)) this._fail("isEqual", arguments);
    },
    isNotEqual: function(expected, actual, message) {
        if (this._isEqual(expected, actual)) this._fail("isNotEqual", arguments);
    },
    fail: function(message) {
        this._fail("fail", arguments);
    },
    message: function(message) {
        this._addMessage("<strong>" + message + "</strong>");
    },

    /**
     * Type in a command and check that the response is as expected
     * @param type The command to execute
     * @param expect If string, then check that the command output is exactly
     * as specified, if array then check that the command output contains all of
     * the strings in the array
     */
    command: function(type, expect) {
        var commandLine = bespin.get("commandLine");
        var instruction = commandLine.executeCommand(type, true);

        var self = this;
        var check = function(output) {
            if (dojo.isArray(expect)) {
                expect.forEach(function(expected) {
                    if (output.indexOf(expected) == -1) {
                        self._fail("command", [ type, expected ], output);
                    }
                });
            } else {
                if (output != expect) {
                    self._fail("command", [ type, expect ], output);
                }
            }
        };

        if (instruction.element) {
            // IE: Do we care that is doesn't do textContent?
            check(instruction.element.textContent);
        } else if (instruction.outstanding != 0) {
            instruction.onOutput(function() {
                if (instruction.complete) {
                    check(instruction.output);
                }
            });
        } else {
            check(instruction.output);
        }
    },

    /**
     * Associate a function to be run in an asynchronous context with the
     * currently executing test.
     */
    link: function(func, scope) {
        this._updateStatus(bespin.test.Status.async);
        this._outstanding++;

        var self = this;
        return function() {
            try {
                if (typeof func == "function") {
                    return func.apply(scope, arguments);
                }
            } catch (e) {
                if (e.toString() != "failFast") {
                    console.error(this._suiteName + "." + this._testName + ":link(): ", e);
                    self._addFunctionMessage("link", [ e.toString() ]);
                    self._updateStatus(bespin.test.Status.fail);
                }
            } finally {
                self._outstanding--;

                if (self._outstanding == 0) {
                    self._updateStatus(bespin.test.Status.pass);
                }
            }
        };
    },

    /**
     * Create a function which will report an error to a test if it is called.
     */
    createOnError: function(func, scope) {
        var self = this;
        return function() {
            self._updateStatus(bespin.test.Status.fail);
            if (typeof func == "function") {
                self._addMessage("onError handler called");
                try {
                    return func.apply(scope, arguments);
                } catch (e) {
                    if (e.toString() != "failFast") {
                        console.error(this._suiteName + "." + this._testName + ":createOnError(): ", e);
                        self._addFunctionMessage("createOnError", [ e.toString() ]);
                    }
                }
            }
            else if (typeof func == "string") {
                self._addFunctionMessage("createOnError", [ func ]);
            }
            else {
                self._addFunctionMessage("createOnError");
            }
        };
    },

    _reset: function() {
        this.status = bespin.test.Status.none;
        this._outstanding = 0;
        this._start = new Date().getTime();
        this._notesTd.innerHTML = "";
        dojo.attr(this._resultsTd, this.status.attr);
    },
    _runTest: function() {
        if (this._suite.setupTest) {
            try {
                this._suite.setupTest.call(this._suite);
            }
            catch (e) {
                console.error("setupTest failure when running: " + this._suiteName + "." + this._testName + "(): ", e);
                this._addFunctionMessage(this._testName, [ e.toString() ]);
                this._updateStatus(bespin.test.Status.fail);
                return;
            }
        }

        console.log("Running test", this._testName);
        this._updateStatus(bespin.test.Status.exec);
        try {
            this._test.call(this._suite, this);

            if (this._outstanding == 0) {
                this._updateStatus(bespin.test.Status.pass);
            }
        }
        catch (e) {
            if (e != "failFast") {
                console.error(this._suiteName + "." + this._testName + "(): ", e);
                this._addFunctionMessage(this._testName, [ e.toString() ]);
                this._updateStatus(bespin.test.Status.fail);
            }
        }

        if (this._suite.tearDownTest) {
            try {
                this._suite.tearDownTest.call(this._suite);
            }
            catch (e) {
                console.error("tearDownTest failure when running: " + this._suiteName + "." + this._testName + "(): ", e);
                this._addFunctionMessage(this._testName, [ e.toString() ]);
                this._updateStatus(bespin.test.Status.fail);
            }
        }
    },
    _fail: function(type, args, reply) {
        this._addFunctionMessage(type, args, reply);
        this._updateStatus(bespin.test.Status.fail);
        if (this.failFast) {
            throw "failFast";
        }
    },
    _addFunctionMessage: function(type, args, reply) {
        var message = type + this._argsToString(args);
        if (reply) {
            message += " = " + dojo.toJson(reply);
        }
        this._addMessage(message);
    },
    _addMessage: function(message) {
        this._notesTd.innerHTML += message + "<br/>";
    },
    /**
     * Status can't be overwritten with value with a lower ord
     */
    _updateStatus: function(status) {
        if (this.status.ord < status.ord) {
            this.status = status;
        }
        dojo.attr(this._resultsTd, this.status.attr);
        var delay = (new Date().getTime() - this._start) / 1000;
        this._resultsTd.innerHTML += " (in " + delay + " ms)";
    },
    _argsToString: function(args) {
        var reply = "(";
        if (args != null) {
            for (var i = 0; i < args.length; i++) {
                if (i != 0) reply += ", ";
                reply += dojo.toJson(args[i]);
            }
        }
        reply += ")";
        return reply;
    },
    _isEqual: function(expected, actual, depth) {
        if (!depth) depth = 0;
        // Rather than failing we assume that it works!
        if (depth > 10) return true;

        if (expected == null) {
            if (actual != null) {
                console.log("expected: null, actual non-null: " + dojo.toJson(actual));
                return false;
            }
            return true;
        }

        if (typeof(expected) == "number" && isNaN(expected)) {
            if (!(typeof(actual) == "number" && isNaN(actual))) {
                console.log("expected: NaN, actual non-NaN: " + dojo.toJson(actual));
                return false;
            }
            return true;
        }

        if (actual == null) {
            if (expected != null) {
                console.log("actual: null, expected non-null: " + dojo.toJson(expected));
                return false;
            }
            return true; // we wont get here of course ...
        }

        if (typeof expected == "object") {
            if (!(typeof actual == "object")) {
                console.log("expected object, actual not an object");
                return false;
            }

            var actualLength = 0;
            for (var prop in actual) {
                if (typeof actual[prop] != "function" || typeof expected[prop] != "function") {
                    var nest = this._isEqual(actual[prop], expected[prop], depth + 1);
                    if (typeof nest != "boolean" || !nest) {
                        console.log("element '" + prop + "' does not match: " + nest);
                        return false;
                    }
                }
                actualLength++;
            }

            // need to check length too
            var expectedLength = 0;
            for (prop in expected) expectedLength++;
            if (actualLength != expectedLength) {
                console.log("expected object size = " + expectedLength + ", actual object size = " + actualLength);
                return false;
            }
            return true;
        }

        if (actual != expected) {
            console.log("expected = " + expected + " (type=" + typeof expected + "), actual = " + actual + " (type=" + typeof actual + ")");
            return false;
        }

        if (expected instanceof Array) {
            if (!(actual instanceof Array)) {
                console.log("expected array, actual not an array");
                return false;
            }
            if (actual.length != expected.length) {
                console.log("expected array length = " + expected.length + ", actual array length = " + actual.length);
                return false;
            }
            for (var i = 0; i < actual.length; i++) {
                var inner = this._isEqual(actual[i], expected[i], depth + 1);
                if (typeof inner != "boolean" || !inner) {
                    console.log("element " + i + " does not match: " + inner);
                    return false;
                }
            }

            return true;
        }

        return true;
    }
});
