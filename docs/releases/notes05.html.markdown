---
layout: default
title: Bespin 0.5 Release Notes
---

Known Bugs
----------

This release is a *preview release*. We wanted to get this out to embedders 
so that they could try it out and give us feedback on the new packaging.

* The Manual Upgrade option for embedding, as listed in the 
  [introduction to embedding][1], currently creates an editor component
  that behaves very strangely.
* The scrollbar behavior is not yet back to its old state, so you may witness
  odd appearance or behavior. A future release will break the editor gutter
  area out into a separate component, which will make fixing the scrollbars
  easier.
* The BespinEmbedded.js file is larger than we'd like it to be, but optimizing
  its size is not easy at this stage. We'll be looking at ways to shrink it
  further from release to release.
* Currently, Bespin is putting three objects into your page's global namespace:
  SC, ENV and tiki.
* In development, the SproutCore test runner is not yet working, likely due 
  to the new "Tiki" module loader that Bespin is using.

[1]: index.html "Introduction to Embedding"

Features
--------
* The user-facing API is now simpler for embedding, and it's possible to use
  the editor without writing *any* JavaScript code.
* New documentation and documentation toolchain


Infrastructure
--------------

* SproutCore now provides the underlying GUI toolkit
* The code has been completely reorganized into CommonJS modules
* Dojo is no longer required
* The scrollbars are no longer built directly into the editor component, but
  are instead separate components that can be changed or reused.
* Bespin Embedded is built using the SproutCore build tools (and therefore
  depends on Ruby, various gems and SC code to build)

Other Changes
-------------

* JSON files are now run through the JavaScript syntax highlighter
* Multiline strings in JavaScript are now highlighted correctly (bug 524577). 
  Thanks to Irakli Gozalishvili.
* Scrollbars are drawn a little nicer with respect to their antialiased
  position.

