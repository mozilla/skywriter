---
layout: default
title: Bespin Plugin Guide
subtitle: Keymapping
---

## Introduction ##

The keyboard mapping mechanism built into Bespin is designed to be extensible
in a declarative way. This design allows a wide variety of keyboard mappings to
be implemented without writing any code.

## Quick Start ##

Whenever a key combination like Cmd+C or a new character like `c` is detected
in the editor, Bespin's keyboard manager component searches through the
keybinding rules, selects the first binding that matches, and executes the
associated command. Keystrokes not handled in this way are inserted as ordinary
text.

In the simplest case, a keymapping plugin looks something like this:

    :::js
    "define metadata";
    ({
        "provides": [
            {
                "ep": "command",
                "name": "alert",
                "key": "ctrl_i",
                "pointer": "#showMessage"
            }
        ]
    });
    "end";

    exports.showMessage = function() {
        alert("Greetings from the cloud!");
    };

When this plugin is loaded and the user presses *Ctrl+I* on the keyboard, then
the command `showMessage` is executed.

For most use cases, this is all that is needed. For those interested in adding
more advanced keybindings such as those used in the vi and Emacs plugins, read
on.

## How Key Detection Works ##

Before diving into more complex use cases, an understanding of the way key
commands work in Bespin is needed.

Whenever a key is pressed while a modifier key (*Meta*, *Cmd*, *Ctrl*, or
*Alt*) is held down, the Bespin framework handles the browser's key event,
performs translation, which most notably involves the creation of a *symbolic
name*, and forwards the event to the Bespin keyboard manager. Some examples of
symbolic names are:

    Ctrl+A       -> ctrl_a
    Alt+C        -> alt_c
    Meta+Shift+Z -> meta_shift_z or ctrl_shift_z

The symbolic names are used to match against the "key" property above or the
"regex" property (demonstrated later).

Keys pressed without a modifier key (as well as input events from other
sources, such as IMEs) are also forwarded to the keyboard manager. The symbolic
name for such events are simply equal to the text that would be inserted for
each event.

*NB:* To aid the creation of cross-platform keybindings, by default the *Meta*
key is treated as though it were the *Ctrl* key. To avoid this and match the
*Meta* key explicitly, set the property `handleMetaKey` on the keybinding to
true.

## A simple vim-style keymapping ##

A simple vim-style modal keymapping looks like this:

    :::js
    "define metadata";
    ({
        "dependencies": {
            "canon": "0.0"
        },
        "provides": [
            {
                "ep": "keymapping",
                "handleMetaKey": false,
                "states": {
                    "start": [
                        {
                            "key":      "i",
                            "then":     "insertMode"
                        }
                    ],
                    "insertMode": [
                        {
                            "key":      "escape",
                            "then":     "start"
                        }
                    ]
                }
            }
        ]
    });
    "end";

Keymappings support multiple *states*, which correspond to the *modes* of modal
keymappings such as vi. The start state is always called `start`. Mode
transitions occur via the `then`, property. In the example, pressing *I*
triggers a switch to the state `insertMode`, which corresponds to vi's
insert mode. Pressing *Esc* in insert mode triggers a switch back to the start
state, corresponding to vi's normal mode.

The value of the `key` property is treated as a regex. So, for example, you
could match either the *K* key or the up arrow key with one binding:

    :::js
    {
        "key":      "(k|up)",
        "exec":     "move up",
    },

Remember that the text which this regex is matched against is the symbolic name
of the key. So this binding will not match *Ctrl+Up*, *Meta+Up*, etc.

## Buffering ##

More complex keymappings such as vi and Emacs typically feature commands that
consist of multiple keystrokes. To support these, the keyboard manager stores
all key events that have not yet mapped to a key binding in a *keyboard
buffer*. After a binding matches, the buffer is cleared.

The buffer is simply a string of symbolic names, so for example the sequence of
keys *d, 2, d* maps to the string `"d2d"`, and the sequence *Ctrl+A* maps to
the string `"ctrl_a"`.

*NB:* On some international keyboards, the Alt key is used to insert special
characters. For instance, on a German keyboard, Alt+8 inserts the `{`
character. The keyboard manager is designed to detect this situation and, in
this case, will report the symbolic name `"{"`, not `"alt_8"`.

To access the characters stored in the buffer, the `regex` property rather than
the `key` property must be used:

    :::js
    {
        "regex":    "dd",
        "exec":     "deleteLines",
    },

The supplied regex is anchored to the end of the buffer; for example, the value
of the `regex` property in this example corresponds to the regex `/dd$/`
(matched against the contents of the buffer).

## Command arguments ##

It's possible to use the `regex` property to extract arguments that are passed
to commands:

    :::js
    {
        "regex":    "([0-9]*)j",
        "exec":     "vim moveDown",
        "params": [
            {
                "name":     "n",
                "match":    1,
                "type":     "number",
                "defaultValue":     1
            }
        ]
    },

Let the *keyboard buffer* be "10j", then the `regex` will match. The part of
the RegExp to match the number - ([0-9]\*) - is grouped. Grouped parts of a RegExp
can be used as arguments. The arguments/params to pass to the command are defined
within the `params` section. `name` specifies the name of the argument. `type`
can be "*number*" or "*text*". `match` means the match/group of the RegExp to use
for this argument. In this example the matched numbers are used as
argument for "n", where "n" means how many lines to move down. To access the
match of the first group, `match` has to be *1*. Counting starts at 1 and not 0
as this is parallel to how you access the groups in normal JS-RegExp-Exec-Results
where 0 represents the entire part of the matched text.
If there is no match, then the `defaultValue` will be used.

## Using predicates ##

In the same way you use predicates for commands you can use them for bindings:

    :::js
    {
        "regex":    "([0-9]*)j",
        "exec":     "vim moveDown",
        "params": [
            {
                "name":     "n",
                "match":    1,
                "type":     "number",
                "defaultValue":     1
            }
        ],
        "predicates": {
            "isCommandKey": false
        }
    },

The predicate *isCommandKey* is set by the KeyboardManager. If the *symbolic name*
is a combination of a command key (CTRL/ALT/META) + a key, then `isCommandKey`
will be true, otherwise it's false.

## Match the symbolic name and the buffer ##

So far, we can match either the *keyboard buffer* or the *symbolic name*, but
not both. If you want to detect the "return" key and use former typed numbers as
argument, you can write:

    :::js
    {
        "regex":    [ "([0-9]*)", "(j|down|return)" ],
        "exec":     "vim moveDown",
        "params": [
            {
                "name":     "n",
                "match":    1,
                "type":     "number",
                "defaultValue":     1
            }
        ]
    },

The `regex` property is an array now. Internal, this is converted to

    :::js
    regex = [ "([0-9]*)", "(j|down|return)" ];

    key = new RegExp("^" + regex[1] + "$");
    regex = new RegExp(regex.join('') + "$");

which means that the second element of the `regex` array has to match the *symbolic
name* and the items in the array combined have to match the *keyboard buffer*.
This way, you can make sure that the user has not typed "1", "r", "e", "t", "u", "r", "n"
as individual characters which then matches the binding. The combination
of of a `key` and `regex` property is not allowed.

## Disallow matches ##

Disallow matches is a way to tell the KeyboardManager to not use a binding if the
`regex` property matches certain groups.

    :::js
    {
        "regex":  [ "(meta_[0-9]*)*", "([0-9]+)" ],
        "disallowMatches":  [ 1 ],
        "exec": "insertText",
        "params": [
            {
                "name": "text",
                "match": 2,
                "type": "text"
            }
        ],
        "predicates": {
            "isCommandKey": false
        }
    },

Let's say the *keyboard buffer* looks like "meta_12". In this case, the RegExp
will match the *buffer* and the first matched group will be "meta_1". But as we
specified in the `disallowMatches` property that the first group is not allowed
to match, this binding doesn't fit.

## Further reading ##

To get more familiar with keymappings in Bespin, take a look at the files
`plugins/samples/vim.js` and `plugins/samples/emacs.js` for starter
implementations of the vim and Emacs keybindings, respectively.

