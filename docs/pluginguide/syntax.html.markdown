---
layout: default
title: Bespin Plugin Guide
subtitle: Syntax highlighting
---

## Introduction ##

Syntax highlighting in Bespin is designed from the ground up for flexibility
and extensibility. It's easy to design syntax highlighting engines
for your favorite programming languages and share them with others.

At its core, a syntax highlighter is simply a routine that annotates lines of
text handed to it with *tags*. Tags are short keywords that describe what a
line fragment is; for example, `keyword`, `identifier`, and `number` are all
common tags. Syntax engines don't directly provide the colors that you see on
the screen; the mapping from tags to colors is the responsibility of the theme.
But the syntax engine provides the programming language-specific markup that
the theme needs to do its work.

There are two APIs for syntax developers: the simple declarative *standard
syntax API*, which derives from `StandardSyntax`, and the low-level
*programmatic syntax API* (which is really an informal interface) providing the
most flexibility. The built-in Bespin highlighters use the standard syntax API,
but advanced developers may prefer the programmatic API for more fine-grained
control over the highlighting. The standard syntax engine is built on top of
the programmatic API.

## Metadata ##

Like all Bespin plugins, syntax engines are JavaScript files (or, less
commonly, collections of JavaScript files). The syntax manager looks for
plugins at the `syntax` extension point like so:

    :::js
    {
        "description": "HTML syntax highlighter",
        "dependencies": { "standard_syntax": "0.0.0" },
        "environments": { "worker": true },
        "provides": [
            {
                "ep": "syntax",
                "name": "html",
                "pointer": "#HTMLSyntax"
            }
        ]
    }

The syntax object that you provide as the target of the pointer is either an
instance of `StandardSyntax`, for the standard API, or a JS Object, for the
programmatic API.

## The Standard API ##

The standard syntax API is based on
[*regular expressions*](http://en.wikipedia.org/wiki/Regular_expression). For
a tutorial on JavaScript regular expressions, see
[regular-expressions.info's JavaScript regex
tutorial](http://www.regular-expressions.info/javascript.html). On the same
site is [a handy online tool to test your
regexes](http://www.regular-expressions.info/javascriptexample.html).

Standard syntax plugins in Bespin are plugins like any other, but most of the
code is written for you. All you need to do is to provide a list of *regexes*,
*tags*, and *actions*, grouped into *states*. Let's look at an excerpt from the
JavaScript syntax highlighter for an example:

    :::js
    exports.JSSyntax = StandardSyntax.create({
        states: {
            start: [
                {
                    regex:  /^[A-Za-z_][A-Za-z0-9_]*/,
                    tag:    'identifier'
                },
                {
                    regex:  /^"/,
                    tag:    'string',
                    then:   'qqstring'
                }
            ]
            ...

To begin with, the JavaScript syntax highlighter derives from the
`StandardSyntax` class using the standard SproutCore `create` method. The
standard syntax engine is passed a list of states, the first of which is always
named `start`. Within each state is a list of regular expressions. The first
regex in this example, `/^[A-Za-z_][A-Za-z0-9_]*/`, matches a word consisting
of letters, numbers, and underscores, starting with a letter or underscore,
which happens to match most JavaScript identifiers. You can see that, in fact,
this regex is tagged with `identifier`, and when this regular expression
matches some text, the `identifier` tag will be applied to the text that it
matched and passed on to the theme engine.

The second regex, `/^"/`, matches the quote character `"`. This character
starts a string in JavaScript, and sure enough, the associated tag is `string`.
In this case, in order to highlight the text correctly, all characters
after the `"` (up to the next `"`) need to be considered part of the same
string. So the JavaScript syntax engine specifies an action to perform via the
`then` property. Here, the action is a transition to the `qqstring` (double
quoted string) state.

Note that all regexes are *anchored* at the beginning of the string with the
`^` character. As you write a syntax highlighter, it's crucial to anchor all
regexes in this way. If you don't, then your regex will match if the pattern
appears anywhere in the line, and the syntax highlighting engine will become
confused.

Now let's look at a more advanced case: a simple HTML highlighter. (The actual
HTML highlighter is more complex than this, because it allows for attributes in
tags and detects malformed syntax.)

    :::js
    exports.HTMLSyntax = StandardSyntax.create({
        states: {
            start: [
                {
                    regex:  /^<script>/i,
                    tag:    'tag',
                    then:   'script start:js'
                },
                {
                    regex:  /^[^<]+/,
                    tag:    'plain'
                }
            ],
            script: [
                {
                    regex:  /^[^<]+/,
                    tag:    'plain'
                },
                {
                    regex:  /^<\/script>/i,
                    tag:    'tag',
                    then:   'start stop:js'
                },
                {
                    regex:  /^./,
                    tag:    'plain'
                    then:   'start'
                }
            ]
        }
    });

This highlighter allows the user to embed JavaScript inside `<script>` tags.
When the `/^<script>/i` regex matches, the syntax engine switches to the
`script` state and starts the `js` context, as specified by the value of the
`then` property. Once in the `script` state, the regex `/^<\/script>/i`
likewise triggers a switch to the `start` state and ends the `js` context.
Under the hood, once the standard syntax engine sees the `start:` or `stop:`
tag in the list of actions, it begins to load the appropriate highlighter in
the background. As soon as the highlighter is loaded, it is run, and the colors
in the region delimited by the `start:` and `stop:` actions change to those
specified by the new highlighter (overriding, in this case, the `plain` tag).

That's all there is to the standard syntax API. It's powerful enough to handle
most cases&mdash;in fact, all of Bespin's syntax highlighters are written using
this API&mdash;but if you want more flexibility or need to run your own custom
parsing code, read on.

## The Programmatic API ##

*Note: This section is incomplete.*

As far as Bespin is concerned, a syntax engine is just a SproutCore object
that implements the method `syntaxInfoForLineFragment`. In JavaScript
pseudocode, this method has the following signature:

    :::js
    syntaxInfoForLineFragment(context : string, state : string, line : string,
        start : number, end : number) : Promise<Result>

The `context` is a string describing the current context: this will be equal
to the name of the context that your plugin exports. The `state` is initially
`start` and is afterward equal to whatever your plugin returned for the
previous line; for efficiency, your plugin should store all of its state in
this string. `line` is the text of the current line, while `start` and `end`
are the boundaries of the region to be styled. (`start` is inclusive, while
`end` is exclusive. So the text to be highlighted can be retrieved with
`line.substring(start, end)`.)

The `Result` object is defined as an object with these properties:

    :::js
    Result = { attrs : Array<Attr>, next : Next }

`attrs` is an array of *attribute ranges*, which specify the boundaries of each
range. The `next` property specifies the context and state for the end of the
line.

The `Attr` object is an object with these properties:

    :::js
    Attr = { start : number, end : number, state : string, tag : string,
        actions : Array<string> }

And the `Next` object is an object that looks like this:

    :::js
    Next = { context : string, state : string }

Note that this function returns a *promise* to return a `Result` object, not a
`Result` object itself. This means that your syntax highlighting engine can do
work asynchronously; e.g. in a Web Worker. For more information on promises,
see the [relevant CommonJS
specification](http://wiki.commonjs.org/wiki/Promises).

To see an example of a syntax engine based on the programmatic API in action,
check out the `StandardSyntax` plugin in
`plugins/supported/SyntaxManager/controllers/standardsyntax.js`.

