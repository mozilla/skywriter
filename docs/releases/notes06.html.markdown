---
layout: default
title: Skywriter 0.6 "Ash" Release Notes
---

[Up](index.html) - [Next Release](notes061.html) - [Previous Release](notes051.html)

Known Issues
------------

Skywriter Embedded 0.6 is *alpha* software. It is still under active development
and APIs are subject to change. Note also that 0.6 features a complete retooling
of the editor component, so it is likely that there will be some new bugs
in the editor.

* Command line completion is not yet implemented. (bug 539446)
* Syntax highlighting is not back yet
* Text selection in fields *other than* the Skywriter editor on the page (in an
  embedded use) does not work (bug 540081)
* The editor has gotten larger by about 100K (before gzipping). Shrinking
  it down is fairly low priority at the moment.
* The cursor doesn't blink (bug 540112)

Features
--------

* The license has changed! Skywriter 0.6 onward is now licensed with the
  tri-license commonly used by Mozilla projects. MPL/GPL/LGPL. This means
  that Skywriter is now official GPL compatible.
* The Editor component has been completely revamped as a SproutCore component.
  It now more closely follows the Model/View/Controller pattern.
* Non-US characters and keyboards now work with Skywriter. A big thanks to Julian
  Viereck for a lot of work and testing on this.
* The undo system is now based on patches. Ultimately, this new way of
  doing undo will be more robust in conjunction with collaboration.
* Embedded now comes in two flavors: Drop In and Customizable. The Drop In 
  flavor is equivalent to the packaging of Skywriter Embedded 0.5.x
* The Drop In package now includes both compressed and uncompressed JavaScript
  files.
* The Customizable package includes the new "dryice" build tool. Using dryice,
  you can build an embedded version with whichever collection of plugins you
  need.
* The Command Line is back, mounted at the bottom of the editor. It is not
  yet available in the Embedded version.
* Command line output is now in a view that appears above the command line.
  This view automatically disappears when you leave the command line, but it
  can also be "pinned" below the editor.
* Commands and editor actions are now the same thing (pre-Reboot, they were
  separate). They can both be implemented by plugins, and the plugins are
  lazily loaded once the command is actually invoked.

Changes
-------

* In Skywriter Embedded 0.5.x, you would use tiki.require("skywriter:embed") to
  access the embedded API. In 0.6, this has moved to a new Embedded plugin.
  tiki.require("Embedded") is equivalent to the old 
  tiki.require("skywriter:embed"). The examples in the documentation have been
  updated accordingly.
