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

var Range = require('rangeutils:utils/range');

"define metadata";
({
    "dependencies": {
        "canon": "0.0"
    },
    "provides": [
        {
            "ep": "command",
            "name": "emacs"
        },
        {
            "ep": "command",
            "name": "emacs insertText",
            "pointer": "#insertText"
        },
        {
            "ep": "keymapping",
            "name": "emacs",
            "handleMetaKey": true,
            "states": {
                "start": [
                    {
                        "key": "ctrl_x",
                        "then": "c-x"
                    },
                    {
                        "regex": [ "(?:meta_([0-9]*))*", "(down|ctrl_n)" ],
                        "exec": "editor moveDown",
                        "params": [
                            {
                                "name": "n",
                                "match": 1,
                                "type": "number",
                                "defaultValue": 1
                            }
                        ]
                    },
                    {
                        "regex": [ "(?:meta_([0-9]*))*", "(right|ctrl_f)" ],
                        "exec": "editor moveRight",
                        "params": [
                            {
                                "name": "n",
                                "match": 1,
                                "type": "number",
                                "defaultValue": 1
                            }
                        ]
                    },
                    {
                        "regex": [ "(?:meta_([0-9]*))*", "(up|ctrl_p)" ],
                        "exec": "editor moveUp",
                        "params": [
                            {
                                "name": "n",
                                "match": 1,
                                "type": "number",
                                "defaultValue": 1
                            }
                        ]
                    },
                    {
                        "regex": [ "(?:meta_([0-9]*))*", "(left|ctrl_b)" ],
                        "exec": "editor moveLeft",
                        "params": [
                            {
                                "name": "n",
                                "match": 1,
                                "type": "number",
                                "defaultValue": 1
                            }
                        ]
                    },
                    {
                        "comment": "This binding matches all printable characters except numbers as long as they are no numbers and print them n times.",
                        "regex": [ "(?:meta_([0-9]*))", "([^0-9]+)" ],
                        "exec": "emacs insertText",
                        "params": [
                            {
                                "name": "n",
                                "match": 1,
                                "type": "number",
                                "defaultValue": "1"
                            },
                            {
                                "name": "text",
                                "match": "KEY_VALUE"
                            },
                            {
                                "name": "cmd",
                                "defaultValue": "editor insertText"
                            }
                        ],
                        "predicates": {
                            "isCommandKey": false
                        }
                    },
                    {
                        "comment": "This binding matches numbers as long as there is no meta_number in the buffer.",
                        "regex":  [ "(meta_[0-9]*)*", "[0-9]+" ],
                        "disallowMatches":  [ 1 ],
                        "exec": "editor insertText",
                        "params": [
                            {
                                "name": "text",
                                "match": "KEY_VALUE",
                                "type": "text"
                            }
                        ],
                        "predicates": {
                            "isCommandKey": false
                        }
                    },
                    {
                        "regex": [ "meta_([0-9]*)", "(meta_[0-9]|[0-9])" ],
                        "comment": "Stops execution if the regex /meta_[0-9]+/ matches to avoid resetting the buffer."
                    }
                ],
                "c-x": [
                    {
                        "key": "ctrl_g",
                        "then": "start"
                    },
                    {
                        "key": "ctrl_s",
                        "exec": "save",
                        "then": "start"
                    }
                ]
            }
        }
    ]
});
"end";

exports.insertText = function(env, args) {
    var text = '';
    while (args.n--) {
        text += args.text;
    }

    var view = env.get('view');
    view.insertText(text);
};

