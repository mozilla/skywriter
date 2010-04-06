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
                "key": "ctrl_a",
                "pointer": "#showMessage"
            }
        ]
    });
    "end";

    exports.showMessage = function() {
        alert("Greetings from the cloud!");
    };

When this plugin is loaded and the user presses *Ctrl+A* on the keyboard, then
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

## Further reading ##

To get more familiar with keymappings in Bespin, take a look at the files
`plugins/samples/vim.js` and `plugins/samples/emacs.js` for starter
implementations of the vim and Emacs keybindings, respectively.

