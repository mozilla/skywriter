/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

exports.metadata = {
    "Base Syntax": {
        "provides": [
            {
                "ep": "extensionpoint",
                "name": "syntax.engine",
                "description": "Syntax highlighting engines"
            },
            {
                "ep": "syntax.engine",
                "name": "simple",
                "pointer": "bespin/syntax/simple:Model"
            },
            {
                "ep": "extensionpoint",
                "name": "syntax.simple.highlighter",
                "description": "Highlighter code for the simple syntax highlighter."
            },
            {
                "ep": "syntax.simple.highlighter",
                "name": "JavaScript",
                "extensions": ["js", "json", "javascript", "ecmascript", "jsm", "java"],
                "pointer": "bespin/syntax/simple/javascript:JavaScript"
            },
            {
                "ep": "syntax.simple.highlighter",
                "name": "C",
                "extensions": ['c', 'h'],
                "pointer": "bespin/syntax/simple/c:C"
            },
            {
                "ep": "syntax.simple.highlighter",
                "name": "CSharp",
                "extensions": ['cs'],
                "pointer": "bespin/syntax/simple/csharp:CSharp"
            },
            {
                "ep": "syntax.simple.highlighter",
                "name": "CSS",
                "extensions": ['css'],
                "pointer": "bespin/syntax/simple/css:CSS"
            },
            {
                "ep": "syntax.simple.highlighter",
                "name": "HTML",
                "extensions": ['html', 'htm', 'xml', 'xhtml', 'shtml'],
                "pointer": "bespin/syntax/simple/html:HTML"
            },
            {
                "ep": "syntax.simple.highlighter",
                "name": "PHP",
                "extensions": ['php', 'php3', 'php4', 'php5'],
                "pointer": "bespin/syntax/simple/php:PHP"
            },
            {
                "ep": "syntax.simple.highlighter",
                "name": "Python",
                "extensions": ['py', 'python'],
                "pointer": "bespin/syntax/simple/python:Python"
            },
            {
                "ep": "syntax.simple.highlighter",
                "name": "Ruby",
                "extensions": ['rb', 'ruby'],
                "pointer": "bespin/syntax/simple/ruby:Ruby"
            }
        ]
    },
    "bespin": {
        "provides": [
            {
                "ep": "extensionpoint",
                "name": "startup",
                "description": "A function that should be called at startup. This should be used \
sparingly, as these plugins will be eagerly loaded at the beginning. All that's needed for this \
extension point is a pointer to a function that takes no arguments.",
                "activate": "plugins:startupHandler"
            },
            {
                "ep": "extensionpoint",
                "name": "factory",
                "description": "Provides a factory for singleton components. Each extension needs to \
provide a name, a pointer and an action. The action can be 'call' (if the pointer refers to \
a function), 'create' (if the pointer refers to an SC.Object), 'new' (if the pointer refers to \
a traditional JS object) or 'value' (if the pointer refers to the object itself that is the \
component).",
                "indexOn": "name"
            },
            {
                "action": "call",
                "pointer": "util/container:dummyFactory",
                "name": "files",
                "ep": "factory"
            },
            {
                "action": "create",
                "pointer": "util/hub:Hub",
                "name": "hub",
                "ep": "factory"
            },
            {
                "action": "create",
                "pointer": "settings:InMemorySettings",
                "name": "settings",
                "ep": "factory"
            },
            {
                "action": "call",
                "pointer": "util/container:dummyFactory",
                "name": "commandLine",
                "ep": "factory"
            },
            {
                "action": "call",
                "pointer": "util/container:dummyFactory",
                "name": "parser",
                "ep": "factory"
            },
            {
                "action": "create",
                "pointer": "editor/controller:EditorController",
                "name": "editor",
                "ep": "factory"
            },
            {
                "action": "call",
                "pointer": "util/container:dummyFactory",
                "name": "editSession",
                "ep": "factory"
            },
            {
                "action": "create",
                "pointer": "cursor:CursorManager",
                "name": "cursorManager",
                "ep": "factory"
            }
        ]
    }
};

/*
These old factory methods were from bespin.js, and we should convert them to
use the factories system above
    popup: function(onCreate) {
        exports.plugins.loadOne("popup", function(popupmod) {
            onCreate(new popupmod.Window());
        });
    },
    piemenu: function(onCreate) {
        exports.plugins.loadOne("piemenu", function(piemenumod) {
            var piemenu = new piemenumod.Window();
            // the pie menu doesn't animate properly
            // without restoring control to the UI temporarily
            setTimeout(function() { onCreate(piemenu); }, 25);
        });
    },
    commandLine: function(onCreate) {
        exports.plugins.loadOne("commandLine", function(commandline) {
            onCreate(new commandline.Interface('command', exports.command.store));
        });
    },
    debugbar: function(onCreate) {
        exports.plugins.loadOne("debugbar", function(debug) {
            onCreate(new debug.EvalCommandLineInterface('debugbar_command', null, {
                idPrefix: "debugbar_",
                parentElement: document.getElementById("debugbar")
            }));
        });
    },
    breakpoints: function(onCreate) {
        exports.plugins.loadOne("breakpoints", function(BreakpointManager) {
            onCreate(new BreakpointManager());
        });
    }
*/
