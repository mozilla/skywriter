---
layout: default
title: Bespin Embedded Guide
subtitle: Building
---

If you have a Bespin Embedded Customizable package, you can build your own
custom version of Bespin Embedded, with just the plugins you want. 

## Prerequisites ##

You will need Python 2.5 or 2.6 in order to build a custom Bespin. If you're using Python 2.5, you will also need to install simplejson.

## The Manifest ##

To define what is included in your build, you will create a .json file called
the "manifest". It can have any name you want, as you'll see in the next section.

Here is a simple manifest:

    :::js
    {
        "include_core_test": true,
        "plugins": ["Editor", "CommandLine"]
    }

You'll want the Editor plugin, to be sure. Embedded builds will usually use
the Embedded plugin, which depends on the Editor plugin. When you list a 
plugin in the manifest, the plugin and all of its dependencies will be
incorporated into the final build. The manifest for the Drop In package,
for example, just lists the "Embedded" plugin and that's all it needs.

## Manifest Options ##

include\_core_test
:   should the output include SproutCore's CoreTest unit testing framework?
    This is useful if you're doing Bespin development in Bespin.

include_sample
:   should the final output directory include a `samples` directory that
    contains HTML files that show off the editor?

output_dir
:   directory where the finished files should be placed. Note that this
    directory will be recreated with each build. Do not point to a directory
    that you don't want to have deleted. The default is `build`.

plugins
:   list of plugins (but you don't need to list their dependencies) to include
    in the build output

search_path
:   provide a list of relative (to the current directory) or absolute paths
    to search for plugins. These paths are added to the beginning of the
    search path. The directories within the "plugins" directory in the current
    directory are automatically added to the end of the search path.

## Writing Your Own Plugins ##

One of the main reasons to use the Customizable package is that you want to,
well, customize Bespin. Generally speaking, this means adding your own
collection of plugins. Let's create a "hello world" style plugin to see how
we can build it into Bespin.

Start by creating a directory *next to* your Bespin Embedded directory.
The reason we create this directory next to your Bespin directory is that 
you're likely to update Bespin from time to time and you wouldn't want to
overwrite your plugins. We'll call the directory "MyPlugins".

In the same directory as the MyPlugins directory, create a "mybespin.json"
manifest that looks like this:

    {
        "output_dir": "tmp",
        "plugins": ["Embedded", "HelloWorld"],
        "include_sample": true,
        "search_path": ["../MyPlugins"]
    }

Finally, we create the plugin itself. This is a file called HelloWorld.js
in the MyPlugins directory that you just created.

    "define metadata";
    ({
        "provides": [
            {
                "ep": "command",
                "name": "alert",
                "key": "meta_a",
                "pointer": "#showMessage"
            }
        ]
    });
    "end";

    exports.showMessage = function() {
        alert("Greetings from the Cloud!");
    };

OK, now we're all set to try out our new plugin in a customized Bespin.
We'll use the dryice tool (described in more detail in the next section)
to create the build. Switch to the Bespin Embedded directory and then
run:

    python dryice.py ../mybespin.json
    cd tmp
    
If you look at the files in your tmp directory, you'll see a fresh
BespinEmbedded.js. That one will actually include your plugin! Open the
sample.html file in your web browser, click on the editor and press
cmd-A (probably alt-A on Windows) and you'll see your alert pop up.

## Building ##

Use the "dryice" command line tool to build according to the manifest.

Run "dryice -h" for up-to-date usage information.

Generally speaking, using dryice is just a matter of pointing the tool at
your manifest file, which describes what needs to be built.

After the JavaScript and CSS are generated, you will likely want to compress 
those files for faster loading over the internet. dryice can do this for
you, using the Closure Compiler for the JavaScript and YUI Compressor for
the CSS. These are both included in the Customizable package in the
"compressors" directory. To activate dryice compression, run a command like
this one:

    dryice -j compressors/compiler.jar -c compressors/yuicompressor.jar MANIFEST.JSON

If you're testing out your builds, leaving the compression step off is
a good idea, because it takes far longer to run the compressors than it does
for dryice to do its work.

Also of note: you can override options in the manifest file using the
-D flag. You use -Dkey=value, and you can have multiple of them on the command
line. Note that the `value` part of that should be a JSON value. So, if it's
a string, it should be enclosed in quotes. Reminder: in many Unix shells
you'll need to put a backslash before the " character so that the shell knows
that you want to include that literally in the parameter to the command.

## Bespin Server ##

It is not necessary to use the Bespin Server when you're working with Bespin
Embedded. However, it may be useful to do so if you're developing your own
custom behavior for Bespin. The Bespin Server has the ability to dynamically
load plugins, whereas the Bespin Embedded package does not -- the plugins
are baked right into the .js file. You would find yourself running dryice
an awful lot to develop your own plugins. A better way to go would be to
develop your custom plugins using the Bespin Server and then run dryice
only when you're done.
