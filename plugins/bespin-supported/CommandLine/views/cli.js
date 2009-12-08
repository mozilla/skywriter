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

var SC = require("sproutcore/runtime").SC;
var dock = require("bespin:views/dock");

/**
 * A Popup to display the command line output
 */
exports.cliOutputView = SC.View.design({
    layout: { centerX: 0, bottom: 0, right: 0, height: 30 },
    childViews: [ 'output' ],
    output: SC.TextFieldView.design({
        //valueBinding: "CommandLine#command.cliController.output",
        layout: { left: 0, top: 0, right: 0, bottom: 30 }
    })
});

/**
 * A view designed to dock in the bottom of the editor, holding the command
 * line input.
 */
exports.cliInputView = SC.View.design({
    dock: dock.DOCK_BOTTOM,
    layout: { left: 0, bottom: 0, right: 0, height: 30 },

    childViews: [ 'prompt', 'input', 'submit' ],

    prompt: SC.LabelView.design({
        value: ">",
        layout: { left: 0, width: 30, bottom: 0, height: 30 },
        textAlign: "right"
    }),

    input: SC.TextFieldView.design({
        valueBinding: "CommandLine#command:cliController.input",
        layout: { left: 35, bottom: 0, height: 30, right: 85 }
    }),

    submit: SC.ButtonView.design({
        isDefault: true,
        title: "Exec",
        target: "CommandLine#command:cliController",
        action: "exec",
        layout: { right: 0, bottom: 0, height: 30, width: 80 }
    })
});
