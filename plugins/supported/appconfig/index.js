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

var catalog = require("bespin:plugins").catalog;
var group = require("bespin:promise").group;
var Promise = require("bespin:promise").Promise;
var console = require("bespin:console").console;
var Trace = require("bespin:util/stacktrace").Trace;

/*
 * launch Bespin with the configuration provided. The configuration is
 * an object with the following properties:
 * - objects: an object with a collection of named objects that will be
 *            registered with the plugin catalog (see PluginCatalog.registerObject)
 *            This will automatically be augmented with sane defaults (for
 *            example, most Bespin users want a text editor!)
 * - gui: instructions on how to build a GUI. Specifically, the current border
 *        layout positions will be filled in. Again this provides sane defaults.
 * - container: node to attach to (optional). If not provided a node will be 
 *              created. and added to the body.
 */
exports.launch = function(config) {
    config = config || {};
    exports.normalizeConfig(config);
    var objects = config.objects;
    for (var key in objects) {
        catalog.registerObject(key, objects[key]);
    }
    
    if (objects.loginController) {
        catalog.createObject("loginController").then(
            function(loginController) {
                var pr = loginController.showLogin();
                pr.then(function() {
                    exports.launchEditor(config);
                });
            });
    } else {
        exports.launchEditor(config);
    }
    var env = require("canon:environment").global;
    return env;
};

exports.normalizeConfig = function(config) {
    if (config.objects === undefined) { 
        config.objects = {};
    }
    if (config.autoload === undefined) {
        config.autoload = [];
    }
    if (!config.objects.loginController && catalog.plugins.userident) {
        config.objects.loginController = {
        };
    }
    if (!config.objects.server && catalog.plugins.bespin_server) {
        config.objects.server = {
            factory: "bespin_server"
        };
        config.objects.filesource = {
            factory: "bespin_filesource",
            arguments: [
                {
                    _Registered_Object: "server"
                }
            ]
        };
    }
    if (!config.objects.files && catalog.plugins.filesystem &&
        config.objects.filesource) {
        config.objects.files = {
            arguments: [
                {
                    _Registered_Object: "filesource"
                }
            ]
        };
    }
    // if (!config.objects.editor) {
    //     // TODO temporary hack until the editor follows the new protocol
    //     var editorContainer = document.createElement("div");
    //     editorContainer.setAttribute("class", "center");
    //     config.objects.editor = {
    //         factory: "text_editor",
    //         arguments: [
    //             editorContainer
    //         ]
    //     };
    // }
    if (!config.objects.session) {
        config.objects.session = {
            // arguments: [
            //     {
            //         _Registered_Object: "editor"
            //     }
            // ]
        };
    }
    if (!config.objects.commandLine && catalog.plugins.command_line) {
        config.objects.commandLine = {
        };
    }
    
    if (config.gui === undefined) {
        config.gui = {};
    }
    if (!config.gui.center && config.objects.editor) {
        config.gui.center = {
            component: "editor"
        };
    }
    if (!config.gui.south && config.objects.commandLine) {
        config.gui.south = {
            component: "commandLine",
            height: 300
        };
    }
};

exports.launchEditor = function(config) {
    if (config === null) {
        var message = 'Cannot start editor without a configuration!';
        console.error(message);
        throw new Error(message);
    }
    
    var pr = createAllObjects(config);
    pr.then(function() {
        generateGUI(config);
    }, function(error) {
        console.log('Error while creating objects');
        new Trace(error).log();
    });
};

var createAllObjects = function(config) {
    var promises = [];
    for (var objectName in config.objects) {
        promises.push(catalog.createObject(objectName));
    }
    return group(promises);
};

var generateGUI = function(config) {
    var $ = require('jquery').$;
    
    var container = document.createElement('div');
    container.setAttribute('class', 'bespin container');
    
    var centerContainer = document.createElement('div');
    centerContainer.setAttribute('class', 'bespin center-container');
    container.appendChild(centerContainer);
    
    for (var place in config.gui) {
        var descriptor = config.gui[place];
        
        var component = catalog.getObject(descriptor.component);
        if (!component) {
            console.error('Cannot find object ' + descriptor.component + ' to attach to the Bespin UI');
            continue;
        }
        
        // special case the editor for now, because it doesn't
        // follow the new protocol
        var element = component.element;
        if (!element) {
            console.error('Component ' + descriptor.component + ' does not have an "element" attribute to attach to the Bespin UI');
            continue;
        }
        
        $(element).addClass(place);
        
        if (place == 'west' || place == 'east' || place == 'center') {
            centerContainer.appendChild(element);
        } else {
            container.appendChild(element);
        }
    }
    
    if (config.element) {
        config.element.appendChild(container);
    } else {
        document.body.appendChild(container);
    }
    
    var editorDiv = document.createElement("div");
    editorDiv.setAttribute('class', "center");
    centerContainer.appendChild(editorDiv);
    var EditorView = require('text_editor:views/editor').EditorView;
    var editorView = new EditorView(editorDiv);
    catalog.instances['editor'] = editorView;
    catalog.getObject("session").currentView = editorView.textView;
};
