---
layout: default
title: Skywriter 0.9 ("Edison") Release Notes
---

[Up](index.html) - Next Release - [Previous Release](notes08.html)

Important Changes
-----------------

There has been a major plugin API change between 0.8 and 0.9. Please
see the "upgrade notes" later in this file.

Deprecations
------------

In order to support themability across Skywriter, future versions will only
support the use of LESS files within plugins and dryice will no longer
automatically process CSS files.

Known Issues
------------

Skywriter 0.9 is *alpha* software. It is still under active development
and APIs are subject to change.

For *Skywriter Embedded*:

* The editor does not yet support tab characters (bug 543999)

For *Skywriter Server*:

Important note: The Skywriter Server is going to undergo a complete rework.
You can read more about this in the [Skywriter Server Roadmap](http://groups.google.com/group/skywriter/browse_thread/thread/6de8c718d64232a0)
that was posted to the mailing list.

Features
--------
* You can now create multiple Skywriter editors on a single page. Note: when
  doing so, settings and themes are shared between the Skywriter editors.
* Supports ctags-based code completion. This feature will be filled out,
  documented and made easier with future releases.

Changes
-------
* There is now only one "Skywriter Embedded" package which combines the features
  of the earlier "Drop In" and "Customizable" packages.

Fixes
-----
* Corrected a problem with the customKeymappings setting
* Skywriter Embedded and the command line now work with XHTML (thanks to satyr,
  bugs 573721 and 573932)
* cmd-L and cmd-F (ctrl- on Windows/Linux) were broken in Embedded builds
  because they required the command line. They have been moved to a separate
  (editing\_commands) plugin so that the keys are no longer bound at all
  in Embedded builds. (bug 547058)
* fontsize setting was not working (bug 575375, thanks to Mark Spear for the 
  patch)

Upgrade Notes
-------------

In Skywriter 0.8 and earlier, command functions had the signature:

    (env, args, request)

Starting with Skywriter 0.9, the "env" parameter is no longer passed in. The change
is simple. At the top of your file, add:

var env = require('environment').env;

You can then generally just do a search and replace in your file, replacing
`(env, ` with `(`.
