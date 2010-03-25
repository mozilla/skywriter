---
layout: default
title: Bespin 0.6.2 Release Notes
---

[Up](index.html) - [Next Release](notes07.html) - [Previous Release](notes061.html)

Known Issues
------------

Bespin Embedded 0.6.2 is *alpha* software. It is still under active development
and APIs are subject to change. Note also that 0.6 featured a complete retooling
of the editor component, so it is likely that there will be some bugs
in the editor that still need squashing.

* Bespin Embedded does not attach correctly to a textarea (bug 535819;
  workaround: change the textarea to a div first)
* Options are not settable at runtime (bug 549679)
* There is no CSS syntax highlighting yet (bug 547272)
* Bits of the cursor may remain when focusing the editor (bug 550642)
* The editor can flicker when it regains focus (bug 550642)
* Accidental double-clicks are possible when changing the selection (bug
  548867)
* The Embedded editor remains larger than we'd like, but shrinking
  it down is low priority at the moment

Features
--------

* Improved display performance
* Alt+arrows move a word at a time

Bug Fixes
---------

* Settings can now be set via the "settings" property in the Bespin options
  (bug 543969)
* Undo/redo are working again in Firefox (bug 549986)
* Tab width is user-customizable
* Painting issues caused by syntax highlighting are fixed (bug 547456)
* Syntax highlighting better handles actions at a distance
* The cursor now blinks (bug 540112)
* The scroll bar handle now has a minimum size (bug 531123)
* The gutter resizes to fit its contents (bug 539207)
* The editor takes more delimiters into account when selecting words (bug
  509492)
* Editors longer than the width of the page are now usable (bug 548400)
* The insertion point now correctly changes color when Bespin loses the focus
* The editor no longer moves in Safari or Chrome when copying large amounts of
  text (bug 544301)

