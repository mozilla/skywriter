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

exports.metadata =
{
    "bespin":
    {
        "provides":
        [
            {
                "ep": "extensionpoint",
                "name": "extensionpoint",
                "indexOx": "name",
                "register": "plugins#registerExtensionPoint",
                "unregister": "plugins#unregisterExtensionPoint",
                "description": "Defines a new extension point",
                "params": [
                    {
                        "name": "name",
                        "type": "string",
                        "description": "the extension point's name",
                        "required": true
                    },
                    {
                        "name": "description",
                        "type": "string",
                        "description": "description of what the extension point is for"
                    },
                    {
                        "name": "params",
                        "type": "array of objects",
                        "description": "parameters that provide the metadata for a given extension. Each object should have name and description, minimally. It can also have a 'type' (eg string, pointer, or array) and required to denote whether or not this parameter must be present on the extension."
                    },
                    {
                        "name": "indexOn",
                        "type": "string",
                        "description": "You can provide an 'indexOn' property to name a property of extensions through which you'd like to be able to easily look up the extension."
                    },
                    {
                        "name": "register",
                        "type": "pointer",
                        "description": "function that is called when a new extension is discovered. Note that this should be used sparingly, because it will cause your plugin to be loaded whenever a matching plugin appears."
                    },
                    {
                        "name": "unregister",
                        "type": "pointer",
                        "description": "function that is called when an extension is removed. Note that this should be used sparingly, because it will cause your plugin to be loaded whenever a matching plugin appears."
                    }
                ]
            },
            {
                "ep": "extensionpoint",
                "name": "extensionhandler",
                "register": "plugins#registerExtensionHandler",
                "unregister": "plugins#unregisterExtensionHandler",
                "description": "Used to attach listeners ",
                "params": [
                    {
                        "name": "name",
                        "type": "string",
                        "description": "name of the extension point to listen to",
                        "required": true
                    },
                    {
                        "name": "register",
                        "type": "pointer",
                        "description": "function that is called when a new extension is discovered. Note that this should be used sparingly, because it will cause your plugin to be loaded whenever a matching plugin appears."
                    },
                    {
                        "name": "unregister",
                        "type": "pointer",
                        "description": "function that is called when an extension is removed. Note that this should be used sparingly, because it will cause your plugin to be loaded whenever a matching plugin appears."
                    }
                ]
            },
            {
                "ep": "extensionpoint",
                "name": "factory",
                "description": "Provides a factory for singleton components. Each extension needs to provide a name, a pointer and an action. The action can be 'call' (if the pointer refers to a function), 'new' (if the pointer refers to a traditional JS object) or 'value' (if the pointer refers to the object itself that is the component).",
                "indexOn": "name"
            },
            {
                "ep": "factory",
                "name": "hub",
                "action": "create",
                "pointer": "util/hub#Hub"
            },
            {
                "ep": "extensionpoint",
                "name": "command",
                "description": "Editor commands/actions. TODO: list parameters here."
            }
        ]
    }
};
