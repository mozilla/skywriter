---
layout: default
title: Skywriter 0.8 ("Cheviot") Release Notes
---

[Up](index.html) - [Next Release](notes09.html) - [Previous Release](notes073.html)

Important Changes
-----------------

Note that there have been some significant changes to the embedded API
between Skywriter 0.7 and 0.8. See the "Upgrade Notes" section below.

Known Issues
------------

Skywriter 0.8 is *alpha* software. It is still under active development
and APIs are subject to change.

For *Skywriter Embedded*:

* The editor does not yet support tab characters (bug 543999)

For *Skywriter Server*:

Important note: The Skywriter Server is going to undergo a complete rework.
You can read more about this in the [Skywriter Server Roadmap](http://groups.google.com/group/skywriter/browse_thread/thread/6de8c718d64232a0)
that was posted to the mailing list.

* The command line does not yet support aliases, which means that you may
  need to use different names for some of the commands you're used to
  in earlier Skywriters (bug 543968)

Features
--------

* Skywriter now supports themes via theme plugins. Themes can style both the
  editor text and the user interface elements.
* User interface styles are done via LESS files rather than plain
  CSS to provide themes with control over the UI elements. (see
  http://lesscss.org/ for more information)
* Skywriter includes a "white" theme plugin.
* Embedded builds are now much smaller (less than half their previous size).
* Skywriter Embedded can now replace a textarea (bug 535819)
* dryice now includes a simple server that you can run with the "-s" option.
  `dryice -s 9090 foo.json` will start a server on port 9090 that will
  rebuild the embedded editor (using the foo.json manifest) with each 
  load of the main page.
* Plugins can include templates in a `templates` directory. These templates
  are automatically made available via a "templates" module in the plugin.
* The command line can now be included in embedded builds. (bug 551546)
* Syntax highlighting is now done in a webworker thread. This provides
  much better performance and also eliminates some reliability issues
  with the highlighting.
* The start of a CSS syntax highlighter (bug 547272, thanks to Cody Marquart)
* Skywriter now includes a "working directory" with cd and pwd commands.
  This directory becomes the root of the quickopen behaivor. (bug 566490)
* The editor can now be set to "read only", similar to how a text area
  can be read only (bug 569440)
* The "export" command allows you to export one of your "projects"
  (top level directories) as a tgz or zip file. This will make it easy
  to get your data off of skywriter.mozillalabs.com. (bug 554947)
* There is a new Growl-like notification system within Skywriter.
* If jQuery is present on a page, Skywriter can use it rather than the
  one that Skywriter normally bundles. (bug 568815)
* Plugins can be dynamically loaded in embedded builds.
* Commands and embedded users have the same convenient APIs now for
  manipulating the editor (bug 568217)
* Added indent/unindent functionality (select a block, press tab)
* The only name exposed to the page in embedded builds is "skywriter".

Fixes
-----

* Skywriter should no longer have issues running in xulrunner due to the absence of
  localStorage (bug 562646)
* Fixed a problem with replacing selected text (bug 567971)
* Delete line (cmd-D) on the last line of a file would raise an exception
  (bug 570272)
* There should no longer be any compatibility problems between Skywriter and
  jQuery.
* Sample custom plugin no longer uses alt-A, which is bound to select all
  (bug 564789)
* Document scrolled to the top when entering text in the editor
  (bug 565333)

Upgrade Notes
-------------

For Embedded builds, SkywriterEmbedded.js now refers to the compressed version. SkywriterEmbedded.uncompressed.js is the uncompressed version. Also noteworthy:
the SkywriterEmbedded.css file is no longer required. Finally, builds now
produce three .js files (SkywriterEmbedded.js, SkywriterMain.js, SkywriterWorker.js).
You only need to refer to SkywriterEmbedded.js on your page.

Before Skywriter 0.8, the booting code for the 'embedded' and the 'server' versions
of Skywriter was different. Because of this, a few plugins available to the 'server'
version couldn't be used in the 'embedded' case and the API offered in the 'embedded'
case was not available in the 'server' version of Skywriter. Starting with Skywriter 0.8,
the 'embedded' and 'server' versions use the same codebase.

This together with a few other modifications and improvements requires that
you change the way you create a new Skywriter instance. Before, things looked like this:

    :::js
    // Get the embedded plugin.
    var embedded = tiki.require("embedded");
    // Create a new Skywriter instance.
    var skywriter = embedded.useSkywriter("edit");
    // Change the value.
    skywriter.value = 'Hello world!';

As with Skywriter 0.8:

    :::js
    // Create a new Skywriter instance.
    // This returns a promise which is resolved when the Skywriter is ready.
    skywriter.useSkywriter("edit").then(function(env) {
        // Get the editor.
        var editor = env.editor;
        // Change the value.
        editor.value = 'Hello world!';
    }, function(error) {
        throw new Error("Launch failed: " + error);
    });

Let's take a closer look:

* The _embedded_ plugin is gone. Instead, you call the `useSkywriter` function from
  the `skywriter` object. If you need to get at tiki to load a module, you can find it
  at `skywriter.tiki`.
* `skywriter.useSkywriter(...)` can't return the Skywriter instance directly any more.
  This is related to a few new features that we introduced with 0.8. For example, the
  _theme\_manager_ plugin loads all the styleFiles from the server and Skywriter can't
  continue launching until some basic parts are there. At the same time, we
  don't want to block the main thread until this is done. Instead, the
  useSkywriter() function returns a _promise_, that is resolved after the Skywriter instance
  is ready to be used and rejects the promise if something went wrong.
* Your callback function for the promise (the function that is passed to "then")
  is passed one argument: `env`. `env` is the Skywriter enviroment
  for your newly created Skywriter. You get the Skywriter code editor object by executing
  `env.editor`. This is the same `env` object that is passed to commands
  that you create.
* Once you have the editor object, you can use the what we call the _Editor API_
  to interact with it. You find the complete [API here][1].
  Many function calls in the 0.7 API have been replaced 
  with getters and setters in 0.8, which makes the code more readable. 
  Imagine you want to make the current selected text upper case. 
  Before, you had to write:

How selected text replacement worked before:

    :::js
    // This holds the Skywriter editor;
    var editor;
    // Make the current selected text upper case.
    editor.replaceSelection(editor.getSelectedText().toUpperCase());

With the new _Editor API_ this changed to:

    :::js
    // This holds the Skywriter editor;
    var editor;
    // Make the current selected text upper case.
    editor.selectedText = editor.selectedText.toUpperCase();

* If you change the size of the Skywriter container, you have to call the
  `dimensionsChanged` function, which is now on the `env` object. When the window
  resizes, this event is fired automatically:

How to register a size change:

    :::js
    // Tell Skywriter that the container size changed.
    env.dimensionsChanged();


* You can still dynamically initialize Skywriter on your page. The
  `skywriter` property on the DOM node is now the `env` (environment) variable
  described above:

Example of using the "env" variable from the DOM node:

    :::html
    <div id='edit' class='skywriter'>Skywriter editor goes here!</div>

    <script>
        // This function is called when all Skywriter instances on the page were
        // initialized.
        //
        // Make sure you access the Skywriter instance *AFTER* the window.onSkywriterLoad
        // function was called.
        window.onSkywriterLoad = function() {
            // Get the DOM node with the Skywriter instance inside
            var edit = document.getElementById("edit");
            // Get the environment variable.
            var env = edit.skywriter;
            // Get the editor.
            var editor = env.editor;
            // Change the value and move to the secound line.
            editor.value = "Initial Content\nWith 2 lines";
            editor.setLineNumber(2);
        };
    </script>

[1]: ../pluginguide/editorapi.html "Editor API"