---
layout: default
title: Bespin 0.7 ("Ped Xing") Release Notes
---

[Up](index.html) - Next Release - [Previous Release](notes062.html)

Known Issues
------------

Bespin 0.7 is *alpha* software. It is still under active development
and APIs are subject to change. Bespin 0.7 marks the first server release
since the Bespin project Reboot. There is still a bit of work required
before the server reaches feature and polish parity with 0.4.4. However, Bespin
0.7 also does a number of things that 0.4.4 didn't.

For *Bespin Embedded*:

* Bespin Embedded does not attach correctly to a textarea (bug 535819;
  workaround: change the textarea to a div first)
* Options are not settable at runtime (bug 549679)
* There is no CSS syntax highlighting yet (bug 547272)
* Bits of the cursor may remain when focusing the editor (bug 550642)
* The editor can flicker when it regains focus (bug 550642)
* The editor does not yet support tab characters (bug 543999)
* The Embedded editor remains larger than we'd like, but shrinking
  it down is low priority at the moment

For *Bespin Server*:

* Collaboration is not done yet (bug 554943)
* The File Explorer is still missing (bug 554945)
* The "vcs clone" command has not been updated (bug 554624)
* The "svn" commands have not been resurrected (bug 554625)
* project import and export have not been resurrected (bug 554946 and 
  bug 554947)
* The command line does not yet support aliases, which means that you may
  need to use different names for some of the commands you're used to
  in earlier Bespins (bug 543968)
* Pressing enter quickly after typing the last character on the command
  line can lead to the last character of input getting chopped off
  (bug 554952)
* The preview command has not been brought back (bug 554958)

Features
--------

* The Bespin server is back! This is the first release to provide the
  full Bespin project experience. A lot has changed since the 0.4.4
  release (almost too much to enumerate here!)
* The command line supports "typed" (in the programming sense) arguments.
  An argument type can help out with completion and verify that the
  argument is valid before the command is run.
* The "open" command now features quick searching through your files to
  allow you to select the file you want to open
* A whole bunch of commands and features have been upgraded from their
  pre-Reboot state
* The login/signup form appears over the editor, not on a separate page
  as it was pre-Reboot
* Plugins can be installed from the web
* Directories and files can be added as plugins (making it very easy to
  create and edit plugins with Bespin)
* Bespin's CSS has been heavily redone, which makes theming easier. Dialogs
  in Bespin now look consistent with the rest of Bespin.

Bug Fixes
---------

* dryice build tool was producing bad builds on Windows due to the \ file
  separator. (bug 550896)
