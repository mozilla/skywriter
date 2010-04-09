---
layout: default
title: Bespin 0.7.2 ("Ashwell") Release Notes
---

[Up](index.html) - Next Release - [Previous Release](notes071.html)

Known Issues
------------

Bespin 0.7.2 is *alpha* software. It is still under active development
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

* The server now supports logging errors to ErrorStack (bug 558311)

Fixes
-----

* Users with & in their passwords were unable to login (bug 558051)
* The command line was not scrolling the output consistently (bug 556327)
* The Bespin server was serving up uncompressed JS and CSS (bug 558329)
* The in-development collaboration plugin had broken the newfile command
  (bug 557505)
