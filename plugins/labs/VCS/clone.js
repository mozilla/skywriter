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
var console = require("bespin:console").console;

/**
 * Controller for the clone form
 */
exports.cloneController = SC.Object.create({
    url: "",
    
    cancel: function() {
        console.log("Cancelled");
    }
});

exports.clonePane = SC.PanelPane.design({
    layout: { centerX: 0, centerY: 0, width: 300, height: 300 },
    // childViews: ("urlLabel urlField projectNameLabel projectNameField " +
    //     "vcsTypeLabel vcsTypeField").w(),
    childViews: ("urlLabel urlField").w(),
    
    urlLabel: SC.LabelView.design({
        layout: {
            left: 10,
            top: 92 - 91 + 26 + 3,
            width: 200,
            height: 14
        },
        value: "URL"
    }),
    
    urlField: SC.LabelView.design({
        valueBinding: "VCS:clone#cloneController",
        layout: { left: 10, top: 92 - 91, width: 200, height: 24 }
    }),
    
    cancel: SC.ButtonView.design({
        layout: { left: 10, top: 308 - 91, width: 200, height: 37 },
        isDefault: false,
        title: "Cancel",
        target: "VCS:clone#cloneController",
        action: "cancel"
    })
});
