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
    "depends": [ "BespinServer", "DelegateSupport" ],
    "provides": [
        {
            "ep": "command",
            "name": "logout",
            "description": "Logout of Bespin",
            "pointer": "#logout"
        }
    ]
});
"end";

var SC = require("sproutcore/runtime").SC;
var MultiDelegateSupport = require('DelegateSupport').MultiDelegateSupport;
var util = require("bespin:util/util");
var server = require("BespinServer").server;
var catalog = require("bespin:plugins").catalog;
var console = require('bespin:console').console;

var LOGIN_PANE_HEIGHT = 321;
var LOGIN_FORM_HEIGHT = 287;
var LOGIN_CONTAINER_HEIGHT = 237 + 37 - 76;
var SIGNUP_PANE_HEIGHT = 429;
var SIGNUP_FORM_HEIGHT = 395;
var SIGNUP_CONTAINER_HEIGHT = 299 + 37 - 76;

/**
 * Controller for the sign-in process
 */
exports.loginController = SC.Object.create(MultiDelegateSupport, {
    username: "",

    password: "",

    login: function() {
        var password = this.get("password");
        this.set("password", "");
        return exports.login(this.get("username"), password).
            then(this.onSuccess.bind(this), this.onFailure.bind(this));
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
        var pane = exports.userIdentPage.get('mainPane');
        pane.append();
        pane.becomeKeyPane();
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
    emailHint: "",

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
            if (this.get(field) === "") {
                return;
            }

            this.changed[field] = true;
        }

        // Store the isValid information in a local var to keep from calling set(...) all the time.
        // The value of this.isValid will be set at the end of this function.
        var isValid = true;

        if (this.changed.username || this.get('username') !== '') {
            var usernameError = '';
            if (this.get('username').length < 4) {
                usernameError = "At least 4 chars";
                isValid = false;
            }
            this.set("usernameError", usernameError);
        }

        if (this.changed.password1  || this.get('password1') !== '') {
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

        if ((this.changed.password1  || this.get('username') !== '') &&
                (this.changed.password2  || this.get('password2') !== '')) {
            var password2Error = '';
            if (this.get('password1') != this.get('password2')) {
                password2Error = "Have to match";
                isValid = false;
            }
            this.set("password2Error", password2Error);
        }

        if (this.changed.email || this.get('email' !== '')) {
            if (!this.get('email').match(/.+@.+\...+/)) {
                this.set("emailHint", "When email is given, it has to be a valid format");
                isValid = false;
            } else {
                this.set("emailHint", "");
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
        } else if (this.get('username') === '' ||
                this.get('password1') === '') {
            pane = SC.AlertPane.error("Correct your signup", "Please fill " +
                "all required fields (username + password).");
            pane.append();
        } else {
            var opts = {
                onSuccess: this.onSuccess.bind(this),
                onFailure: this.onFailure.bind(this)
            };
            exports.signup(this.username, this.password1, this.email, opts);
        }
    },

    /**
     * The sign up worked.
     */
    onSuccess: function() {
        exports.userIdentPage.get("mainPane").remove();

        // Load the plugin metadata for the user's plugins
        catalog.loadMetadata(server.SERVER_BASE_URL + "/plugin/register/user");

        this.notifyDelegates('loginControllerAcceptedLogin');
    },

    /**
     * The sign up failed.
     */
    onFailure: function(xhr) {
        var pane = SC.AlertPane.error("Signup Failed", xhr.responseText);
        pane.append();
        pane.becomeKeyPane();
    }
});

/**
 *
 */
exports.userIdentPage = SC.Page.design({
    mainPane: SC.PanelPane.design({
        layout: {
            centerX:    0,
            width:      580,
            centerY:    0,
            height:     LOGIN_PANE_HEIGHT
        },

        contentView: SC.View.design({
            layout: { left: 0, top: 0, bottom: 0, right: 0 },
            classNames: "bespin-color-field".w(),
            childViews: "welcome form logo".w(),

            welcome: SC.View.design({
                childViews: "h1 p".w(),

                layout: {
                    left:   10,
                    top:    15,
                    width:  300,
                    height: 263
                },

                h1: SC.LabelView.design({
                    layout: {
                        left:   10,
                        top:    10,
                        width:  290,
                        height: 85
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

                    classNames: "bespin-informational".w(),

                    value:  "The <a href=\"http://mozillalabs.com/bespin/\" " +
                            "target=\"_blank\">Bespin project</a> is " +
                            "building a web-based code editor using the " +
                            "emerging HTML 5 standard. The editor is easily " +
                            "extensible with JavaScript and can be used in " +
                            "your own applications or on our experimental " +
                            "hosted service.",

                    escapeHTML: false
                })
            }),

            form: SC.View.design({
                childViews: "action container".w(),
                layout: {
                    left:   310 + 2 + 10,
                    top:    15 + 2,
                    width:  240,
                    height: LOGIN_FORM_HEIGHT
                },

                classNames: "bespin-form".w(),

                action: SC.RadioView.design({
                    layout: {
                        left:   20,
                        top:    21,
                        width:  220,
                        height: 31 + 25
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
                        top:    91 + 21,
                        width:  220,
                        height: LOGIN_CONTAINER_HEIGHT
                    },

                    nowShowingBinding: "UserIdent#userIdentPage.mainPane." +
                        "contentView.form.action.value",

                    contentViewDidChange: function() {
                        arguments.callee.base.apply(this, arguments);

                        var page = exports.userIdentPage;
                        var pane = page.get('mainPane');
                        var form = pane.getPath('contentView.form');
                        var value = form.getPath('action.value');

                        var paneHeight, formHeight, containerHeight;
                        switch (value) {
                        case 'loginView':
                            paneHeight = LOGIN_PANE_HEIGHT;
                            formHeight = LOGIN_FORM_HEIGHT;
                            containerHeight = LOGIN_CONTAINER_HEIGHT;
                            break;
                        case 'signupView':
                            paneHeight = SIGNUP_PANE_HEIGHT;
                            formHeight = SIGNUP_FORM_HEIGHT;
                            containerHeight = SIGNUP_CONTAINER_HEIGHT;
                            break;
                        }

                        pane.adjust('height', paneHeight);
                        form.adjust('height', formHeight);
                        this.adjust('height', containerHeight);

                        setTimeout(function() {
                            var view = page.getPath(value + ".usernameField");
                            pane.makeFirstResponder(view);
                        }, 0);
                    }
                })
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
        layout: { left: 0, top: 0, right: 0, height: 291 },
        childViews: ("usernameField usernameLabel passwordField " +
            "passwordLabel submit").w(),

        usernameField: SC.TextFieldView.design({
            valueBinding: "UserIdent#loginController.username",
            controlSize: SC.SMALL_CONTROL_SIZE,
            layout: { left: 10, top: 92 - 91, width: 200, height: 24 }
        }),

        usernameLabel: SC.LabelView.design({
            layout: {
                left:   10,
                top:    92 - 91 + 26 + 3,
                width:  200,
                height: 14
            },

            controlSize: SC.SMALL_CONTROL_SIZE,
            value: "Username"
        }),

        passwordField: SC.TextFieldView.design({
            layout: {
                left:   10,
                top:    146 - 91,
                width:  200,
                height: 24
            },

            controlSize: SC.SMALL_CONTROL_SIZE,
            valueBinding: "UserIdent#loginController.password",
            isPassword: true
        }),

        passwordLabel: SC.LabelView.design({
            layout: {
                left:   10,
                top:    146 - 91 + 26 + 3,
                width:  200,
                height: 14
            },

            controlSize: SC.SMALL_CONTROL_SIZE,
            value: "Password"
        }),

        submit: SC.ButtonView.design({
            layout: {
                left:   10,
                top:    200 - 91,
                width:  200,
                height: 37
            },

            title: "Log in",
            isDefault: true,
            target: "UserIdent#loginController",
            action: "login"
        })
    }),

    signupView: SC.View.design({
        layout: { left: 0, top: 0, right: 0, height: 399 },

        childViews: ("usernameField usernameLabel usernameError " +
            "password1Field password1Label password1Error " +
            "password2Field password2Label password2Error " +
            "emailField emailLabel emailHint submit").w(),

        usernameField: SC.TextFieldView.design({
            layout: { left: 10, top: 92 - 91, width: 200, height: 24 },
            controlSize: SC.SMALL_CONTROL_SIZE,
            valueBinding: "UserIdent#signupController.username",
            commitEditing: function() {
                arguments.callee.base.apply(this, arguments);
                exports.signupController.validate("username");
                return true;
            }
        }),

        usernameLabel: SC.LabelView.design({
            value: "Username",
            controlSize: SC.SMALL_CONTROL_SIZE,
            layout: { left: 10, top: 92 - 91 + 26 + 3, width: 53, height: 14 }
        }),

        usernameError: SC.LabelView.design({
            layout: {
                right:  10,
                top:    92 - 91 + 26 + 3,
                width:  200,
                height: 14
            },

            classNames: "signupValidationError".w(),
            textAlign: 'right',
            valueBinding: "UserIdent#signupController.usernameError",
            controlSize: SC.SMALL_CONTROL_SIZE
        }),

        password1Field: SC.TextFieldView.design({
            layout: { left: 10, top: 146 - 91, width: 200, height: 24 },
            controlSize: SC.SMALL_CONTROL_SIZE,
            isPassword: true,
            valueBinding: "UserIdent#signupController.password1",
            commitEditing: function() {
                arguments.callee.base.apply(this, arguments);
                exports.signupController.validate("password1");
                return true;
            }
        }),

        password1Label: SC.LabelView.design({
            layout: {
                left:   10,
                top:    146 - 91 + 26 + 3,
                width:  200,
                height: 14
            },

            value: "Password",
            controlSize: SC.SMALL_CONTROL_SIZE
        }),

        password1Error: SC.LabelView.design({
            layout: {
                right:  10,
                top:    146 - 91 + 26 + 3,
                height: 14,
                width:  200
            },

            controlSize: SC.SMALL_CONTROL_SIZE,
            textAlign: 'right',
            classNames: "signupValidationError".w(),
            valueBinding: "UserIdent#signupController.password1Error"
        }),

        password2Field: SC.TextFieldView.design({
            layout: { left: 10, top: 200 - 91, height: 24, width: 105 },
            controlSize: SC.SMALL_CONTROL_SIZE,
            isPassword: true,
            valueBinding: "UserIdent#signupController.password2",
            commitEditing: function() {
                arguments.callee.base.apply(this, arguments);
                exports.signupController.validate("password2");
                return true;
            }
        }),

        password2Label: SC.LabelView.design({
            layout: {
                left:   10,
                top:    200 - 91 + 26 + 3,
                height: 14,
                width:  200
            },

            controlSize: SC.SMALL_CONTROL_SIZE,
            value: "Password <i>(confirm)</i>",
            escapeHTML: false
        }),

        password2Error: SC.LabelView.design({
            layout: {
                right:  10,
                top:    200 - 91 + 26 + 3,
                height: 14,
                width:  200
            },

            controlSize: SC.SMALL_CONTROL_SIZE,
            textAlign: 'right',
            classNames: [ "signupValidationError" ],
            valueBinding: "UserIdent#signupController.password2Error",
            layout: { left: 265, top: 65, height: 30, width: 120 }
        }),

        emailField: SC.TextFieldView.design({
            layout: { left: 10, top: 254 - 91, width: 200, height: 24 },
            controlSize: SC.SMALL_CONTROL_SIZE,
            valueBinding: "UserIdent#signupController.email",
            commitEditing: function() {
                arguments.callee.base.apply(this, arguments);
                exports.signupController.validate("email");
                return true;
            }
        }),

        emailLabel: SC.LabelView.design({
            layout: {
                left:   10,
                top:    254 - 91 + 26 + 3,
                height: 14,
                width:  200
            },

            controlSize: SC.SMALL_CONTROL_SIZE,
            value: "Email <i>(optional)</i>",
            escapeHTML: false
        }),

        emailHint: SC.LabelView.design({
            layout: {
                right:  10,
                top:    254 - 91 + 26 + 3,
                height: 14,
                width:  200
            },

            controlSize: SC.SMALL_CONTROL_SIZE,
            textAlign: "right",
            classNames: "signupValidationNote".w(),
            valueBinding: "UserIdent#signupController.emailHint"
        }),

        submit: SC.ButtonView.design({
            layout: { left: 10, top: 308 - 91, width: 200, height: 37 },
            isDefault: true,
            title: "Sign up",
            target: "UserIdent#signupController",
            action: "signup"
        })
    })
});

/**
 * Try to login to the backend system.
 * @param user is the username
 * @param pass is the password
 */
exports.login = function(user, pass) {
    var url = "/register/login/" + user;
    return server.request('POST', url, "password=" + encodeURI(pass), {
        log: 'Login complete.'
    });
};

/**
 * Signup / Register the user to the backend system
 * @param user is the username
 * @param pass is the password
 * @param email is the email
 */
exports.signup = function(user, pass, email, opts) {
    opts = opts || {};
    var url = "/register/new/" + user;
    var data = "password=" + encodeURI(pass) + "&email=" + encodeURI(email);
    return server.request('POST', url, data, opts);
};

/**
 * Logout from the backend
 * @param onSuccess fires after the logout attempt
 */
exports.logout = function() {
    var url = "/register/logout/";
    return server.request('POST', url, null, {
        log: 'Logout complete.'
    }).then(function() {
        exports.loginController.set("username", "");
        exports.loginController.set("password", "");
        exports.loginController.notifyDelegates("loginControllerLoggedOut");
    }, function(error) {
        var pane = SC.AlertPane.error("Unable to log out",
            "There was a problem logging out: " + error.message);
        pane.append();
        pane.becomeKeyPane();
    });
};

/**
 * Return info on the current logged in user
 */
exports.currentuser = function() {
    var url = "/register/userinfo/";
    return server.request('GET', url, null, {
        evalJSON: true
    });
};
