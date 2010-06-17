---
title: Bespin Developer's Guide
subtitle: Template Engine
layout: default
---

Using The Bespin Template Engine
================================

The template engine is designed to be all the things that everyone always claims
like easy to use etc, but specifically:
* Lightweight (if we need more than 300 lines of code, then someone else can
  probably do it better)
* DOM based - that is to say we process the DOM, not strings. This allows us to
  register event handlers and provide better access to constructed elements.

Creating a Template
-------------------

Create a file called `templates/whatever.htmlt` in your plugin. The
important parts are that the file is in a templates directory at in the root of
you plugin, and called `*.htmlt`.

The file is an HTML fragment. It is not restricted to a single root, however
since the fragment is NOT automatically added to the document, this will be the
common way to do things.

An example template could look like this:

    $ cat bespin/plugins/foo/templates/bar.htmlt
    
    <div save="${parent.element}" id="hello">${contents}</div>

This would then be used as follows:

    var templates = require('foo:templates');
    templates.bar({
        parent: this,
        contents: "world"
    });
    
    console.log(this.element.id);         // hello
    console.log(this.element.innerHTML);  // world

${...} in General Attributes
----------------------------

Any ${} element will be processed as a portion of Javascript, in the context of
the object passed to the templates.name function (i.e. templates.bar in the
example above)

The 'save' attribute is a special attribute to record the current element. See
below for more details.

${...} can show up in elements and in text nodes, and will be processed
accordingly. A ${...} block contains arbitrary Javascript, but should return
something. Generally however it is recommended to stick to a dot path from
an attribute passed to the template.

save="${...}" Attributes
------------------------

The save attribute is special. It takes the current node at sets it into the
pointed to structure. In this case ${} is not arbitrary Javascript but a dot
path to an element to set.

on***="${...}" Attributes
-------------------------

Events are registered using onevent handlers that look similar to the way events
are normally set in HTML, however there are some things to be aware of.

Example:

    <div onclick="${parent.mouse}>Hello</div>

    var templates = require('foo:templates');
    this.name = 'Fred';
    this.mouse = function(ev) {
        console.log(this.name, ev);
    };
    templates.bar({ parent: this });

Here we are registering an onClick handler for the new div, which, when clicked
simply echos `this` and the event object to the console.

This form is particularly handy when the handler to be registered is part of the
`parent` object without needing to be especially created as above, and for this
reason we automatically bind `this` to the object that contains the function
(i.e. what you might like Javascript to do automatically)

For event listener registration there are 2 things to look out for:
* Although it looks like we are using DOM level 0 event registration (i.e.
  element.onfoo = somefunc) we are actually using DOM level 2, by stripping
  off the 'on' prefix and then using addEventListener('foo', ...). Watch out
  for case sensitivity, and if you successfully use an event like DOMFocusIn
  then consider updating these docs or the code.
* Sometimes we might need to use the capture phase of an event (for example
  when processing mouse or focus events). The way to do that is as follows:
  `onfocus="${object.handler [useCapture:true]}"`. Currently the only
  supported option is useCapture, and it must be specified EXACTLY as the
  example. In the future we might add other options, or make the syntax
  simpler.

It is very likely that the useCapture syntax will change in the future, probably
to something that does not invade the ${...} space possibly something more like
`onfocus="${object.handler}" onfocususecapture="true"`

Future
------

2 future directions are being considered for this template:
* if="${some_boolean}" and loopFor="${some_array}" attributes. The former allows
  the template to prune some part of the output unless a condition is met. The
  latter allows a node to be repeated a number of times with different values
  for each member of the array.
* 2-way templating. For form fill applications, it can be useful to allow
  changes to input elements to be automatically reflected in the original
  structure, or even for changes in the original structure to be reflected in
  the HTML. This last example is probably too complex for our purposes however.
