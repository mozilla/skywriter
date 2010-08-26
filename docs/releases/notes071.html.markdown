---
layout: default
title: Skywriter 0.7.1 ("Bryce") Release Notes
---

[Up](index.html) - [Next Release](notes072.html) - [Previous Release](notes07.html)

Known Issues
------------

Skywriter 0.7.1 is *alpha* software. It is still under active development
and APIs are subject to change. Skywriter 0.7 marks the first server release
since the Skywriter project Reboot. There is still a bit of work required
before the server reaches feature and polish parity with 0.4.4. However, Skywriter
0.7 also does a number of things that 0.4.4 didn't.

For *Skywriter Embedded*:

* Skywriter Embedded does not attach correctly to a textarea (bug 535819;
  workaround: change the textarea to a div first)
* Options are not settable at runtime (bug 549679)
* There is no CSS syntax highlighting yet (bug 547272)
* Bits of the cursor may remain when focusing the editor (bug 550642)
* The editor can flicker when it regains focus (bug 550642)
* The editor does not yet support tab characters (bug 543999)
* The Embedded editor remains larger than we'd like, but shrinking
  it down is low priority at the moment

For *Skywriter Server*:

* Collaboration is not done yet (bug 554943)
* The File Explorer is still missing (bug 554945)
* The "vcs clone" command has not been updated (bug 554624)
* The "svn" commands have not been resurrected (bug 554625)
* project import and export have not been resurrected (bug 554946 and 
  bug 554947)
* The command line does not yet support aliases, which means that you may
  need to use different names for some of the commands you're used to
  in earlier Skywriters (bug 543968)
* Pressing enter quickly after typing the last character on the command
  line can lead to the last character of input getting chopped off
  (bug 554952)
* The preview command has not been brought back (bug 554958)

Features
--------

* The keyboard is now remappable via plugins and configuration. We've tried
  to make it powerful enough to support vi and emacs style key commands.
  (bug 542492)
* Added built-in plugin gallery (plugin gallery and plugin upload commands)
  for sharing plugins.
* New "feedback" command opens your browser to the Skywriter forum at
  feedback.mozillalabs.com, making it very easy to let us know if you
  have any suggestions. (bug 550287)
* The "vcs clone" command is back for checking out Subversion and Mercurial
  repositories (bug 554624)
* New editing command to create a new line and move the cursor to the next
  line, like "opening a line" in vi (bug 557191)

Fixes
-----

* The Python server build did not include all of the installation requirements
  (bug 552670)
* Syntax highlighting could overflow the call stack (bug 556151)
* Numerous fixes to SproutCore (bug 553497)
* cmd-J now properly moves between the editor and the command line
  (bug 554652)
* The tab order in the login dialog is now correct (this was a SproutCore
  bug in the end). (bug 554892)
* "tab" in the editor was causing a jump to the command line (bug 555598)
* The mini manpage for commands was not painting with a background in Chrome
  (bug 556527)
* VCS commands weren't working because of a polling problem (bug 556823)
* The select word left command would not go past a period (bug 557186)