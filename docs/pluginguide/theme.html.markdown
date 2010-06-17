---
layout: default
title: Bespin Plugin Guide
subtitle: Themes
---

Bespin allows users to change themes (color schemes) and to create new theme plugins
as well. This document describes how you can create your own themes and gives a 
basic overview about the theming techniques used in Bespin.

The problem
-----------

Much of Bespin's UI (login form, command line) is themed using CSS.
Imagine someone wants the whole UI background, including that of the command 
line, to be green. If you use CSS, this means you have to replace the entire 
CSS file only to change one variable - in this case the background color 
to green. If you could use variables in CSS, you could add a `background` 
variable and define a color in the theme data.

LESS extends CSS
----------------

CSS has no way of dealing with variables, which is why Bespin uses [LESS][1] instead:

> LESS extends CSS with: variables, mixins, operations and nested rules.
> (Quoted from the LESS homepage.)

We use `themeVariables` to customize the CSS that LESS ultimately generates. 
You can't customize the UI 100%, because then every little bit has to 
be a themeVariable, but you can change most of the colors and a few more 
things. If that's not enough for your use case, you still can override the 
LESS file provided by a plugin with your own styles.

When you define a new theme, you have to create only a set of colors, fonts etc.
that is then available to each plugin. We call these the `global themeVariables`.
Plugins that provide user interface elements should use these variables to 
adjust their design. This ensures that whichever plugin a user installs looks 
right as they apply a theme.

[1]: http://lesscss.org/ "LESS Homepage"

How this works
--------------

The `theme_manager` plugin is responsible to, surprise!, managing the themes. 
It loads all of the LESS files defined within the plugins and passes the 
plugin-specific `themeVariables` as well as the `global themeVariables` to it. 
The generated CSS code is then added to the page.

Writing your own theme
------------------------

If you want to create your own theme, create a new plugin - let's say 'demo_theme'.
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

The `name` provided in the metadata is what the user will type in when they're
changing the theme. In this case, the user will type `set theme demoTheme`.

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
the adjustable `themeVariables` in the _global_ and _text\_editor_ section, take a
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
the comamnd\_line's  `link_text` will be _red_. If we hadn't declared this, the
defaultValue will be used. As this value is equal to the global `link_color`, the
value is then _blue_.

Note that it's generally a good idea to focus on the global variables as much
as possible. There's no predicting which plugins a user is likely to have
installed!

Custom CSS
----------

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
