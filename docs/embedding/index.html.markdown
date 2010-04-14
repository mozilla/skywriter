---
layout: default
title: Bespin Embedded Guide
subtitle: Introduction
---

Important Note
==============

The current Bespin Embedded release is a *preview release*, and the API has
not yet been finalized. Changes from release-to-release are still possible
at this stage, and will be noted in the release notes for each release.

The Two Flavors of Bespin Embedded
==================================

Bespin is designed to scale up from simple text area replacement to a 
full-blown, powerful editing environment. This is accomplished through
plugins. The Bespin Embedded package comes in two flavors:

* Drop In
* Customizable

With the Drop In flavor, you get a single .js and a single .css file that you can
include on your server simply. You don't need anything else to use it.

With the Customizable flavor, you are able to tailor which plugins are
installed for use with your Bespin.

The instructions on this page tell you how to deploy Bespin on your site, and 
apply regardless of which flavor of Bespin Embedded you're using. If you are
using the Customizable flavor, you can take a look at the 
[building instructions](building.html) for information on how to change
what is built into your Bespin.

Compressed vs. Uncompressed
===========================

The Drop In package comes with both compressed and uncompressed JavaScript
and CSS files. For live site use, you will likely want to use the compressed
JavaScript because it is *much* smaller than the uncompressed version.
If you are trying to troubleshoot a problem, you should use the uncompressed
version.

`BespinEmbedded.js` is uncompressed. `BespinEmbedded.compressed.js` is,
unsurprisingly, compressed.

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
Bespin Embedded release and put these two files on your web server:

* BespinEmbedded.js
* BespinEmbedded.css

To use Bespin on your page, you would then add lines like the following to
the &lt;head&gt; element on your page:

    :::html
    <link href="/path/to/BespinEmbedded.css" rel="stylesheet" 
      type="text/css">
    <script src="/path/to/BespinEmbedded.js"></script>
    
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

The [Bespin startup options][2] are documented elsewhere.

Bespin does not allow multiple elements in a page to become Bespin editors - 
there can only be one.

[1]: http://json.org/ "The JSON Spec"
[2]: bespinoptions.html "Start-up option documentation"


Level 2: Manual Upgrade
-----------------------

Sometimes the element to upgrade might be dynamically created, or you might want
to have Bespin as an option that is only loaded when the user selects a 'Use
Bespin' option. In this case just inserting `class="bespin` after page load
won't work, and you'll need to tell Bespin to use an element:

    :::html
    <script src="/path/to/BespinEmbedded.js"><script>
    <script>
    var embed = tiki.require("embedded");
    var node = document.getElementById("edit");
    var bespin = embed.useBespin(node);
    </script>

    <textarea id="edit">Initial contents</textarea>

Rather than passing in a node, you can also simply pass in an string identifier
as follows:

    :::js
    tiki.require("embedded").useBespin("edit");

And as with level 1 above, you can also use options to customize the display:

    :::js
    tiki.require("embedded").useBespin("edit", {
        stealFocus: true
    });

Because this is JavaScript, the strict demands of JSON are not applicable here,
where they are when using data-bespinoptions.


The Embedded API
----------------

It is possible to interact with a Bespin instance on a page, to alter contents
for example.

When using manual upgrade of an element, the `useBespin()` function returns a
bespin object which can be manipulated as follows:

    :::js
    var bespin = embed.useBespin("edit");
    bespin.value = "Initial Content\nWith 2 lines";
    bespin.setLineNumber(2);


It's possible to change any settings (as in those defined by the 'set' command
where the command line is available). Note that the same settings apply to
all editors on the page. To change a setting use:

    :::js
    bespin.setSetting("fontsize", 10);


To change the initial context for the syntax highlighter run:

    :::js
    bespin.setSyntax("html");


When using element upgrading (with the `class="bespin"` attribute), you don't
instantly have access to the Bespin Component. Fortunately, you can get access
to it fairly easily:

    :::html
    <div id="edit" class="bespin">Initial contents</div>
    <script>
        var bespin = document.getElementById("edit").bespin;
        bespin.value = "Hello, World!";
    </script>

The DOM node that contains the editor gets a "bespin" property on it with
the embedded editor convenience API.

Dimensions
----------

Bespin always has to know the absolute position and size of the element it's
contained in. The Bespin code will try to figure out the position of the element
and keep it updated whenever the window size changes, so normally this all
occurs behind the scenes and you don't need to worry about it. However, if
you're altering elements in the DOM through JavaScript in ways that might cause
the Bespin editor to move around, then you'll need to let Bespin know that its
position might have changed. You can use the `dimensionsChanged()` function to
do this. Pass in the editor object that you received from the `useBespin()` call
whenever you programmatically update the absolute position of the editor on the
page, whether directly (through altering the style of the Bespin element itself)
or indirectly (through altering the style of some other element that triggers a
reflow). For example, suppose we have this page:

    :::html
    <div id="box" style="display: inline-block; width: 100px;">Hello</div>
    <div id="bespin"
        style="display: inline-block; width: 640px; height: 480px;">Bespin</div>

And this JavaScript:

    :::js
    bespin = embed.useBespin("bespin");

Notice that the position of the Bespin editor on the page is determined by the
width of the box next to it, since both elements have _inline-block_ layout.
So, if the width of the adjacent box ever changes, `dimensionsChanged()` will
need to be called. For example:

    :::js
    var box = document.getElementById('box');
    box.style.width = '200px';                  // will cause Bespin to move
    bespin.dimensionsChanged();                 // tell Bespin


Development Mode and onBespinLoad
---------------------------------

When you use a simple &lt;script&gt; tag to include the Bespin components, you can be
sure that Bespin is ready for action on page load. However, what happens if you
are in development mode where the components are loaded asynchronously? Then,
it's hard to know when Bespin is ready for action. Bespin fires an
onBespinLoad event when it is ready for action.

For example:

    :::html
    <script>
    window.onBespinLoad = function() {
        bespin = document.getElementById("editor").bespin;
    };
    <input type="button" value="Clear Bespin" 
        onclick="bespin.value='';">
    </script>

If you are using Bespin via a normal script tag, then you don't need to use the
onBespinLoad() function.

Events
======

Often, you'll want to execute some code whenever the user interacts with Bespin
in some way; for example, whenever the text is changed. Bespin's API is designed
to resemble the standard DOM Events API, so it's easy to pick up.

To add an event handler, use `addEventListener()` as though Bespin were a DOM
object:

    :::js
    bespin.addEventListener('textChange', function() {
        alert("The text changed!");
    });

The available events are as follows:

* `select`: Called whenever the selection changes.
* `textChange`: Called whenever the text changes, either from user input or
commands such as Undo.

