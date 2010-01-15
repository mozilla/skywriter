/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is
 * Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

"define metadata";
({
    "depends": [ "BespinServer" ],
    "provides":
    [
        {
            "ep": "DISABLED startup",
            "pointer": "#showSignup"
        }
    ]
});
"end";

var SC = require("sproutcore/runtime").SC;
var util = require("bespin:util/util");
var server = require("BespinServer").server;
var catalog = require("bespin:plugins").catalog;

/**
 * Begin the login process
 */
exports.showSignup = function() {
    // FIXME: currently broken --pcw
    exports.userIdentPage.get("mainPane").append();
};

/**
 * Controller for the sign-in process
 */
exports.loginController = SC.Object.create({
    username: "",

    password: "",

    login: function() {
        server.login(this.get("username"), this.get("password"),
            this.onSuccess, this.onFailure);
    },

    /**
     * The login worked.
     */
    onSuccess: function() {
        exports.userIdentPage.get("mainPane").remove();

        // Load the plugin metadata for the user's plugins
        catalog.loadMetadata(server.SERVER_BASE_URL + "/plugin/register/user");

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
    isValid: true,

    username: "",
    usernameError: "",

    password1: "",
    password1Error: "",

    password2: "",
    password2Error: "",

    email: "",
    emailHint: "(Email optional - only used for password recovery)",

    dump: '',

    /**
     * We only validate fields that have been edited
     */
    changed: {},

    /**
     * Called by commitEditing() on
     */
    validate: function(field) {
        if (field !== undefined) {
            // We do nothing if the field is empty.
            if (this.get(field) == "") {
                return;
            }

            this.changed[field] = true;
        }

        // Store the isValid information in a local var to keep from calling set(...) all the time.
        // The value of this.isValid will be set at the end of this function.
        var isValid = true;

        if (this.changed.username || this.get('username') != '') {
            var usernameError = '';
            if (this.get('username').length < 4) {
                usernameError = "At least 4 chars";
                isValid = false;
            }
            this.set("usernameError", usernameError);
        }

        if (this.changed.password1  || this.get('password1') != '') {
            var password1Error = '';
            var l= this.get('password1').length;
            if (l < 6) {
                password1Error = "At least 6 chars";
                isValid = false;
            } else if (l > 20) {
                password1Error = "Maximum 20 chars";
                isValid = false;
            }
            this.set("password1Error", password1Error);
        }

        if ((this.changed.password1  || this.get('username') != '') && (this.changed.password2  || this.get('password2') != '')) {
            var password2Error = '';
            if (this.get('password1') != this.get('password2')) {
                password2Error = "Have to match";
                isValid = false;
            }
            this.set("password2Error", password2Error);
        }

        if (this.changed.email || this.get('email' != '')) {
            if (!this.get('email').match(/.+@.+\...+/)) {
                this.set("emailHint", "When email is given, it has to be a valid format");
                isValid = false;
            } else {
                this.set("emailHint", "(Email optional - only used for password recovery)");
            }
        }

        this.set('isValid', isValid);
    },

    /**
     * Attempt to register
     */
    signup: function() {
        var pane;

        // validates the form.
        this.validate();

        if (!this.get('isValid')) {
            pane = SC.AlertPane.error("Correct your signup", "Please correct your signup information.");
            pane.append();
        } else if (this.get('username') == '' || this.get('password1') == '') {
            pane = SC.AlertPane.error("Correct your signup", "Please fill up all required fields (username + password).");
            pane.append();
        } else {
            var opts = {
                onSuccess: this.onSuccess.bind(this),
                onFailure: this.onFailure.bind(this)
            };
            server.signup(this.username, this.password1, this.email, opts);
        }
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
                itemValueKey: 'value',
                itemTitleKey: 'title',
                items: [
                    { title: "I have a Bespin account", value: "loginView" },
                    { title: "I'm new", value: "signupView" }
                ],
                value: "loginView",
                layout: { top: 20, left: 140 }
            }),

            container: SC.ContainerView.design({
                nowShowingBinding: "UserIdent#userIdentPage.mainPane.contentView.action.value",
                contentViewDidChange: function() {
                    arguments.callee.base.apply(this, arguments);
                    setTimeout(function() {
                        this.mainPane.makeFirstResponder(this.getPath(this.mainPane.contentView.action.value + ".usernameField"));
                    }.bind(exports.userIdentPage), 0);
                    /**
                     * TODO: The mainPane's height should be different for the loginView or the signupView.
                     * How to do this?
                     */
                },
                layout: { left: 0, top: 75, right: 0, bottom: 0 }
            })
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
            textAlign: "right",
            layout: { right: 400-150, top: 5 }
        }),

        usernameField: SC.TextFieldView.design({
            valueBinding: "UserIdent#loginController.username",
            hint: "Your username",
            layout: { left: 155, top: 5, height: 20, width: 100 }
        }),

        passwordLabel: SC.LabelView.design({
            value: "Password:",
            textAlign: "right",
            layout: { right: 400-150, top: 35 }
        }),

        passwordField: SC.TextFieldView.design({
            valueBinding: "UserIdent#loginController.password",
            hint: "Your password",
            isPassword: true,
            layout: { left: 155, top: 35, height: 20, width: 100 }
        }),

        submit: SC.ButtonView.design({
            title: "Log in",
            isDefault: true,
            target: "UserIdent#loginController",
            action: "login",
            layout: { left: 155, top: 65, width: 100 }
        })
    }),

    signupView: SC.View.design({
        layout: { left: 0, top: 0, right: 0, bottom: 0 },
        childViews: [
            "usernameLabel", "usernameField", "usernameError",
            "password1Label", "password1Field", "password1Error",
            "password2Label", "password2Field", "password2Error",
            "emailLabel", "emailField", "emailHint",
            "submit"
        ],

        usernameLabel: SC.LabelView.design({
            value: "Username:",
            textAlign: "right",
            layout: { right: 400-150, top: 5 }
        }),

        usernameField: SC.TextFieldView.design({
            valueBinding: "UserIdent#signupController.username",
            hint: "At least 4 chars",
            commitEditing: function() {
                arguments.callee.base.apply(this, arguments);
                exports.signupController.validate("username");
                return true;
            },
            layout: { left: 155, top: 5, height: 20, width: 105 }
        }),

        usernameError: SC.LabelView.design({
            classNames: [ "signupValidationError" ],
            valueBinding: "UserIdent#signupController.usernameError",
            layout: { left: 265, top: 0, height: 30, width: 120 }
        }),

        password1Label: SC.LabelView.design({
            value: "Password:",
            textAlign: "right",
            layout: { right: 400-150, top: 35 }
        }),

        password1Field: SC.TextFieldView.design({
            isPassword: true,
            valueBinding: "UserIdent#signupController.password1",
            hint: "At least 6 chars",
            commitEditing: function() {
                arguments.callee.base.apply(this, arguments);
                exports.signupController.validate("password1");
                return true;
            },
            layout: { left: 155, top: 35, height: 20, width: 105 }
        }),

        password1Error: SC.LabelView.design({
            classNames: [ "signupValidationError" ],
            valueBinding: "UserIdent#signupController.password1Error",
            layout: { left: 265, top: 35, height: 30, width: 120 }
        }),

        password2Label: SC.LabelView.design({
            value: "Password (confirm):",
            textAlign: "right",
            layout: { right: 400-150, top: 65 }
        }),

        password2Field: SC.TextFieldView.design({
            isPassword: true,
            valueBinding: "UserIdent#signupController.password2",
            hint: "Repeat it",
            commitEditing: function() {
                arguments.callee.base.apply(this, arguments);
                exports.signupController.validate("password2");
                return true;
            },
            layout: { left: 155, top: 65, height: 20, width: 105 }
        }),

        password2Error: SC.LabelView.design({
            classNames: [ "signupValidationError" ],
            valueBinding: "UserIdent#signupController.password2Error",
            layout: { left: 265, top: 65, height: 30, width: 120 }
        }),

        emailLabel: SC.LabelView.design({
            value: "Email (optional):",
            textAlign: "right",
            layout: { right: 400-150, top: 95 }
        }),

        emailField: SC.TextFieldView.design({
            valueBinding: "UserIdent#signupController.email",
            hint: "email@example.com",
            commitEditing: function() {
                arguments.callee.base.apply(this, arguments);
                exports.signupController.validate("email");
                return true;
            },
            layout: { left: 155, top: 95, height: 20, width: 200 }
        }),

        submit: SC.ButtonView.design({
            isDefault: true,
            title: "Sign up",
            target: "UserIdent#signupController",
            action: "signup",
            layout: { left: 155, top: 160, width: 105 }
        }),

        emailHint: SC.LabelView.design({
            classNames: [ "signupValidationNote" ],
            textAlign: "center",
            valueBinding: "UserIdent#signupController.emailHint",
            layout: { left: 50, top: 125, height: 30, width: 300 }
        })
    })
});
