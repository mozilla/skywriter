---
layout: default
title: Bespin Embedded Guide
subtitle: Embedded changes 0.7.x to 0.8
---

Before Bespin 0.8, the booting code for the 'embedded' and the 'normal' version
of Bespin was different. As a downside, a few plugins available to the 'normal'
version couldn't be used in the 'embedded' case and the API offered in the 'embedded'
case was not available in the 'normal' version of Bespin. Starting with Bespin 0.8,
the codebase used by the 'embedded' and 'normal' version is the same.

This together with a few other modifications and improvments required that
the way you create a new Bespin instance changed. Before, things looked like this:

    :::js
    // Get the embedded plugin.
    var embedded = tiki.require("embedded");
    // Create a new Bespin instance.
    var bespin = embedded.useBespin("edit");
    // Change the value.
    bespin.value = 'Hello world!';

As with Bespin 0.8:

    :::js
    // Create a new Bespin instance.
    // This returns a promise which is resolved when the Bespin is ready.
    bespin.useBespin("edit").then(function(env) {
        // Get the editor.
        var editor = env.editor;
        // Change the value.
        editor.value = 'Hello world!';
    }, function(error) {
        throw new Error("Launch failed: " + error);
    });

Let's take a closer look:

 *  The _embedded_ plugin is gone. Instead, you call the useBespin function from
the `bespin` object.
 *  `bespin.useBespin(...)` can't return the Bespin instance directly anymore.
This is related to a few new features that we introduced with 0.8. E.g. the
`theme_manager` plugin loads all the styleFiles from the server and Bespin can't
continue launching until some basic stuff is there. At the same time, we
don't want to block the main thread until this is done. Instead, the
useBespin() function returns a _promise_, that is resolved after the Bespin instance
is ready to be used and rejects the promise if something went wrong.
  * The resolved promise has an `env` variable as argument. `env` is the Bespin enviroment
for this new created Bespin. You get the Bespin code editor object by executing
`env.editor`. This is the same `env` object that is passed to commands.
 *  As you have the editor object, you can use the what we call _Editor API_
to interact with it. You find the complete [API here][1].
Compared to the former embedded API a lot of function calls have been replaced
by getters and setters, which makes the code more readable. Imagine, you want to
make the current selected text upper case. Before, you had to write:

    :::js
    // This holds the Bespin editor;
    var editor;
    // Make the current selected text upper case.
    editor.selectedText = editor.selectedText.toUpperCase();

With the new _Editor API_ this changed to:

    :::js
    // This holds the Bespin editor;
    var editor;
    // Make the current selected text upper case.
    editor.selectedText = editor.selectedText.toUpperCase();

 *  If you change the size of the Bespin container, you have to call the
`dimensionChanged` function, which is now on the `env` object. When the window
resizes, this event is fired automatically:

    :::js
    // Tell Bespin that the container size changed.
    env.dimensionsChanged();


* You still can use the dynamically way to initialize Bespin on you're page. The
`bespin` property on the DOM node is now equal to the `env` variable returned
by the resolved promise before:

    :::html
    <div id='edit' class='bespin'>Bespin editor goes here!</div>

    <script>
        // This function is called when all Bespin instances on the page were
        // initialized.
        //
        // Make sure you access the Bespin instance *AFTER* the window.onBespinLoad
        // function was called.
        window.onBespinLoad = function() {
            // Get the DOM node with the Bespin instance inside
            var edit = document.getElementById("edit");
            // Get the environment variable.
            var env = edit.bespin;
            // Get the editor.
            var editor = env.editor;
            // Change the value and move to the secound line.
            editor.value = "Initial Content\nWith 2 lines";
            editor.setLineNumber(2);
        };
    </script>

 [1]: ../pluginguide/editorapi.html "Editor API"