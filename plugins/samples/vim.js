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
            "name": "vim"
        },
        {
            "ep": "command",
            "name": "vim moveLeft",
            "pointer": "#moveLeft"
        },
        {
            "ep": "command",
            "name": "vim moveRight",
            "pointer": "#moveRight"
        },
        {
            "ep": "command",
            "name": "vim moveUp",
            "pointer": "#moveUp"
        },
        {
            "ep": "command",
            "name": "vim moveDown",
            "pointer": "#moveDown"
        },
        {
            "ep": "keymapping",
            "name": "vim",
            "states": {
                "start": [
                    {
                        "key":      "i",
                        "then":     "insertMode"
                    },
                    {
                        "regex":    [ "([0-9]*)", "(k|up)" ],
                        "exec":     "vim moveUp",
                        "params": [
                            {
                                "name":     "n",
                                "match":    1,
                                "type":     "number",
                                "defaultValue":     1
                            }
                        ]
                    },
                    {
                        "regex":    [ "([0-9]*)", "(j|down|return)" ],
                        "exec":     "vim moveDown",
                        "params": [
                            {
                                "name":     "n",
                                "match":    1,
                                "type":     "number",
                                "defaultValue":     1
                            }
                        ]
                    },
                    {
                        "regex":    [ "([0-9]*)", "(l|right)" ],
                        "exec":     "vim moveRight",
                        "params": [
                            {
                                "name":     "n",
                                "match":    1,
                                "type":     "number",
                                "defaultValue":     1
                            }
                        ]
                    },
                    {
                        "regex":    [ "([0-9]*)", "(h|left)" ],
                        "exec":     "vim moveLeft",
                        "params": [
                            {
                                "name":     "n",
                                "match":    1,
                                "type":     "number",
                                "defaultValue":     1
                            }
                        ]
                    },
                    {
                        "regex":    "(.*)",
                        "predicates": { "isCommandKey": false }
                    }
                ],
                "insertMode": [
                    {
                        "key":      "escape",
                        "then":     "start"
                    },
                    {
                        "key":      "right",
                        "exec":     "vim moveRight",
                        "params": [
                            {
                                "name":     "n",
                                "match":    1,
                                "type":     "number",
                                "defaultValue":     1
                            }
                        ]
                    },
                    {
                        "key":      "left",
                        "exec":     "vim moveLeft",
                        "params": [
                            {
                                "name":     "n",
                                "match":    1,
                                "type":     "number",
                                "defaultValue":     1
                            }
                        ]
                    }
                ]
            }
        }
    ]
});
"end";

exports.moveLeft = function(env, args) {
    var view = env.view;
    var range = view.getSelectedRange();

    view.moveCursorTo({
        col: Math.max(range.start.col - args.n, 0),
        row: range.start.row
    });
};

exports.moveRight = function(env, args) {
    var view = env.view;
    var lines = env.model.lines;
    var range = view.getSelectedRange();
    var lineLength = lines[range.start.row].length

    view.moveCursorTo({
        col: Math.min(range.start.col + args.n, lineLength),
        row: range.start.row
    });
};

exports.moveUp = function(env, args) {
    var view = env.view;

    while (args.n--) {
        view.moveUp();
    }
};

exports.moveDown = function(env, args) {
    var view = env.view;

    while (args.n--) {
        view.moveDown();
    }
};
