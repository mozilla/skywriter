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
    <textarea class="bespin">Initial contents</textarea>

There are a number of options to customize how Bespin loads. You can request
Bespin to use these as follows:

    :::html
    <textarea class="bespin" data-bespinoptions='{ "stealFocus":true }'>
    </textarea>

data-bespinoptions uses a JSON structure (so make sure you [follow the rules][1]
about escaping strings).

The element to be upgraded does not have to be a textarea. Any element type will
do.

The [Bespin startup options][2] are documented.

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
    var embed = tiki.require("bespin:embed");
    var node = document.getElementById("edit");
    embed.useBespin(node);
    </script>

    <textarea id="edit">Initial contents</textarea>

Rather than passing in a node, you can also simply pass in an string identifier
as follows:

    :::js
    tiki.require("bespin:embed").useBespin("edit");

And as with level 1 above, you can also use options to customize the display:

    :::js
    tiki.require("bespin:embed").useBespin("edit", {
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
    bespin.setContent("Initial Content\nWith 2 lines");
    bespin.setLineNumber(2);

When using element upgrading (with the `class="bespin"` attribute), you don't
instantly have access to the Bespin Component. Fortunately, you can get access
to it fairly easily:

    :::html
    <textarea id="edit" class="bespin">Initial contents</textarea>
    <script>
    var bespin = document.getElementById("edit").bespin;
    bespin.setContent("Hello, World!");
    </script>

That is to say, when Bespin upgrades an element, it adds the corresponding
Component as a member of the parent DOM node, called 'bespin'.


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
    embed.dimensionsChanged(bespin);            // tell Bespin


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
        onclick="bespin.setContent('');">
    </script>

If you are using Bespin via a normal script tag, then you don't need to use the
onBespinLoad() function.
