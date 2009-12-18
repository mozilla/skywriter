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

"define metadata";
({
    "depends": [ "CommandLine", "UserIdent" ],
    "provides": [
        {
            "ep":       "factory",
            "name":     "applicationcontroller",
            "pointer":  "#applicationController",
            "action":   "value"
        }
    ]
});
"end";

var SC = require('sproutcore/runtime').SC;
var m_bespin = require('bespin');
var EditorController = require('bespin:editor/controller').EditorController;
var catalog = require('bespin:plugins').catalog;
var cliInputView = require('CommandLine:views/cli').cliInputView;

exports.applicationController = SC.Object.extend({
    // The main pane in which to place the app view. This field needs to be
    // filled in upon instantiating the app controller.
    mainPane: null,

    _applicationView: SC.View,

    init: function() {
        this.sc_super();

        var applicationView = this._applicationView.create();
        this._applicationView = applicationView;

        var container = m_bespin._container;
        container.register('container', applicationView.get('layer'));

        var editorController = EditorController.create();
        container.register('editor', editorController);

        var dockView = editorController.get('dockView');
        //dockView.appendChild(dockView.addDockedView(cliInputView));
        applicationView.appendChild(dockView);

        editorController.model.insertDocument("Welcome to Bespin!");

        this.get('mainPane').appendChild(applicationView);
    }
});

