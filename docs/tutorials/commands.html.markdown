---
layout: default
title: Bespin Tutorials
subtitle: Manipulating Text Through Commands
---

Introduction
============

This tutorial was originally written for Bespin 0.9.

In this tutorial, we'll be creating new commands that allow Bespin to work
with [Markdown](http://daringfireball.net/projects/markdown/) formatted
text.

For this tutorial, **you'll need the markdown\_js plugin** which is available
from the Plugin Gallery.

Setting Up
----------

With this tutorial, we're starting from the very basics. You'll need Python
(preferably 2.6) to do custom Bespin plugin development. If you don't have
Python already, you can get it [prebuilt for your platform](http://python.org/)
with little fuss.

You'll also need Bespin Embedded, which you can get from the
[releases directory on ftp.mozilla.org](http://ftp.mozilla.org/pub/mozilla.org/labs/bespin/Embedded/).

Make a directory called `bespintutorial`. Uncompress the BespinEmbedded package
in there and rename the directory from the tarfile `bespin` (so you'll have
`bespintutorial/bespin/`). On a Mac, you can do these things from the Terminal
command line:

    mkdir bespintutorial
    cd bespintutorial
    cp ~/Downloads/BespinEmbedded-VERSION.tar.gz .
    tar xzf BespinEmbedded-VERSION.tar.gz
    mv BespinEmbedded-VERSION bespin


The Manifest
------------

Bespin's build tool, dryice, uses a "manifest" file in JSON format to describe
what it needs to build and where to find all of the parts. Open up your
text editor to create a file called `manifest.json` in the `bespintutorial`
directory. Here's what will go into the file at this step:

    :::js
    {
        "output_dir": "../build",
        "plugins": ["embedded"],
        "search_path": [".."]
    }

We'll be running the build from the `bespin` directory, so those `..` in
the manifest are referring to the `bespintutorial` directory.

Now, we'll fire up the dryice server. This command assumes at Python is
on your path:

    cd bespin
    python dryice.py -s 8080 ../manifest.json

After running that command, you can open up your browser to 
http://localhost:8080/ and you should see the Bespin editor that dryice
just built for us.

Next, place the `markdown_js.js` file which you got from the Plugin Gallery
into the `bespintutorial` directory.

Getting Our Plugin Going
------------------------

Now, we'll create a new file called `markdown.js`. This is our Bespin plugin
file. Bespin plugins all have a metadata section, so let's put that at the
top of our file to get us going:

    :::js
    "define metadata";
    ({
        "dependencies": {
            "markdown_js": "0.1.2"
        }
    });
    "end";
    
So, that's our whole plugin for now. All we're saying is that our plugin
depends on the `markdown_js` plugin (version 0.1.2). Now we have to tell
dryice about our new plugin, so we'll add it to the plugins line
of our manifest.json file:

    "plugins": ["embedded", "markdown"],

You should be able to reload http://localhost:8080/ and have things still work.

Making Our Plugin Do Something
------------------------------

Since we're going to be making commands, it would be most convenient for us
at this point to have a command line. So, we'll add the `command_line`
plugin to our manifest.json file:

    "plugins": ["embedded", "markdown", "command_line"],

Reload the page in your browser and you should see the command line at the
bottom. I also like being able to press cmd-J (ctrl-J on Windows/Linux) to
switch between the command line and the editor. The uicommands plugin gives
us that, so let's enable that, too:

    "plugins": ["embedded", "markdown", "command_line", "uicommands"],

Now we're ready to make our first command. We're going to make a command
that:

1. converts the Markdown text we've entered to HTML
2. puts that HTML in a new window so we can preview it.

Let's write a function that does these things.
    
    :::js
    var env = require('environment').env;
    var markdown = require("markdown_js");

    exports.preview = function(args, request) {
        var text = env.editor.selectedText;
        if (!text) {
            text = env.editor.value;
        }
        var popup = window.open("", "_blank", "location=no,menubar=no");
        popup.document.body.innerHTML = markdown.toHTML(text);
        request.done();
    };

The first two lines import other modules that we'll be needing. The
`environment` plugin is always available in Bespin, and the `env`
variable inside of there is very handy, as we'll soon see. We also
import the `markdown_js` module that we declared in our dependencies.
We'll call it `markdown` when we use it in this module for convenience.

If you're not familiar with [CommonJS Modules](http://commonjs.org/specs/modules/1.0/),
you'll find that they're simple to work with. You use the `require` function to
import modules and you put anything you want to be available outside of the
module on the `exports` object. We're going to make a function called `preview`
available from this module.

Bespin command functions all take two parameters: `args` and `request`.
`args` contains the incoming arguments to the command and `request` provides
methods for working with this particular request from the user. Of these, the
commands we'll be making here today only make use of `request.done()`, which
signals that we have finished all of our processing.

Now, let's focus on the body of the function:

    :::js
    var text = env.editor.selectedText;
    if (!text) {
        text = env.editor.value;
    }
    var popup = window.open("", "_blank", "location=no,menubar=no");
    popup.document.body.innerHTML = markdown.toHTML(text);
    request.done();

The first line gets us the currently selected text. If the user selected only
a portion of the document, we'll preview that. The next line looks to see
if there was any selected text. If there wasn't, then we just grab all of the
text from the editor.

Next, we use the standard window.open call to make a new window. A call to `markdown.toHTML` will give us the HTML version of our text and we drop
that into our new window and we're all set!

We need to register our new command with Bespin.

Since we're going to create more than one Markdown related command, we'll
plan to create a top-level `markdown` command with subcommands. The
command we're working on now is `markdown preview`. We need to add
a new `provides` section to our JSON metadata. Here's what that looks like:

    "provides": [
        {
            "ep": "command",
            "name": "markdown",
            "description": "commands for working with markdown files"
        },
        {
            "ep": "command",
            "name": "markdown preview",
            "description": "preview the HTML form of this markdown text",
            "pointer": "#preview"
        }
    ]

`provides` gives a list of extensions that are provided by this plugin.
Each of those will have an `ep` at a minimum. That's the "extension point"
that we're plugging into. Our first extension is a command and we give
the command a name (which is what the user types) and a description that
will appear in help text.

The second extension is for our preview command. It has a name and description
as well. But, since this command is not just a holder for other commands,
it also has a `pointer`. The `pointer` tells Bespin where to find the object
(in this case, a function) for the extension. `#preview` is equivalent to
`markdown:index#preview` which means the `preview` function in the `index`
module in the `markdown` plugin.

Your complete file should now look like this:

    "define metadata";
    ({
        "dependencies": {
            "markdown_js": "0.1.2"
        },
        "provides": [
            {
                "ep": "command",
                "name": "markdown",
                "description": "commands for working with markdown files"
            },
            {
                "ep": "command",
                "name": "markdown preview",
                "description": "preview the HTML form of this markdown text",
                "pointer": "#preview"
            }
        ]
    });
    "end";

    var env = require('environment').env;
    var markdown = require("markdown_js");

    exports.preview = function(args, request) {
        var text = env.editor.selectedText;
        if (!text) {
            text = env.editor.value;
        }
        var popup = window.open("", "_blank", "location=no,menubar=no");
        popup.document.body.innerHTML = markdown.toHTML(text);
        request.done();
    };


Let's come up with some sample Markdown to use. How about this:

    # Markdown Test #
    
    This is a *simple* test of Markdown.
    
    * one
    * two
    * three
    
Reload your browser, select all of the text and paste in that text. Then,
jump down to the command line and run the `markdown preview` command. You
should see a new window popup with the HTML version of the text there.

Congratulations! You've extended Bespin with a new command.

Keyboard Shortcut
-----------------

Previewing the HTML seems like a very useful feature. Why don't we add a 
keyboard shortcut so that we don't need to go to the command line each time.
To do this, we just need to add a `key` to the `markdown preview` metadata, 
like so:

    {
        "ep": "command",
        "name": "markdown preview",
        "description": "preview the HTML form of this markdown text",
        "key": "ctrl_shift_p",
        "pointer": "#preview"
    }

Now, cmd-shift-P on the Mac or ctrl-shift-P on Windows/Linux will run
the `markdown preview` command. This also means that we can run the
`markdown preview` command even if we don't have the command line plugin
in our build.

An aside about keyboard shortcuts: the `key` defined in command metadata
like this is the lowest priority keyboard binding. A keymapping plugin can
redefine the keys as can user preferences.

Replacing Text
--------------

One more common requirement of commands is that they need to be able to
manipulate the text in some fashion and then put the manipulated version
back into the editor.

We'll make a `markdown convert` command that converts the text to HTML
and then puts the text back into the editor. As before, we'll start
by writing a function that does this conversion and we'll place it at
the bottom of our file:

    exports.convert = function(args, request) {
        var allOrSelection = 'selectedText';
        var text = env.editor.selectedText;
        if (!text) {
            allOrSelection = 'value';
            text = env.editor.value;
        }
        var html = markdown.toHTML(text);
        env.editor[allOrSelection] = html;
        request.done();
    };

In this function, we're going to do the same kind of thing we did in the 
`preview` function. We'll work with the user's selection, if there is one,
and the complete text otherwise. In this case, we need to keep track
of which it was so that, when we do the replacement, we're only replacing
the text that the user had selected.

Once we've gotten our text, we can use `markdown.toHTML` to do the conversion.
Then, we put the text back into the editor (going into either `selectedText`
or `value`, depending on where the text came from originally).

We need to tell Bespin about our new command, so we'll add another object
to the `provides` part of our metadata.

    :::js
    {
        "ep": "command",
        "name": "markdown convert",
        "description": "convert the selected text to HTML",
        "pointer": "#convert"
    }

Looks just like the `markdown preview` command, doesn't it?

Reload the page in your browser, paste in the sample markdown text and
then run the `markdown convert` command. You should see the text converted
to HTML. Try converting just a section of the text, and you'll see that just
that portion of the file is modified.

That was easy, wasn't it?

Undo
----

Try converting the Markdown to HTML and then pressing cmd/ctrl-Z.

Submitting to the Bespin Plugin Gallery
---------------------------------------

Once you've completed creating a plugin that you want to share with the
rest of the world, you should add a little more to the metadata before
uploading your plugin to the [Bespin Plugin Gallery](http://bespinplugins.mozillalabs.com/).

We'll add version, license and maintainer information:

    "version": "1.0.0",
    "maintainers": [
        {
            "name": "Kevin Dangoor",
            "email": "kid@blazingthings.com",
            "web": "http://blueskyonmars.com/"
        }
    ],
    "licenses": [
        {
            "type": "MPL",
            "url": "http://www.mozilla.org/MPL/MPL-1.1.html"
        },
        {
            "type": "GPL",
            "url": "http://creativecommons.org/licenses/GPL/2.0/"
        },
        {
            "type": "LGPL",
            "url": "http://creativecommons.org/licenses/LGPL/2.1/"
        }
    ]

Bespin Plugin metadata is actually a superset of the 
[CommonJS package](http://wiki.commonjs.org/wiki/Packages/1.0)
metadata. As specified there, the version numbers should follow
the [Semantic Versioning](http://semver.org/) numbering so that
useful information about compatibility can be picked up from the
version number alone.

I added myself as a maintainer and made this plugin available under
the tri-license that Bespin itself is available under.

With all of this metadata in place, the final plugin file looks like this:

    "define metadata";
    ({
        "dependencies": {
            "markdown_js": "0.1.2"
        },
        "provides": [
            {
                "ep": "command",
                "name": "markdown",
                "description": "commands for working with markdown files"
            },
            {
                "ep": "command",
                "name": "markdown preview",
                "description": "preview the HTML form of this markdown text",
                "key": "ctrl_shift_p",
                "pointer": "#preview"
            },
            {
                "ep": "command",
                "name": "markdown convert",
                "description": "convert the selected text to HTML",
                "pointer": "#convert"
            }
        ],
        "version": "1.0.0",
        "maintainers": [
            {
                "name": "Kevin Dangoor",
                "email": "kid@blazingthings.com",
                "web": "http://blueskyonmars.com/"
            }
        ],
        "licenses": [
            {
                "type": "MPL",
                "url": "http://www.mozilla.org/MPL/MPL-1.1.html"
            },
            {
                "type": "GPL",
                "url": "http://creativecommons.org/licenses/GPL/2.0/"
            },
            {
                "type": "LGPL",
                "url": "http://creativecommons.org/licenses/LGPL/2.1/"
            }
        ]
    });
    "end";

    var env = require('environment').env;
    var markdown = require("markdown_js");

    exports.preview = function(args, request) {
        var text = env.editor.selectedText;
        if (!text) {
            text = env.editor.value;
        }
        var popup = window.open("", "_blank", "location=no,menubar=no");
        popup.document.body.innerHTML = markdown.toHTML(text);
        request.done();
    };

    exports.convert = function(args, request) {
        var allOrSelection = 'selectedText';
        var text = env.editor.selectedText;
        if (!text) {
            allOrSelection = 'value';
            text = env.editor.value;
        }
        var html = markdown.toHTML(text);
        env.editor[allOrSelection] = html;
        request.done();
    };

We can upload this single .js file to the plugin gallery to share it with others.
Once we do, we'll have a change to add images and further description of the
plugin if we wish. You can actually add a description to the plugin metadata
itself, if you wish.

The End
-------

In this tutorial, we created a brand new plugin that leveraged an existing 
JavaScript library to do useful text transformation in Bespin. Key concepts
covered:

* using dryice server mode to test new plugins
* plugin structure and metadata
* the mechanics of creating an extension
* how to write command extensions
* how to manipulate the text in the editor
