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

// ---plugin.json---
var metadata = {
    "depends": ["BespinServer"],
    "provides": [ {
            "ep": "startup",
            "pointer": "#showSignup"
        }
    ]
};
// ---

var SC = require("sproutcore/runtime:package").SC;
var util = require("bespin:util/util");
var bespin = require("bespin");
var server = require("BespinServer").server;

exports.showSignup = function() {
    exports.userIdentPage.get("mainPane").append();
};

/**
 * Controller for the sign-in process
 */
exports.loginController = SC.Object.create({
    username: "",

    password: "",

    login: function() {
        server.login(this.username, this.password, this.onSuccess,
                this.onFailure);
    },

    /**
     * The login worked.
     */
    onSuccess: function() {
        exports.userIdentPage.get("mainPane").remove();
        console.log("login succeeded");
    },

    /**
     * The login failed.
     */
    onFailure: function() {
        var pane = SC.AlertPane.error("Login Failed", 'Your Username or Password was not recognized');
        pane.append();
        console.log("login failed");
    }
});

/**
 * Controller for the registration process
 */
exports.signupController = SC.Object.create({
    username: "",
    usernameError: function() {
        var usernameError = this.get('username').length > 4 ? "" :
                "Must be 4 characters or more";
        console.log(usernameError);
    }.property("username").cacheable(),

    password1: "",
    password1Error: function() {
        var password1Error = this.get('password1').length >= 6 ? "" :
                "Must be 6 characters or more";
        console.log(password1Error);
    }.property("password1").cacheable(),

    password2: "",
    password2Error: function() {
        var password2Error = this.get('password1') == this.get('password2') ? "" :
                "Passwords do not match";
        console.log(password2Error);
    }.property("password2", "password1").cacheable(),

    /**
     * Email is only used for
     */
    email: "",
    emailError: "",

    /**
     * Attempt to register
     */
    signup: function() {
        var opts = {
            onSuccess: this.onSuccess.bind(this),
            onFailure: this.onFailure.bind(this)
        };
        server.signup(this.username, this.password1, this.email, opts);
    },

    /**
     * The sign up worked.
     */
    onSuccess: function() {
        exports.userIdentPage.get("mainPane").remove();
        console.log("login succeeded");
    },

    /**
     * The sign up failed.
     */
    onFailure: function(xhr) {
        var pane = SC.AlertPane.error("Signup Failed", xhr.responseText);
        pane.append();
        console.log("login failed");
    }
});

/**
 * UI change controller
 */
exports.dumbController = SC.Object.create({
    action: "login",
    actionView: function() {
        var mainPane = exports.userIdentPage.get("mainPane");
        mainPane.get("layout").height = 450;
        mainPane.set("layerNeedsUpdate", true);
        
        return this.get("action") + "View";
    }.property("action").cacheable()
});

/**
 *
 */
exports.userIdentPage = SC.Page.design({

    mainPane: SC.PanelPane.design({
        classNames: [ "bespin-theme" ],
        layout: { centerX: 0, width: 400, centerY: 0, height: 240 },

        contentView: SC.View.design({
            backgroundColor: '#D1CFC1',
            childViews: [ "action", "container" ],
            action: SC.RadioView.design({
                layout: { top: 45, left: 140 },
                valueBinding: "UserIdent#dumbController.action",
                itemValueKey: 'value',
                itemTitleKey: 'title',
                items: [
                    { title: "I have a Bespin account", value: "login" },
                    { title: "I'm new", value: "signup" }
                ]
            }),

            container: SC.ContainerView.design({
                nowShowingBinding: "UserIdent#dumbController.actionView",
                layout: { left: 0, top: 100, right: 0, bottom: 0 }
            })
        })
    }),

    loginView: SC.View.design({
        layout: { left: 0, top: 0, right: 0, bottom: 0 },
        childViews: [
            "userLabel", "userField",
            "passwordLabel", "passwordField",
            "submit"
        ],

        userLabel: SC.LabelView.design({
            value: "Username:",
            layout: { right: 400-150, top: 0 },
            textAlign: "right"
        }),

        userField: SC.TextFieldView.design({
            valueBinding: "UserIdent#loginController.username",
            blur: function() { console.log("hai"); },
            layout: { left: 155, top: 0, height: 20, width: 100 }
        }),

        passwordLabel: SC.LabelView.design({
            value: "Password:",
            layout: { right: 400-150, top: 30 },
            textAlign: "right"
        }),

        passwordField: SC.TextFieldView.design({
            valueBinding: "UserIdent#loginController.password",
            isPassword: true,
            layout: { left: 155, top: 30, height: 20, width: 100 }
        }),

        submit: SC.ButtonView.design({
            layout: { left: 155, top: 60, width: 80 },
            isDefault: true,
            title: "Log in",
            target: "UserIdent#loginController",
            action: "login"
        })
    }),

    signupView: SC.View.design({
        layout: { left: 0, top: 0, right: 0, bottom: 0 },
        childViews: [
            "userLabel", "userField",
            "password1Label", "password1Field",
            "password2Label", "password2Field",
            "emailLabel", "emailField",
            "submit"
        ],

        userLabel: SC.LabelView.design({
            value: "Username:",
            layout: { right: 400-150, top: 0 },
            textAlign: "right"
        }),

        userField: SC.TextFieldView.design({
            valueBinding: "UserIdent#signupController.username",
            layout: { left: 155, top: 0, height: 20, width: 100 }
        }),

        password1Label: SC.LabelView.design({
            value: "Password:",
            layout: { right: 400-150, top: 30 },
            textAlign: "right"
        }),

        password1Field: SC.TextFieldView.design({
            valueBinding: "UserIdent#signupController.password1",
            layout: { left: 155, top: 30, height: 20, width: 100 }
        }),

        password2Label: SC.LabelView.design({
            value: "Password (confirm):",
            layout: { right: 400-150, top: 60 },
            textAlign: "right"
        }),

        password2Field: SC.TextFieldView.design({
            valueBinding: "UserIdent#signupController.password2",
            layout: { left: 155, top: 60, height: 20, width: 100 }
        }),

        emailLabel: SC.LabelView.design({
            value: "Email:",
            layout: { right: 400-150, top: 90 },
            textAlign: "right"
        }),

        emailField: SC.TextFieldView.design({
            valueBinding: "UserIdent#signupController.email",
            layout: { left: 155, top: 90, height: 20, width: 100 }
        }),

        submit: SC.ButtonView.design({
            layout: { left: 155, top: 120, width: 80 },
            isDefault: true,
            title: "Sign up",
            target: "UserIdent#signupController",
            action: "signup"
        })
    })
});
