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

To run the tests from your browser, fire up the development server
and then point your browser at 
[http://localhost:8080/test/](http://localhost:8080/test/).

You can select the portion of the test suite you wish to run.