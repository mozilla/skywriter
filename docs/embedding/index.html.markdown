---
layout: default
title: Skywriter Embedded Guide
subtitle: Introduction
---

Compressed vs. Uncompressed
===========================

The Drop In package comes with both compressed and uncompressed JavaScript
and CSS files. For live site use, you will likely want to use the compressed
JavaScript because it is *much* smaller than the uncompressed version.
If you are trying to troubleshoot a problem, you should use the uncompressed
version.

`SkywriterEmbedded.uncompressed.js` is uncompressed. `SkywriterEmbedded.js` 
is compressed.

I suggest that you have your HTML refer to SkywriterEmbedded.js and just put
the version of the file you need in place at that URL. The examples that
follow all make the assumption that you're doing just that.

How to embed Skywriter in your site
================================

Level 1: Upgrade an element
---------------------------

The easiest thing to do to get Skywriter working on your website is to simply
include the Skywriter script in your page, and mark the elements that you wish to
use with Skywriter with the `class="skywriter` attribute. Download the
Skywriter Embedded release and put the files from the "prebuilt"
directory on your web server.

To use Skywriter on your page, you would then add lines like the following to
the &lt;head&gt; element on your page:

    :::html
    <link id="skywriter_base" href="/path/to"/>
    <script src="/path/to/SkywriterEmbedded.js"></script>

The skywriter\_base link tag is important to tell Skywriter where to find
other resources (such as the stylesheets, plugins, etc.)

Then, elsewhere on your page, you can transform an element (such as a
&lt;div&gt; or &lt;textarea&gt;) into a Skywriter editor:

    :::html
    <div class="skywriter">Initial contents</div>

There are a number of options to customize how Skywriter loads. You can request
Skywriter to use these as follows:

    :::html
    <div class="skywriter" data-skywriteroptions='{ "stealFocus":true, "syntax": "js" }'>
    </div>

data-skywriteroptions uses a JSON structure (so make sure you [follow the rules][1]
about escaping strings).

The element to be upgraded does not have to be a div, though there is a known
issue that other element types such as textarea are not working right now.

Skywriter does not allow multiple elements in a page to become Skywriter editors -
there can only be one.

[1]: http://json.org/ "The JSON Spec"


Level 2: Manual Upgrade
-----------------------

Sometimes the element to upgrade might be dynamically created, or you might want
to have Skywriter as an option that is only loaded when the user selects a 'Use
Skywriter' option. In this case just inserting `class="skywriter"` after page load
won't work, and you'll need to tell Skywriter to use an element:

    :::html
    <link id="skywriter_base" href="/path/to"/>
    <script src="/path/to/SkywriterEmbedded.js"><script>
    <script>
        var node = document.getElementById("edit");
        skywriter.useSkywriter(node);
    </script>

    <textarea id="edit">Initial contents</textarea>

Rather than passing in a node, you can also simply pass in an string identifier
as follows:

    :::js
    skywriter.useSkywriter("edit");

And as with level 1 above, you can also use options to customize the display:

    :::js
    skywriter.useSkywriter("edit", {
        stealFocus: true
    });

Because this is JavaScript, the strict demands of JSON are not applicable here,
where they are when using data-skywriteroptions.


Interaction
-----------

It is possible to interact with a Skywriter instance on a page, to alter contents
for example.

When using manual upgrade of an element, the `useSkywriter()` function returns a
promise. The resolved promise has as first argument the _environment_ variable:

    :::js
    skywriter.useSkywriter("edit").then(function(env) {
        // Get the editor.
        var editor = env.editor;
        // Change the value and move to the secound lien.
        editor.value = "Initial Content\nWith 2 lines";
        editor.setLineNumber(2);
    }, function(error) {
        throw new Error("Launch failed: " + error);
    });

When the Skywriter was created dynamically (using a div with `class="skywriter"`), you
can get the Skywriter `environment` instance from the DOM node as the `skywriter` 
variable on the node.

Creating the Skywriter dynamically takes some time and the Skywriter might not be ready
when the page fires the `onLoad` event. Accessing the dynamically created Skywriter
is save after the onSkywriterLoad event is fired:

    ::::js
    window.onSkywriterLoad = function() {
        var edit = document.getElementById("edit");
        // Get the environment variable.
        var env = edit.skywriter;
        // Get the editor.
        var editor = env.editor;
        // Change the value and move to the secound line.
        editor.value = "Initial Content\nWith 2 lines";
        editor.setLineNumber(2);
    };

It's possible to change any settings (as in those defined by the 'set' command
where the command line is available). Note that the same settings apply to
all editors on the page. To change a setting use:

    :::js
    env.settings.set("fontsize", 10);

To change the initial context for the syntax highlighter run:

    :::js
    env.editor.syntax = "html";

The complete [Skywriter editor API][3] is documented elsewhere.

[3]: ../pluginguide/editorapi.html "Editor API"

Dimensions
----------

Skywriter always has to know the absolute size of the element it's contained in.
Because parts of Skywriter depend on absolute position and size (mainly the canvas
elements) it's necessary to tell Skywriter that its container dimension changed.
You can do this by:

    :::js
    env.dimensionsChanged();

Where `env` is the environment variable of the Skywriter that container's size changed.

Embedding Skywriter in XULRunner
=============================

Skywriter's use of web workers and other features requires it to be loaded via
resource:// urls if used in XULRunner iframes.
