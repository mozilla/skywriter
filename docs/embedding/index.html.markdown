---
layout: default
title: Bespin Embedded Guide
subtitle: Introduction
---

Compressed vs. Uncompressed
===========================

The Drop In package comes with both compressed and uncompressed JavaScript
and CSS files. For live site use, you will likely want to use the compressed
JavaScript because it is *much* smaller than the uncompressed version.
If you are trying to troubleshoot a problem, you should use the uncompressed
version.

`BespinEmbedded.uncompressed.js` is uncompressed. `BespinEmbedded.js` 
is compressed.

I suggest that you have your HTML refer to BespinEmbedded.js and just put
the version of the file you need in place at that URL. The examples that
follow all make the assumption that you're doing just that.

How to embed Bespin in your site
================================

Level 1: Upgrade an element
---------------------------

The easiest thing to do to get Bespin working on your website is to simply
include the Bespin script in your page, and mark the elements that you wish to
use with Bespin with the `class="bespin` attribute. Download the
Bespin Embedded release and put the files from the "prebuilt"
directory on your web server.

To use Bespin on your page, you would then add lines like the following to
the &lt;head&gt; element on your page:

    :::html
    <link id="bespin_base" href="/path/to"/>
    <script src="/path/to/BespinEmbedded.js"></script>

The bespin\_base link tag is important to tell Bespin where to find
other resources (such as the stylesheets, plugins, etc.)

Then, elsewhere on your page, you can transform an element (such as a
&lt;div&gt; or &lt;textarea&gt;) into a Bespin editor:

    :::html
    <div class="bespin">Initial contents</div>

There are a number of options to customize how Bespin loads. You can request
Bespin to use these as follows:

    :::html
    <div class="bespin" data-bespinoptions='{ "stealFocus":true, "syntax": "js" }'>
    </div>

data-bespinoptions uses a JSON structure (so make sure you [follow the rules][1]
about escaping strings).

The element to be upgraded does not have to be a div, though there is a known
issue that other element types such as textarea are not working right now.

Bespin does not allow multiple elements in a page to become Bespin editors -
there can only be one.

[1]: http://json.org/ "The JSON Spec"


Level 2: Manual Upgrade
-----------------------

Sometimes the element to upgrade might be dynamically created, or you might want
to have Bespin as an option that is only loaded when the user selects a 'Use
Bespin' option. In this case just inserting `class="bespin"` after page load
won't work, and you'll need to tell Bespin to use an element:

    :::html
    <link id="bespin_base" href="/path/to"/>
    <script src="/path/to/BespinEmbedded.js"><script>
    <script>
        var node = document.getElementById("edit");
        bespin.useBespin(node);
    </script>

    <textarea id="edit">Initial contents</textarea>

Rather than passing in a node, you can also simply pass in an string identifier
as follows:

    :::js
    bespin.useBespin("edit");

And as with level 1 above, you can also use options to customize the display:

    :::js
    bespin.useBespin("edit", {
        stealFocus: true
    });

Because this is JavaScript, the strict demands of JSON are not applicable here,
where they are when using data-bespinoptions.


Interaction
-----------

It is possible to interact with a Bespin instance on a page, to alter contents
for example.

When using manual upgrade of an element, the `useBespin()` function returns a
promise. The resolved promise has as first argument the _environment_ variable:

    :::js
    bespin.useBespin("edit").then(function(env) {
        // Get the editor.
        var editor = env.editor;
        // Change the value and move to the secound lien.
        editor.value = "Initial Content\nWith 2 lines";
        editor.setLineNumber(2);
    }, function(error) {
        throw new Error("Launch failed: " + error);
    });

When the Bespin was created dynamically (using a div with `class="bespin"`), you
can get the Bespin `environment` instance from the DOM node as the `bespin` 
variable on the node.

Creating the Bespin dynamically takes some time and the Bespin might not be ready
when the page fires the `onLoad` event. Accessing the dynamically created Bespin
is save after the onBespinLoad event is fired:

    ::::js
    window.onBespinLoad = function() {
        var edit = document.getElementById("edit");
        // Get the environment variable.
        var env = edit.bespin;
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

The complete [Bespin editor API][3] is documented elsewhere.

[3]: ../pluginguide/editorapi.html "Editor API"

Dimensions
----------

Bespin always has to know the absolute size of the element it's contained in.
Because parts of Bespin depend on absolute position and size (mainly the canvas
elements) it's necessary to tell Bespin that its container dimension changed.
You can do this by:

    :::js
    env.dimensionsChanged();

Where `env` is the environment variable of the Bespin that container's size changed.

Embedding Bespin in XULRunner
=============================

Bespin's use of web workers and other features requires it to be loaded via
resource:// urls if used in XULRunner iframes.
