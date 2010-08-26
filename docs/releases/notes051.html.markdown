---
layout: default
title: Skywriter 0.5.1 Release Notes
---

[Up](index.html) - [Next Release](notes06.html) - [Previous Release](notes05.html)

Known Bugs
----------

This release is a *preview release*. We wanted to get this out to embedders 
so that they could try it out and give us feedback on the new packaging.

* The SkywriterEmbedded.js file is larger than we'd like it to be, but optimizing
  its size is not easy at this stage. We'll be looking at ways to shrink it
  further from release to release. [bug 528479](https://bugzilla.mozilla.org/show_bug.cgi?id=528479)
* Currently, Skywriter is putting three objects into your page's global namespace:
  SC, ENV and tiki. [bug 528480](https://bugzilla.mozilla.org/show_bug.cgi?id=528480)
* In development, the SproutCore test runner is not yet working, likely due 
  to the new "Tiki" module loader that Skywriter is using. 
  [bug 528482](https://bugzilla.mozilla.org/show_bug.cgi?id=528482)

Features
--------

* You can now log in to Skywriter and sign up. 
    [bug 530242](https://bugzilla.mozilla.org/show_bug.cgi?id=530242)
* *Embedded* new option: dontHookWindowResizeEvent. Skywriter will now
    automatically listen for resize events and do the right thing with the
    editor. This option lets you turn that behavior off.

Plugins
-------

* startup extension point: called when Skywriter is done initializing. Use this
    sparingly, because plugins that use this are basically not lazily loaded.

Bug Fixes
---------

* *Embedded* A great many fixes with resizing.

Infrastructure
--------------

* The gutter in the editor has now been broken out into a separate component.
* There is now a CanvasMixin that makes creating &lt;canvas&gt;-based components 
    easier.
* `paver start` now launches both SproutCore's Abbot build server (sc-server)
    *and* Skywriter's Python server. Abbot's server sits in front on port 4020
    and proxies requests to Skywriter's server on port 8080. All of the server
    requests are prefixed with /server/
* The server now automatically serves up the plugin metadata in 
    `plugins/skywriter-supported` in the `skywriterclient` project.
    The URL for this is http://localhost:4020/server/plugin/register/defaults
* The Settings API has been cleaned up dramatically.
* When installing the server for development, the development sqlite database
    is automatically created for you. 
    [bug 531985](https://bugzilla.mozilla.org/show_bug.cgi?id=531985)
