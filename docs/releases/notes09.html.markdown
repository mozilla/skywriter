---
layout: default
title: Bespin 0.9 ("Edison") Release Notes
---

[Up](index.html) - Next Release - [Previous Release](notes08.html)

Important Changes
-----------------

There has been a major plugin API change between 0.8 and 0.9. Please
see the "upgrade notes" later in this file.

Known Issues
------------

Bespin 0.9 is *alpha* software. It is still under active development
and APIs are subject to change.

For *Bespin Embedded*:

* The editor does not yet support tab characters (bug 543999)

For *Bespin Server*:

Important note: The Bespin Server is going to undergo a complete rework.
You can read more about this in the [Bespin Server Roadmap](http://groups.google.com/group/bespin/browse_thread/thread/6de8c718d64232a0)
that was posted to the mailing list.

Features
--------
* You can now create multiple Bespin editors on a single page. Note: when
  doing so, settings and themes are shared between the Bespin editors.
* Supports ctags-based code completion. This feature will be filled out,
  documented and made easier with future releases.

Fixes
-----
* Corrected a problem with the customKeymappings setting


Upgrade Notes
-------------

In Bespin 0.8 and earlier, command functions had the signature:

    (env, args, request)

Starting with Bespin 0.9, the "env" parameter is no longer passed in. The change
is simple. At the top of your file, add:

var env = require('environment').env;

You can then generally just do a search and replace in your file, replacing
`(env, ` with `(`.
