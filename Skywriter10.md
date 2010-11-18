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

* **Bespin** the original Mozilla Labs experiment for coding in the cloud. In this document, we'll use the name Bespin to refer to the 0.9x releases. Skywriter will refer to plans for 1.0.
* **Mozilla Skywriter** the more stable successor to Bespin
* **Cloud9 IDE** an open source project from Ajax.org to build an IDE for the cloud.
* **ACE** the text editor component used in Cloud9 that will also be used in Skywriter
* **APF** the GUI toolkit created by Ajax.org that is used to build Cloud9's UI
* **dryice** the CommonJS package build tool for the browser that was introduced with Bespin

## Source Repositories ##

The authoritative repository for Skywriter is here:

<https://github.com/mozilla/skywriter>

This repository includes ACE as a submodule. The authoritative repository for ACE is here:

<https://github.com/ajaxorg/ace>

The authoritative repository for Cloud9 is here:

<https://github.com/ajaxorg/cloud9>

In the immediate term, Mozilla will create a fork of the ACE repository.
The Skywriter repository will have this fork as a submodule.

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

From Joe Walker on the skywriter-core mailing list (edited for this document):

The basic command interfaces look something like this: 

Ace commands are just used for keyboard shortcuts, so they are 
synchronous, have no arguments, and do no output. 

`void function(editor, selection)`

Where: 

* editor is an instance of Editor 
* selection is an instance of Selection, which is synonymous with editor.getSelection() 

Bespin commands encompass the Ace case, but also extend to the command line case, so they can do output, can be asynch, and can have arguments. 

`void function(args, request)`

Where: 

* args is simple object containing command line parameters as a result of parsing the command line using the command definition
* request is an instance of Request which allows output and control over asynchronicity 

Things like editor and selection were available via require. Bespin originally had 2 separate concepts, but we merged them, and were pleased that we had. 2 obvious advantages of a merged system: 

- It enables keyboard acceleration of more stuff 
- It allows testing to happen via commands 

The proposed command interface for Ace is:

`void function(env, args, request)`

Where: 

* env is an object that will contain the Editor, Selection, and potentially other stuff 
* args is input from the command line (and other places) and can be ignored for 0 parameter commands 
* request is as above, and can be ignored for output-less synchronous cases 

The original thread for this is here:

<http://groups.google.com/group/skywriter-core/browse_thread/thread/6414cfe25e86e327>

## Command Line ##

## Themes ##
