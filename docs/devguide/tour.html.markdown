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
* bespinserver - This is currently the Python server. The Python server will be
  replaced by a new JS server that is based on the same plugin architecture
  as bespinclient.

Most people hacking on Bespin will never need to do anything inside of the bespinserver project.

# Inside bespinclient #

In a fresh bespinclient checkout, there are four top-level directories of note:

* docs - the documentation source files, of which this tour is a part.
* plugins - this is where most of Bespin lives
* embedded - miscellaneous other files used when building Bespin Embedded packages.
* static - static files used by the web server

When things are fully set up, there are also some other directories of interest:

* bin - this is the Python virtualenv bin directory, containing various scripts used to manage the project and start things up.
* external - other tools used, such as JS and CSS compressors

There are other directories that are not interesting:

* include - part of virtualenv, not important
* lib - also part of the virtualenv

# Plugins #

Bespin is built completely around plugins. The vast majority of the JavaScript
for Bespin is in the plugins directory. In the plugins directory, there are
three categories of plugins represented:

1. boot - these are the plugins that Bespin uses to get going (the plugin system
   itself, for example).
2. supported - these are the plugins that are core bits of Bespin and that
   we are subjecting to increasingly rigorous demands in terms of documentation
   and testing.
3. labs - these are more experimental parts of Bespin and we will be a bit
   less restrictive about what goes in here. The intention, however, is that
   things in the labs part of Bespin are likely to become part of
   `supported` someday.
4. samples - these plugins provide proof-of-concept support for features that
   are ultimately expected to live in third party plugins (this is like the
   labs plugins, but without the expectation that the plugins will move
   into supported later on.)
5. thirdparty - this is code from outside of the Bespin project that is relied 
   upon by the boot and supported plugins
