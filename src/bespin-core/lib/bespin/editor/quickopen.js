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
var command = require("bespin/command");
var SC = require("sproutcore");

/**
 *
 */
exports.API = SC.Object.extend({
    requestFinished: true,
    preformNewRequest: false,
    projects: null,
    currentProject: null,
    currentProjectInclude: null,

    init: function() {
        this.scene = new th.WindowScene({
            canvasOrId: document.getElementById("quickopen"),
            createFocusManager: true,
            isVisible: false,
            isDraggable: true,
            title: "Find Files"
        });

        this.focusManager = this.scene.focusManager;
        this.input = this.scene.byId('input');
        this.input.selectAll();
        this.inputProject = this.scene.byId('project');

        this.list = this.scene.byId('list');
        this.list.items = [ 'Loading...'];
        this.list.remove(this.list.renderer);
        this.list.renderer = new th.HtmlLabel();
        this.list.add(this.list.renderer);
        this.list.renderer.addCss('padding', '2px 5px');

        this.label = this.scene.byId('label');

        this.focusManager.subscribe(this.inputProject);
        this.focusManager.subscribe(this.input);

        this.scene.render();
        this.scene.center();

        // add some key bindings
        this.input.bindKey("", this.input.ARROW_UP, this.list.moveSelectionUp, this.list);
        this.input.bindKey("", this.input.ARROW_DOWN, this.list.moveSelectionDown, this.list);
        this.input.bindKey("", this.input.ESCAPE, function() { bespin.publish("ui:escape"); }, this);
        this.input.bindKey("", this.input.ENTER, this.openFile, this);

        this.inputProject.bindKey("", this.inputProject.ENTER, function() {
            this.input.focusManager.focus(this.input);
        });
        this.inputProject.bindKey("", this.input.ESCAPE, function() {
            bespin.publish("ui:escape");
        }, this);

        // bind to some events
        this.scene.bus.bind("dblclick", this.list, this.openFile, this);

        this.scene.bus.bind("itemselected", this.list, function(e) {
            this.label.text = e.item.filename;
            this.label.repaint();
        }, this);

        this.scene.bus.bind("text:changed", this.input, function() {
            if (!this.currentProject) {
                return;
            }

            // the text has changed!
            if (this.requestFinished) {
                this.requestFinished = false;
                bespin.get('server').searchFiles(this.currentProject, this.input.text, this.currentProjectInclude, this.displayResult);
            } else {
                this.preformNewRequest = true;
            }
        }, this);

        this.scene.bus.bind("text:changed:newChar", this.inputProject, function() {
            if (!this.inputProject.text == '') {
                var newText = this.inputProject.text.toLowerCase();
                // the text has changed!
                for (var i=0; i < this.projects.length; i++) {
                    if (this.projects[i].toLowerCase().indexOf(newText) == 0) {
                        this.inputProject.setText(this.inputProject.text + this.projects[i].substring(newText.length), true);
                        this.inputProject.setSelection(newText.length, this.inputProject.text.length);
                    }
                }
            }
        }, this);

        this.scene.bus.bind("focus:lost", this.inputProject, function() {
            var newText = this.inputProject.text.toLowerCase();
            for (var i=0; i < this.projects.length; i++) {
                if (this.projects[i].toLowerCase() == newText) {
                    this.setProject(this.projects[i]);
                    if (this.input.text == 'no such project') {
                        this.input.setText('', true);
                    }
                    // TODO: put in recent files
                    this.showFiles([]);
                    this.label.text = 'Loading List...';
                    bespin.get('server').searchFiles(this.currentProject, this.input.text, this.currentProjectInclude, this.displayResult);
                    return;
                }
            }
            // there was no such project as typed => show this the to the user!
            this.input.setText('no such project', true);
            this.list.items = [];
            delete this.list.selected;
            this.label.text = '';
            this.scene.render();
        }, this);

        this.scene.bus.bind("focus:received", this.inputProject, function() {
            this.selectAll();
        }, this.inputProject);

        this.scene.bus.bind("focus:received", this.input, function() {
            this.selectAll();
        }, this.input);

        var self = this;
        bespin.subscribe('ui:escape', function() {
            if (self.scene.isVisible) {
                self.toggle();
                bespin.get('editor').setFocus(true);
            }
        });
    },

    toggle: function() {
        if (!this.scene.isVisible) {
            dojo.style("quickopenContainer", "display", "block");
        }

        this.scene.toggle();

        if (!this.scene.isVisible) {
            this.focusManager.removeFocus();
        } else {
            this.focusManager.focus(this.input);
            this.setProject(bespin.get('editSession').project);
            this.input.setText('');
            this.loadProjects();
        }
    },

    openFile: function() {
        var item = this.list.selected;
        if (!item) {
            return; // short circuit if we don't have an item to click on
        }

        // save the current file and load up the new one
        var editor = bespin.get('editor');
        editor.saveFile();
        editor.openFile(this.currentProject, item.filename);

        // TODO: fix this, since we no longer get open session files for a project.
        // var currentProjectList = this.openSessionFiles[this.currentProject];
        // // adds the new opened file to the top of the openSessionFiles
        // if (currentProjectList.indexOf(item.filename) != -1) {
        //      currentProjectList.splice(currentProjectList.indexOf(item.filename), 1);
        // }
        // currentProjectList.unshift(item.filename);

        this.toggle();
        editor.setFocus(true);
    },

    highlightText: function(text, highlight) {
        if (highlight == '') {
            return text;
        }
        var lastIndex = 0, startIndex = -1;
        var lowerText = text.toLowerCase();
        highlight = highlight.toLowerCase();
        var result = '';
        for (var i=0; i < highlight.length; i++) {
            lastIndex = startIndex;
            startIndex = lowerText.indexOf(highlight[i], startIndex);
            if (startIndex == -1) {
                break;
            }
            result += text.substring(lastIndex + 1, startIndex) + '<#000000>' + text[startIndex] + '</#000000>';
        }
        result += text.substring(startIndex + 1);
        return result.replace(/<\/#000000><#000000>/g, '');
    },

    showFiles: function(files, sortFiles) {
        sortFiles = sortFiles || false;
        var items = [];
        var sortedItems = [];
        var quickopen = bespin.get('quickopen');
        var settings = bespin.get('settings');
        var lastFolder;
        var name;
        var path;
        var lastSlash;
        var file;

        if (files === undefined || files.length == 0) {
            quickopen.list.items = [];
            delete quickopen.list.selected;
            quickopen.label.text = 'No File was found!';
            quickopen.scene.render();
            return;
        }

        for (var x = 0; x < files.length; x++) {
            file = files[x];
            lastSlash = file.lastIndexOf("/");
            path = (lastSlash == -1) ? "" : file.substring(0, lastSlash);
            name = (lastSlash == -1) ? file : file.substring(lastSlash + 1);
            if (settings && settings.isSettingOff('dotmode') && name[0] == '.') {
                continue;
            }

            // look at the array if there is an entry with the same name => adds folder to it!
            lastFolder = false;
            for (var y = items.length - 1; y != -1 ; y--) {
                if (items[y].name == name) {
                    if (!items[y].lastFolder) {
                        lastFolder = items[y].filename.split('/');
                        items[y].lastFolder = (lastFolder.length > 1 ? lastFolder[lastFolder.length - 2] : '');
                    }

                    lastFolder = file.split('/');
                    lastFolder = (lastFolder.length > 1 ? lastFolder[lastFolder.length - 2] : '');
                    break;
                }
            }
            items.push({filename: file, lastFolder: lastFolder, name: name});
        }

        // for the moment there are only 13 files displayed...
        items = items.slice(0, 13);

        if (sortFiles) {
            items.sort(function(a, b) {
                try {
                    var x = a.text.toLowerCase();
                    var y = b.text.toLowerCase();
                    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
                } catch (e) {
                    return 0;
                }
            });
        }

        for (var i=0; i < items.length; i++) {
            items[i].text = quickopen.highlightText(items[i].name, quickopen.input.text) +
                    (items[i].lastFolder == false ? '' :  ' - ' + items[i].lastFolder);
        }

        quickopen.list.items = items;
        if (items.length != 0) {
            quickopen.list.selected = items[0];
            quickopen.label.text = items[0].filename;
        }
        quickopen.scene.render();
        //quickopen.window.layoutAndRender();
    },

    displayResult: function(files) {
        var quickopen = bespin.get('quickopen');
        quickopen.showFiles(files);

        quickopen.requestFinished = true;

        if (quickopen.preformNewRequest) {
            quickopen.requestFinished = false;
            quickopen.preformNewRequest = false;
            quickopen.requestText = quickopen.input.text;
            bespin.get('server').searchFiles(quickopen.currentProject, quickopen.input.text, quickopen.currentProjectInclude, quickopen.displayResult);
        }
    },

    loadProjects: function() {
        var self = this;
        bespin.get("server").list(null, null, function(projectItems) {
            self.projects = [];
            for (var i=0; i < projectItems.length; i++) {
                var name = projectItems[i].name;
                self.projects.push(name.substring(0, name.length - 1));
            }
            self.projects.sort(function(a, b) {
                 var x = a.toLowerCase();
                 var y = b.toLowerCase();
                 return ((x < y) ? -1 : ((x > y) ? 1 : 0));
             });
        });
    },

    setProject: function(name) {
        this.inputProject.setText(name, true);
        this.currentProject = name;
        this.currentProjectInclude = [];

        var settings = bespin.get('settings');
        if (settings) {
            var includeFolders = settings.getObject('quickopenInclude');
            if (includeFolders) {
                if (includeFolders[name]) {
                    this.currentProjectInclude = includeFolders[name];
                }
            }
        }
    }
});

/**
 * The 'quickopen' command
 */
command.store.addCommand({
    name: 'quickopen',
    takes: ['task', 'project', 'path'],
    preview: 'list, add or remove a folder from the list quickopen uses to search in for files',
    usage: '[add|remove] [project] [path to be added or removed]',
    execute: function(instruction, args) {
        var settings = bespin.get('settings');
        var includes;

        if (!args.task) {
            instruction.addOutput(this.preview);
            instruction.addUsageOutput(this);
            instruction.error = false;

            includes = settings.getObject('quickopenInclude');
            if (includes === undefined) {
                return;
            }
            var output = '<br/>';
            for (var projects in includes) {
                if (includes[projects].length == 0) {
                    continue;
                }
                output += "<u><b>Project: " + projects + "</b></u>";
                output += "<ul>";
                for (var i=0; i < includes[projects].length; i++) {
                    output += '<li>' + includes[projects][i] + "</li>";
                }
                output += "</ul><br/>";
            }
            instruction.addOutput(output);
            return;
        }

        if (!args.path || !args.project) {
            instruction.addUsageOutput(this);
            return;
        }

        if (args.task == 'add') {
            includes = settings.getObject('quickopenInclude');
            if (includes === undefined){includes = {};}
            if (includes[args.project] === undefined){includes[args.project] = [];}
            includes[args.project].push(args.path);
            settings.setObject('quickopenInclude', includes);
        } else if (args.task == 'remove') {
            includes = settings.getObject('quickopenInclude');
            if (includes === undefined) {
                return;
            }
            if (includes[args.project] === undefined) {
                return;
            }
            if (includes[args.project].indexOf(args.path) == -1) {
                return;
            }
            includes[args.project].splice(includes[args.project].indexOf(args.path), 1);
            settings.setObject('quickopenInclude', includes);
        }
    }
});
