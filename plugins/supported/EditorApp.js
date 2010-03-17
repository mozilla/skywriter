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
    "depends":
    [
        "AppSupport", "BespinServer", "CommandLine", "EditSession", "Editor",
        "Filesystem", "PluginDev", "Settings", "ThemeManager", "UserIdent"
    ],
    "provides":
    [
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
        }
    ],
    "preRefresh": "#preRefresh"
});
"end";

var SC = require('sproutcore/runtime').SC;
var CliInputView = require('CommandLine:views/cli').CliInputView;
var DockView = require('bespin:views/dock').DockView;
var EditorView = require('Editor:views/editor').EditorView;
var KeyListener = require('AppSupport:views/keylistener').KeyListener;
var m_userident = require('UserIdent');
var loginController = m_userident.loginController;
var userIdentPage = m_userident.userIdentPage;
var BespinFileSource = require("BespinServer:filesource").BespinFileSource;
var ServerPersister = require("BespinServer:settings").ServerPersister;
var ThemeManager = require('ThemeManager').ThemeManager;
var settings = require("Settings").settings;
var Directory = require("Filesystem").Directory;
var editsession = require("EditSession");

exports.session = editsession.EditSession.create();

var INITIAL_TEXT;   // defined at the end of the file to reduce ugliness

exports.applicationController = SC.Object.create({
    _editorHasBeenSetup: false,
    
    _application: SC.Application.extend(),

    _themeManager: null,

    _applicationView: DockView.extend({
        centerView: EditorView.extend(),
        dockedViews: [ CliInputView.extend() ]
    }),

    _mainPage: SC.Page.extend({
        mainPane: SC.MainPane.design({
            defaultResponder: KeyListener.create(),
            layout: { top: 0, left: 0, bottom: 0, right: 0 }
        })
    }),

    _showEditor: function() {
        if (this._editorHasBeenSetup) {
            this._setupSession();
            return;
        }
        this._editorHasBeenSetup = true;
        
        settings.setPersister(ServerPersister.create());

        var applicationView = this._applicationView.create();
        
        var dockedViews = applicationView.get("dockedViews");
        exports.cli = dockedViews[0];
        
        this._applicationView = applicationView;

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
        var themeManager = ThemeManager.create({ theme: "Screen" });
        this._themeManager = themeManager;
        themeManager.addPane(mainPane);
        loginController.addDelegate(this);
        
        m_userident.currentuser().then(this.loginControllerAcceptedLogin.bind(this),
            this._displayLogin.bind(this));

    },
    
    _displayLogin: function() {
        this._themeManager.addPane(userIdentPage.get('mainPane'));

        loginController.show();
    },

    loginControllerAcceptedLogin: function(sender) {
        exports.files = Directory.create({source: BespinFileSource.create()});
        this._showEditor();
    },
    
    loginControllerLoggedOut: function(sender) {
        this._displayLogin();
    }
});

exports.preRefresh = function(reloadDescription) {
    var pluginName = reloadDescription.pluginName;
    var dependents = reloadDescription.dependents;
    if (pluginName == "CommandLine" || dependents.CommandLine) {
        var view = exports.applicationController._applicationView;
        view.removeDockedView(exports.cli);
    }
    return {
        keepModule: true,
        callPointer: "#postRefresh"
    };
};

exports.postRefresh = function(reloadDescription) {
    var pluginName = reloadDescription.pluginName;
    var dependents = reloadDescription.dependents;
    if (pluginName == "CommandLine" || dependents.CommandLine) {
        var view = exports.applicationController._applicationView;
        CliInputView = require('CommandLine:views/cli').CliInputView;
        exports.cli = view.addDockedView(CliInputView, 0);
        view.appendChild(exports.cli);
    }
};

