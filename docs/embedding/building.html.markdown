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
        "include_tests": true,
        "plugins": ["embedded", "command_line"]
    }

You'll want the `embedded` plugin, to be sure. This plugin actually does 
nothing other than include a collection of plugins that are required to make
the editor work. When you list a 
plugin in the manifest, the plugin and all of its dependencies will be
incorporated into the final build.

## Manifest Options ##

include\_tests
:   should the output include Bespin's test suite?
    This is useful if you're doing Bespin development in Bespin.

include_sample
:   should the final output directory include a `samples` directory that
    contains HTML files that show off the editor?

jquery
:   Bespin uses jQuery for its utility functions. By default, Bespin will
    use its own private copy of jQuery. The jquery build option can be
    set to either "global" or "builtin". When jquery="global", Bespin
    will use the jQuery that is on "window".

output_dir
:   directory where the finished files should be placed. Note that this
    directory will be recreated with each build. Do not point to a directory
    that you don't want to have deleted. The default is `build`.

plugins
:   list of plugins (but you don't need to list their dependencies) to include
    in the build output

dynamic_plugins
:   list of plugins that should be available for dynamic loading. These will
    end up in a "plugins" directory and their metadata will be available to
    your Embedded Bespin plugin system

search_path
:   provide a list of relative (to the current directory) or absolute paths
    to search for plugins. These paths are added to the beginning of the
    search path. The directories within the "plugins" directory in the current
    directory are automatically added to the end of the search path.

config
:   the default [appconfig](appconfig.html) to use in the build

## Using Bespin with your own jQuery ##

Bespin uses jQuery for utility functions. Additionally, some Bespin plugins use
various jQuery plugins for higher-level user interface widgets. If you are 
already using jQuery on your page, you can set jquery="global" in your manifest
file, and you will end up with a smaller Bespin build that does not include
jQuery.

*Important Note*: you should ensure that the Bespin plugins that use jQuery
plugins do not interfere with jQuery plugins that you are using elsewhere
on your page.

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
        "plugins": ["embedded", "hello_world"],
        "include_sample": true,
        "search_path": ["../MyPlugins"]
    }

Finally, we create the plugin itself. This is a file called hello\_world.js
in the MyPlugins directory that you just created.

    "define metadata";
    ({
        "provides": [
            {
                "ep": "command",
                "name": "alert",
                "key": "ctrl_i",
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
cmd-I (ctrl-I on Windows) and you'll see your alert pop up.

## The dryice Server ##

If you're hacking on plugins purely with the Bespin Embedded Customizable
package, it gets annoying to have to re-run dryice every time you make a
change. For this reason, dryice has a simple server that you can run. The
simplest way to get going is:

    python dryice.py -s 8080 ../mybespin.json

This will start the server on port 8080, using the manifest file that
we created in the previous section. Just point your browser to
[http://localhost:8080/]() and you should see your custom Bespin build!
It will be rebuilt each time you reload the page.

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

