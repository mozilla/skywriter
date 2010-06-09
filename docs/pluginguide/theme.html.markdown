---
layout: default
title: Bespin Plugin Guide
subtitle: Themes
---

For a long time, Bespin only had its brown theme and no way of changing this to
a different theme. Starting with the Bespin 0.8 release, you can change your
theme and create custom ones as well. The following doc will show you, how you
can white you're own themes and give a basic overview about the theming technic
used in Bespin.

The problem:
------------

A lot of Bespin's UI (login form, command line) is themed using CSS.
Imagine someone wants the command line to be green. If you use CSS,
this means you have to replace the entire CSS file only to change on variable -
in this case the background color to green. If you could use variables in CSS,
you could add a `background` variable and define a color in the theme data.

LESS extends CSS:
-----------------

CSS has no way of dealing with variables, which is why Bespin use [LESS][1] instead:

> LESS extends CSS with: variables, mixins, operations and nested rules.
> (Quoted from the LESS homepage.)

Former CSS files are now LESS files. Also, what are called `themeVariables`
were added at places where it makes sense to customize the CSS. You can't customize the UI
100%, because then every little bit has to be a themeVariable, but you can change
most of the colors and a few more things. If that's not enough for your use case, you
still can override the LESS file provided by a plugin with your own ones.

When you define a new theme, you have to create only a set of colors, fonts etc.
that is then available to each plugin. We call these the `global themeVariables`.
UI plugins use these variables to adjust their design. This makes
sure whatever UI plugin you pick up, it looks right as you apply a theme.

 [1]: http://lesscss.org/ "LESS Homepage"

How this works:
---------------

The entire theming stuff is managed by the `theme_manager` plugin. It loads all
the LESS files defined within the plugins and passes the plugin specific `themeVariables`
as well as the `global themeVariables` to it. The parsed CSS data is then added
to the page.

Writing you're own theme:
------------------------

If you want to create you're own theme, create a new plugin - let's say 'demo_theme'.
Themes have to be defined in the metadata of the plugin. The `package.json` file
inside of the 'demo_theme' folder might look like this:

    :::js
    {
        "description": "Provides a basic demo theme",
        "provides": [
            {
                "ep": "theme",
                "name": "demoTheme",
                "description": "Provides a basic demo theme",
                "pointer": "index#demoTheme"
           }
        ]
    }

Create a new file `index.js` inside of the 'demo_theme' folder. This is
the place where the `themeVariable` definitions will get stored. When the
`theme_manager` plugin loads the _demoTheme_, it calls the function defined
in the _pointer_ property. This function has to return the `themeVariables`:

    :::js
    // This goes in the index.js file.

    /**
     * Exports the demoTheme function that is called by the theme_manager plugin.
     */
    exports.demoTheme = function() {
        return {
            // Theme variables that are available to every plugin.
            global: {
                // Defines the color for links.
                link_color: 'blue',

                [...]
            },

            // Theme variables for the editor.
            text_editor: {
                // Theme of the gutter:
                gutter: {
                    [...]
                },

                editor: {
                    [...]
                },

                highlighter: {
                    [...]
                },

                scroller: {
                    [...]
                }
            },

            // Defines themeVariables for the command_line plugin.
            command_line: {
                // Defines the color for links.
                link_text: 'red';
            }
        };
    };

This is the basic structure of a theme definition. For a complete overview of all
the adjustable `themeVariables` in the _global_ and _text_editor_ section, take a
look at the [whiteTheme][2].

 [2]: http://hg.mozilla.org/labs/bespinclient/file/tip/plugins/supported/whitetheme/index.js#l38 "Bespin whiteTheme definition"

In the example, we define the themeVariables for the `global themeVariables`
(stored in `global`), the  `text_editor` plugin and the `command_line` plugin.
Within the `command_line`'s metadata the `link_text` is defined as:

    :::js
        {
            "ep": "themevariable",
            "name": "link_text",
            "defaultValue": "@global_link_color"
        }

Every defined `themeVariable` has a `defaultValue`. This value is used
if no other value is specified. In the case of the _demoTheme_, the value for
the comamnd_line's  `link_text` will be _red_. If we hadn't declared this, the
defaultValue will be used. As this value is equal to the global `link_color`, the
value is then _blue_.

Custom CSS:
-----------

If adjusting the `themeVariables` is not enough for you, you can provide your own
LESS file. The CSS rules from the LESS file will then override the CSS rules that
are included inside of the plugins. The `theme_manager` has to know which LESS file
you want to load with the theme, so you have to declare it inside of the themes
metadata:

    :::js
    {
        "description": "Provides a basic demo theme",
        "provides": [
            {
                "ep": "theme",
                "name": "demoTheme",
                "description": "Provides a basic demo theme",
                "url": [
                    "theme.less"
                ],
                "pointer": "index#demoTheme"
           }
        ]
    }

As the `demoTheme` gets activated, the `theme_manager` will handle the defined
`themeVariables` and load up the files defined in the `url` property - in this
case the _theme.less_ file. This file has to be located in the _resources_ folder
which has to be inside of the plugin folder. You can use the [whiteTheme][3] as an
example.

 [3]: http://hg.mozilla.org/labs/bespinclient/file/tip/plugins/supported/whitetheme/ "Bespin whiteTheme plugin"