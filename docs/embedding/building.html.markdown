---
layout: default
title: Bespin Embedded Guide
subtitle: Building
---

Bespin is designed to scale up from simple text area replacement to a 
full-blown, powerful editing environment. This is accomplished through
plugins. The Bespin Embedded package comes in two flavors:

* Drop-in
* Customizable

With the Drop-in flavor, you get a single .js and a single .css file that you can
include on your server simply. You don't need anything else to use it.

With the Customizable flavor, you are able to tailor which plugins are
installed for use with your Bespin.

This section is all about using Bespin Embedded Customizable to create a custom
embedded build.

## Prerequisites ##

You will need Python 2.5 or 2.6 in order to build a custom Bespin. If you're using Python 2.5, you will also need to install simplejson.

## The Manifest ##

To define what is included in your build, you will create a .json file called
the "manifest". It can have any name you want, as you'll see in the next section.

    :::js
    {
        "include_core_test": true,
        "plugins": ["Editor", "SimpleSyntax", "SimpleJavaScript"]
    }

## Manifest Options ##

output_dir
:   directory where the finished files should be placed. Note that this
    directory will be recreated with each build. Do not point to a directory
    that you don't want to have deleted. The default is `build`.


## Building ##

Use the "bespin" command line tool to build according to the manifest.

Run "bespin -h" for up-to-date usage information.
