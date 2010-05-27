---
layout: default
title: Bespin Startup Options
---

Bespin Startup Options
======================

See the main [Bespin embedding documentation][1] for details on how to use these
options.

[1]: index.html "Bespin embedding documentation"


initialContent
--------------

This option allows you to replace the startup content of an element with some
custom content. For example:

    :::html
    <textarea id="edit"></textarea>
    <script>
    tiki.require("Embedded").useBespin("edit", {
        initialContent: "Hello, World!"
    });
    </script>

This is an alternative to the simpler:

    :::html
    <textarea id="edit">Hello, World!</textarea>
    <script>
    tiki.require("Embedded").useBespin("edit");
    </script>

For use when the initial content is computed in some way. This option is also
available for use with data-bespinoptions, however there is little benefit over
placing the content in the element for this case, so that option is preferred.


settings
--------

You can customize any of the editor's settings declaratively or
programmatically. These are the same settings that are set using the "set"
command in the full Bespin. These can be specified using the
`data-bespinoptions` attribute on the HTML like so:

    :::html
    <div class="bespin" data-bespinoptions='{"settings":{"tabstop":2}}'/>

Programmatically:

    :::html
    <textarea id="edit"></textarea>
    <script>
    tiki.require("Embedded").useBespin("edit", {
        settings: { tabstop:2 }
    });
    </script>

Both of these examples are equivalent to calling
`bespin.setSetting("tabstop", 2);` on page load.


stealFocus
----------

On startup it's sometimes useful to instruct the browser to begin with some
specific component having the focus. For example:

    :::js
    tiki.require("Embedded").useBespin("edit", {
        stealFocus: true
    });

This is equivalent to calling `bespin.setFocus(true);` on page load.
`stealFocus` is also available when using the element upgrade option.


lineNumber
----------

It might be useful to start with the cursor set to a specific line on startup.
You can do this with the `lineNumber` startup option. For example:

    :::html
    <div class="bespin" data-bespinoptions='{ "lineNumber":1000 }'/>

This is equivalent to calling `bespin.setLineNumber(1000);` on page load.
`lineNumber` is also available when using the element upgrade option.

