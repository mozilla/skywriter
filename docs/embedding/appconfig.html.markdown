---
layout: default
title: Bespin Embedded Guide
subtitle: Application Configuration
---

Gluing Bespin Together
======================

Bespin is built as a dynamic, customizable editor. It's created out of a
collection of plugins so that it can start out as something that just
replaces a textarea and grow via plugins to a complete client/server 
development environment.

Bespin includes a plugin called _appconfig_ which is responsible for
gluing all of the desired available pieces together. It will instantiate
objects that are used behind the scenes throughout Bespin and will also
create components that provide the user interface that you see.

_appconfig_ has sane default behavior for a few of the supported Bespin plugins.
For example, if the _command\_line_ plugin is available, Bespin will
automatically include it when it sets up the GUI.

Calling appconfig
-----------------

When you use Bespin Embedded, you will generally call the bespin.useBespin 
function to get Bespin running. This, in turn, calls appconfig.launch
with your config. The useBespin function merges configuration that is
provided in your dryice manifest (see [the building doc](building.html)
for more information about manifests) with the configuration that is
passed in by the page.

This setup gives you a lot of flexibility in how you configure your
Bespin.

objects
-------

The configuration object can have a property of "objects" on it.
config.objects defines a collection of objects that need to be
created and used across Bespin. config.objects is an object. The
keys on the object will become the names of the created objects
and the values define how the object is created. Here's a simple
example config:

    :::js
    {
        objects: {
            settings: {}
        }
    }

appconfig will register an object with the name `settings` in the
Bespin plugin catalog (`bespin:plugins#catalog`). To create that
object, Bespin will look for a `factory` extension with the name
`settings`. That factory doesn't require any additional parameters.

Here's a more complex example:

    :::js
    {
        objects: {
            server: {
                factory: "bespin_server"
            },
            filesource: {
                factory: "bespin_filesource",
                arguments: [
                    "server"
                ],
                objects: {
                    "0": "server"
                }
            },
            files: {
                arguments: [
                    "filesource"
                ],
                "objects": {
                    "0": "filesource"
                }
            }
        }
    }

The `server` object will be created by looking up a factory extension called
`bespin_server`. There are no arguments for that one. The `filesource`
is created by finding the `bespin_filesource` factory and passing in
the arguments provided. Here's the tricky bit: that factory actually needs
a bespin\_server instance, not the string "server". The `objects` property
for `filesource` says to replace element `0` in the arguments array with
the object called `server`. The plugin catalog knows to create the
server first, and then create the filesource.

Finally, `files` works a lot like `filesource`. Since there is no
`factory` property, the factory name is assumed to be `files`. That
object will be passed the `filesource` object that is created. Through
this mechanism, it's very easy to configure Bespin to use a file source
other than the Bespin server.

