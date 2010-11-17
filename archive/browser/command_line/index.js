require.def(['require', 'exports', 'module',
    'skywriter/plugins'
], function(require, exports, module,
    plugins
) {

/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is
 * Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

exports.startup = function(data, reason) {
    var catalog = plugins.catalog;
    catalog.connect("themestyles", module.id, {
        "url": [
            "article.less",
            "cli.less",
            "menu.less",
            "requestOutput.less",
            "global.less"
        ]
    });
    catalog.connect("themevariable", module.id, { "name": "bg", "defaultValue": "@global_container_background" });
    catalog.connect("themevariable", module.id, {
        "name": "input_bg_light",
        "defaultValue": "@global_container_background + #090807"
    });
    catalog.connect("themevariable", module.id, {
        "name": "input_bg",
        "defaultValue": "@global_container_background - #030303"
    });
    catalog.connect("themevariable", module.id, {
        "name": "input_bg2",
        "defaultValue": "@global_container_background - #050506"
    });
    catalog.connect("themevariable", module.id, { "name": "border_fg", "defaultValue": "@global_menu_inset_color_top_left" });
    catalog.connect("themevariable", module.id, { "name": "border_fg2", "defaultValue": "@global_menu_inset_color_right" });
    catalog.connect("themevariable", module.id, { "name": "menu_bg", "defaultValue": "@global_menu_background" });
    catalog.connect("themevariable", module.id, { "name": "border_bg", "defaultValue": "@global_menu_border_color" });
    catalog.connect("themevariable", module.id, { "name": "text", "defaultValue": "@global_color" });
    catalog.connect("themevariable", module.id, { "name": "hi_text", "defaultValue": "@global_header_color" });
    catalog.connect("themevariable", module.id, { "name": "lo_text", "defaultValue": "@global_hint_color" });
    catalog.connect("themevariable", module.id, { "name": "lo_text2", "defaultValue": "@global_hint_color" });
    catalog.connect("themevariable", module.id, { "name": "link_text", "defaultValue": "@global_link_color" });
    catalog.connect("themevariable", module.id, { "name": "error_text", "defaultValue": "@global_error_color" });
    catalog.connect("themevariable", module.id, {
        "name": "theme_text",
        "defaultValue": "@global_selectable_hover_background"
    });
    catalog.connect("themevariable", module.id, {
        "name": "theme_text_light",
        "defaultValue": "rgb(255,206,0)",
        "comment": "#FFCE00"
    });
    catalog.connect("themevariable", module.id, {
        "name": "theme_text_dark",
        "defaultValue": "@global_selectable_hover_background - #222000"
    });
    catalog.connect("themevariable", module.id, { "name": "theme_text_dark2", "defaultValue": "@global_accelerator_color" });
    catalog.connect("themevariable", module.id, {
        "name": "input_submenu",
        "defaultValue": "rgb(14,9,6)",
        "comment": "#0E0906"
    });
    catalog.connect("themevariable", module.id, { "name": "fonts", "defaultValue": "@global_font" });
    catalog.connect("themevariable", module.id, {
        "name": "li_hover_color",
        "defaultValue": "@global_selectable_hover_color"
    });
    catalog.connect("themevariable", module.id, { "name": "li_hint_hover_color", "defaultValue": "@global_hint_hover_color" });
    catalog.connect("themevariable", module.id, {
        "name": "li_accelerator_hover_color",
        "defaultValue": "@global_accelerator_hover_color"
    });
    catalog.connect("factory", module.id, {
        "name": "commandLine",
        "action": "new",
        "pointer": "views/cli#CliInputView"
    });
    catalog.connect("setting", module.id, {
        "name": "historyTimeMode",
        "description":
            "Display number|date|none next to each historical instruction",
        "type": { "name": "selection", "data": [ "number", "date", "none" ] },
        "defaultValue": "none"
    });
    catalog.connect("setting", module.id, {
        "name": "minConsoleHeight",
        "description":
            "The maximum size (in pixels) for the command line output area",
        "type": "number",
        "defaultValue": 0
    });
    catalog.connect("setting", module.id, {
        "name": "maxConsoleHeight",
        "description":
            "The minimum size (in pixels) for the command line output area",
        "type": "number",
        "defaultValue": 300
    });
    catalog.connect("command", module.id, {
        "name": "complete",
        "predicates": { "isCommandLine": true, "isKeyUp": false },
        "key": "tab",
        "pointer": "commands/simple#completeCommand"
    });
    catalog.connect("command", module.id, {
        "name": "menu1",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_1",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu2",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_2",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu1",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_1",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu3",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_3",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu4",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_4",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu5",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_5",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu6",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_6",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu7",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_7",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu8",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_8",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu9",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_9",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu0",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_0",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "help",
        "params": [
            {
                "name": "search",
                "type": "text",
                "description": "Search string to narrow the output.",
                "defaultValue": null
            }
        ],
        "description": "Get help on the available commands.",
        "pointer": "commands/simple#helpCommand"
    });
    catalog.connect("command", module.id, {
        "name": "alias",
        "params": [
            {
                "name": "alias",
                "type": "text",
                "description": "optionally, your alias name",
                "defaultValue": null
            },
            {
                "name": "command",
                "type": "text",
                "description": "optionally, the command name",
                "defaultValue": null
            }
        ],
        "description": "define and show aliases for commands",
        "pointer": "commands/simple#aliasCommand"
    });
    catalog.connect("command", module.id, {
        "name": "eval",
        "params": [
            {
                "name": "javascript",
                "type": "text",
                "description": "The JavaScript to evaluate"
            }
        ],
        "description": "evals given js code and show the result",
        "hidden": true,
        "pointer": "commands/basic#evalCommand"
    });
    catalog.connect("command", module.id, {
        "name": "version",
        "description": "show the Skywriter version",
        "hidden": true,
        "pointer": "commands/basic#versionCommand"
    });
    catalog.connect("command", module.id, {
        "name": "skywriter",
        "description": "has",
        "hidden": true,
        "pointer": "commands/basic#skywriterCommand"
    });
    catalog.connect("command", module.id, {
        "name": "historyPrevious",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "up",
        "pointer": "commands/history#historyPreviousCommand"
    });
    catalog.connect("command", module.id, {
        "name": "historyNext",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "down",
        "pointer": "commands/history#historyNextCommand"
    });
    catalog.connect("command", module.id, {
        "name": "history",
        "description": "Show history of the commands",
        "pointer": "commands/history#historyCommand",
        "params": []
    });
    catalog.connect("addedRequestOutput", module.id, { "pointer": "commands/history#addedRequestOutput" });
    catalog.addExtensionPoint("typehint", {
        "description":
            "A function to allow the command line to show a hint to the user on how they should finish what they're typing",
        "indexOn": "name"
    });
    catalog.connect("typehint", module.id, {
        "name": "selection",
        "description":
            "A UI for string that is constrained to be one of a number of pre-defined values",
        "pointer": "views/basic#selection"
    });
    catalog.connect("typehint", module.id, {
        "name": "boolean",
        "description": "A UI for a boolean",
        "pointer": "views/basic#bool"
    });
};

exports.shutdown = function(data, reason) {
    catalog.disconnectAll(module.id);
    catalog.removeExtensionPoint("typehint");
};

exports.startup = function(data, reason) {
    var catalog = plugins.catalog;
    catalog.connect("themestyles", module.id, {
        "url": [
            "article.less",
            "cli.less",
            "menu.less",
            "requestOutput.less",
            "global.less"
        ]
    });
    catalog.connect("themevariable", module.id, { "name": "bg", "defaultValue": "@global_container_background" });
    catalog.connect("themevariable", module.id, {
        "name": "input_bg_light",
        "defaultValue": "@global_container_background + #090807"
    });
    catalog.connect("themevariable", module.id, {
        "name": "input_bg",
        "defaultValue": "@global_container_background - #030303"
    });
    catalog.connect("themevariable", module.id, {
        "name": "input_bg2",
        "defaultValue": "@global_container_background - #050506"
    });
    catalog.connect("themevariable", module.id, { "name": "border_fg", "defaultValue": "@global_menu_inset_color_top_left" });
    catalog.connect("themevariable", module.id, { "name": "border_fg2", "defaultValue": "@global_menu_inset_color_right" });
    catalog.connect("themevariable", module.id, { "name": "menu_bg", "defaultValue": "@global_menu_background" });
    catalog.connect("themevariable", module.id, { "name": "border_bg", "defaultValue": "@global_menu_border_color" });
    catalog.connect("themevariable", module.id, { "name": "text", "defaultValue": "@global_color" });
    catalog.connect("themevariable", module.id, { "name": "hi_text", "defaultValue": "@global_header_color" });
    catalog.connect("themevariable", module.id, { "name": "lo_text", "defaultValue": "@global_hint_color" });
    catalog.connect("themevariable", module.id, { "name": "lo_text2", "defaultValue": "@global_hint_color" });
    catalog.connect("themevariable", module.id, { "name": "link_text", "defaultValue": "@global_link_color" });
    catalog.connect("themevariable", module.id, { "name": "error_text", "defaultValue": "@global_error_color" });
    catalog.connect("themevariable", module.id, {
        "name": "theme_text",
        "defaultValue": "@global_selectable_hover_background"
    });
    catalog.connect("themevariable", module.id, {
        "name": "theme_text_light",
        "defaultValue": "rgb(255,206,0)",
        "comment": "#FFCE00"
    });
    catalog.connect("themevariable", module.id, {
        "name": "theme_text_dark",
        "defaultValue": "@global_selectable_hover_background - #222000"
    });
    catalog.connect("themevariable", module.id, { "name": "theme_text_dark2", "defaultValue": "@global_accelerator_color" });
    catalog.connect("themevariable", module.id, {
        "name": "input_submenu",
        "defaultValue": "rgb(14,9,6)",
        "comment": "#0E0906"
    });
    catalog.connect("themevariable", module.id, { "name": "fonts", "defaultValue": "@global_font" });
    catalog.connect("themevariable", module.id, {
        "name": "li_hover_color",
        "defaultValue": "@global_selectable_hover_color"
    });
    catalog.connect("themevariable", module.id, { "name": "li_hint_hover_color", "defaultValue": "@global_hint_hover_color" });
    catalog.connect("themevariable", module.id, {
        "name": "li_accelerator_hover_color",
        "defaultValue": "@global_accelerator_hover_color"
    });
    catalog.connect("factory", module.id, {
        "name": "commandLine",
        "action": "new",
        "pointer": "views/cli#CliInputView"
    });
    catalog.connect("setting", module.id, {
        "name": "historyTimeMode",
        "description":
            "Display number|date|none next to each historical instruction",
        "type": { "name": "selection", "data": [ "number", "date", "none" ] },
        "defaultValue": "none"
    });
    catalog.connect("setting", module.id, {
        "name": "minConsoleHeight",
        "description":
            "The maximum size (in pixels) for the command line output area",
        "type": "number",
        "defaultValue": 0
    });
    catalog.connect("setting", module.id, {
        "name": "maxConsoleHeight",
        "description":
            "The minimum size (in pixels) for the command line output area",
        "type": "number",
        "defaultValue": 300
    });
    catalog.connect("command", module.id, {
        "name": "complete",
        "predicates": { "isCommandLine": true, "isKeyUp": false },
        "key": "tab",
        "pointer": "commands/simple#completeCommand"
    });
    catalog.connect("command", module.id, {
        "name": "menu1",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_1",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu2",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_2",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu1",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_1",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu3",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_3",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu4",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_4",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu5",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_5",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu6",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_6",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu7",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_7",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu8",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_8",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu9",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_9",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu0",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_0",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "help",
        "params": [
            {
                "name": "search",
                "type": "text",
                "description": "Search string to narrow the output.",
                "defaultValue": null
            }
        ],
        "description": "Get help on the available commands.",
        "pointer": "commands/simple#helpCommand"
    });
    catalog.connect("command", module.id, {
        "name": "alias",
        "params": [
            {
                "name": "alias",
                "type": "text",
                "description": "optionally, your alias name",
                "defaultValue": null
            },
            {
                "name": "command",
                "type": "text",
                "description": "optionally, the command name",
                "defaultValue": null
            }
        ],
        "description": "define and show aliases for commands",
        "pointer": "commands/simple#aliasCommand"
    });
    catalog.connect("command", module.id, {
        "name": "eval",
        "params": [
            {
                "name": "javascript",
                "type": "text",
                "description": "The JavaScript to evaluate"
            }
        ],
        "description": "evals given js code and show the result",
        "hidden": true,
        "pointer": "commands/basic#evalCommand"
    });
    catalog.connect("command", module.id, {
        "name": "version",
        "description": "show the Skywriter version",
        "hidden": true,
        "pointer": "commands/basic#versionCommand"
    });
    catalog.connect("command", module.id, {
        "name": "skywriter",
        "description": "has",
        "hidden": true,
        "pointer": "commands/basic#skywriterCommand"
    });
    catalog.connect("command", module.id, {
        "name": "historyPrevious",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "up",
        "pointer": "commands/history#historyPreviousCommand"
    });
    catalog.connect("command", module.id, {
        "name": "historyNext",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "down",
        "pointer": "commands/history#historyNextCommand"
    });
    catalog.connect("command", module.id, {
        "name": "history",
        "description": "Show history of the commands",
        "pointer": "commands/history#historyCommand",
        "params": []
    });
    catalog.connect("addedRequestOutput", module.id, { "pointer": "commands/history#addedRequestOutput" });
    catalog.addExtensionPoint("typehint", {
        "description":
            "A function to allow the command line to show a hint to the user on how they should finish what they're typing",
        "indexOn": "name"
    });
    catalog.connect("typehint", module.id, {
        "name": "selection",
        "description":
            "A UI for string that is constrained to be one of a number of pre-defined values",
        "pointer": "views/basic#selection"
    });
    catalog.connect("typehint", module.id, {
        "name": "boolean",
        "description": "A UI for a boolean",
        "pointer": "views/basic#bool"
    });
};

exports.shutdown = function(data, reason) {
    catalog.disconnectAll(module.id);
    catalog.removeExtensionPoint("typehint");
};

exports.startup = function(data, reason) {
    var catalog = plugins.catalog;
    catalog.connect("themestyles", module.id, {
        "url": [
            "article.less",
            "cli.less",
            "menu.less",
            "requestOutput.less",
            "global.less"
        ]
    });
    catalog.connect("themevariable", module.id, { "name": "bg", "defaultValue": "@global_container_background" });
    catalog.connect("themevariable", module.id, {
        "name": "input_bg_light",
        "defaultValue": "@global_container_background + #090807"
    });
    catalog.connect("themevariable", module.id, {
        "name": "input_bg",
        "defaultValue": "@global_container_background - #030303"
    });
    catalog.connect("themevariable", module.id, {
        "name": "input_bg2",
        "defaultValue": "@global_container_background - #050506"
    });
    catalog.connect("themevariable", module.id, { "name": "border_fg", "defaultValue": "@global_menu_inset_color_top_left" });
    catalog.connect("themevariable", module.id, { "name": "border_fg2", "defaultValue": "@global_menu_inset_color_right" });
    catalog.connect("themevariable", module.id, { "name": "menu_bg", "defaultValue": "@global_menu_background" });
    catalog.connect("themevariable", module.id, { "name": "border_bg", "defaultValue": "@global_menu_border_color" });
    catalog.connect("themevariable", module.id, { "name": "text", "defaultValue": "@global_color" });
    catalog.connect("themevariable", module.id, { "name": "hi_text", "defaultValue": "@global_header_color" });
    catalog.connect("themevariable", module.id, { "name": "lo_text", "defaultValue": "@global_hint_color" });
    catalog.connect("themevariable", module.id, { "name": "lo_text2", "defaultValue": "@global_hint_color" });
    catalog.connect("themevariable", module.id, { "name": "link_text", "defaultValue": "@global_link_color" });
    catalog.connect("themevariable", module.id, { "name": "error_text", "defaultValue": "@global_error_color" });
    catalog.connect("themevariable", module.id, {
        "name": "theme_text",
        "defaultValue": "@global_selectable_hover_background"
    });
    catalog.connect("themevariable", module.id, {
        "name": "theme_text_light",
        "defaultValue": "rgb(255,206,0)",
        "comment": "#FFCE00"
    });
    catalog.connect("themevariable", module.id, {
        "name": "theme_text_dark",
        "defaultValue": "@global_selectable_hover_background - #222000"
    });
    catalog.connect("themevariable", module.id, { "name": "theme_text_dark2", "defaultValue": "@global_accelerator_color" });
    catalog.connect("themevariable", module.id, {
        "name": "input_submenu",
        "defaultValue": "rgb(14,9,6)",
        "comment": "#0E0906"
    });
    catalog.connect("themevariable", module.id, { "name": "fonts", "defaultValue": "@global_font" });
    catalog.connect("themevariable", module.id, {
        "name": "li_hover_color",
        "defaultValue": "@global_selectable_hover_color"
    });
    catalog.connect("themevariable", module.id, { "name": "li_hint_hover_color", "defaultValue": "@global_hint_hover_color" });
    catalog.connect("themevariable", module.id, {
        "name": "li_accelerator_hover_color",
        "defaultValue": "@global_accelerator_hover_color"
    });
    catalog.connect("factory", module.id, {
        "name": "commandLine",
        "action": "new",
        "pointer": "views/cli#CliInputView"
    });
    catalog.connect("setting", module.id, {
        "name": "historyTimeMode",
        "description":
            "Display number|date|none next to each historical instruction",
        "type": { "name": "selection", "data": [ "number", "date", "none" ] },
        "defaultValue": "none"
    });
    catalog.connect("setting", module.id, {
        "name": "minConsoleHeight",
        "description":
            "The maximum size (in pixels) for the command line output area",
        "type": "number",
        "defaultValue": 0
    });
    catalog.connect("setting", module.id, {
        "name": "maxConsoleHeight",
        "description":
            "The minimum size (in pixels) for the command line output area",
        "type": "number",
        "defaultValue": 300
    });
    catalog.connect("command", module.id, {
        "name": "complete",
        "predicates": { "isCommandLine": true, "isKeyUp": false },
        "key": "tab",
        "pointer": "commands/simple#completeCommand"
    });
    catalog.connect("command", module.id, {
        "name": "menu1",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_1",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu2",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_2",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu1",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_1",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu3",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_3",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu4",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_4",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu5",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_5",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu6",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_6",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu7",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_7",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu8",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_8",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu9",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_9",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "menu0",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "alt_0",
        "pointer": "views/menu#activateItemAction"
    });
    catalog.connect("command", module.id, {
        "name": "help",
        "params": [
            {
                "name": "search",
                "type": "text",
                "description": "Search string to narrow the output.",
                "defaultValue": null
            }
        ],
        "description": "Get help on the available commands.",
        "pointer": "commands/simple#helpCommand"
    });
    catalog.connect("command", module.id, {
        "name": "alias",
        "params": [
            {
                "name": "alias",
                "type": "text",
                "description": "optionally, your alias name",
                "defaultValue": null
            },
            {
                "name": "command",
                "type": "text",
                "description": "optionally, the command name",
                "defaultValue": null
            }
        ],
        "description": "define and show aliases for commands",
        "pointer": "commands/simple#aliasCommand"
    });
    catalog.connect("command", module.id, {
        "name": "eval",
        "params": [
            {
                "name": "javascript",
                "type": "text",
                "description": "The JavaScript to evaluate"
            }
        ],
        "description": "evals given js code and show the result",
        "hidden": true,
        "pointer": "commands/basic#evalCommand"
    });
    catalog.connect("command", module.id, {
        "name": "version",
        "description": "show the Skywriter version",
        "hidden": true,
        "pointer": "commands/basic#versionCommand"
    });
    catalog.connect("command", module.id, {
        "name": "skywriter",
        "description": "has",
        "hidden": true,
        "pointer": "commands/basic#skywriterCommand"
    });
    catalog.connect("command", module.id, {
        "name": "historyPrevious",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "up",
        "pointer": "commands/history#historyPreviousCommand"
    });
    catalog.connect("command", module.id, {
        "name": "historyNext",
        "predicates": { "isCommandLine": true, "isKeyUp": true },
        "key": "down",
        "pointer": "commands/history#historyNextCommand"
    });
    catalog.connect("command", module.id, {
        "name": "history",
        "description": "Show history of the commands",
        "pointer": "commands/history#historyCommand",
        "params": []
    });
    catalog.connect("addedRequestOutput", module.id, { "pointer": "commands/history#addedRequestOutput" });
    catalog.addExtensionPoint("typehint", {
        "description":
            "A function to allow the command line to show a hint to the user on how they should finish what they're typing",
        "indexOn": "name"
    });
    catalog.connect("typehint", module.id, {
        "name": "selection",
        "description":
            "A UI for string that is constrained to be one of a number of pre-defined values",
        "pointer": "views/basic#selection"
    });
    catalog.connect("typehint", module.id, {
        "name": "boolean",
        "description": "A UI for a boolean",
        "pointer": "views/basic#bool"
    });
};

exports.shutdown = function(data, reason) {
    catalog.disconnectAll(module.id);
    catalog.removeExtensionPoint("typehint");
};
