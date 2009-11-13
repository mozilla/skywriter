---
title: Bespin Developer's Guide
subtitle: Code Tour
layout: default
---

# Taking It From The Top #

At the highest level, there are two separate projects that make up the whole of the Bespin codebase:

* bespinclient - The JavaScript code that makes up the Bespin user interface. This is considered to be the "main" repository.
* bespinserver - This is currently the Python server. Bespin expects a certain server API and any server that adheres to that API could be made to work with Bespin.

Most people hacking on Bespin will never need to do anything inside of the bespinserver project.

# Inside bespinclient #

In a fresh bespinclient checkout, there are four top-level directories of note:

* docs - the documentation source files, of which this tour is a part.
* frameworks - the project source code.
* apps - the location of the applications (in SproutCore terminology) that
  are built on the infrastructure in frameworks.
* src - this directory is from the initial Reboot work and will go away
  once everything has migrated to the frameworks directory.

When things are fully set up, there are also some other directories of interest:

* bin - this is the Python virtualenv bin directory, containing various scripts used to manage the project and start things up.
* abbot - the SproutCore build system

There are a couple of directories that are not interesting:

* include - part of virtualenv, not important
* lib - also part of the virtualenv

# Frameworks #

* bespin - the minimal set of code required to create a functioning editor environment

# Inside bespin #

If you look in the frameworks/bespin directory, you will see the JavaScript code for the
editor, and a `Buildfile`. The `Buildfile` provides instructions to SproutCore's Abbot build 
system.

There are four categories of code in bespin:

1. bespin:* - infrastructure code, such as `bespin/plugins`, which is required for the editor to work
2. bespin:util - utility code that is not necessarily Bespin-specific but is also required for the editor
3. bespin:editor - this is where all of the code that is specific to the Bespin text editor lives
4. bespin:tests - unit test suites

`bespin:embed` notably provides the useBespin function, which is how the embedded editor gets dropped into pages.

`bespin:editor/controller` is the controller in the ["model/view/controller"][mvc] sense. It provides the main API for managing the text editor control and for connecting the data with the view.

`bespin:editor/views/editor.js` provides the visible editor component. It is responsible for drawing on the canvas and for managing events that come in.

[mvc]: http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller

