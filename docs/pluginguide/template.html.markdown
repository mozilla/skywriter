---
title: Skywriter Developer's Guide
subtitle: Template Engine
layout: default
---

Using The Skywriter Template Engine
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

    $ cat skywriter/plugins/foo/templates/bar.htmlt
    
    <div save="${parent.element}" id="hello">${contents}</div>

This would then be used as follows:

    var templates = require('foo:templates');
    templates.bar({
        parent: this,
        contents: "world"
    });
    
    console.log(this.element.id);         // hello
    console.log(this.element.innerHTML);  // world

${...} in Attributes and Content
--------------------------------

Any ${} element will be processed as a portion of Javascript, in the context of
the first object passed to the templating function (In the example above the
context would be `{ parent: this, contents: "world" }`)

The `save`/`if`/`foreach` attributes have special meanings. See below for more
details.

`${...}` can show up in elements and in HTML content. A `${...}` block contains
arbitrary Javascript. Generally however it is recommended to stick to a dot path
from an attribute passed to the template.

It expected that `${...}` blocks will return strings when used in an attribute.
When used in HTML content, `${...}` blocks can return either strings (which will
be added to the DOM inside a TextNode (i.e. with HTML escaped) or they can
return DOM elements, in which case the DOM element will be added to the tree.

The following is not recommended (try to keep logic separate from content)
however it should work:
    <div>${document.createTextNode('BANG!')}</div>

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
`onfocus="${object.handler}" captureonfocus="true"`

_***="${...}" Attributes
------------------------

The Skywriter Template engine uses the web browsers parser to interpret .htmlt
file before we process the templates. This has a number of advantages in
simplicity and the ability to work with the resulting DOM, however one drawback
is that the browser may try to process certain elements before they are ready.
For example:

  <img src="${path}/thing.png"/>

This will the processed, and (assuming 'path' is correctly set) the right image
will be displayed, however you may notice your browser giving a 404 message from
${path}/thing.png as it has attempted to retrieve the image before the template
process had a chance to substitute the correct path.

The solution is to prefix the attribute name with an underscore ('_'). The
template engine will remove the underscore automatically. For example:

  <img _src="${path}/thing.png"/>

Should you wish to have an attribute in the resulting document prefixed with an
underscore, simply begin your attribute name with 2 underscores. (Is this a
common scenario? If you know of another scenario where attribute names are
prefixed with _, please inform the Skywriter-Core mailing list using
[skywriter-core at googlegroups dot com].

if="${some_boolean}" Attributes
-------------------------------

If an element contains an 'if' attribute, then its value will be evaluated and
if the result is 'falsey', then the entire element will be removed from the
tree. This allows simple if statements.

Example:

    <div>
    <p if="${name !== null}>Hello, ${name}</p>
    </div>

    templates.example({ name: 'Fred' }); // <div><p>Hello, Fred</p></div>
    templates.example({ });              // <div></div>

In the second example, the entire 'p' element has been removed by processing
the if attribute.

foreach="${some_array} Attributes
---------------------------------

If an element contains a foreach attribute, then that element will be repeated
in the final document once for each member of the array returned by the
attribute value. The 'param' variable will be available, and set to the
corresponding array member during the evaluation.

Example:

    <div foreach="${[ 1, 2, 3 ]}">${param}</div>
    templates.example({ }); // <div>1</div><div>2</div><div>3</div>

A future version of the template engine will likely allow you to alter the
name of the variable to which array members are set, from the default 'param'.
This will allow greater flexibility in processing nested loops.
A natural syntax could be:
    <div foreach="number in ${[ 1, 2, 3 ]}">${number}</div>

Future and Questions
--------------------
* Should we have a way to recognize attributes that are special to the template
  engine? What if a future HTML standard introduces an element with
  if/save/foreach attributes?
* 2-way templating. For form fill applications, it can be useful to allow
  changes to input elements to be automatically reflected in the original
  structure, or even for changes in the original structure to be reflected in
  the HTML. It could be managed using #{} references rather then ${}. The
  difficulty is in recognizing changes to DOM elements on all browsers.
  This last example is probably too complex for our purposes however.
