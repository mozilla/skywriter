---
layout: default
title: Bespin 0.8 ("Cheviot") Release Notes
---

[Up](index.html) - Next Release - [Previous Release](notes073.html)

Known Issues
------------

Bespin 0.8 is *alpha* software. It is still under active development
and APIs are subject to change.

For *Bespin Embedded*:

* Bespin Embedded does not attach correctly to a textarea (bug 535819;
  workaround: change the textarea to a div first)
* There is no CSS syntax highlighting yet (bug 547272)
* The editor does not yet support tab characters (bug 543999)

For *Bespin Server*:

* Collaboration is not done yet (bug 554943)
* The File Explorer is still missing (bug 554945)
* The "svn" commands have not been resurrected (bug 554625)
* project import and export have not been resurrected (bug 554946 and 
  bug 554947)
* The command line does not yet support aliases, which means that you may
  need to use different names for some of the commands you're used to
  in earlier Bespins (bug 543968)

Features
--------

* Bespin now supports themes via theme plugins
* Embedded builds are now much smaller (less than half their previous size).
* dryice now includes a simple server that you can run with the "-s" option.
  `dryice -s 9090 foo.json` will start a server on port 9090 that will
  rebuild the embedded editor (using the foo.json manifest) with each 
  load of the main page.
* Plugins can include templates in a `templates` directory. These templates
  are automatically made available via a "templates" module in the plugin.
* The command line can now be included in embedded builds. (bug 551546)
* The start of a CSS syntax highlighter (bug 547272, thanks to Cody Marquart)
