/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an 'AS IS' basis,
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
var Trait = require('traits').Trait;
var Promise = require('bespin:promise').Promise;

var DEFAULT_COMPONENT_ORDER = [
    'environment', 'theme_manager', 'login_controller', 'file_source',
    'key_listener', 'dock_view', 'command_line', 'social_view', 'editor_view',
    'edit_session'
];

var RegistrationHandler = Trait({
    attach: Trait.required,
    detach: function() {}
});

// We can't use Trait.create() on objects that have SproutCore classes as
// instance members, because they look like functions and Trait.create() tries
// to bind them...
var bespinController;
bespinController = Object.create(Object.prototype, Trait({
    // The table of component objects: a map from component names to the
    // "pointer" values specified in the components' plugin metadata.
    _components: null,

    // The order in which components are initialized.
    _componentOrder: null,

    // The set of components whose extensions are currently loaded.
    _loadedComponents: null,

    // The set of components that are currently registered. We have to maintain
    // this list manually, unfortunately, because the registration handler can
    // be called multiple times for each plugin before unregistration.
    _registeredComponents: null,

    // The index of the component we're waiting on in the component order. If
    // this value is equal to the number of components, the app is fully
    // initialized and ready to go.
    _state: 0,

    _dockView: null,
    _editorView: null,
    _themeManager: null,
    _username: null,

    _registrationHandlers: {
        environment: Trait.create(Object.prototype, Trait.override(Trait({
            attach: function(environmentTrait) {
                var paneClass = bespinController.paneClass;
                var thisEnvironmentTrait = Trait({ paneClass: paneClass });
                var environment = Object.create(Object.prototype,
                    Trait.compose(environmentTrait, thisEnvironmentTrait));
                environment.init();

                var pane = environment.pane;
                bespinController.pane = pane;

                return new Promise().resolve();
            },

            detach: function() {
                bespinController.pane = null;
            }
        }), RegistrationHandler)),

        theme_manager: Trait.create(Object.prototype, Trait.override(Trait({
            attach: function(themeManager) {
                themeManager.addPane(bespinController.pane);
                bespinController._themeManager = themeManager;
                return new Promise().resolve();
            },

            detach: function() {
                var themeManager = bespinController._themeManager;
                _themeManager.removePane(bespinController.pane);
                bespinController._themeManager = null;
            }
        }), RegistrationHandler)),

        login_controller: Trait.create(Object.prototype, Trait.override(Trait({
            _loginController: null,
            _loginPane: null,
            _promise: null,

            attach: function(loginController) {
                this._loginController = loginController;

                var acceptedEvent = loginController.get('accepted');
                var loggedOutEvent = loginController.get('loggedOut');
                acceptedEvent.add(this.loginControllerAcceptedLogin);
                loggedOutEvent.add(this.loginControllerLoggedOut);

                var page = require('userident').userIdentPage;
                var loginPane = page.get('mainPane');
                this._loginPane = loginPane;

                var themeManager = bespinController._themeManager;
                themeManager.addPane(loginPane);

                var promise = new Promise();
                this._promise = promise;
                var showIfNotLoggedIn = loginController.showIfNotLoggedIn;
                SC.run(showIfNotLoggedIn.bind(loginController));
                return promise;
            },

            detach: function() {
                var themeManager = bespinController._themeManager;
                themeManager.removePane(this._loginPane);

                var loginController = this._loginController;
                var loggedOutEvent = loginController.get('loggedOut');
                var acceptedEvent = loginController.get('accepted');
                loggedOutEvent.remove(this.loginControllerLoggedOut);
                acceptedEvent.remove(this.loginControllerAcceptedLogin);

                this._loginPane = null;
                this._loginController = null;
            },

            /** Called when a user successfully logs in. */
            loginControllerAcceptedLogin: function(username) {
                bespinController._username = username;

                var m_userident = require('userident');
                m_userident.registerUserPlugins();

                this._promise.resolve();
                this._promise = null;
            },

            /** Called when the user logs out. */
            loginControllerLoggedOut: function() {
                bespinController._rollback('login_controller');
                bespinController._username = null;

                var loginController = this._loginController;
                SC.run(loginController.show.bind(loginController));
            },
        }), RegistrationHandler)),

        file_source: Trait.create(Object.prototype, Trait.override(Trait({
            attach: function(fileSourceClass) {
                var filesystemClass = require('filesystem').Filesystem;
                exports.files = filesystemClass.create({
                    source: fileSourceClass.create()
                });

                return new Promise().resolve();
            },

            detach: function(fileSourceClass) {
                exports.files = null;
            }
        }), RegistrationHandler)),

        key_listener: Trait.create(Object.prototype, Trait.override(Trait({
            _keyListener: null,

            attach: function(keyListenerClass) {
                var pane = bespinController.pane;
                var keyListener = keyListenerClass.create();
                pane.set('defaultResponder', keyListener);
                this._keyListener = keyListener;

                return new Promise().resolve();
            },

            detach: function() {
                bespinController.pane.set('defaultResponder', null);
                this._keyListener = null;
            }
        }), RegistrationHandler)),

        dock_view: Trait.create(Object.prototype, Trait.override(Trait({
            attach: function(dockViewClass) {
                var dockView = dockViewClass.create();
                bespinController.pane.appendChild(dockView);
                bespinController._dockView = dockView;
                return new Promise().resolve();
            },

            detach: function(dockViewClass) {
                bespinController._dockView.removeFromParent();
                bespinController._dockView = null;
            }
        }), RegistrationHandler)),

        command_line: Trait.create(Object.prototype, Trait.override(Trait({
            _cliView: null,

            attach: function(cliViewClass) {
                // TODO: customize which side this docks on
                var dockView = bespinController._dockView;
                var cliView = dockView.addDockedView(cliViewClass, 'bottom');
                dockView.appendChild(cliView);

                this._cliView = cliView;
                return new Promise().resolve();
            },

            detach: function(cliView) {
                this._cliView.removeFromParent();
                this._cliView = null;
            }
        }), RegistrationHandler)),

        social_view: Trait.create(Object.prototype, Trait.override(Trait({
            _socialView: null,

            attach: function(socialViewClass) {
                // TODO: customize which side this docks on
                var dockView = bespinController._dockView;
                var socialView = dockView.addDockedView(socialViewClass,
                    'right');
                dockView.appendChild(socialView);

                this._socialView = socialView;
                return new Promise().resolve();
            },

            detach: function() {
                this._socialView.removeFromParent();
                this._socialView = null;
            }
        }), RegistrationHandler)),

        editor_view: Trait.create(Object.prototype, Trait.override(Trait({
            attach: function(editorViewClass) {
                var dockView = bespinController._dockView;
                var editorView = dockView.createCenterView(editorViewClass);
                dockView.set('centerView', editorView);

                dockView.appendChild(editorView);
                bespinController._editorView = editorView;

                return new Promise().resolve();
            },

            detach: function(editorViewClass) {
                bespinController._editorView.removeFromParent();
                bespinController._editorView = null;
            }
        }), RegistrationHandler)),

        edit_session: Trait.create(Object.prototype, Trait.override(Trait({
            attach: function(m_editsession) {
                var editorView = bespinController._editorView;
                var textView = editorView.get('textView');
                var layoutManager = editorView.get('layoutManager');
                var textStorage = layoutManager.get('textStorage');
                var syntaxManager = layoutManager.get('syntaxManager');

                var buffer = m_editsession.Buffer.create({
                    model:          textStorage,
                    syntaxManager:  syntaxManager
                });

                var session = m_editsession.EditSession.create();
                exports.session = session;
                session.set('currentUser', bespinController._username);
                session.set('currentView', textView);
                session.set('currentBuffer', buffer);

                if (bespinController.loadFile) {
                    session.loadMostRecentOrNew();
                }

                return new Promise().resolve();
            },

            detach: function() {
                exports.session = null;
            }
        }), RegistrationHandler))
    },

    _attach: function(componentName) {
        var attach = this._registrationHandlers[componentName].attach;
        var promise = attach(this._components[componentName]);
        promise.then(this._attached.bind(this));
    },

    _attached: function() {
        this._state++;

        var nextComponent = this._componentOrder[this._state];
        if (nextComponent in this._components) {
            this._attach(nextComponent);
        }
    },

    // Rolls the initialized state of the application back down to (and
    // including) the requested state, detaching components along the way.
    _rollback: function(componentName) {
        var index = this._componentOrder.indexOf(componentName);
        while (this._state > index) {
            this._state--;

            var detachee = this._componentOrder[this._state];
            this._registrationHandlers[detachee].detach();
        }

        this._attach(componentName);
    },

    /**
     * @property{boolean}
     *
     * Whether a file should be loaded at startup.
     */
    loadFile: true,

    /**
     * @property{boolean}
     *
     * Whether login is required in order to use the editor. If this is true,
     * the "userident" plugin must be present for the editor to boot.
     */
    loginRequired: true,

    /**
     * @type{SC.MainPane}
     *
     * The pane in which Bespin lives.
     */
    pane: null,

    /**
     * @type{class<SC.MainPane>}
     *
     * The class of the pane in which Bespin lives. This field will be
     * instantiated when the environment is.
     */
    paneClass: SC.MainPane.extend({
        layout: { left: 0, bottom: 0, top: 0, right: 0 }
    }),

    init: function() {
        var componentOrder = DEFAULT_COMPONENT_ORDER.concat();
        this._componentOrder = componentOrder;
        if (!this.loginRequired) {
            var index = componentOrder.indexOf('login_controller');
            componentOrder.splice(index, 1);
        }

        this._components = {};
        this._loadedComponents = {};
        this._registeredComponents = {};
    },


    /**
     * Called whenever one of the application components has been loaded or
     * reloaded.
     */
    registerAppComponent: function(extension) {
        var registeredComponents = this._registeredComponents;
        var name = extension.name;
        if (name in registeredComponents) {
            return;
        }

        registeredComponents[name] = true;

        extension.load(function(pointer) {
            this._loadedComponents[name] = true;
            this._components[name] = pointer;

            if (this._componentOrder[this._state] === name) {
                this._attach(name);
            }
        }.bind(this));
    },

    /** Called whenever one of the application components has been unloaded. */
    unregisterAppComponent: function(extension) {
        var name = extension.name;
        var index = this._componentOrder.indexOf(extension.name);

        // TODO: Can't reload the root extension at this time.
        this._rollback(this._componentOrder[index - 1]);

        delete this._registeredComponents[name];
        delete this._components[name];
    }
}));

bespinController.init();
exports.bespinController = bespinController;

var controller = exports.bespinController;
exports.registerAppComponent = controller.registerAppComponent.
    bind(controller);
exports.unregisterAppComponent = controller.unregisterAppComponent.
    bind(controller);

/** The file source, populated by the "file_source" component. */
exports.files = null;

/** The current session, populated by the "edit_session" component. */
exports.session = null;

