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

var SC = require("sproutcore/runtime").SC;
var util = require("bespin:util/util");
var bespin = require("bespin");
var server = require("BespinServer").server;

/**
 * Begin the login process
 */
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
        
        // Load the plugin metadata for the user's plugins
        var body = document.body;
        var el = document.createElement('script');
        el.setAttribute('src', "/server/plugin/register/user");
        body.appendChild(el);
        
        console.log("login succeeded");
    },

    /**
     * The login failed.
     */
    onFailure: function() {
        var pane = SC.AlertPane.error("Login Failed",
                "Your Username or Password was not recognized");
        pane.append();
        console.log("login failed");
    }
});

/**
 * Controller for the registration process
 */
exports.signupController = SC.Object.create({
    username: "",
    usernameError: "",

    password1: "",
    password1Error: "",

    password2: "",
    password2Error: "",

    email: "",
    emailError: "",

    /**
     * We only validate fields that have been edited
     */
    changed: {},

    /**
     * Called by commitEditing() on
     */
    validate: function(field) {
        // We do nothing if the field is empty.
        if (this.get(field) == "") {
            return;
        }
        
        this.changed[field] = true;

        if (this.changed.username) {
            var usernameError = this.get('username').length > 3 ? "" :
                    "At least 4 chars";
            this.set("usernameError", usernameError);
        }

        if (this.changed.password1) {
            var password1Error = '';
            var l= this.get('password1').length;
            if (l < 6) {
                password1Error = "At least 6 chars";
            } else if (l > 20) {
                password1Error = "Maximum 20 chars";
            }
            this.set("password1Error", password1Error);
        }

        if (this.changed.password1 && this.changed.password2) {
            var password2Error = (this.get('password1') == this.get('password2'))
                    ? "" : "Have to match";
            this.set("password2Error", password2Error);
        }
    },

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
        console.log("signup succeeded");
    },

    /**
     * The sign up failed.
     */
    onFailure: function(xhr) {
        var pane = SC.AlertPane.error("Signup Failed", xhr.responseText);
        pane.append();
        console.log("signup failed");
    }
});

/**
 *
 */
exports.userIdentPage = SC.Page.design({

    mainPane: SC.PanelPane.design({
        classNames: [ "bespin-theme" ],
        layout: { centerX: 0, width: 400, centerY: 0, height: 270 },

        contentView: SC.View.design({
            backgroundColor: '#D1CFC1',
            childViews: [ "action", "container" ],
            action: SC.RadioView.design({
                layout: { top: 20, left: 140 },
                itemValueKey: 'value',
                itemTitleKey: 'title',
                items: [
                    { title: "I have a Bespin account", value: "loginView" },
                    { title: "I'm new", value: "signupView" }
                ],
                value: "loginView"
            }),

            container: SC.ContainerView.design({
                nowShowingBinding: "UserIdent#userIdentPage.mainPane.contentView.action.value",
                contentViewDidChange: function() {
                    arguments.callee.base.apply(this, arguments); //sc_super()
                    setTimeout(function() {
                        this.mainPane.makeFirstResponder(this.getPath(this.mainPane.contentView.action.value + ".usernameField"));
                    }.bind(exports.userIdentPage), 0);
                    /**
                     * TODO: The mainPane's height should be different for the loginView or the signupView.
                     * How to do this?
                     */
                },
                layout: { left: 0, top: 75, right: 0, bottom: 0 }
            }),
        })
    }),

    loginView: SC.View.design({          
        layout: { left: 0, top: 0, right: 0, bottom: 0 },
        childViews: [
            "usernameLabel", "usernameField",
            "passwordLabel", "passwordField",
            "submit"
        ],

        usernameLabel: SC.LabelView.design({
            value: "Username:",
            layout: { right: 400-150, top: 5 },
            textAlign: "right"
        }),

        usernameField: SC.TextFieldView.design({
            valueBinding: "UserIdent#loginController.username",
            layout: { left: 155, top: 5, height: 20, width: 100 }
        }),

        passwordLabel: SC.LabelView.design({
            value: "Password:",
            layout: { right: 400-150, top: 35 },
            textAlign: "right"
        }),

        passwordField: SC.TextFieldView.design({
            valueBinding: "UserIdent#loginController.password",
            isPassword: true,
            layout: { left: 155, top: 35, height: 20, width: 100 }
        }),

        submit: SC.ButtonView.design({
            layout: { left: 155, top: 65, width: 100 },
            isDefault: true,
            title: "Log in",
            target: "UserIdent#loginController",
            action: "login"
        })
    }),

    signupView: SC.View.design({
        layout: { left: 0, top: 0, right: 0, bottom: 0 },
        childViews: [
            "usernameLabel", "usernameField", "usernameError",
            "password1Label", "password1Field", "password1Error",
            "password2Label", "password2Field", "password2Error",
            "emailLabel", "emailField", "emailError", "emailHint",
            "submit"
        ],

        usernameLabel: SC.LabelView.design({
            value: "Username:",
            layout: { right: 400-150, top: 5 },
            textAlign: "right"
        }),

        usernameField: SC.TextFieldView.design({
            layout: { left: 155, top: 5, height: 20, width: 105 },
            valueBinding: "UserIdent#signupController.username",
            commitEditing: function() {
                arguments.callee.base.apply(this, arguments); //sc_super
                exports.signupController.validate("username");
                return true;
            }
        }),

        usernameError: SC.LabelView.design({
            classNames: [ "signupValidationError" ],
            layout: { left: 265, top: 0, height: 30, width: 120 },
            valueBinding: "UserIdent#signupController.usernameError"
        }),

        password1Label: SC.LabelView.design({
            value: "Password:",
            layout: { right: 400-150, top: 35 },
            textAlign: "right"
        }),

        password1Field: SC.TextFieldView.design({
            isPassword: true,
            layout: { left: 155, top: 35, height: 20, width: 105 },
            valueBinding: "UserIdent#signupController.password1",
            commitEditing: function() {
                arguments.callee.base.apply(this, arguments); //sc_super
                exports.signupController.validate("password1");
                return true;
            }
        }),

        password1Error: SC.LabelView.design({
            classNames: [ "signupValidationError" ],
            layout: { left: 265, top: 35, height: 30, width: 120 },
            valueBinding: "UserIdent#signupController.password1Error"
        }),

        password2Label: SC.LabelView.design({
            value: "Password (confirm):",
            layout: { right: 400-150, top: 65 },
            textAlign: "right"
        }),

        password2Field: SC.TextFieldView.design({
            isPassword: true,
            layout: { left: 155, top: 65, height: 20, width: 105 },
            valueBinding: "UserIdent#signupController.password2",
            commitEditing: function() {
                arguments.callee.base.apply(this, arguments); //sc_super
                exports.signupController.validate("password2");
                return true;
            }
        }),

        password2Error: SC.LabelView.design({
            classNames: [ "signupValidationError" ],
            layout: { left: 265, top: 65, height: 30, width: 120 },
            valueBinding: "UserIdent#signupController.password2Error"
        }),

        emailLabel: SC.LabelView.design({
            value: "Email (optional):",
            layout: { right: 400-150, top: 95 },
            textAlign: "right"
        }),

        emailField: SC.TextFieldView.design({
            layout: { left: 155, top: 95, height: 20, width: 105 },
            valueBinding: "UserIdent#signupController.email"
        }),

        emailError: SC.LabelView.design({
            classNames: [ "signupValidationError" ],
            layout: { left: 265, top: 95, height: 30, width: 120 },
            valueBinding: "UserIdent#signupController.emailError"
        }),
        
        submit: SC.ButtonView.design({
            layout: { left: 155, top: 125, width: 105 },
            isDefault: true,
            title: "Sign up",
            target: "UserIdent#signupController",
            action: "signup"
        }),
        
        emailHint: SC.LabelView.design({
            classNames: [ "signupValidationNote" ],
            textAlign: "center",
            layout: { left: 50, top: 160, height: 30, width: 300 },
            value: "(Email optional - only used for password recovery)"
        })
    })
});
