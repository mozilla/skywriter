---
layout: default
title: Bespin Developer's Guide
subtitle: Testing Bespin
---

Bespin uses the SproutCore testing framework as its unit testing library, which
is derived from [QUnit](http://docs.jquery.com/QUnit). Our goal is to have
"very good" code coverage for everything that is "officially supported" (the
_bespin-core_ and _bespin-supported_ packages).

very good code coverage
:   Everything that can be readily tested without a huge amount of work.
    This means that some parts of the UI will not have automated tests,
    but we want everything else to have automated tests.

Running the Tests
-----------------

As of this writing, the test results are displayed to the browser console,
so you will need [Firebug](http://getfirebug.com/) or similar. To run the 
tests from your browser, fire up the development server and then point 
your browser at 
[`http://localhost:4020/bespin/en/current/tests/editor.html`](http://localhost:4020/bespin/en/current/tests/editor.html).
To run other tests, replace `editor` with the name of the test as appropriate.
(You can find the names of the tests by looking at the names of the files in
`frameworks/bespin/tests`.)

In the future, this process will mature as SproutCore's testing framework does.

