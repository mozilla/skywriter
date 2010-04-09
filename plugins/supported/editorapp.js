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
        "appsupport": "0.0",
		"bespin_server": "0.0",
		"command_line": "0.0",
		"dock_view": "0.0",
		"edit_session": "0.0",
		"text_editor": "0.0",
        "filesystem": "0.0",
		"plugindev": "0.0",
		"settings": "0.0",
		"theme_manager": "0.0",
		"userident": "0.0"
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
var DockView = require('dock_view').DockView;
var EditorView = require('text_editor:views/editor').EditorView;
var KeyListener = require('appsupport:views/keylistener').KeyListener;
var m_promise = require('bespin:promise');
var m_userident = require('userident');
var catalog = require('bespin:plugins').catalog;
var loginController = m_userident.loginController;
var signupController = m_userident.signupController;
var registerUserPlugins = m_userident.registerUserPlugins;
var userIdentPage = m_userident.userIdentPage;
var BespinFileSource = require("bespin_server:filesource").BespinFileSource;
var ServerPersister = require("bespin_server:settings").ServerPersister;
var themeManager = require('theme_manager').themeManager;
var settings = require("settings").settings;
var editsession = require("edit_session");

exports.session = editsession.EditSession.create();
exports.cli = null;
exports.social = null;

var INITIAL_TEXT;   // defined at the end of the file to reduce ugliness

var createFilesystem = function() {
    var Filesystem = require("filesystem").Filesystem;
    exports.files = Filesystem.create({source: BespinFileSource.create()});
};

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
        var view;
        var applicationView = this._applicationView;

        // Remove any docked views already present.
        var dockedViews = this._dockedViews;
        for (name in dockedViews) {
            view = dockedViews[name];
            applicationView.removeDockedView(view);
        }
        
        // the require happens here so that reloading happens correctly.
        CliInputView = require('command_line:views/cli').CliInputView;
        dockedViews = {};
        view = applicationView.addDockedView(CliInputView);
        exports.cli = view;
        applicationView.appendChild(view);
        dockedViews.cli = view;
		
		/* TODO: the code below doesn't work --- promise never calls callbacks
		// check for collab
		if (catalog.plugins.collab) {
			require.loader.async('collab:view').then(function () {
				var SocialView = require('collab:view').SocialView;
				var view = applicationView.addDockedView(SocialView);
				exports.social = view;
				applicationView.appendChild(view);
				dockedViews.social = view;
			}, function (err) {
				console.log('ERROR: ' + err);
			});
		}
		*/

        this._dockedViews = dockedViews;
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
        createFilesystem();
        registerUserPlugins();
        this._showEditor();
    },
    
    loginControllerLoggedOut: function(sender) {
        this._displayLogin();
    },

    postRefresh: function(reloadDescription) {
        var pluginName = reloadDescription.pluginName;
        var dependents = reloadDescription.dependents;
        
        if (pluginName == "filesystem" || dependents.filesystem) {
            createFilesystem();
        }
        
        // TODO make this better. Basically, there is an issue
        // with running the "reload" command because the command line
        // is still expecting some things to be around. So,
        // as a workaround, unless we're reloading the CommandLine
        // plugin, we don't recreate the docked views.
        if (pluginName == "command_line" || dependents.command_line) {
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

