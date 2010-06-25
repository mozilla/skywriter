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

var SC = require('sproutcore/runtime').SC;

var env = require('environment').env;
var Promise = require('bespin:promise').Promise;
var server = require('bespin_server').server;

// these are private, because we will likely want to put a little more
// control around the kcpass.
var kcpass = null;
var pr = null;
var pane = null;
var pwpath = 'contentView.form.passwordField.value';

exports.kcController = SC.Object.create({
    doCancel: function() {
        pane.remove();
        pane = null;
        pr.reject({message: 'Canceled'});
    },

    savePassword: function() {
        kcpass = pane.getPath(pwpath);
        pane.setPath(pwpath, '');
        pane.remove();
        pane = null;
        pr.resolve(kcpass);
    }
});

var kcPage = SC.Page.design({
    mainPane: SC.PanelPane.design({
        layout: { centerX: 0, centerY: 0, width: 300, height: 275 },

        contentView: SC.View.design({
            classNames: 'bespin-color-field'.w(),
            childViews: 'form'.w(),
            form: SC.View.design({
                classNames: 'bespin-form'.w(),

                childViews: ('title passwordField description cancel ok').w(),

                title: SC.LabelView.design({
                    classNames: 'title'.w(),

                    layout: {
                        left: 10,
                        top: 10,
                        width: 290,
                        height: 24
                    },
                    value: 'Keychain Password',
                    controlSize: SC.LARGE_CONTROL_SIZE,
                    fontWeight: 'bold'
                }),

                passwordField: SC.TextFieldView.design({
                    layout: {
                        left: 10,
                        top: 50,
                        width: 275,
                        height: 24
                    },
                    valueBinding: '.password',
                    isPassword: true
                }),

                description: SC.LabelView.design({
                    layout: {
                        left: 10,
                        top: 80,
                        width: 275,
                        height: 150
                    },
                    value: 'Your keychain password is used to encrypt your ' +
                        'usernames, passwords and SSH keys for remote servers.' +
                        ' <b>Your password is set the first time you enter it</b>.' +
                        'Please make sure this is a good, strong password, but ' +
                        'one you can remember because we have no way to recover it.',
                    escapeHTML: false
                }),

                cancel: SC.ButtonView.design({
                    layout: { left: 10, top: 225, width: 100, height: 37 },
                    isCancel: true,
                    title: 'Cancel',
                    target: 'userident:kc#kcController',
                    action: 'doCancel'
                }),

                ok: SC.ButtonView.design({
                    layout: { left: 175, top: 225, width: 100, height: 37 },
                    isDefault: true,
                    title: 'OK',
                    target: 'userident:kc#kcController',
                    action: 'savePassword'
                })

            })
        })
    })
});


exports.getKeychainPassword = function() {
    if (pane) {
        return null;
    }

    pr = new Promise();

    if (kcpass != null) {
        pr.resolve(kcpass);
        return pr;
    }

    pane = kcPage.get('mainPane');
    pane.append();
    pane.becomeKeyPane();
    pane.getPath('contentView.form.passwordField').becomeFirstResponder();
    return pr;
};

exports.clearPassword = function() {
    kcpass = null;
};


/**
 * Retrieve an SSH public key for authentication use
 */
exports.getkey = function(args, request) {
    if (args.password == '') {
        args.password = undefined;
    }

    var pr = exports.getKeychainPassword().then(function(kcpass) {
        var pr;

        var url = '/vcs/getkey/';
        if (kcpass == null) {
            pr = server.request('POST', url, null);
        } else {
            var params = 'kcpass=' + escape(kcpass);
            pr = server.request('POST', url, params);
        }

        pr.then(function(key) {
            request.done('Your SSH public key that Bespin can use for remote repository authentication:<br/>' + key);
        }, function(error) {
            if (error.status == '401') {
                kc.clearPassword();
                request.doneWithError('Incorrect keychain password!');
            } else {
                request.doneWithError('Error from server: ' + error.message);
            }
        });

    }, function() {
        request.done('Canceled');
    });
};

/*
 * Clears the stored keychain password.
 */
exports.forget = function(args, request) {
    exports.clearPassword();
    request.done('Password forgotten.');
};
