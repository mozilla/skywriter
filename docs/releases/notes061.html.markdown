---
layout: default
title: Skywriter 0.6.1 Release Notes
---

[Up](index.html) - [Next Release](notes062.html) - [Previous Release](notes051.html)

Known Issues
------------

Skywriter Embedded 0.6.1 is *alpha* software. It is still under active development
and APIs are subject to change. Note also that 0.6 featured a complete retooling
of the editor component, so it is likely that there will be some bugs
in the editor that still need squashing.

* Command line completion is not yet implemented. (bug 539446)
* Text selection in fields *other than* the Skywriter editor on the page (in an
  embedded use) does not work (bug 540081)
* The Embedded editor remains larger than we'd like, but shrinking
  it down is low priority at the moment.
* The cursor doesn't blink (bug 540112)
* There is no CSS syntax highlighting yet (bug 547272)

Features
--------

* Syntax highlighting is back!
    * The new highlighting engine can properly handle a language embedded
      in another (such as JavaScript or CSS in HTML)
    * Highlighters are now created in a largely declarative way, as a set of
      regular expressions that are run in a state machine. There is documentation
      to help write syntax highlighters in the Plugin Guide.

Bug Fixes
---------

* Clicking on the "down" scrollbar handle should no longer crash your browser
  (bug 541938) 
* There was some overly aggressive CSS leaking out of the page (bugs
  546413 and 547106)
