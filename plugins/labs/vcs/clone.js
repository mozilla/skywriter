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

var server = require("bespin_server").server;

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
    username: "",
    password: "",
    
    show: function(request) {
        var pane = exports.clonePage.get("mainPane");
        themeManager.addPane(pane);
        pane.append();
        pane.becomeKeyPane();
        pane.getPath("contentView.form.urlField").becomeFirstResponder();
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
            this._request.doneWithError("Canceled");
            this._request = null;
        }
    },
    
    clone: function() {
        this.hide();
        var data = {
            url: this.get("url"),
            projectName: this.get("projectName"),
            vcsType: this.get("vcsType"),
            push: this.get("push"),
            remoteauth: this.get("remoteauth")
        };
        if (data.vcsType !== "svn") {
            data.vcsUser = this.get("vcsUser");
        }
        if (data.remoteauth) {
            data.authType = this.get("authType");
            data.username = this.get("username");
            if (data.authType === "password") {
                data.password = this.get("password");
            }
        }
        var pr = exports.cloneNewProject(data);
        pr.then(function(output) {
            request.done(output);
        }, function(error) {
            request.doneWithError("Problem while cloning: " + error.message + " " +
                error.xhr.responseText);
        });
    },
    
    hasAuth: function() {
        return this.get("remoteauth") !== "";
    }.property("remoteauth").cacheable(),
    
    isUserPass: function() {
        return this.get("remoteauth") !== "" && this.get("authType") !== "ssh";
    }.property("authType", "remoteauth").cacheable(),
    
    allowsUser: function() {
        return this.get("vcsType") !== "svn";
    }.property("vcsType").cacheable()
});

exports.clonePage = SC.Page.design({
    mainPane: SC.PanelPane.design({
        layout: { centerX: 0, centerY: 0, width: 570, height: 445 },
        
        contentView: SC.View.design({
            classNames: "bespin-color-field".w(),
            childViews: "form".w(),
            form: SC.View.design({
                classNames: "bespin-form".w(),
                
                childViews: ("title urlLabel urlField projectNameField " +
                    "projectNameLabel vcsTypeLabel vcsTypeField vcsUserField " +
                    "vcsUserLabel remoteauthField remoteauthLabel " +
                    "pushField pushLabel authTypeField authTypeLabel " +
                    "usernameField usernameLabel passwordField " + 
                    "passwordLabel cancel ok").w(),

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
                    layout: { left: 10, top: 39, width: 225, height: 24 }
                }),

                urlLabel: SC.LabelView.design({
                    layout: {
                        left: 10,
                        top: 63,
                        width: 225,
                        height: 14
                    },
                    value: "URL"
                }),

                projectNameField: SC.TextFieldView.design({
                    layout: {
                        left: 10,
                        top: 82,
                        width: 225,
                        height: 24
                    },
                    valueBinding: "vcs:clone#cloneController.projectName"
                }),

                projectNameLabel: SC.LabelView.design({
                    layout: {
                        left: 10,
                        top: 106,
                        width: 200,
                        height: 35
                    },
                    value: "Project Name (defaults to the last part of the URL)"
                }),
                
                vcsTypeLabel: SC.LabelView.design({
                    layout: {
                        left: 10,
                        top: 168,
                        width: 200,
                        height: 15
                    },
                    value: "Version control system:"
                }),
                
                vcsTypeField: SC.RadioView.design({
                    layout: {
                        left: 10,
                        top: 188,
                        width: 225,
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
                        top: 264,
                        width: 225,
                        height: 24
                    },
                    valueBinding: "vcs:clone#cloneController.vcsUser",
                    isEnabledBinding: "vcs:clone#cloneController.allowsUser"
                }),
                
                vcsUserLabel: SC.LabelView.design({
                    layout: {
                        left: 10,
                        top: 288,
                        width: 225,
                        height: 20
                    },
                    value: "VCS Username (used for commit logs)",
                    isEnabledBinding: "vcs:clone#cloneController.allowsUser"
                }),
                
                pushField: SC.TextFieldView.design({
                    layout: {
                        left: 10,
                        top: 318,
                        width: 225,
                        height: 24
                    },
                    valueBinding: "vcs:clone#cloneController.push"
                }),
                
                pushLabel: SC.LabelView.design({
                    layout: {
                        left: 10,
                        top: 343,
                        width: 200,
                        height: 50
                    },
                    value: "Push to URL (if different from the read URL)"
                }),
                
                remoteauthLabel: SC.LabelView.design({
                    layout: {
                        left: 310,
                        top: 39,
                        width: 225,
                        height: 14
                    },
                    value: "Authentication is required:"
                }),
                
                remoteauthField: SC.RadioView.design({
                    layout: {
                        left: 310,
                        top: 64,
                        width: 250,
                        height: 85
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
                
                authTypeLabel: SC.LabelView.design({
                    layout: {
                        left: 310,
                        top: 168,
                        width: 225,
                        height: 19
                    },
                    value: "Type of authentication:"
                }),
                
                authTypeField: SC.RadioView.design({
                    layout: {
                        left: 310,
                        top: 189,
                        width: 225,
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
                    valueBinding: "vcs:clone#cloneController.authType",
                    isEnabledBinding: "vcs:clone#cloneController.hasAuth"
                }),
                
                usernameField: SC.TextFieldView.design({
                    layout: {
                        left: 310,
                        top: 264,
                        width: 225,
                        height: 24
                    },
                    valueBinding: "vcs:clone#cloneController.username",
                    isEnabledBinding: "vcs:clone#cloneController.hasAuth"
                }),
                
                usernameLabel: SC.LabelView.design({
                    layout: {
                        left: 310,
                        top: 290,
                        width: 225,
                        height: 14
                    },
                    value: "Username",
                    isEnabledBinding: "vcs:clone#cloneController.hasAuth"
                }),
                
                passwordField: SC.TextFieldView.design({
                    layout: {
                        left: 310,
                        top: 314,
                        width: 225,
                        height: 24
                    },
                    valueBinding: "vcs:clone#cloneController.password",
                    isEnabledBinding: "vcs:clone#cloneController.isUserPass"
                }),
                
                passwordLabel: SC.LabelView.design({
                    layout: {
                        left: 310,
                        top: 339,
                        width: 225,
                        height: 14
                    },
                    value: "Password",
                    isEnabledBinding: "vcs:clone#cloneController.isUserPass"
                }),
                
                cancel: SC.ButtonView.design({
                    layout: { left: 10, top: 395, width: 100, height: 37 },
                    isCancel: true,
                    title: "Cancel",
                    target: "vcs:clone#cloneController",
                    action: "cancel"
                }),
                
                ok: SC.ButtonView.design({
                    layout: { left: 450, top: 395, width: 100, height: 37 },
                    isDefault: true,
                    title: "Checkout",
                    target: "vcs:clone#cloneController",
                    action: "clone"
                })
                
            })
        })
    })
});

exports.cloneCommand = function(env, args, request) {
    request.async();
    exports.cloneController.show(request);
};

/**
 * Clone a remote repository
 */
exports.cloneNewProject = function(data) {
    return server.requestDisconnected("POST", "/vcs/clone/", data);
};

