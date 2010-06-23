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

"define metadata";
({
    "description": "Defines extension points required for theming",
    "dependencies": { },
    "environments": { "main": true },
    "share": true,
    "provides": [
        {
            "ep": "extensionpoint",
            "name": "themestyles",
            "description": "(Less)files holding the CSS style information for the UI.",

            "params": [
                {
                    "name": "url",
                    "required": true,
                    "description": "Name of the ThemeStylesFile - can also be an array of files."
                }
            ]
        },
        {
            "ep": "extensionpoint",
            "name": "themeChange",
            "description": "Event: Notify when the theme(styles) changed.",

            "params": [
                {
                    "name": "pointer",
                    "required": true,
                    "description": "Function that is called whenever the theme is changed."
                }
            ]

        },
        {
            "ep": "extensionpoint",
            "name": "theme",
            "indexOn": "name",
            "description": "A theme is a way change the look of the application.",

            "params": [
                {
                    "name": "url",
                    "required": false,
                    "description": "Name of a ThemeStylesFile that holds theme specific CSS rules - can also be an array of files."
                },
                {
                    "name": "pointer",
                    "required": true,
                    "description": "Function that returns the ThemeData"
                }
            ]
        }
    ]
})
"end";
