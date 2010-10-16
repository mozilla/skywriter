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

exports.init = function() {
    var catalog = plugins.catalog;
    catalog.connect("factory", module.id, {
        "name": "text_editor",
        "pointer": "views/editor#EditorView",
        "action": "new"
    });
    catalog.connect("command", module.id, {
        "name": "backspace",
        "key": "backspace",
        "predicates": { "isTextView": true },
        "pointer": "commands/editing#backspace"
    });
    catalog.connect("command", module.id, {
        "name": "delete",
        "key": "delete",
        "predicates": { "isTextView": true },
        "pointer": "commands/editing#deleteCommand"
    });
    catalog.connect("command", module.id, {
        "name": "deletelines",
        "description": "Delete all lines currently selected",
        "key": "ctrl_d",
        "predicates": { "isTextView": true },
        "pointer": "commands/editing#deleteLines"
    });
    catalog.connect("command", module.id, {
        "name": "openline",
        "description": "Create a new, empty line below the current one",
        "key": "ctrl_return",
        "predicates": { "isTextView": true },
        "pointer": "commands/editing#openLine"
    });
    catalog.connect("command", module.id, {
        "name": "joinline",
        "description": "Join the current line with the following",
        "key": "ctrl_shift_j",
        "predicates": { "isTextView": true },
        "pointer": "commands/editing#joinLines"
    });
    catalog.connect("command", module.id, {
        "name": "insertText",
        "pointer": "commands/editing#insertText",
        "params": [
            {
                "name": "text",
                "type": "text",
                "description": "The text to insert",
                "defaultValue": ""
            }
        ]
    });
    catalog.connect("command", module.id, {
        "name": "newline",
        "key": "return",
        "predicates": { "isTextView": true, "completing": false },
        "pointer": "commands/editing#newline"
    });
    catalog.connect("command", module.id, {
        "name": "tab",
        "key": "tab",
        "predicates": { "isTextView": true, "completing": false },
        "pointer": "commands/editing#tab"
    });
    catalog.connect("command", module.id, {
        "name": "untab",
        "key": "shift_tab",
        "predicates": { "isTextView": true },
        "pointer": "commands/editing#untab"
    });
    catalog.connect("command", module.id, { "name": "move", "predicates": { "isTextView": true } });
    catalog.connect("command", module.id, {
        "name": "findnext",
        "key": "ctrl_g",
        "description": "Repeat the last search (forward)",
        "pointer": "commands/editor#findNextCommand"
    });
    catalog.connect("command", module.id, {
        "name": "findprev",
        "key": "ctrl_shift_g",
        "description": "Repeat the last search (backward)",
        "pointer": "commands/editor#findPrevCommand"
    });
    catalog.connect("command", module.id, {
        "name": "move down",
        "key": "down",
        "predicates": { "isTextView": true, "completing": false },
        "pointer": "commands/movement#moveDown"
    });
    catalog.connect("command", module.id, {
        "name": "move left",
        "key": "left",
        "predicates": { "isTextView": true },
        "pointer": "commands/movement#moveLeft"
    });
    catalog.connect("command", module.id, {
        "name": "move right",
        "key": "right",
        "predicates": { "isTextView": true },
        "pointer": "commands/movement#moveRight"
    });
    catalog.connect("command", module.id, {
        "name": "move up",
        "key": "up",
        "predicates": { "isTextView": true, "completing": false },
        "pointer": "commands/movement#moveUp"
    });
    catalog.connect("command", module.id, { "name": "select", "predicates": { "isTextView": true } });
    catalog.connect("command", module.id, {
        "name": "select down",
        "key": "shift_down",
        "predicates": { "isTextView": true },
        "pointer": "commands/movement#selectDown"
    });
    catalog.connect("command", module.id, {
        "name": "select left",
        "key": "shift_left",
        "predicates": { "isTextView": true },
        "pointer": "commands/movement#selectLeft"
    });
    catalog.connect("command", module.id, {
        "name": "select right",
        "key": "shift_right",
        "predicates": { "isTextView": true },
        "pointer": "commands/movement#selectRight"
    });
    catalog.connect("command", module.id, {
        "name": "select up",
        "key": "shift_up",
        "predicates": { "isTextView": true },
        "pointer": "commands/movement#selectUp"
    });
    catalog.connect("command", module.id, {
        "name": "move lineend",
        "key": [ "end", "ctrl_right" ],
        "predicates": { "isTextView": true },
        "pointer": "commands/movement#moveLineEnd"
    });
    catalog.connect("command", module.id, {
        "name": "select lineend",
        "key": [ "shift_end", "ctrl_shift_right" ],
        "predicates": { "isTextView": true },
        "pointer": "commands/movement#selectLineEnd"
    });
    catalog.connect("command", module.id, {
        "name": "move docend",
        "key": "ctrl_down",
        "predicates": { "isTextView": true },
        "pointer": "commands/movement#moveDocEnd"
    });
    catalog.connect("command", module.id, {
        "name": "select docend",
        "key": "ctrl_shift_down",
        "predicates": { "isTextView": true },
        "pointer": "commands/movement#selectDocEnd"
    });
    catalog.connect("command", module.id, {
        "name": "move linestart",
        "key": [ "home", "ctrl_left" ],
        "predicates": { "isTextView": true },
        "pointer": "commands/movement#moveLineStart"
    });
    catalog.connect("command", module.id, {
        "name": "select linestart",
        "key": [ "shift_home", "ctrl_shift_left" ],
        "predicates": { "isTextView": true },
        "pointer": "commands/movement#selectLineStart"
    });
    catalog.connect("command", module.id, {
        "name": "move docstart",
        "key": "ctrl_up",
        "predicates": { "isTextView": true },
        "pointer": "commands/movement#moveDocStart"
    });
    catalog.connect("command", module.id, {
        "name": "select docstart",
        "key": "ctrl_shift_up",
        "predicates": { "isTextView": true },
        "pointer": "commands/movement#selectDocStart"
    });
    catalog.connect("command", module.id, {
        "name": "move nextword",
        "key": [ "alt_right" ],
        "predicates": { "isTextView": true },
        "pointer": "commands/movement#moveNextWord"
    });
    catalog.connect("command", module.id, {
        "name": "select nextword",
        "key": [ "alt_shift_right" ],
        "predicates": { "isTextView": true },
        "pointer": "commands/movement#selectNextWord"
    });
    catalog.connect("command", module.id, {
        "name": "move prevword",
        "key": [ "alt_left" ],
        "predicates": { "isTextView": true },
        "pointer": "commands/movement#movePreviousWord"
    });
    catalog.connect("command", module.id, {
        "name": "select prevword",
        "key": [ "alt_shift_left" ],
        "predicates": { "isTextView": true },
        "pointer": "commands/movement#selectPreviousWord"
    });
    catalog.connect("command", module.id, {
        "name": "select all",
        "key": [ "ctrl_a", "meta_a" ],
        "predicates": { "isTextView": true },
        "pointer": "commands/movement#selectAll"
    });
    catalog.connect("command", module.id, { "name": "scroll", "predicates": { "isTextView": true } });
    catalog.connect("command", module.id, {
        "name": "scroll start",
        "key": "ctrl_home",
        "predicates": { "isTextView": true },
        "pointer": "commands/scrolling#scrollDocStart"
    });
    catalog.connect("command", module.id, {
        "name": "scroll end",
        "key": "ctrl_end",
        "predicates": { "isTextView": true },
        "pointer": "commands/scrolling#scrollDocEnd"
    });
    catalog.connect("command", module.id, {
        "name": "scroll down",
        "key": "pagedown",
        "predicates": { "isTextView": true },
        "pointer": "commands/scrolling#scrollPageDown"
    });
    catalog.connect("command", module.id, {
        "name": "scroll up",
        "key": "pageup",
        "predicates": { "isTextView": true },
        "pointer": "commands/scrolling#scrollPageUp"
    });
    catalog.connect("command", module.id, {
        "name": "lc",
        "description": "Change all selected text to lowercase",
        "withKey": "CMD SHIFT L",
        "pointer": "commands/editor#lcCommand"
    });
    catalog.connect("command", module.id, {
        "name": "detab",
        "params": [
            {
                "name": "tabsize",
                "type": "text",
                "description": "Optionally, specify a tab size. (Defaults to setting.)",
                "defaultValue": null
            }
        ],
        "description": "Convert tabs to spaces.",
        "pointer": "commands/editor#detabCommand"
    });
    catalog.connect("command", module.id, {
        "name": "entab",
        "params": [
            {
                "name": "tabsize",
                "type": "text",
                "description": "Optionally, specify a tab size. (Defaults to setting.)",
                "defaultValue": null
            }
        ],
        "description": "Convert spaces to tabs.",
        "pointer": "commands/editor#entabCommand"
    });
    catalog.connect("command", module.id, {
        "name": "trim",
        "params": [
            {
                "name": "side",
                "type": {
                    "name": "selection",
                    "data": [
                        { "name": "left" },
                        { "name": "right" },
                        { "name": "both" }
                    ]
                },
                "description": "Do we trim from the left, right or both",
                "defaultValue": "both"
            }
        ],
        "description":
            "trim trailing or leading whitespace from each line in selection",
        "pointer": "commands/editor#trimCommand"
    });
    catalog.connect("command", module.id, {
        "name": "uc",
        "description": "Change all selected text to uppercase",
        "withKey": "CMD SHIFT U",
        "pointer": "commands/editor#ucCommand"
    });
    catalog.connect("command", module.id, {
        "name": "redo",
        "key": [ "ctrl_shift_z" ],
        "predicates": { "isTextView": true },
        "pointer": "controllers/undo#undoManagerCommand"
    });
    catalog.connect("command", module.id, {
        "name": "undo",
        "key": [ "ctrl_z" ],
        "predicates": { "isTextView": true },
        "pointer": "controllers/undo#undoManagerCommand"
    });
    catalog.connect("setting", module.id, {
        "name": "tabstop",
        "description": "The distance in characters between each tab",
        "type": "number",
        "defaultValue": 8
    });
    catalog.connect("setting", module.id, {
        "name": "customKeymapping",
        "description": "Customize the keymapping",
        "type": "text",
        "defaultValue": "{}"
    });
    catalog.connect("setting", module.id, {
        "name": "keymapping",
        "description": "The keymapping to use",
        "type": "text",
        "defaultValue": "standard"
    });
    catalog.connect("setting", module.id, {
        "name": "fontsize",
        "description": "The editor font size in pixels",
        "type": "number",
        "defaultValue": 14
    });
    catalog.connect("setting", module.id, {
        "name": "fontface",
        "description": "The editor font face",
        "type": "text",
        "defaultValue": "Monaco, Lucida Console, monospace"
    });
    catalog.connect("themevariable", module.id, {
        "name": "gutter",
        "defaultValue": {
            "color": "#e5c138",
            "backgroundColor": "#4c4a41",
            "paddingLeft": 5,
            "paddingRight": 10
        }
    });
    catalog.connect("themevariable", module.id, {
        "name": "editor",
        "defaultValue": {
            "color": "#e6e6e6",
            "backgroundColor": "#2a211c",
            "cursorColor": "#879aff",
            "selectedTextBackgroundColor": "#526da5",
            "unfocusedCursorColor": "#ff0033",
            "unfocusedCursorBackgroundColor": "#73171e"
        }
    });
    catalog.connect("themevariable", module.id, {
        "name": "highlighterFG",
        "defaultValue": {
            "plain": "#e6e6e6",
            "comment": "#666666",
            "directive": "#999999",
            "error": "#ff0000",
            "identifier": "#D841FF",
            "keyword": "#42A8ED",
            "operator": "#88BBFF",
            "string": "#039A0A",
            "addition": "#FFFFFF",
            "deletion": "#FFFFFF"
        }
    });
    catalog.connect("themevariable", module.id, {
        "name": "highlighterBG",
        "defaultValue": { "addition": "#008000", "deletion": "#800000" }
    });
    catalog.connect("themevariable", module.id, {
        "name": "scroller",
        "defaultValue": {
            "padding": 5,
            "thickness": 17,
            "backgroundStyle": "#2A211C",
            "fullAlpha": 1.0,
            "particalAlpha": 0.3,
            "nibStyle": "rgb(100, 100, 100)",
            "nibArrowStyle": "rgb(255, 255, 255)",
            "nibStrokeStyle": "rgb(150, 150, 150)",
            "trackFillStyle": "rgba(50, 50, 50, 0.8)",
            "trackStrokeStyle": "rgb(150, 150, 150)",
            "barFillStyle": "rgb(0, 0, 0)",
            "barFillGradientTopStart": "rgb(90, 90, 90)",
            "barFillGradientTopStop": "rgb(40, 40, 40)",
            "barFillGradientBottomStart": "rgb(22, 22, 22)",
            "barFillGradientBottomStop": "rgb(44, 44, 44)"
        }
    });
    catalog.addExtensionPoint("editorChange", {
        "description": "Event: Notify when something within the editor changed.",
        "params": [
            {
                "name": "pointer",
                "required": true,
                "description": "Function that is called whenever a change happened."
            }
        ]
    });
    catalog.addExtensionPoint("gutterDecoration", { "description": "Decoration for the gutter" });
    catalog.connect("gutterDecoration", module.id, {
        "name": "lineNumbers",
        "description": "Line number decoration for the gutter",
        "pointer": "views/gutter#lineNumbers"
    });
};

exports.deinit = function() {
    catalog.disconnectAll(module.id);
    catalog.removeExtensionPoint("editorChange");
    catalog.removeExtensionPoint("gutterDecoration");
};
});