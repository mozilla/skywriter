---
layout: default
title: Bespin 0.5 Release Notes
---

Known Bugs
----------

This release is a *preview release*. We wanted to get this out to embedders 
so that they could try it out and give us feedback on the new packaging.

* The scrollbar behavior is not yet back to its old state, so you may witness
  odd appearance or behavior.

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

