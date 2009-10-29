---
layout: default
title: Bespin Embedded Guide
subtitle: Introduction
---

How to embed Bespin in your site
================================

Level 1: Upgrade an element
---------------------------

The easiest thing to do to get Bespin working on your website is to simply
include the Bespin script in your page, and mark the elements that you wish to
use with Bespin with the `class="bespin` attribute.

For example:

    <script src="https://bespin.mozilla.com/embed/minimal-bespin.js"><script>
    
    <textarea class="bespin">Initial contents</textarea>

**NOTE**: Currently we have not published and embedded builds to mozilla.com.
Until they are finalized, you will need to [build your own](building.html)

There are a number of options to customize how Bespin loads. You can request
Bespin to use this as follows:

    <textarea class="bespin" data-bespinoptions='{ "stealFocus":true }'>
    </textarea>

data-bespinoptions uses a JSON structure (so make sure you [follow the rules][1]
about escaping strings).

The element to be upgraded does not have to be a textarea. Any element type will
do.

The [Bespin startup options][2] are documented.

As of the time of writing Bespin does not allow multiple elements in a page to
become Bespin editors - there can only be one. We expect this restriction to be
removed soon.

[1]: http://json.org/ "The JSON Spec"
[2]: bespinoptions.html "Start-up option documentation"


Level 2: Manual Upgrade
-----------------------

Sometimes the element to upgrade might be dynamically created, or you might want
to have Bespin as an option that is only loaded when the user selects a 'Use
Bespin' option. In this case just inserting `class="bespin` after page load
won't work, you need to tell Bespin to use an element:

    <script src="https://bespin.mozilla.com/embed/minimal-bespin.js"><script>
    <script>
    var embed = require("bespin/embed");
    var node = document.getElementById("edit");
    embed.useBespin(node);
    </script>

    <textarea id="edit">Initial contents</textarea>

Rather than passing in a node, you can also simply pass in an string identifier
as follows:

    require("bespin/embed").useBespin("edit");

And as with level 1 above, you can also use options to customize the display:

    require("bespin/embed").useBespin("edit", {
        stealFocus: true
    });

Because this is JavaScript, the strict demands of JSON are not applicable here,
where they are when using data-bespinoptions.


Level 3: Adding Plug-ins
-----------------------

Many uses of Bespin will require a set of extra plug-ins for example, to allow
server-side file storage, or adding collaboration. Bespin is designed to scale
from a simple textarea replacement to larger shared project 'IDE replacement'
environments.

See the [plug-in guide][3] for details on

[3]: ../pluginguide/index.html "Bespin Plug-in Documentation"


The Embedded API
----------------

It is possible to interact with a Bespin instance on a page, to alter contents
for example.

When using manual upgrade of an element, the `useBespin()` function returns a
bespin object which can be manipulated as follows:

    var bespin = embed.useBespin("edit");
    bespin.setContent("Initial Content\nWith 2 lines");
    bespin.setLineNumber(2);

For full details of the available methods, see the [bespin/embed.Component][1]

[1]: todo.com "We've not worked out what the URL for generated docs is yet"

When using element upgrading (with the `class="bespin` attribute), you don't
instantly have access to the Bespin Component. Fortunately you can get access
to it fairly easily:

    <textarea id="edit" class="bespin">Initial contents</textarea>
    <script>
    var bespin = document.getElementById("edit").bespin;
    bespin.setContent("Hello, World!");
    </script>

That is to say, when Bespin upgrades an element, it adds the corresponding
Component as a member of the parent DOM node, called 'bespin'.


Development Mode and onBespinLoad
---------------------------------

When using a simple <script> tag to include the Bespin components, we can be
sure that Bespin is ready for action on page load. However what happens if we
are in development mode where the components are loaded asynchronously. Then
it's hard to know when Bespin is ready for action. For now there is an
onBespinLoad event that is fired when bespin is ready for action. This event
may well be replaced in the future, so don't rely on it.

For example:
    <script>
    window.onBespinLoad = function() {
        bespin = document.getElementById("editor").bespin;
    };
    <input type="button" value="Clear Bespin" onclick="bespin.setContent('');">
    </script>

If you are using Bespin via a normal script tag, then you don't need to use the
onBespinLoad() function.
