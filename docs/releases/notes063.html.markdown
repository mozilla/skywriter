---
layout: default
title: Skywriter 0.6.3 Release Notes
---

[Up](index.html) - [Next Release](notes07.html) - [Previous Release](notes062.html)

Known Issues
------------

Skywriter Embedded 0.6.3 is *alpha* software. It is still under active development
and APIs are subject to change. Note also that 0.6 featured a complete retooling
of the editor component, so it is likely that there will be some bugs
in the editor that still need squashing.

* Skywriter Embedded does not attach correctly to a textarea (bug 535819;
  workaround: change the textarea to a div first)
* Options are not settable at runtime (bug 549679)
* There is no CSS syntax highlighting yet (bug 547272)
* Bits of the cursor may remain when focusing the editor (bug 550642)
* The editor can flicker when it regains focus (bug 550642)
* Accidental double-clicks are possible when changing the selection (bug
  548867)
* The Embedded editor remains larger than we'd like, but shrinking
  it down is low priority at the moment

Bug Fixes
---------

* dryice on Windows now produces good builds (previously broken because
  of the \ path separator.) (bug 550896)
* fixes in dryice unicode handling
* tweaks to the sample.html file to fix the button that copies the text from
  the editor to the DOM.
