---
layout: default
title: Bespin Plugin Guide
subtitle: Introduction
---

Bespin is built around a small core with most additional functionality placed in plugins. The driving goals behind plugins are:

* Allow lazy loading of functionality
* Be very easy to use
* Make it possible to update the editor without page reloads

The ability to load functionality lazily is very important, because we expect
that Bespin will have a large number of features, only some of which any given
person is likely to use at one time. The simplest example of this is syntax
highlighters: maybe you write JavaScript most of the time, but someone else is
developing Ruby code. If you only use JavaScript, that's the only syntax
highlighter that will get loaded into your browser. And there are many more
examples possible.

## The Basics ##

A plugin consists of *metadata* and *everything else*. When you log into
Bespin, the metadata for all of your plugins is loaded. Everything else
(JavaScript, CSS, images, etc.) is loaded as needed. At its simplest, a plugin
is a single .js file that contains a special section for the metadata. Here's a
trivial example:

    :::js
    "define metadata";
    ({});
    "end";
    
    exports.someFunction = function() { };
    
Clearly, this example doesn't do anything useful. The first step in making a
plugin do something is to define the appropriate metadata.

Bespin plugins feature *extensions* that plug into *extension points*. As an
example of this, the simple syntax highlighter defines an extension point
called "syntax.simple.highlighter". The JavaScript highlighter is one extension
that plugs into that extension point. The metadata for the JavaScript
highlighter looks like this:

    :::js
    {
        "provides": [
            {
                "ep": "syntax.simple.highlighter",
                "name": "JavaScript",
                "extensions": ["js", "json", "javascript", 
                    "ecmascript", "jsm", "java"],
                "pointer": "#JavaScript"
            }
        ],
        "depends": ["SimpleSyntax"]
    }

The metadata is an object specified in JSON format. `provides` is a list of
extensions that are provided by this plugin. Each one of the extensions is
given as an object with one attribute that is always there: "ep". `ep` is the
extension point that the extension is for. In the example above, you can see
that the plugin is providing an extension for the "syntax.simple.highlighter"
extension point. The other metadata for the extension is specific to the
extension point.

`pointer` is a common piece of metadata. Since this is pure JSON, and we want
to lazily load the code anyhow, a pointer is a string that tells Bespin where
to find the object that the extended code is going to need to perform the
necessary work (in this case, the JavaScript syntax highlighting). A pointer is
given in this format: `plugin:path/to/module/in/plugin#memberInModule`. The
example above is about as simple as it gets. It's pointing to an object called
`JavaScript` in the "package module" of the plugin (see more about the package
module below). The `name` and `extensions` metadata are specific to the
`syntax.simple.highlighter` extension point.

The `depends` list in the metadata is a list of the names of plugins upon which
this plugin depends. Bespin will ensure that those plugins are loaded before
this one. In the example above, the JavaScript highlighter plugin depends on
the SimpleSyntax engine, which is itself a plugin.

## Plugin File Structure ##

A plugin can be a single .js file with it's metadata bordered by directives
that are contained in strings. Here's an example:

    :::js
    "define metadata";
    ({});
    "end";

You must start the metadata with `"define metadata";` and end it with `"end";`.
The metadata itself is contained in an object. JavaScript does not allow you to
put a bare object in a program, so you can either enclose the object in
parentheses (as above) or set it to a variable. Bespin can handle either of
those formats.

Often, a single file is not going to be enough. When you move beyond a single
file, a plugin is defined as a directory with a `plugin.json` file in it. In a
single file plugin, the "package module" is the plugin .js file. In a plugin
directory, the "package module" is a file called "index.js".

## Plugin Reloading ##

A key feature of the Bespin user experience is the ability to edit plugins
from within Bespin and have the changes take effect immediately. Many types
of Bespin plugins, such as syntax highlighters, don't have any UI which makes
them easy to reload. If you write a plugin that has UI or any other resources
that need to be cleaned up, you can point Bespin at a function to run *before*
the plugin is to be reloaded. Here's an example:

    :::js
    "define metadata";
    ({
        "reloadPointer": "#cleanup"
    });
    "end";
    
    exports.cleanup = function() {
        // remove the UI from the DOM, parent view, etc.
    };

