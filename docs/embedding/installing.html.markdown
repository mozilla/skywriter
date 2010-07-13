---
layout: default
title: Bespin Embedded Guide
subtitle: Installing Plugins
---

Plugin Formats
--------------

When you download a plugin, you're likely to get one of three kinds of files:

* .js
* .zip
* .tar.gz  (or .tgz)

Bespin can directly work with the `.js` files. The other two formats are
archive formats that contain multiple files and directories. You will need
to expand those archives into your plugin directory (see "Where To Put
The Files" below).

Where To Put The Files
----------------------

In the [building](building.html) section of this guide, we described the
manifest file. The manifest file allows you to set a `search_path` option
that dryice will use when building Bespin.

We recommend a directory structure that is something like this:

* your\_project (top level directory with everything you need)
    * bespin (the original Bespin Embedded files provided by the Bespin project)
    * plugins (your custom-created plugins)
    * thirdparty (plugins that you've downloaded from elsewhere)

With this kind of directory structure, you can upgrade Bespin at will just by
deleting the `bespin` directory and putting a new one in its place. In your
manifest file, you'll add both `plugins` and `thirdparty` to your `search_path`.

So, when you download a plugin, you'll either drop the `.js` file into the
`thirdparty` directory, or you'll expand the `.zip` or `.tar.gz` file into
the thirdparty directory. Expanding the `.zip` or `.tar.gz` file should create
a new directory that has a file called `package.json` in it. The name of the
plugin is the name of the directory.

A complete example:

* your\_project
    * bespin
    * plugins
        * mygroovyplugin.js
    * thirdparty
        * markdown.js
        * toolbar
            * package.json
            * index.js
            * resources
                * icon1.png
                * icon2.png

In this example, we have downloaded two plugins created by other people:
`markdown` and `toolbar`. The `markdown` plugin is contained in a single `.js`
file that we've placed in the `thirdparty` directory. The `toolbar` plugin
may have started out as a `.zip` file, and we've expanded it out to create
a directory called `toolbar` with a `package.json` file in it.
