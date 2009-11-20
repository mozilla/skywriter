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

var SC = require("sproutcore/runtime:package").SC;
var util = require("bespin:util/util");
var view = require("editor:view");
var bespin = require("bespin");

exports.showSignup = function() {
    view.app.getPath("signupPage.mainPane").append();
    // exports.app.signupPage.makeFirstResponder(pane.contentView.firstName);
};

/**
 * Controller for the sign-in process
 */
exports.signupController = bespin.BaseController.extend({
    /** @see BaseController */
    requires: {
        server: 'server'
    },

    username: "",

    password: "",

    signIn: function() {
        this.server.login(this.username, this.password, this.onSuccess,
                this.onFailure);
    },

    /**
     * The login worked.
     */
    onSuccess: function() {
        console.log("login succeeded");
    },

    /**
     * The login failed.
     */
    onFailure: function() {
        console.log("login failed");
    }
});

/**
 * Controller for the registration process
 */
exports.registerController = bespin.BaseController.create({
    /** @see BaseController */
    requires: {
        server: 'server'
    },

    username: "",
    usernameError: "",
    usernameCheck: function() {
        this.usernameError = this.username.length > 4 ? "" :
                "Must be 4 characters or more";
    }.bind(".username"),

    password1: "",
    password1Error: "",
    password1Check: function() {
        this.password1Error = this.password1.length >= 6 ? "" :
                "Must be 6 characters or more";
    }.bind(".password1"),

    password2: "",
    password2Error: "",
    password2Check: function() {
        this.password2Error = this.password1 == this.password2 ? "" :
                "Passwords do not match";
    }.bind(".password2"),

    /**
     * Email is only used for
     */
    email: "",
    emailError: "",
    emailCheck: function() {
        this.emailError = this.password1 == this.email ? "" :
                "Passwords do not match";
    }.bind(".email"),

    register: function() {
        var opts = {
            onSuccess: this.onSuccess.bind(this),
            onFailure: this.onFailure.bind(this)
        };
        // this.server.signup(this.username, this.password1, this.email, opts);
    }
}),

/**
 *
 */
view.app.signupPage = SC.Page.design({

    nowShowing: 'container1',

    showRegisterView: function() {
        this.set('nowShowing', 'register');
        console.log("register");
    },

    mainPane: SC.PanelPane.design({
        classNames: [ "bespin-theme" ],
        layout: { centerX: 0, width: 400, centerY: 0, height: 240 },

        contentView: SC.View.design({
            backgroundColor: '#D1CFC1',
            childViews: [ "action", "loginView" ],

            action: SC.RadioView.design({
                layout: { top: 45, left: 140 },
                valueBinding: "signupController.action",
                items: [ "I have a Bespin account", "I'm new" ]
            }),

            loginView: SC.View.design({
                layout: { top: 100, left: 10 },
                childViews: [ "userLabel", "userField", "passwordLabel", "passwordField", "submit" ],

                userLabel: SC.LabelView.design({
                    value: "Username:",
                    layout: { right: 400-150, top: 0 },
                    textAlign: "right"
                }),

                userField: SC.TextFieldView.design({
                    valueBinding: "signupController.username",
                    layout: { left: 150, top: 0, height: 20, width: 100 }
                }),

                passwordLabel: SC.LabelView.design({
                    value: "Password:",
                    layout: { right: 400-150, top: 30 },
                    textAlign: "right"
                }),

                passwordField: SC.TextFieldView.design({
                    valueBinding: "signupController.password",
                    layout: { left: 150, top: 30, height: 20, width: 100 }
                }),

                submit: SC.ButtonView.design({
                    layout: { left: 150, top: 60, width: 80 },
                    isDefault: true,
                    title: "Log in",
                    target: "signupController",
                    action: "signIn"
                })

            }),
            registerView: SC.View.design({
                layout: {},
                childViews: [
                ]
            })
        })
    })
});
