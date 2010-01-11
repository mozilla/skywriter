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

exports.metadata =
{
    "bespin":
    {
        "provides":
        [
            {
                "ep": "extensionpoint",
                "name": "extensionpoint",
                "description": "Use the 'extensionpoint' extension point to \
define new extension points. You can provide an 'indexOn' property to name a \
property of extensions through which you'd like to be able to easily look up the \
extension. You can also provide a 'register' and 'unregister' properties which are \
pointers to functions that are called whenever a new extension is discovered or \
removed, respectively. 'register' and 'unregister' \
should be used sparingly, because your plugin will be loaded whenever a \
matching plugin is available."
            },
            {
                "ep": "extensionpoint",
                "name": "extensionhandler",
                "description": "extensionhandlers are able to have 'register' \
and 'unregister' pointers to functions that are called with each extension as \
it is discovered or unregistered. Use 'register' sparingly as your plugin will \
be loaded automatically if there is a matching extension (and not just when \
your extension's functionality is required)."
            },
            {
                "ep": "extensionpoint",
                "name": "startup",
                "description": "A function that should be called at startup. This should be used \
sparingly, as these plugins will be eagerly loaded at the beginning. All that's needed for this \
extension point is a pointer to a function that takes no arguments.",
                "register": "plugins#startupHandler"
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
                "ep": "factory",
                "name": "files",
                "action": "call",
                "pointer": "util/container#dummyFactory"
            },
            {
                "ep": "factory",
                "name": "hub",
                "action": "create",
                "pointer": "util/hub#Hub"
            },
            {
                "ep": "factory",
                "name": "parser",
                "action": "call",
                "pointer": "util/container#dummyFactory"
            },
            {
                "ep": "factory",
                "name": "editSession",
                "action": "call",
                "pointer": "util/container#dummyFactory"
            },
            {
                "ep": "factory",
                "name": "cursorManager",
                "action": "create",
                "pointer": "cursor#CursorManager"
            },
            {
                "ep": "extensionpoint",
                "name": "command",
                "description": "Editor commands/actions. TODO: list parameters here."
            }
        ]
    }
};
