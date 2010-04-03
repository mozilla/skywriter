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
var themeManager = require("theme_manager").themeManager;

/**
 * Controller for the clone form
 */
exports.cloneController = SC.Object.create({
    _pane: null,
    _request: null,
    
    url: "",
    projectName: "",
    vcsType: "svn",
    vcsUser: "",
    remoteauth: "",
    push: "",
    authType: "ssh",
    
    show: function(request) {
        var pane = exports.clonePage.get("mainPane");
        themeManager.addPane(pane);
        pane.append();
        pane.becomeKeyPane();
        this._pane = pane;
        this._request = request;
    },
    
    hide: function() {
        if (this._pane) {
            this._pane.remove();
            this._pane = null;
        }
    },
    
    cancel: function() {
        this.hide();
        if (this._request) {
            this._request.done("Canceled");
            this._request = null;
        }
    }
});

exports.clonePage = SC.Page.design({
    mainPane: SC.PanelPane.design({
        layout: { centerX: 0, centerY: 0, width: 300, height: 600 },
        
        contentView: SC.View.design({
            classNames: "bespin-color-field".w(),
            childViews: "form".w(),
            form: SC.View.design({
                classNames: "bespin-form".w(),
                
                childViews: ("title urlLabel urlField projectNameField " +
                    "projectNameLabel vcsTypeField vcsUserField " +
                    "vcsUserLabel remoteauthField remoteauthLabel " +
                    "pushField pushLabel authTypeField authTypeLabel cancel").w(),

                title: SC.LabelView.design({
                    classNames: "title".w(),

                    layout: {
                        left: 10,
                        top: 10,
                        width: 290,
                        height: 24
                    },
                    value: "Checkout a Repository",
                    controlSize: SC.LARGE_CONTROL_SIZE,
                    fontWeight: 'bold'
                }),

                urlField: SC.TextFieldView.design({
                    valueBinding: "vcs:clone#cloneController.url",
                    layout: { left: 10, top: 29, width: 200, height: 24 }
                }),

                urlLabel: SC.LabelView.design({
                    layout: {
                        left: 10,
                        top: 53,
                        width: 200,
                        height: 14
                    },
                    value: "URL"
                }),

                projectNameField: SC.TextFieldView.design({
                    layout: {
                        left: 10,
                        top: 67,
                        width: 200,
                        height: 24
                    },
                    valueBinding: "vcs:clone#cloneController.projectName"
                }),

                projectNameLabel: SC.LabelView.design({
                    layout: {
                        left: 10,
                        top: 91,
                        width: 200,
                        height: 14
                    },
                    value: "Project Name (defaults to the last part of the URL)"
                }),
                
                vcsTypeField: SC.RadioView.design({
                    layout: {
                        left: 10,
                        top: 105,
                        width: 200,
                        height: 56
                    },
                    itemValueKey: "value",
                    itemTitleKey: "title",
                    items: [
                        {
                            title: "Subversion",
                            value: "svn"
                        },
                        {
                            title: "Mercurial",
                            value: "hg"
                        }
                    ],
                    valueBinding: "vcs:clone#cloneController.vcsType"
                }),
                
                vcsUserField: SC.TextFieldView.design({
                    layout: {
                        left: 10,
                        top: 161,
                        width: 200,
                        height: 24
                    },
                    valueBinding: "vcs:clone#cloneController.vcsUser"
                }),
                
                vcsUserLabel: SC.LabelView.design({
                    layout: {
                        left: 10,
                        top: 185,
                        width: 200,
                        height: 14
                    },
                    value: "VCS Username"
                }),
                
                remoteauthLabel: SC.LabelView.design({
                    layout: {
                        left: 10,
                        top: 199,
                        width: 200,
                        height: 14
                    },
                    value: "Authentication is required:"
                }),
                
                remoteauthField: SC.RadioView.design({
                    layout: {
                        left: 10,
                        top: 213,
                        width: 200,
                        height: 80
                    },
                    itemValueKey: "value",
                    itemTitleKey: "title",
                    items: [
                        {
                            title: "Never (read-only access)",
                            value: ""
                        },
                        {
                            title: "Only for writing",
                            value: "write"
                        },
                        {
                            title: "Both for reading and writing",
                            value: "both"
                        }
                    ],
                    valueBinding: "vcs:clone#cloneController.remoteauth"
                }),
                
                pushField: SC.TextFieldView.design({
                    layout: {
                        left: 10,
                        top: 293,
                        width: 200,
                        height: 24
                    },
                    valueBinding: "vcs:clone#cloneController.push"
                }),
                
                pushLabel: SC.LabelView.design({
                    layout: {
                        left: 10,
                        top: 317,
                        width: 200,
                        height: 14
                    },
                    value: "Push to URL (if different from the read URL)"
                }),
                
                authTypeLabel: SC.LabelView.design({
                    layout: {
                        left: 10,
                        top: 331,
                        width: 200,
                        height: 14
                    },
                    value: "Type of authentication:"
                }),
                
                authTypeField: SC.RadioView.design({
                    layout: {
                        left: 10,
                        top: 346,
                        width: 200,
                        height: 56
                    },
                    itemValueKey: "value",
                    itemTitleKey: "title",
                    items: [
                        {
                            title: "SSH",
                            value: "ssh"
                        },
                        {
                            title: "Username+Password",
                            value: "password"
                        }
                    ],
                    valueBinding: "vcs:clone#cloneController.authType"
                }),
                
                cancel: SC.ButtonView.design({
                    layout: { left: 10, top: 560, width: 200, height: 37 },
                    isCancel: true,
                    title: "Cancel",
                    target: "vcs:clone#cloneController",
                    action: "cancel"
                })
            })
        })
    })
});

exports.cloneCommand = function(env, args, request) {
    exports.cloneController.show(request);
    request.async();
};
