# Skywriter 1.0 Spec #

## Introduction ##

The Bespin project has shifted focus based on our needs within Mozilla and 
things that we've learned. From the perspective of the Mozilla
Developer Tools group, what we really need out of the project today is a
powerful, user-friendly, customizable code editor component. This is 
what we've been building with our Bespin Embedded packages.

As of a few months ago, we still intended to create Desktop and Server
versions of the editor. However, our need for those is less important to
us than our need for great developer tools.

Looking forward as Bespin matures from the Bespin project to 
Mozilla Skywriter 1.0, we have this narrowed focus. This gives us leeway
to greatly simplify things based on what we've learned and the new goals.
Additionally, we have found that we have similar goals for Skywriter as
Ajax.org does for the ACE editor component and that Ajax.org's Cloud9
IDE has a lot in common with what we wanted to see the Bespin server become.

At the high level, our plan is to merge Mozilla Skywriter and ACE. Skywriter
1.0 will be based on this merged codebase. This document is here to collect
up notes about how this merger will work and what the end product will look
like.

## Glossary ##

* **Bespin** the original Mozilla Labs experiment for coding in the cloud.
* **Mozilla Skywriter** the more stable successor to Bespin
* **Cloud9 IDE** an open source project from Ajax.org to build an IDE for the cloud.
* **ACE** the text editor component used in Cloud9 that will also be used in Skywriter
* **APF** the GUI toolkit created by Ajax.org that is used to build Cloud9's UI
* **dryice** the CommonJS package build tool for the browser that was introduced with Bespin

## Source Repositories ##

As of this writing, our source repositories are in a bit of a funny state.
We've done a good deal of work creating a new plugin structure and altering
Skywriter plugins to fit this structure. That work is in a "shared"
repository that we had created originally to hold code shared between the 
projects. That repository is here:

https://github.com/mozilla/cloud9-skywriter-shared

Right now, that repository includes its own copy of ACE, right in that
repository. This will need to change.

The authoritative repository for ACE is here:

https://github.com/ajaxorg/ace

The authoritative repository for Skywriter is here:

https://github.com/mozilla/skywriter

At present, the Skywriter repository doesn't have much that has migrated
forward toward 1.0.

In the immediate term, Mozilla will create a fork of the ACE repository.
The Skywriter repository will have this fork as a submodule. The code
in the shared repository will either move into the ACE repository or the
Skywriter repository, depending on whether it's likely to be useful
to ACE/Cloud9.

Once Ajax.org is ready to move over to the updated-with-new-plugin-system ACE,
the submodule in Skywriter will change to point to the authoritative ACE
repository.

## Plugin System ##

Bespin 0.9 is built around and driven by a plugin system. ACE has a tiny bit
of a plugin capability. The plan for Skywriter 1.0 is to be plugin-driven but
to have a far simpler plugin model.

When Bespin's plugins were introduced, we did so with the thought that we 
would have a Bespin server potentially with a great many plugins. In order to
make load times reasonable, we would lazy load plugins on demand as much as
was possible. In order to make lazy loading possible, plugins needed to have
a bunch of metadata that described what they offered to the system. As an
example of this, if you made a command to reformat a document when you press
ctrl-K, that plugin would not be sent along to the client until the user
actually presses ctrl-K.

That lazy loading made the plugin system and the plugins themselves more
complex and less JavaScripty.

Skywriter throws out the lazy loading requirement, though we may bring it
back in limited cases in the future for things like syntax highlighters.
This simplifies the plugin system and many plugins.

As with Bespin 0.9, plugins are [CommonJS packages](http://wiki.commonjs.org/wiki/Packages/1.0).
However, the notion of "extension points" that was so important in Bespin 0.9
is being replaced by the more common idiom of calling registration functions
to tell the editor about new functionality. The common extension points from
Bespin 0.9 will have a straightforward conversion to a registration function
call.

The plugin's main module (generally called "index.js") can have functions
defined on it that are called at various points in the plugin's lifecycle.
The function names and the plugin lifecycle are the same as defined in
Firefox's [Bootstrapped Extensions](https://developer.mozilla.org/en/Extensions/Bootstrapped_extensions).
There is no relationship between Skywriter plugins and Firefox extensions, but
the interface described on that page matches exactly what we need.

## dryice ##

dryice is the name of Bespin's build tool. The intention is to move this tool
to a separate repository so that it can be used by APF, Cloud9 and Skywriter
for generating ready-to-deploy JavaScript easily from a collection of
Skywriter plugins.

The new version of dryice will be written in JavaScript with an initial target
platform of node.js.

The intention is for dryice to be very simple and extensible in the right places.
It has been my experience that declarative syntaxes often fail unless the
problem space is extremely simple or well understood.

For that reason, the new dryice will support a manifest.json file that is
similar to that supported by the current dryice. This file will be used
for simple builds where the user is just gathering up a bunch of plugins
(which is a very common case).

dryice will support more custom builds through the use of JavaScript
file that uses dryice as a library.

## appconfig and environment ##

## Events ##

Node has a nice [Event Emitter](https://github.com/ry/node/blob/master/lib/events.js)
API that we will use directly. We'll augment this with a DOM-like API that
is both familiar to browser JavaScript programmers and also used in APF
(Ajax.org's GUI toolkit). This means that in addition to the
[Event Emitter API](http://nodejs.org/api.html#eventemitter-13) there will also
be:

* addEventListener
* (others?) TODO

[Email discussion](http://groups.google.com/group/skywriter-core/browse_thread/thread/aa546535613c236)

## Text Editor ##

## Syntax Highlighters ##

Skywriter 1.0 syntax highlighters will be very similar to those in Bespin 0.9,
but will have some breaking changes from both Bespin 0.9 and ACE.

There is a [spec](http://etherpad.mozilla.com:9000/oSW4EWUuOX) in an etherpad
at the moment.

TODO enumerate the changes for people upgrading Bespin 0.9 syntax highlighters.

## Commands ##

## Command Line ##

## Themes ##
