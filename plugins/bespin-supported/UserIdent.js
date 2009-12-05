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
        this.changed[field] = true;

        if (this.changed.username) {
            var usernameError = this.get('username').length > 4 ? "" :
                    "Must be 4 characters or more";
            this.set("usernameError", usernameError);
        }

        if (this.changed.password1) {
            var password1Error = this.get('password1').length >= 6 ? "" :
                    "Must be 6 characters or more";
            this.set("password1Error", password1Error);
        }

        if (this.changed.password1 && this.changed.password2) {
            var password2Error = (this.get('password1') == this.get('password2'))
                    ? "" : "Passwords do not match";
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
        
        var newView = this.get("action") + "View";
        /**
         * The TextFieldView usernameField should be focused. We can't call mainPane.makeFirstResponder(...)
         * by now, as the newView is not yet displayed => got to wait till the current call stack is done and
         * the newView is displayed. This is achieved by using setTimeout(..., 0).
         * TODO: Find a better solution for this.
         */
        setTimeout(function() {
            mainPane.makeFirstResponder(exports.userIdentPage.getPath(newView + ".usernameField"));
        }.bind(this), 0);
        return newView;
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
            layout: { right: 400-150, top: 0 },
            textAlign: "right"
        }),

        usernameField: SC.TextFieldView.design({
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
            "usernameLabel", "usernameField", "usernameError",
            "password1Label", "password1Field", "password1Error",
            "password2Label", "password2Field", "password2Error",
            "emailLabel", "emailField", "emailError",
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
                // TODO: Surely we should use exports.signupController here?
                window.signupController.validate("username");
            }
        }),

        usernameError: SC.LabelView.design({
            classNames: [ "signupValidationError" ],
            layout: { left: 265, top: 0, height: 30, width: 120 },
            valueBinding: "signupController.usernameError"
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
                // TODO: Surely we should use exports.signupController here?
                window.signupController.validate("password1");
            }
        }),

        password1Error: SC.LabelView.design({
            classNames: [ "signupValidationError" ],
            layout: { left: 265, top: 30, height: 30, width: 120 },
            valueBinding: "signupController.password1Error"
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
                // TODO: Surely we should use exports.signupController here?
                window.signupController.validate("password2");
            }
        }),

        password2Error: SC.LabelView.design({
            classNames: [ "signupValidationError" ],
            layout: { left: 265, top: 60, height: 30, width: 120 },
            valueBinding: "signupController.password2Error"
        }),

        emailLabel: SC.LabelView.design({
            value: "Email:",
            layout: { right: 400-150, top: 95 },
            textAlign: "right"
        }),

        emailField: SC.TextFieldView.design({
            layout: { left: 155, top: 95, height: 20, width: 105 },
            valueBinding: "UserIdent#signupController.email"
        }),

        emailError: SC.LabelView.design({
            classNames: [ "signupValidationNote" ],
            layout: { left: 265, top: 90, height: 30, width: 120 },
            value: "(Optional - only used for password recovery)"
        }),

        submit: SC.ButtonView.design({
            layout: { left: 155, top: 125, width: 80 },
            isDefault: true,
            title: "Sign up",
            target: "UserIdent#signupController",
            action: "signup"
        })
    })
});
