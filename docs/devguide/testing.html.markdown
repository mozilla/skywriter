---
layout: default
title: Bespin Developer's Guide
subtitle: Testing Bespin
---

Bespin uses [QUnit](http://docs.jquery.com/QUnit) as its unit testing 
library. Our goal is to have "very good" code coverage for everything
that is "officially supported" (the bespin-core and bespin-supported 
packages).

very good code coverage
:   Everything that can be readily tested without a huge amount of work.
    This means that some parts of the UI will not have automated tests,
    but we want everything else to have automated tests.

Running the Tests
-----------------

There are two ways to run the tests: from the browser and from the command 
line. To run the tests from the browser, fire up the development server
and then point your browser at 
[http://localhost:8080/test.html](http://localhost:8080/test.html).

To run the command line tests, run the following command:
  
    bespinTests

These commands will run the entire test suite, as appropriate for the type
of runner. In other words, tests that can only run on the command line will
only run there and tests that can only run in the browser will only run there.
Some tests can run just fine in both places.
