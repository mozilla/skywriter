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

var util = require('bespin:util/util');
var Event = require('events').Event;
var settings = require('settings').settings;
var ServerPersister = require('bespin_server:settings').ServerPersister;
var catalog = require('bespin:plugins').catalog;
var console = require('bespin:console').console;
var Promise = require("bespin:promise").Promise;
var templates = require("templates");

var $ = require("jquery").$;
require("overlay");
require("toolbox_expose");
require('jquery_ui_checkbox');

var USER_INFO_URL = '/register/userinfo/';

var searchQuery;

(function() {
    if (window.location.search === "") {
        searchQuery = {};
    } else {
        searchQuery = util.queryToObject(window.location.search.substring(1));
    }
})();

var _getCurrentUser = function(server) {
    return server.request('GET', USER_INFO_URL, null, { evalJSON: true });
};

var loginPromise = null;

exports.loginController = function() {};

exports.loginController.prototype = {
    showLogin: function() {
        // If there is already a login promise, then return it.
        if (loginPromise) {
            return loginPromise;
        }

        // Otherwise create a new login promise and return it at the end of
        // the function call.
        var pr = loginPromise = new Promise();

        catalog.createObject("server").then(function(server) {
            var prAlreadyLoggedIn = _getCurrentUser(server);
            prAlreadyLoggedIn.then(function(data) {
                pr.resolve(data.username);
            }, function() {
                this._showLoginForm(pr);
            }.bind(this));
        }.bind(this));


        // After the user logged in, load user specific data (settings, plugins).
        pr.then(function(username) {
            var server = catalog.getObject('server');
            // Load the plugin metadata for the user's plugins
            var pr = server.request('GET', '/plugin/register/user', null,
                {
                    evalJSON: true
                }
            );

            pr.then(function(pluginInfo) {
                var deactivatePlugins;

                if (util.none(searchQuery.safeMode)) {
                    deactivatePlugins = pluginInfo.deactivated;
                } else {
                    deactivatePlugins = pluginInfo.metadata;
                }

                for (var pluginName in deactivatePlugins) {
                    catalog.deactivatePlugin(pluginName);
                    catalog.children.forEach(function(child) {
                        child.deactivatePlugin(pluginName);
                    });
                }

                catalog.registerMetadata(pluginInfo.metadata);
                catalog.orderExtensions(pluginInfo.ordering);

                // Init the settings after all the plugin data is loaded.
                settings.setPersister(new ServerPersister());
            }, function(error) {
                if (!error.xhr || error.xhr.status != 404) {
                    displayError('Register User Plugins',
                            'Failed to load user\'s pluginInfo.json: ' + error.message);
                }
                settings.setPersister(new ServerPersister);
            });
        });

        return pr;
    },

    /**
     * Validates the signup form.
     *
     * @param formObj Object that holds all the fields objects
     * @return True if the form is valid otherwise false.
     */
    _validSignupForm: function(formObj) {
        // Store the isValid information in a local var to keep from calling set(...) all the time.
        // The value of this.isValid will be set at the end of this function.
        var isValid = true;

        // Validates the username.
        if (formObj.username.value.length < 4) {
            $(formObj.usernameHint).show();
            isValid = false;
        } else {
            $(formObj.usernameHint).hide();
        }

        // Validate the password.
        var l = formObj.password.value.length;
        var passwordError = '';
        if (l < 6) {
            passwordError = 'At least 6 chars';
            isValid = false;
        } else if (l > 20) {
            passwordError = 'Maximum 20 chars';
            isValid = false;
        }
        $(formObj.passwordHint).html(passwordError);

        // Check if the typed passwords are the same.
        if (!passwordError) {
            if (formObj.password.value !== formObj.password2.value) {
                $(formObj.passwordHint).html('Passwords don\'t match');
                isValid = false;
            }
        }

        // Validates the email.
        var email = formObj.email.value;
        var emailError = '';
        if (email === '') {
            emailError = 'Required field';
            isValid = false;
        } else if (email.match(/.+@.+\...+/) === null) {
            emailError = 'Not a valid format';
            isValid = false;
        }

        $(formObj.emailHint).html(emailError);

        return isValid;
    },

    _doLogin: function(pr, username, password) {
        exports.login(username, password).then(function(data) {
            pr.resolve(username);
        }, function() {
            var notifier = catalog.getObject('notifier');
            notifier.notify({
                plugin: 'userident',
                notification: 'loginerror',
                body: 'Your username or password was not recognized.'
            });
        });
    },

    _showLoginForm: function(pr) {
        var self = this;

        // Hide the overlay after the user logged in.
        pr.then(function() {
            overlayNode.eq(0).overlay().close();
        });

        // Object that holds the data passed to the template as well as the
        // saved objects generated by the template.
        var obj = {
            resourceURL: catalog.getResourceURL('userident'),
            loginForm: {
                // Submit function for the loginForm.
                submit: function(evt) {
                    var username = obj.loginForm.username.value;
                    var password = obj.loginForm.password.value;
                    self._doLogin(pr, username, password);
                    // Stop the event.
                    evt.preventDefault();
                    return false;
                }
            },
            lostForm: {
                submit: function(evt) {
                    if (obj.lostForm.input.length < 4) {
                        var notifier = catalog.getObject('notifier');
                        notifier.notify({
                            plugin: 'userident',
                            notification: 'loginerror',
                            body: 'The username is at least 4 characters.'
                        });
                    } else {
                        exports.lostPassword({
                            username: obj.lostForm.input.value
                        }).then(function() {
                            var notifier = catalog.getObject('notifier');
                            notifier.notify({
                                plugin: 'userident',
                                notification: 'reset',
                                title: 'Reset Password',
                                body: 'confirmation email sent - check your mail and follow the link'
                            });
                        }, function() {
                            var notifier = catalog.getObject('notifier');
                            notifier.notify({
                                plugin: 'userident',
                                notification: 'loginerror',
                                body: 'Reset Password: Your username or email is unknown.'
                            });
                        });
                    }
                    // Stop the event.
                    evt.preventDefault();
                    return false;
                }
            },
            resetForm: {
                submit: function(evt) {
                    var password = obj.resetForm.password.value;
                    var password2 = obj.resetForm.password2.value;

                    var notifier = catalog.getObject('notifier');
                    var len = password.length;
                    if (len < 6 || len > 20) {
                        notifier.notify({
                            plugin: 'userident',
                            notification: 'loginerror',
                            title: 'Reset Password',
                            body: 'The password has to be at least 6 and at most 20 characters.'
                        });
                    } else if (this.get('password1') !== this.get('password2')) {
                        notifier.notify({
                            plugin: 'userident',
                            notification: 'loginerror',
                            title: 'Reset Password',
                            body: 'The typed passwords do not match.'
                        });
                    } else {
                        var data = searchQuery.pwchange.split(';');
                        var usename = data[0];
                        var hash = data[1];

                        exports.changePassword(
                            username, password, hash
                        ).then(function() {
                            // Password sucessfully changed. Log the user in.
                            self._doLogin(pr, username, password);
                        }, function(error) {
                            notifier.notify({
                                plugin: 'userident',
                                notification: 'loginerror',
                                title: 'Reset Password',
                                body: 'Password reset failed because: ' + error.message
                            });
                        });
                    }

                    // Stop the event.
                    evt.preventDefault();
                    return false;
                }
            },
            signupForm: {
                submit: function(evt) {
                    var signupForm = obj.signupForm;
                    if (!self._validSignupForm(signupForm)) {
                        var notifier = catalog.getObject('notifier');
                        notifier.notify({
                            plugin: 'userident',
                            notification: 'loginerror',
                            title: 'Signup Problem',
                            body: 'Please correct your signup information.'
                        });
                    } else {
                        var username = signupForm.username.value;
                        var password = signupForm.password.value;
                        var email = signupForm.email.value;
                        exports.signup(username, password, email).then(function(data) {
                            pr.resolve(username);
                        }, function(xhr) {
                            var notifier = catalog.getObject('notifier');
                            notifier.notify({
                                plugin: 'userident',
                                notification: 'loginerror',
                                title: 'Signup Problem',
                                body: 'Signup failed because:' + xhr.responseText
                            });
                        });
                    }
                    // Stop the event.
                    evt.preventDefault();
                    return false;
                }
            }
        };

        // Generate the template and insert it to the page.
        document.body.appendChild(templates.login(obj));

        // Set the initial height of the formDiv. Do this after a short timeout
        // to make sure the DOM is ready.
        var updateFromDiv = function() {
            setTimeout(function() {
                // Find the current visible form.
                var visibleForm = $("#bespinloginform form[style*='block']");
                // Focus the first input field on the visible form.
                visibleForm.find('input:eq(0)').focus();
                // Set the height of the div based on the visibleForm height.
                $(obj.formDiv).height(visibleForm.height() + 10);

            }, 0);
        };
        updateFromDiv();

        // One jQuery object that holds all the forms.
        var radioItem = $("#bespinloginform form");

        // Create the UI radioboxes and add an 'change' event listener that
        // is fired whenever the radio selection changes.
        $('#bespinloginform input[type=radio]').checkBox({
            change: function(e, ui){
                if (ui.checked) {
                    radioItem.hide();
                    $(obj[$(this).attr('radioFor')].form).show();
                    updateFromDiv();
                }
                //checked or unchecked || $(this).is(':checked') === ui.checked
            }
        });

        // Default: select the first radio from the list.
        var selectedRadio = 0;

        // If a resetURL is given, then show the 'reset' radio and select it.
        if (!util.none(searchQuery.pwchange)) {
            // Hide the 'lostForm' radio and show the 'resetForm' radio.
            $(obj.lostForm.radio).hide();
            $(obj.resetForm.radio).show();
            // Select the 'resetForm' radio at startup.
            selectedRadio = 2;
        }

        // Mark the radio item as selected.
        $('#bespinloginform input[type=radio]:eq(' + selectedRadio + ')')
            .checkBox('changeCheckStatus', true);

        // Create the overlay.
        var overlayNode = $('#bespinloginform').overlay({
            mask: {
                color: '#4E4D45',
                loadSpeed: 200,
                opacity: 1
            },
            closeOnClick: false,
            closeOnEsc: false,
            close: null,
            load: true
        });
    }
};

/**
 * Try to login to the backend system.
 * @param user is the username
 * @param pass is the password
 */
exports.login = function(user, pass) {
    var server = catalog.getObject('server');
    var url = '/register/login/' + user;
    return server.request('POST', url, 'password=' + escape(pass), {
        log: 'Login complete.'
    });
};

/**
 * Signup / Register the user to the backend system
 * @param user is the username
 * @param pass is the password
 * @param email is the email
 */
exports.signup = function(user, pass, email) {
    var server = catalog.getObject('server');
    var url = '/register/new/' + user;
    var data = 'password=' + encodeURI(pass) + '&email=' + encodeURI(email);
    return server.request('POST', url, data);
};

/**
 * Logout from the backend
 * @param onSuccess fires after the logout attempt
 */
exports.logout = function() {
    var server = catalog.getObject('server');
    var url = '/register/logout/';
    return server.request('POST', url, null, {
        log: 'Logout complete.'
    }).then(function() {
        // Reset the login promise;
        loginPromise = null;

        // Remove all user plugins.
        for (var pluginName in catalog.plugins) {
            if (catalog.plugins[pluginName].type === 'user') {
                catalog.removePlugin(pluginName);
            }
        }

        // Reset the settings persister.
        settings.setPersister(null);

        // Reset all settings.
        settings.resetAll();

        // TODO: Tell appconfig to destroy everything and relunch the app.
        window.location.reload();
    }, function(error) {
        displayError('Unable to log out',
            'There was a problem logging out: ' + error.message);
    });
};

/**
 * Tell the backend that the user lost the password.
 */
exports.lostPassword = function(values) {
    var server = catalog.getObject('server');
    var url = '/register/lost/';
    return server.request('POST', url, util.objectToQuery(values));
};

/**
 * Changes the user's password.
 */
exports.changePassword = function(username, newPassword, verifyCode) {
    var server = catalog.getObject('server');
    var url = '/register/password/' + username;
    var query = { newPassword: newPassword, code: verifyCode };
    return server.request('POST', url, util.objectToQuery(query));
};
