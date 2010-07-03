---
layout: default
title: Bespin Tutorials
subtitle: Adding to the GUI
---

Introduction
============

Since Bespin is a webapp, any Bespin command could conceivably pop up some bit
of user interface to interact with the user. It's just a matter of creating some
DOM nodes and placing them on the screen.

But, if you want something a bit more persistent and integrated, you'll need
to learn a bit about how Bespin's GUI is put together. That's what this tutorial
is about.

At the same time, we're going to talk about how Bespin plugins can themselves
be pluggable.

In this tutorial, we assume that you're already familiar with using dryice and
the basics of making plugins. We're also going to assume a directory structure
like the one from the [commands tutorial](commands.html).

By the end of this tutorial, we'll have something that looks toolbar-like. 
We're not trying to create a fully-functional toolbar here, because the 
focus is on hooking in to Bespin's GUI.

This tutorial should work with Bespin 0.9a1 or later. However, there
is a **bug in Firefox 3.6.x that will cause the toolbar to not display
properly**. Bespin 0.9a2 has a workaround for this, and the bug itself
is fixed in Firefox versions after 3.6.x.

Creating Our Plugin
-------------------

As with the commands tutorial, we're assuming that you're working within a
directory called `bespintutorial` that has Bespin itself in a subdirectory
called `bespin`.

In plugins that have user interface elements, you will almost always need
to create a "multi file plugin". That just means we'll be creating a 
directory rather than a single .js file.

We'll create a directory called `tutorialtoolbar`. To turn it into a plugin,
we need to create a file called `package.json` in the `tutorialtoolbar`
directory.

We also need a dryice manifest so that we can see our plugin in action.
Create a file called `toolbar.json` in the `bespintutorial` directory.
Here's what we'll put in it to start with:

    {
        "output_dir": "../build",
        "plugins": ["embedded", "tutorialtoolbar"],
        "search_path": [".."]
    }

Switch to the `bespin` directory and run:

    python dryice.py -s 8080 ../toolbar.json

You shouldn't get any errors from dryice. That means that it was able to find
our tutorialtoolbar plugin. If you open your browser to http://localhost:8080/,
you'll see a normal looking Bespin. Now we just need to put something in our 
plugin.

Creating A Simple View
----------------------

For a first step, we'll just toss a string up on the screen. In the
`tutorialtoolbar` directory, create a new file called `index.js`.
Here's how our toolbar component will start out:

    exports.ToolbarView = function() {
        var elem = document.createElement("div");
        elem.innerHTML = "<b>Toolbar!</b>";
        this.element = elem;
    };

We're creating a `Toolbar` class. When a new `Toolbar` is created,
it gets a new element which just has our string in it. We
set that to `element` on the instance. This is the key to GUI components
that are integrated into Bespin's UI: they just offer up an `element`
that Bespin will put in place.

The next step is telling the Bespin system about our new component.
We do that in the `package.json` file, which will now look like this:

    {
        "provides": [
            {
                "ep": "factory",
                "name": "tutorialtoolbar",
                "action": "new",
                "pointer": "#ToolbarView"
            }
        ]
    }

The factory extension point is used for extensions that provide components
for Bespin to automatically instantiate. That may sound kind of vague,
but you'll see in a moment that it's actually easy to use. The `action`
tells Bespin that it's going to be creating a new instance and the
`pointer` is telling Bespin to look in the tutorialtoolbar plugin's
`index` module for something called `ToolbarView`.

We've written code that will generate our initial toolbar and we've told
Bespin that this is available. The next step is to tell Bespin to put
one into the UI. This can be done either in the dryice manifest file or
even at runtime when `useBespin` is called. We'll do it in the manifest
file (`toolbar.json`). Here's the new manifest:

    {
        "output_dir": "../build",
        "plugins": ["embedded", "tutorialtoolbar"],
        "search_path": [".."],
        "config": {
            "objects": {
                "toolbar": {
                    "factory": "tutorialtoolbar"
                }
            },
            "gui": {
                "north": {
                    "component": "toolbar"
                }
            }
        }
    }

The new section is the `config` section. This provides the application
configuration (about which you can read more in the [Embedder's Guide](../embedding/appconfig.html)).

The `objects` part of the config is telling Bespin to create a "global"
(global within Bespin) object called `toolbar`. Bespin will look for
a factory called `tutorialtoolbar`, which happens to be what we defined
in the `package.json` file.

The `gui` part of the config is telling Bespin to toss the component
(object) that we created with the name `toolbar` into the "north" part
of the interface. Bespin uses a simple "border layout" with north, south,
east, west and center locations. So, our toolbar should appear at the top
of the page.

Refresh your browser, and you should see our Toolbar! appear at the top.
*If it appears at the bottom, you've witnessed the bug mentioned in the
introduction.*

CSS3 Flexible Box Model (an aside)
----------------------------------

CSS3 includes a module called the Flexible Box Model (sometimes called flexbox), 
which Paul Rouget did a great job of introducing 
[in this Mozilla Hacks article](http://hacks.mozilla.org/2010/04/the-css-3-flexible-box-model/). 

Traditionally, HTML+CSS have been quite nice for laying out documents
but not so great for laying out user interfaces. Flexbox
makes laying out UI a far easier process.

Bespin uses flexbox to create the border layout. When you declare that a GUI
component belongs in the "north", all Bespin has to do is add the "north" 
class to the element, and it pops into the right place.

Flexbox would also be a great way to create a toolbar, but we're not
going to go that far in this tutorial.

By using flexbox, we let the browser do all of the layout which is generally
faster and smoother than JavaScript-based layouts.

Making Our Toolbar Pluggable
----------------------------

One of Bespin's main features is that it is customizable and extendable.
While it's certainly possible to make a static toolbar with a certain
collection of functions, it's a lot more interesting to create a toolbar
that is itself pluggable. Plus, that's part of the point of our tutorial.

We'll start by defining an extension point of our own in `package.json`.
Add this as another item in the `provides` list in `package.json`:

    {
        "ep": "extensionpoint",
        "name": "tutorialtoolbaritem",
        "description": "Toolbar item views",
        "params": [
            {
                "name": "name",
                "description": "name of this toolbar item",
                "type": "string"
            },
            {
                "name": "pointer",
                "description": "pointer to a component that can be instantiated with new and has an element defined on it."
            }
        ]
    }

Extension points themselves are defined via the `extensionpoint` extension
point. Seems a bit circular, but it works. We're creating an extension point
called `tutorialtoolbaritem`. Bespin is designed to be introspectable,
so we provide some documentation about the extension point via the `description`
and `params` properties.

We're going to make `tutorialtoolbaritem`s look a lot like Bespin's GUI components
(an object with an `element` property).

Now, we need to make our toolbar go out and find the registered `tutorialtoolbaritem`s.
We'll change `index.js` to look like this:

    var catalog = require("bespin:plugins").catalog;

    exports.ToolbarView = function() {
        var elem = document.createElement("menu");
        elem.setAttribute('class', "tutorial-toolbar");
        elem.setAttribute('type', "toolbar");
        this.element = elem;

        this._items = [];

        var extensions = catalog.getExtensions('tutorialtoolbaritem');
        var self = this;
        extensions.forEach(function(ext) {
            ext.load().then(function(item) {
                item = new item();
                self._items.push(item);
                elem.appendChild(item.element);
            });
        });
    };
    
The first thing we're going to do is change the element we're creating into 
an [HTML5 menu element](http://www.w3.org/TR/html5/interactive-elements.html#menus).
By giving it a type of `toolbar`, we're letting the browser know that we're
creating a toolbar. Right now, the browsers don't render the toolbar in any
special way, but we can use CSS to render the toolbar however we wish.

Next, we'll make a list to keep track of the items we find. Speaking of finding
the items, we need to talk to the plugin catalog about that. In the first line
of the file, we imported the catalog. Now, we call getExtensions which will
return all of the `tutorialtoolbaritem`s.

We use `var self = this` because we've got some nested callbacks and that's
a bit nicer to look at than binding each function individually. Then, we loop
through the list of extensions and call `load` on each one.

The `load` function returns a *Promise*. Promises provide a convenient way
to manage callbacks for asynchronous behavior. For our purposes here, the
only difference between a Promise and a normal callback function is that 
we don't pass the callback directly to `load`. Instead, we call `then`
on the promise and pass the callback to that.

Back in our metadata for the `tutorialtoolbaritem` extension point, we defined the
`pointer` property as a _pointer to a component that can be instantiated with 
new and has an element defined on it._ So, when we `load` the extension, that's
what we're going to get back. With the tutorialtoolbar item in hand, we can
call `new` on it, add that new instance to our items list and then add 
the instance's element to our toolbar.

And, with that, we have created a dynamically extendable toolbar.

Adding Some Items
-----------------

Of course, if we reload our Bespin, the toolbar will be rather boring. We
haven't added any toolbar items!

With the infrastructure that we put in place in the last section, we can
create `tutorialtoolbaritem`s in any plugin. For convenience, we'll just
add a couple of items in the tutorialtoolbar plugin.

We'll make a new module (file) for them in the `tutorialtoolbar` directory
called `items.js`. At this stage, we're not going to make our toolbar items
*do* anything, but we just want to have something to display. Here is
our `items.js` file:

    exports.Logo = function() {
        var li = document.createElement('li');
        li.innerHTML = "Logo here";
        this.element = li;
    };

    exports.OpenFileIndicator = function() {
        var li = document.createElement('li');
        li.innerHTML = "SampleProject &mdash; readme.txt";
        this.element = li;
    };

    exports.Save = function() {
        var li = document.createElement('li');
        li.innerHTML = "Save";
        this.element = li;
    };

    exports.PositionIndicator = function() {
        var li = document.createElement('li');
        li.innerHTML = "Row 0, Column 0";
        this.element = li;
    };

As you can see, each one of these functions does nothing but create an
`li` element (as per the HTML5 spec for menus) and add that element
to the instance on the `element` property.

One more thing to do before we can see our toolbar. We need to register
the extensions for our `tutorialtoolbar` extension point. Back in
`package.json`, we're going to add these four more items to our
`provides` property:

    {
        "ep": "tutorialtoolbaritem",
        "name": "logo",
        "pointer": "items#Logo"
    },
    {
        "ep": "tutorialtoolbaritem",
        "name": "openfileindicator",
        "pointer": "items#OpenFileIndicator"
    },
    {
        "ep": "tutorialtoolbaritem",
        "name": "save",
        "pointer": "items#Save"
    },
    {
        "ep": "tutorialtoolbaritem",
        "name": "positionindicator",
        "pointer": "items#PositionIndicator"
    }

You can see that each one of these refers to the `items` module in the
pointer, since that's where we put these items.

For reference, here's the complete `package.json` file at this stage:

    {
        "provides": [
            {
                "ep": "factory",
                "name": "tutorialtoolbar",
                "action": "new",
                "pointer": "#ToolbarView"
            },
            {
                "ep": "extensionpoint",
                "name": "toolbaritem",
                "description": "Toolbar item views",
                "params": [
                    {
                        "name": "name",
                        "description": "name of this toolbar item",
                        "type": "string"
                    },
                    {
                        "name": "pointer",
                        "description": "pointer to a component that can be instantiated with new and has an element defined on it."
                    }
                ]
            },
            {
                "ep": "tutorialtoolbaritem",
                "name": "logo",
                "pointer": "items#Logo"
            },
            {
                "ep": "tutorialtoolbaritem",
                "name": "openfileindicator",
                "pointer": "items#OpenFileIndicator"
            },
            {
                "ep": "tutorialtoolbaritem",
                "name": "save",
                "pointer": "items#Save"
            },
            {
                "ep": "tutorialtoolbaritem",
                "name": "positionindicator",
                "pointer": "items#PositionIndicator"
            }
        ]
    }

With that, we've done everything we need to do to see our toolbar. Let's
reload the page. You should see something that looks like this:

![Toolbar displayed as list](ToolbarAsList.png)

It worked! It has our items in it! Doesn't look much like a toolbar, though,
does it?

Styling Your Plugins
--------------------

To make our toolbar look like a toolbar, we need to add some styles. In order
to support themes properly, Bespin uses [LESS](http://lesscss.org), which is
an extended CSS syntax.

In the `tutorialtoolbar` directory, create a `resources` directory. In there,
create a file called `toolbar.less`. We need to tell Bespin's theme manager
about this file, so we need to add one more thing to the `provides` property
in `package.json`:

    {
        "ep": "themestyles",
        "url": [ "toolbar.less" ]
    }

`themestyles` extensions provide URLs (relative to the plugin's resources 
directory) to the LESS files that this plugin needs to have loaded. The
theme manager will automatically load these files as needed.

And what's in this mysterious `toolbar.less` file?

    .bespin {
        .tutorial-toolbar {
            display: block;
            background-color: #000;
            border-bottom: solid #424038 1px;
            -moz-box-shadow: 0px 0px 3px 3px #000;
            -webkit-box-shadow: 0px 0px 3px 3px #000;
            color: #ffffff;
            font-family: Helvetica, Arial;
            width: 100%;
            margin: 0px;
            padding: 0px;
        }

        .tutorial-toolbar li {
            display: inline;
            padding: 0px 24px 0px 0px;
        }
    }

This looks like fairly normal CSS, right? *Except* what's that `.bespin` doing
surrounding those other rules? When LESS expands this out to standard CSS,
the result would be something like this:

    .bespin .tutorial-toolbar {
    }
    
    .bespin .tutorial-toolbar li {
    }

So, the surrounding `.bespin` is a nice little shorthand, and it prevents CSS
from leaking out onto the page. When you consider the use of Bespin Embedded
on other sites, it's a good idea to ensure that all of our styles are scoped
for use only within Bespin.

With these styles in place, let's reload the page. Much nicer, eh?

Wrapping Up
-----------

On the one hand, this tutorial didn't give us a *functioning* toolbar. It's all
static text. On the other hand, look at everything we *did* cover:

* multi-file plugin structure
* creating a component that Bespin can display
* the awesomeness that is CSS3's Flexible Box Model
* configuring our component for display in Bespin
* defining and using our own extension points

