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

var bespin = require("bespin");

var navigate = require("bespin/util/navigate");
var path = require("bespin/util/path");
var urlbar = require("bespin/util/urlbar");

var filesystem = require("bespin/client/filesystem");
var server = require("bespin/client/server");

var editorMod = require("bespin/editor");
var settings = require("bespin/settings");
var toolbar = require("bespin/editor/toolbar");
var sessionMod = require("bespin/client/session");
var filesearch = require("bespin/editor/filesearch");
var quickopen = require("bespin/editor/quickopen");

/**
 * This file is the editor bootstrap code that is loaded via script src from
 * "/editor.html". It handles setting up the objects that are to be used on the
 * editor and deals with layout changes.
 */

var statusScene;

/**
 * When a change to the UI is needed due to opening or closing a feature
 * (e.g. file view, session view) move the items around
 */
exports.recalcLayout = function() {
    //var subheader = dojo.byId("subheader");
    var footer = dojo.byId("footer");
    var editor = dojo.byId("editor");
    var files = dojo.byId("files");
    var collab = dojo.byId("collab");
    var target = dojo.byId("target_browsers");

    var move = [ editor ];

    // if the footer is displayed, then move it too.
    if (footer.style.display == "block") {
        move.push(footer);
    }

    // This should really move into a debugger plugin!
    // note also that this interferes with collab below.
    var debugbar = dojo.byId("debugbar");
    if (debugbar.style.display == "block") {
        move.forEach(function(item) { item.style.right = "201px"; });
    }

    if (bespin.get('toolbar').showCollab) {
        collab.style.display = "block";
        move.forEach(function(item) { item.style.right = "201px"; });
    } else {
        collab.style.display = "none";
        move.forEach(function(item) { item.style.right = "0"; });
    }

    if (bespin.get('toolbar').showTarget) {
        target.style.display = "block";
    } else {
        target.style.display = "none";
    }

    exports.doResize();
};

/**
 * When a user resizes the window, deal with resizing the canvas and repaint
 */
exports.doResize = function() {
    var d = dojo.coords('status');
    dojo.attr('projectStatus', { width: d.w, height: d.h });

    // Repaint the various canvas'
    statusScene.paint();
    bespin.get('editor').paint();
};

/**
 * The object that understands how to render the project label scene
 * It paints "project name [status of clean or dirty] file name"
 */
var ProjectStatusScene = function() {
    var scene = new th.Scene(dojo.byId("projectStatus"));
    var panel = new th.Panel();

    var projectLabel = new th.Label({ className: "statusProject" });
    var statusLabel = new th.Label({ text: "–", className: "statusSymbol" });
    var fileLabel = new th.Label({ className: "statusFile" });
    var statusLabelWidth = null;

    panel.add([ projectLabel, statusLabel, fileLabel ]);
    panel.layout = function() {
       var d = this.d();

       var x = 0;

       // Layout the project name
       var width = this.children[0].getPreferredSize().width;
       this.children[0].bounds = { x: x, y: 0, width: width, height: d.b.h };
       x += width;

       // Layout the status (save the clean statuses width)
       if (!statusLabelWidth) {
           statusLabelWidth = this.children[1].getPreferredSize().width;
       }

       this.children[1].bounds = { x: x, y: 0, width: statusLabelWidth, height: d.b.h };
       x += statusLabelWidth;

       // Layout the filename
       var filenameWidth = d.b.w - d.i.w - x;
       this.children[2].bounds = { x: x, y: 0, width: filenameWidth, height: d.b.h };
    };
    scene.root.add(panel);
    scene.render();

    // When a file is opened successfully change the project and file status area.
    // Then change the window title, and change the URL hash area
    bespin.subscribe("editor:openfile:opensuccess", function(event) {
        var project = event.project || bespin.get('editSession').project;
        var filename = path.trimLeadingSlash(event.file.name);

        // update the project label
        projectLabel.text = project;
        fileLabel.text = filename;
        scene.render();
    });

    // Add a notifier to show that the file is dirty and needs to be saved
    bespin.subscribe("editor:dirty", function(event) {
        statusLabel.text = "●";
        scene.render();
    });

    // Change the HTML title to change - to ● as a subtle indicator
    bespin.subscribe("editor:dirty", function() {
        document.title = document.title.replace('- editing with Bespin', '● editing with Bespin');
    });

    // Take away the notifier. Just saved
    bespin.subscribe("editor:clean", function(event) {
        statusLabel.text = "–";
        scene.render();
    });

    // Take away the notifier from the HTML title.
    bespin.subscribe("editor:clean", function(event) {
        document.title = document.title.replace('● editing with Bespin', '- editing with Bespin');
    });

    return {
        render: function() {
            scene.render();
        },
        paint: function() {
            scene.paint();
        }
    };
};

/**
 * Loads and configures the objects that the editor needs
 */
exports.onLoad = function() {
    var editor = bespin.register('editor', new editorMod.API('editor'));
    var editSession = bespin.register('editSession', new sessionMod.EditSession({ editor: editor }));
    var server = bespin.register('server', new server.Server());
    var files = bespin.register('files', new filesystem.FileSystem());

    bespin.register('actions', editor.ui.actions);
    //bespin.register('filesearch', new filesearch.API());
    bespin.register('toolbar', new toolbar.Toolbar({ editor: editor, opts: { setupDefault: true } }));
    bespin.register('quickopen', new quickopen.API());

    // Get going when settings are loaded
    bespin.subscribe("settings:loaded", function(event) {
        bespin.get('settings').loadSession();  // load the last file or what is passed in
        exports.doResize();
    });

    var whenLoggedIn = function(userinfo) {
        bespin.get('editSession').setUserinfo(userinfo);
        bespin.register('settings', new settings.Core());

        if (userinfo.serverCapabilities) {
            var sc = userinfo.serverCapabilities;
            bespin.register("serverCapabilities", sc.capabilities);

            for (var packagename in sc.dojoModulePath) {
                dojo.registerModulePath(packagename, sc.dojoModulePath[packagename]);
            }

            // this is done to trick the build system which would
            // try to find a module called "plugin" below.
            var re = require;
            sc.javaScriptPlugins.forEach(function(plugin) {
                re.call(dojo, plugin);
            });
        }

        bespin.publish("authenticated");
    };

    var whenNotLoggedIn = function() {
        navigate.home(); // go back
    };

    // Force a login just in case the user session isn't around
    server.currentuser(whenLoggedIn, whenNotLoggedIn);

    // Set the version info
    bespin.displayVersion();

    dojo.connect(window, 'resize', exports, "doResize");

    // -- Deal with the project label (project, filename, dirty flag)
    statusScene = new ProjectStatusScene();

    // publish changes to the URL bar to allow us to change the edited file
    urlbar.monitor();

    bespin.publish("bespin:editor:initialized", {});
};
var toolbar = require("bespin/toolbar");
var sessionMod = require("bespin/client/session");
var filesearch = require("bespin/filesearch");
var quickopen = require("bespin/quickopen");

/**
 * This file is the editor bootstrap code that is loaded via script src from
 * "/editor.html". It handles setting up the objects that are to be used on the
 * editor and deals with layout changes.
 */

var statusScene;

/**
 * When a change to the UI is needed due to opening or closing a feature
 * (e.g. file view, session view) move the items around
 */
exports.recalcLayout = function() {
    //var subheader = dojo.byId("subheader");
    var footer = dojo.byId("footer");
    var editor = dojo.byId("editor");
    var files = dojo.byId("files");
    var collab = dojo.byId("collab");
    var target = dojo.byId("target_browsers");

    var move = [ editor ];

    // if the footer is displayed, then move it too.
    if (footer.style.display == "block") {
        move.push(footer);
    }

    // This should really move into a debugger plugin!
    // note also that this interferes with collab below.
    var debugbar = dojo.byId("debugbar");
    if (debugbar.style.display == "block") {
        move.forEach(function(item) { item.style.right = "201px"; });
    }

    if (bespin.get('toolbar').showCollab) {
        collab.style.display = "block";
        move.forEach(function(item) { item.style.right = "201px"; });
    } else {
        collab.style.display = "none";
        move.forEach(function(item) { item.style.right = "0"; });
    }

    if (bespin.get('toolbar').showTarget) {
        target.style.display = "block";
    } else {
        target.style.display = "none";
    }

    exports.doResize();
};

/**
 * When a user resizes the window, deal with resizing the canvas and repaint
 */
exports.doResize = function() {
    var d = dojo.coords('status');
    dojo.attr('projectStatus', { width: d.w, height: d.h });

    // Repaint the various canvas'
    statusScene.paint();
    bespin.get('editor').paint();
};

/**
 * The object that understands how to render the project label scene
 * It paints "project name [status of clean or dirty] file name"
 */
var ProjectStatusScene = function() {
    var scene = new th.Scene(dojo.byId("projectStatus"));
    var panel = new th.Panel();

    var projectLabel = new th.Label({ className: "statusProject" });
    var statusLabel = new th.Label({ text: "–", className: "statusSymbol" });
    var fileLabel = new th.Label({ className: "statusFile" });
    var statusLabelWidth = null;

    panel.add([ projectLabel, statusLabel, fileLabel ]);
    panel.layout = function() {
       var d = this.d();

       var x = 0;

       // Layout the project name
       var width = this.children[0].getPreferredSize().width;
       this.children[0].bounds = { x: x, y: 0, width: width, height: d.b.h };
       x += width;

       // Layout the status (save the clean statuses width)
       if (!statusLabelWidth) {
           statusLabelWidth = this.children[1].getPreferredSize().width;
       }

       this.children[1].bounds = { x: x, y: 0, width: statusLabelWidth, height: d.b.h };
       x += statusLabelWidth;

       // Layout the filename
       var filenameWidth = d.b.w - d.i.w - x;
       this.children[2].bounds = { x: x, y: 0, width: filenameWidth, height: d.b.h };
    };
    scene.root.add(panel);
    scene.render();

    // When a file is opened successfully change the project and file status area.
    // Then change the window title, and change the URL hash area
    bespin.subscribe("editor:openfile:opensuccess", function(event) {
        var project = event.project || bespin.get('editSession').project;
        var filename = path.trimLeadingSlash(event.file.name);

        // update the project label
        projectLabel.text = project;
        fileLabel.text = filename;
        scene.render();
    });

    // Add a notifier to show that the file is dirty and needs to be saved
    bespin.subscribe("editor:dirty", function(event) {
        statusLabel.text = "●";
        scene.render();
    });

    // Change the HTML title to change - to ● as a subtle indicator
    bespin.subscribe("editor:dirty", function() {
        document.title = document.title.replace('- editing with Bespin', '● editing with Bespin');
    });

    // Take away the notifier. Just saved
    bespin.subscribe("editor:clean", function(event) {
        statusLabel.text = "–";
        scene.render();
    });

    // Take away the notifier from the HTML title.
    bespin.subscribe("editor:clean", function(event) {
        document.title = document.title.replace('● editing with Bespin', '- editing with Bespin');
    });

    return {
        render: function() {
            scene.render();
        },
        paint: function() {
            scene.paint();
        }
    };
};

/**
 * Loads and configures the objects that the editor needs
 */
exports.onLoad = function() {
    var editor = bespin.register('editor', new editorMod.API('editor'));
    var editSession = bespin.register('editSession', new sessionMod.EditSession({ editor: editor }));
    var server = bespin.register('server', new server.Server());
    var files = bespin.register('files', new filesystem.FileSystem());

    bespin.register('actions', editor.ui.actions);
    //bespin.register('filesearch', new filesearch.API());
    bespin.register('toolbar', new toolbar.Toolbar({ editor: editor, opts: { setupDefault: true } }));
    bespin.register('quickopen', new quickopen.API());

    // Get going when settings are loaded
    bespin.subscribe("settings:loaded", function(event) {
        bespin.get('settings').loadSession();  // load the last file or what is passed in
        exports.doResize();
    });

    var whenLoggedIn = function(userinfo) {
        bespin.get('editSession').setUserinfo(userinfo);
        bespin.register('settings', new settings.Core());

        if (userinfo.serverCapabilities) {
            var sc = userinfo.serverCapabilities;
            bespin.register("serverCapabilities", sc.capabilities);

            for (var packagename in sc.dojoModulePath) {
                dojo.registerModulePath(packagename, sc.dojoModulePath[packagename]);
            }

            // this is done to trick the build system which would
            // try to find a module called "plugin" below.
            var re = require;
            sc.javaScriptPlugins.forEach(function(plugin) {
                re.call(dojo, plugin);
            });
        }

        bespin.publish("authenticated");
    };

    var whenNotLoggedIn = function() {
        navigate.home(); // go back
    };

    // Force a login just in case the user session isn't around
    server.currentuser(whenLoggedIn, whenNotLoggedIn);

    // Set the version info
    bespin.displayVersion();

    dojo.connect(window, 'resize', exports, "doResize");

    // -- Deal with the project label (project, filename, dirty flag)
    statusScene = new ProjectStatusScene();

    // publish changes to the URL bar to allow us to change the edited file
    urlbar.monitor();

    bespin.publish("bespin:editor:initialized", {});
};
