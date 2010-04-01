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
    "description": "Constructs what you see on a hosted Bespin server",
    "dependencies": {
        "AppSupport": "0.0",
		"BespinServer": "0.0",
		"CommandLine": "0.0",
		"DockView": "0.0",
		"EditSession": "0.0",
		"Editor": "0.0",
        "Filesystem": "0.0",
		"PluginDev": "0.0",
		"Settings": "0.0",
		"ThemeManager": "0.0",
		"UserIdent": "0.0"
    },
    "provides": [
        {
            "ep": "factory",
            "name": "session",
            "pointer": "#session",
            "action": "value"
        },
        {
            "ep": "factory",
            "name": "files",
            "pointer": "#files",
            "action": "value"
        },
        {
            "ep": "factory",
            "name": "cli",
            "pointer": "#cli",
            "action": "value"
        },
        {
            "ep": "extensionpoint",
            "name": "dockedview",
            "description": "Views docked to the sides of the editor window"
        }
    ],
    "preRefresh": "#preRefresh"
});
"end";

var SC = require('sproutcore/runtime').SC;
var CliInputView = require('CommandLine:views/cli').CliInputView;
var DockView = require('DockView').DockView;
var EditorView = require('Editor:views/editor').EditorView;
var KeyListener = require('AppSupport:views/keylistener').KeyListener;
var m_promise = require('bespin:promise');
var m_userident = require('UserIdent');
var catalog = require('bespin:plugins').catalog;
var loginController = m_userident.loginController;
var signupController = m_userident.signupController;
var registerUserPlugins = m_userident.registerUserPlugins;
var userIdentPage = m_userident.userIdentPage;
var BespinFileSource = require("BespinServer:filesource").BespinFileSource;
var ServerPersister = require("BespinServer:settings").ServerPersister;
var themeManager = require('ThemeManager').themeManager;
var settings = require("Settings").settings;
var Filesystem = require("Filesystem").Filesystem;
var editsession = require("EditSession");

exports.session = editsession.EditSession.create();

var INITIAL_TEXT;   // defined at the end of the file to reduce ugliness

exports.applicationController = SC.Object.create({
    _editorHasBeenSetup: false,
    
    _application: SC.Application.extend(),

    _dockedViews: {},

    _themeManager: null,

    _applicationView: DockView.extend({
        centerView: EditorView.extend(),
        dockedViews: []
    }),

    _mainPage: SC.Page.extend({
        mainPane: SC.MainPane.design({
            defaultResponder: KeyListener.create(),
            layout: { top: 0, left: 0, bottom: 0, right: 0 }
        })
    }),

    _createDockedViews: function() {
        var applicationView = this._applicationView;

        // Remove any docked views already present.
        var dockedViews = this._dockedViews;
        for (name in dockedViews) {
            console.log("removing", name);
            var view = dockedViews[name];
            applicationView.removeDockedView(view);
        }

        var extensions = catalog.getExtensions('dockedview');
        var extensionCount = extensions.length;
        var names = extensions.map(function(ext) { return ext.get('name'); });
        var promises = extensions.map(function(ext) { return ext.load(); });
        m_promise.group(promises).then(function(viewClasses) {
                var dockedViews = {};
                for (var i = 0; i < extensionCount; i++) {
                    var name = names[i], viewClass = viewClasses[i];
                    var view = applicationView.addDockedView(viewClass);
                    applicationView.appendChild(view);
                    dockedViews[name] = view;
                }

                this._dockedViews = dockedViews;
            }.bind(this));
    },

    _showEditor: function() {
        if (this._editorHasBeenSetup) {
            this._setupSession();
            return;
        }
        this._editorHasBeenSetup = true;
        
        settings.setPersister(ServerPersister.create());

        var applicationView = this._applicationView.create();
        this._applicationView = applicationView;

        this._createDockedViews();
        
        var dockedViews = applicationView.get("dockedViews");
        exports.cli = dockedViews.cliinputview;

        var mainPane = this._mainPage.get('mainPane');
        mainPane.appendChild(applicationView);

        this._setupSession();
    },
    
    _setupSession: function() {
        var editorView = this._applicationView.get('centerView');
        var layoutManager = editorView.get('layoutManager');
        var textStorage = layoutManager.get('textStorage');

        var syntaxManager = layoutManager.get('syntaxManager');
        syntaxManager.set('initialContext', 'html');
        
        var buffer = editsession.Buffer.create({
            model:          textStorage,
            syntaxManager:  syntaxManager
        });

        var textView = editorView.get("textView");
        exports.session.set('currentView', textView);
        exports.session.set('currentBuffer', buffer);
        exports.session.loadMostRecentOrNew();
        setTimeout(function() {
            textView.focus();
        }, 25);
    },

    init: function() {
        arguments.callee.base.apply(this, arguments);

        this._application = this._application.create();

        var mainPage = this._mainPage.create();
        this._mainPage = mainPage;

        var mainPane = mainPage.get('mainPane');
        mainPane.append();
        this._themeManager = themeManager;
        themeManager.addPane(mainPane);
        loginController.addDelegate(this);
        signupController.addDelegate(this);
        
        var self = this;
        
        m_userident.currentuser().then(this.loginControllerAcceptedLogin.bind(this),
            this._displayLogin.bind(this));

    },
    
    _displayLogin: function() {
        this._themeManager.addPane(userIdentPage.get('mainPane'));
        
        SC.run(loginController.show);
    },

    loginControllerAcceptedLogin: function(sender) {
        exports.session.set("currentUser", sender);
        exports.files = Filesystem.create({source: BespinFileSource.create()});
        registerUserPlugins();
        this._showEditor();
    },
    
    loginControllerLoggedOut: function(sender) {
        this._displayLogin();
    },

    postRefresh: function(reloadDescription) {
        var pluginName = reloadDescription.pluginName;
        var dependents = reloadDescription.dependents;
        // TODO make this better. Basically, there is an issue
        // with running the "reload" command because the command line
        // is still expecting some things to be around. So,
        // as a workaround, unless we're reloading the CommandLine
        // plugin, we don't recreate the docked views.
        if (pluginName == "CommandLine" || dependents.CommandLine) {
            this._createDockedViews();
        }
    },

    preRefresh: function(reloadDescription) {
        console.log("preRefresh");
        return {
            keepModule: true,
            callPointer: "#postRefresh"
        };
    }
});

var app = exports.applicationController;
exports.preRefresh = app.preRefresh.bind(app);
exports.postRefresh = app.postRefresh.bind(app);

