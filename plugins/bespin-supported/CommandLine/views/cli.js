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
var util = require("bespin:util/util");

/**
 * Begin the login process
 */
exports.showCli = function() {
    exports.cliPage.get("mainPane").append();
};

/**
 * Show helpers for the command line
 */
exports.cliController = SC.Object.create({
    input: "",
    output: ""
});

/**
 *
 */
exports.cliPage = SC.Page.design({

    mainPane: SC.PanelPane.design({
        classNames: [ "bespin-theme" ],
        layout: { top: 50, bottom: 0, left: 50, right: 50 },

        contentView: SC.View.design({
            childViews: [ "prompt", "input", "output" ],

            prompt: SC.LabelView.design({
                value: ">",
                fontSize: 20,
                layout: { left: 0, width: 30, bottom: 0, height: 30 },
                textAlign: "right"
            }),

            input: SC.TextFieldView.design({
                valueBinding: "cli#cliController.input",
                layout: { left: 35, bottom: 0, height: 30, right: 0 }
            }),

            output: SC.TextareaView.design({
                valueBinding: "cli#cliController.output",
                layout: { left: 0, top: 0, right: 0, bottom: 30 }
            })
        })
    })
});
