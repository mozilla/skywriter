---
layout: default
title: Bespin 0.7.3 Release Notes
---

[Up](index.html) - Next Release - [Previous Release](notes072.html)

Known Issues
------------

Bespin 0.7.3 is *alpha* software. It is still under active development
and APIs are subject to change. Bespin 0.7 marks the first server release
since the Bespin project Reboot. There is still a bit of work required
before the server reaches feature and polish parity with 0.4.4. However, Bespin
0.7 also does a number of things that 0.4.4 didn't.

For *Bespin Embedded*:

* Bespin Embedded does not attach correctly to a textarea (bug 535819;
  workaround: change the textarea to a div first)
* There is no CSS syntax highlighting yet (bug 547272)
* The editor does not yet support tab characters (bug 543999)
* The Embedded editor remains larger than we'd like, but shrinking
  it down is low priority at the moment

For *Bespin Server*:

* Collaboration is not done yet (bug 554943)
* The File Explorer is still missing (bug 554945)
* The "svn" commands have not been resurrected (bug 554625)
* project import and export have not been resurrected (bug 554946 and 
  bug 554947)
* The command line does not yet support aliases, which means that you may
  need to use different names for some of the commands you're used to
  in earlier Bespins (bug 543968)

Changes
-------

* The fileextension extension point has been eliminated. Syntax highlighters
  now directly report which file extensions they are designed to work with.

Features
--------

* The preview command is back (bug 554958)
* The open command is now bound to cmd/ctrl-O (bug 560943)
* The file completion for the open command now allows you to press
  ALT-# to select a given file from the list quickly and without
  leaving the keyboard. This also works with any other completion
  menu (bug 555958)
* The display of a completion result when the result is not a prefix
  match has been improved. It now displays 
  what\_you\_typed -> what\_it\_completes\_to (bug 555959)
* The password recovery feature is back (bug 558323)
* You can now log in using your email address or username. (Note that
  if your email address is associated with more than one account, you
  will have to log in with your username.)
* The editor now supports a "read only" mode, that is going to be used
  in future features.
* Plugins can now have an ordering set. So, for example, you can install
  both vim and emacs keybindings and explicitly set that one of them
  has precedence. (bug 558790)

Fixes
-----

* The "saveas" command was not always working. This was largely due to
  bad error reporting (bug 558670)
* Pressing enter quickly after typing the last character on the command
  line can lead to the last character of input getting chopped off
  (bug 554952)
* CSS in user-created plugins is now served up properly (bug 561070)
* Better error messages for the "plugin add" command (bug 558316)
* Settings defined by plugins were not always loading (bug 559020)
* plugin install from a URL now works again. So you can, for example,
  toss a plugin up as a gist on GitHub and then install it with
  plugin install. (bug 558310)
* Installing a plugin with a command in it would not allow you to run 
  the command immediately (you'd have to reload the page). This
  works properly now, without reloads. (bug 556345)
* The "version" command works properly (bug 552672)
* The correct cursor is now used for the editor (bug 561332)
