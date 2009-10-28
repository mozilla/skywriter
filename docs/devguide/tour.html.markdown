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

In a fresh bespinclient checkout, there are two top-level directories of note:

* docs - the documentation source files, of which this tour is a part.
* src - the project source code.

When things are fully set up, there are also some other directories of interest:

* bin - this is the Python virtualenv bin directory, containing various scripts used to manage the project and start things up.
* narwhal - a clone of the [Narwhal project](http://narwhaljs.org), which is used for JavaScript command line tools and module loading.

There are a couple of directories that are not interesting:

* include - part of virtualenv, not important
* lib - also part of the virtualenv

# Packages #

Inside the src directory, you will find an `html` directory. These are static files served directly by the web server.

The directories starting with bespin-* are packages available to Narwhal:

* bespin-build - the command line build tools for creating a new Bespin Embedded or Bespin Server package
* bespin-core - the minimal set of code required to create a functioning editor environment
* bespin-supported - plugins for bespin-core that add the other main functionality of the Bespin web site
* bespin-labs - plugins for bespin-core that provide features that are not fully fleshed out

# Inside bespin-core #

If you look in the src/bespin-core/lib directory, you will see:

* bespin.js - some top level functions, many of which are deprecated, that are available as bespin.*
* sproutcore.js - at this time, a pre-built SproutCore is actually part of the Bespin repository. This will likely change.
* bespin/ - this is where the main code lies.

There are three categories of code in bespin-core:

1. bespin/ - infrastructure code, such as `bespin/plugins`, which is required for the editor to work
2. bespin/util - utility code that is not necessarily Bespin-specific but is also required for the editor
3. bespin/editor - this is where all of the code that is specific to the Bespin text editor lives

TODO: #3 above is not wholly accurate as of this writing (10/27/09). There are currently some modules at the bespin/ level that belong in bespin/editor.

`bespin/boot` is the module that kicks off the loading of Bespin's code. `bespin/embed` notably provides the useBespin function, which is how the embedded editor gets dropped into pages.

`bespin/editor/controller` is the controller in the "model/view/controller" sense. It provides the main API for managing the text editor control and for connecting the data with the view.

`bespin/editor/view` is provides the visible editor component. It is responsible for drawing on the canvas and for managing events that come in.
