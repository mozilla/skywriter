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
    "description": "Identifies the user via a Bespin server",
    "depends": [ "BespinServer", "DelegateSupport" ]
});
"end";

var SC = require("sproutcore/runtime").SC;
var MultiDelegateSupport = require('DelegateSupport').MultiDelegateSupport;
var util = require("bespin:util/util");
var server = require("BespinServer").server;
var catalog = require("bespin:plugins").catalog;
var console = require('bespin:console').console;

/**
 * Controller for the sign-in process
 */
exports.loginController = SC.Object.create(MultiDelegateSupport, {
    username: "",

    password: "",

    login: function() {
        server.login(this.get("username"), this.get("password"),
            this.onSuccess.bind(this), this.onFailure.bind(this));
    },

    /**
     * The login failed.
     */
    onFailure: function() {
        var pane = SC.AlertPane.error("Login Failed",
                "Your Username or Password was not recognized");
        pane.append();
        pane.becomeKeyPane();
    },

    /**
     * The login worked.
     */
    onSuccess: function() {
        exports.userIdentPage.get("mainPane").remove();

        // Load the plugin metadata for the user's plugins
        catalog.loadMetadata(server.SERVER_BASE_URL + "/plugin/register/user");

        this.notifyDelegates('loginControllerAcceptedLogin');
    },

    show: function() {
        var username;
        var password;

        try {
            if (window.localStorage) {
                username = localStorage.getItem("username");
                password = localStorage.getItem("password");
            }
        }
        catch (ex) {
            console.error("localStorage blew up. ignoring auto-login. Do you have cookies disabled?", ex);
        }

        var onFailure = function() {
            console.error("Login failed for ", username);
            var pane = exports.userIdentPage.get('mainPane');
            pane.append();
            pane.becomeKeyPane();

            this.onFailure();
        }.bind(this);

        if (username && password) {
            server.login(username, password,
                this.onSuccess.bind(this), onFailure);
        } else {
            var pane = exports.userIdentPage.get('mainPane');
            pane.append();
            pane.becomeKeyPane();
        }
    }
});

/**
 * Setup auto-login shortcut
 */
exports.autoLogin = function(username, password) {
    if (window.localStorage) {
        if (!username) {
            localStorage.removeItem("username");
            localStorage.removeItem("password");
            console.log("Removed auto-login info");
        } else {
            localStorage.setItem("username", username);
            localStorage.setItem("password", password);
            console.log("Added auto-login info for " + username);
        }
    } else {
        console.error("window.localStorage is not supported");
    }
};

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
        layout: { centerX: 0, width: 560 + 20, centerY: 0, height: 291 + 30 },

        contentView: SC.View.design({
            layout: { left: 0, top: 0, bottom: 0, right: 0 },
            classNames: "bespin-color-field".w(),
            childViews: "welcome form logo".w(),

            welcome: SC.View.design({
                childViews: "h1 p".w(),

                layout: {
                    left:   11,
                    top:    16,
                    width:  300,
                    height: 263
                },

                h1: SC.LabelView.design({
                    layout: {
                        left:   10,
                        top:    10,
                        width:  290,
                        height: 78
                    },

                    value: "Welcome to Bespin",
                    controlSize: SC.HUGE_CONTROL_SIZE,
                    fontWeight: 'bold'
                }),

                p: SC.LabelView.design({
                    layout: {
                        left:   10,
                        top:    113,
                        width:  290,
                        height: 144
                    },

                    value:  "The Bespin project is building a web-based " +
                            "code editor using the emerging HTML 5 " +
                            "standard. The editor is easily extensible with " +
                            "JavaScript and can be used in your own " +
                            "applications or on our experimental hosted " +
                            "service.",

                    classNames: "bespin-informational".w()
                })
            }),

            form: SC.View.design({
                childViews: "action container".w(),
                layout: {
                    left:   310 + 2 + 10,
                    top:    15 + 2,
                    width:  220,
                    height: 257
                },

                classNames: "bespin-form".w(),

                action: SC.RadioView.design({
                    layout: {
                        left:   10 + 10,
                        top:    15 + 6,
                        width:  210,
                        height: 61
                    },

                    itemValueKey: 'value',
                    itemTitleKey: 'title',
                    items: [
                        {
                            title: "I have a Bespin account",
                            value: 'loginView'
                        },
                        {
                            title: "I'm new",
                            value: 'signupView'
                        }
                    ],
                    value: "loginView"
                }),

                container: SC.ContainerView.design({
                    layout: {
                        left:   10,
                        top:    191 - 76,
                        width:  220,
                        height: 299 + 37 - 76
                    },

                    nowShowingBinding: "UserIdent#userIdentPage.mainPane." +
                        "contentView.form.action.value",

                    contentViewDidChange: function() {
                        arguments.callee.base.apply(this, arguments);
                        setTimeout(function() {
                            this.mainPane.makeFirstResponder(this.getPath(this.
                                mainPane.contentView.form.action.value +
                                ".usernameField"));
                        }.bind(exports.userIdentPage), 0);
                    }
                }),
            }),

            logo: SC.ImageView.design({
                layout: {
                    left:   251 + 11,
                    top:    18 + 16,
                    width:  73,
                    height: 70
                },

                value:  'bespin-logo'
            })
        })
    }),

    loginView: SC.View.design({
        layout: { left: 0, top: 0, right: 0, bottom: 0 },
        childViews: ("usernameField usernameLabel passwordField " +
            "passwordLabel submit").w(),

        usernameField: SC.TextFieldView.design({
            valueBinding: "UserIdent#loginController.username",
            controlSize: SC.SMALL_CONTROL_SIZE,
            layout: { left: 10, top: 1, right: 10, height: 24 }
        }),

        usernameLabel: SC.LabelView.design({
            value: "Username",
            controlSize: SC.SMALL_CONTROL_SIZE,
            layout: { left: 10, top: 1 + 24 + 3, right: 10, height: 14 }
        }),

        passwordField: SC.TextFieldView.design({
            valueBinding: "UserIdent#loginController.password",
            isPassword: true,
            controlSize: SC.SMALL_CONTROL_SIZE,
            layout: { left: 10, top: 1 + 48, right: 10, height: 24 }
        }),

        passwordLabel: SC.LabelView.design({
            value: "Password",
            controlSize: SC.SMALL_CONTROL_SIZE,
            layout: { left: 10, top: 1 + 48 + 24 + 3, right: 10, height: 14 }
        }),

        submit: SC.ButtonView.design({
            layout: {
                left:   10,
                top:    1 + 48*2 + 1,
                right:  10,
                height: 19
            },

            title: "Log in",
            isDefault: true,
            target: "UserIdent#loginController",
            action: "login",
        })
    }),

    signupView: SC.View.design({
        layout: { left: 0, top: 0, right: 0, bottom: 0 },

        childViews: ("usernameField usernameLabel usernameError " +
            "password1Field password1Label password1Error " +
            "password2Field password2Label password2Error " +
            "emailField emailLabel emailHint submit").w(),

        usernameField: SC.TextFieldView.design({
            valueBinding: "UserIdent#signupController.username",
            commitEditing: function() {
                arguments.callee.base.apply(this, arguments);
                exports.signupController.validate("username");
                return true;
            },
            layout: { left: 10, top: 1, width: 210, height: 48 }
        }),

        usernameLabel: SC.LabelView.design({
            value: "Username:",
            controlSize: SC.SMALL_CONTROL_SIZE,
            layout: { left: 10, top: 26 + 3 + 1, width: 53, height: 14 }
        }),

        usernameError: SC.LabelView.design({
            classNames: [ "signupValidationError" ],
            valueBinding: "UserIdent#signupController.usernameError",
            controlSize: SC.SMALL_CONTROL_SIZE,
            layout: { right: 10, top: 26 + 3 + 1, width: 200, height: 14 }
        }),

        password1Label: SC.LabelView.design({
            value: "Password:",
            textAlign: "right",
            layout: { right: 400-150, top: 35 }
        }),

        password1Field: SC.TextFieldView.design({
            isPassword: true,
            valueBinding: "UserIdent#signupController.password1",
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

