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

var client = require("bespin/client");
var utils = require("bespin/user/utils");
var webpieces = require("bespin/util/webpieces");

/**
 * Login, logout and registration functions for the Bespin front page.
 */
exports.login = function() {
    if (utils.showingBrowserCompatScreen()) {
        return;
    }

    var username = dojo.byId("username").value;
    var password = dojo.byId("password").value;

    if (!username || !password) {
        webpieces.showStatus("Please give me both a username and a password");
        return;
    }

    var server = bespin.get('server');
    server.login(username, password, utils.whenLoginSucceeded, utils.whenLoginFailed);
};

exports.logout = function() {
    server.logout();
    dojo.style('logged_in', 'display', 'none');
    dojo.style('not_logged_in', 'display', 'block');
};

exports.checkUsername = function(idPrefix) {
    var username_error = [];
    var username = dojo.byId(idPrefix + "_username").value;
    if (username.length < 4) {
        username_error.push("Usernames must be at least 4 characters long");
    }
    if (/[<>| '"]/.test(username)) {
        username_error.push("Usernames must not contain any of: <>| '\"");
    }
    dojo.byId(idPrefix + '_username_error').innerHTML = username_error.join(", ");
};

exports.checkPassword = function(idPrefix) {
    dojo.byId(idPrefix + '_password_error').innerHTML =
        !utils.validatePassword(dojo.byId(idPrefix + '_password').value) ?
                "Password must be between 6 and 20 characters" :
                "";
};

exports.checkConfirm = function(idPrefix) {
    dojo.byId(idPrefix + '_confirm_error').innerHTML =
        dojo.byId(idPrefix + '_password').value != dojo.byId(idPrefix + '_confirm').value ?
            "Passwords do not match" :
            "";
};

exports.checkEmail = function(idPrefix) {
    dojo.byId(idPrefix + '_email_error').innerHTML =
        !utils.validateEmail(dojo.byId(idPrefix + '_email').value) ?
            "Invalid email address" :
            "";
};

exports.showForm = function() {
    if (utils.showingBrowserCompatScreen()) {
        return;
    }
    dojo.style("register_form", "display", "block");
    dojo.style('logged_in', 'display', 'none');
    dojo.style('not_logged_in', 'display', 'none');
    webpieces.showCenterPopup(dojo.byId('centerpopup'), true);
};

exports.hideForm = function() {
    webpieces.hideCenterPopup(dojo.byId('centerpopup'));
    dojo.style("register_form", "display", "none");
    server.currentuser(utils.whenAlreadyLoggedIn, utils.whenNotAlreadyLoggedIn);
};

exports.showLostPassword = function() {
    dojo.style("lost_password_form", "display", "block");
    webpieces.showCenterPopup(dojo.byId('centerpopup'), true);
};

exports.hideLostPassword = function() {
    webpieces.hideCenterPopup(dojo.byId('centerpopup'));
    dojo.style("lost_password_form", "display", "none");
};

exports.showLostUsername = function() {
    dojo.style("lost_username_form", "display", "block");
    webpieces.showCenterPopup(dojo.byId('centerpopup'), true);
};

exports.hideLostUsername = function() {
    webpieces.hideCenterPopup(dojo.byId('centerpopup'));
    dojo.style("lost_username_form", "display", "none");
};

exports.showChangePassword = function() {
    dojo.style("change_password_form", "display", "block");
    webpieces.showCenterPopup(dojo.byId('centerpopup'), true);
};

exports.hideChangePassword = function() {
    webpieces.hideCenterPopup(dojo.byId('centerpopup'));
    dojo.style("change_password_form", "display", "none");
};

exports.send = function() {
    var pw = dojo.byId('register_password').value;
    if (utils.validatePassword(pw) && (pw == dojo.byId('register_confirm').value)) {
        this.hideForm();
        server.signup(dojo.byId("register_username").value,
            pw,
            dojo.byId('register_email').value,
            {
                onSuccess: utils.whenLoginSucceeded,
                on400: utils.whenUserinfoBad,
                on401: utils.whenLoginFailed,
                on409: utils.whenUsernameInUse,
                log: 'Login complete.'
            });
    }
};

exports.cancel = function() {
    this.hideForm();
};

exports.sendLostPassword = function() {
    var username = dojo.byId("lost_password_username").value;
    server.lost({username: username}, {
        onSuccess: function() {
            exports.hideLostPassword();
            bespin.util.webpieces.showStatus("Password change email sent!");
        },
        onFailure: function(xhr) {
            dojo.byId("lost_password_register_error").innerHTML = xhr.responseText;
        }
    });
};

exports.sendLostUsername = function() {
    var email = dojo.byId("lost_username_email").value;
    server.lost({email: email}, {
        onSuccess: function() {
            exports.hideLostPassword();
            bespin.util.webpieces.showStatus("Username email sent!");
        },
        onFailure: function(xhr) {
            dojo.byId("lost_username_register_error").innerHTML = xhr.responseText;
        }
    });
};

exports.sendChangePassword = function() {
    var pw = dojo.byId("change_password_password").value;
    if (utils.validatePassword(pw) && (pw == dojo.byId('change_password_confirm').value)) {
        server.changePassword(exports._cpusername, pw, exports._cpcode, {
            onSuccess: function() {
                exports.hideChangePassword();
                // log the user in
                dojo.byId("username").value = exports._cpusername;
                dojo.byId("password").value = pw;
                exports.login();
            },
            onFailure: function(xhr) {
                dojo.byId("change_password_register_error").innerHTML = xhr.responseText;
            }
        });
    }
};
