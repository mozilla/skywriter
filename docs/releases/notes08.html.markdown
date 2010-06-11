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
* The editor does not yet support tab characters (bug 543999)

For *Bespin Server*:

Important note: The Bespin Server is going to undergo a complete rework.
You can read more about this in the [Bespin Server Roadmap](http://groups.google.com/group/bespin/browse_thread/thread/6de8c718d64232a0)
that was posted to the mailing list.

* The command line does not yet support aliases, which means that you may
  need to use different names for some of the commands you're used to
  in earlier Bespins (bug 543968)

Features
--------

* Bespin now supports themes via theme plugins. Themes can style both the
  editor text and the user interface elements.
* User interface styles are done via LESS files rather than plain
  CSS to provide themes with control over the UI elements. (see
  http://lesscss.org/ for more information)
* Bespin includes a "white" theme plugin.
* Embedded builds are now much smaller (less than half their previous size).
* dryice now includes a simple server that you can run with the "-s" option.
  `dryice -s 9090 foo.json` will start a server on port 9090 that will
  rebuild the embedded editor (using the foo.json manifest) with each 
  load of the main page.
* Plugins can include templates in a `templates` directory. These templates
  are automatically made available via a "templates" module in the plugin.
* The command line can now be included in embedded builds. (bug 551546)
* Syntax highlighting is now done in a webworker thread. This provides
  much better performance and also eliminates some reliability issues
  with the highlighting.
* The start of a CSS syntax highlighter (bug 547272, thanks to Cody Marquart)
* Bespin now includes a "working directory" with cd and pwd commands.
  This directory becomes the root of the quickopen behaivor. (bug 566490)
* The editor can now be set to "read only", similar to how a text area
  can be read only (bug 569440)
* The "export" command allows you to export one of your "projects"
  (top level directories) as a tgz or zip file. This will make it easy
  to get your data off of bespin.mozillalabs.com. (bug 554947)
* There is a new Growl-like notification system within Bespin.
* If jQuery is present on a page, Bespin can use it rather than the
  one that Bespin normally bundles. (bug 568815)
* Plugins can be dynamically loaded in embedded builds.

Fixes
-----

* Bespin should no longer have issues running in xulrunner due to the absence of
  localStorage (bug 562646)
* Fixed a problem with replacing selected text (bug 567971)
* Delete line (cmd-D) on the last line of a file would raise an exception
  (bug 570272)
* There should no longer be any compatibility problems between Bespin and
  jQuery.
* Sample custom plugin no longer uses alt-A, which is bound to select all
  (bug 564789)