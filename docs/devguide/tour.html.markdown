---
title: Bespin Developer's Guide
subtitle: Code Tour
layout: default
---

# Taking It From The Top #

At the highest level, there are two separate projects that make up the whole of the Bespin codebase:

* bespinclient - The JavaScript code that makes up the Bespin user interface. This is
  considered to be the "main" repository and is all that is actually used for Bespin
  Embedded. However, when working on your own customizations to Bespin Embedded
  it is often useful to use the Bespin Server.
* bespinserver - This is currently the Python server. Bespin expects a certain server
  API and any server that adheres to that API could be made to work with Bespin.

Most people hacking on Bespin will never need to do anything inside of the bespinserver project.

# Inside bespinclient #

In a fresh bespinclient checkout, there are four top-level directories of note:

* docs - the documentation source files, of which this tour is a part.
* frameworks - the location of Bespin's plugin system.
* apps - the location of the applications (in SproutCore terminology) that
  are built on the infrastructure in frameworks.
* plugins - this is where most of Bespin lives
* sproutcore - a snapshot of [SproutCore](http://sproutcore.com), which is
  a JavaScript GUI toolkit that Bespin relies on.

When things are fully set up, there are also some other directories of interest:

* bin - this is the Python virtualenv bin directory, containing various scripts used to manage the project and start things up.

There are a couple of directories that are not interesting:

* include - part of virtualenv, not important
* lib - also part of the virtualenv

# Frameworks #

* bespin - the minimal set of code required to create a functioning plugin loading
  environment. We try to keep everything else in plugins

# Plugins #

Bespin is built completely around plugins. The vast majority of the JavaScript
for Bespin is in the plugins directory. In the plugins directory, there are
three categories of plugins represented:

1. supported - these are the plugins that are core bits of Bespin and that
   we are subjecting to increasingly rigorous demands in terms of documentation
   and testing.
2. labs - these are more experimental parts of Bespin and we will be a bit
   less restrictive about what goes in here. The intention, however, is that
   things in the labs part of Bespin are likely to become part of
   `supported` someday.
3. testing - these exist solely for the purpose of unit testing


