---
layout: default
title: Skywriter Plugin Guide
subtitle: Writing and Running Tests
---

For core Skywriter code, our goal is to have "very good" code coverage. Plugins
that are not part of the Skywriter core can have whatever level of code coverage
you're comfortable with. The tools you need to do testing are included with
Skywriter in a plugin called "PluginDev".

very good code coverage
:   Everything that can be readily tested without a huge amount of work.
    This means that some parts of the UI will not have automated tests,
    but we want everything else to have automated tests.

Writing Unit Tests
------------------

The unit test library is based on SproutCore's core_test which is, in turn,
based on the [CommonJS Unit Testing 1.0 API](http://wiki.commonjs.org/wiki/Unit_Testing/1.0). 
SproutCore's test infrastructure (the core_test framework) is a modified 
version of [QUnit](http://docs.jquery.com/QUnit).
The CommonJS API doesn't define a way to do asynchronous testing in the
1.0 version, so the mechanism for async testing is borrowed from QUnit.

Here is an example test module:

    var t = require("PluginDev");

    exports.testBooleans = function() {
        t.ok(true, "This one's good");
        t.ok(2 == 3, "This one's a failure");
    };
    
    exports.testAsync = function() {
        setTimeout(function() {
            t.ok(true, "Got back from my timeout");
            t.start();
        }, 1);
        t.stop(100);
    };

    exports.testEquality = function() {
        t.equal(2*2, 4, "actual was 2*2, expected 4");
        t.deepEqual([{a:1}], [{a:1}], "deepEqual compares the objects recursively");
        t.notEqual(5, 4);
    };

The tests are very straightforward to write:

1. Make functions that start with "test" that you export from your module.
2. Use the various assertion functions available in PluginDev. In our tests, we import this module as "t" for convenience.
3. When performing asynchronous actions, call stop with a timeout. Once the action is done, call start again.


Running the Tests
-----------------

As of this writing, the test results are displayed to the browser console,
so you will need [Firebug](http://getfirebug.com/) or the developer tools
available for Safari and Chrome. To run the tests from your browser, fire up 
the development server load up the editor as normal. Log in to the editor.

In the console, run:

    tiki.async("PluginDev");
    var t = tiki.require("PluginDev");

This loads the PluginDev plugin for you. In addition to providing all of the assertions, PluginDev also provides a convenient way to run the tests. Run:

    t.runTest("PluginName:path/to/testmodule")
    
This will load and execute your test. As a bonus, if you run this again, it will reload your plugin and then run the test. So, you can switch back and forth between editor and browser, just pushing up arrow in between. It'll be even better when your editor is in your browser!

