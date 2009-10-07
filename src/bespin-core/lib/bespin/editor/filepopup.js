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
var util = require("bespin/util");

var images = {
    open: "images/actions/open.png",
    paste: "images/actions/pasteToCommandLine.png",
    del: "images/actions/delete.png",
    newfile: "images/actions/newfile.png",
    mkdir: "images/actions/mkdir.png"
};

for (var imgName in images) {
    var imgUrl = images[imgName];
    var main = new Image();
    main.src = imgUrl;
    var active = new Image();
    active.src = imgUrl.substring(0, imgUrl.length-4) + "-b.png";

    images[imgName] = [main, active];
}

exports.ActionTree = Class.define({
    type: "HorizontalTree",
    superclass: th.HorizontalTree,
    members: {
        init: function(parms) {
            this._super(parms);

            this.filePanel = parms.filePanel;

            this.folderActionList = null;
            this.pendingList = null;

            this.createFolderActionPanel();
        },

        createFolderActionPanel: function() {
            var folderActions = [];

            var action = {
                name: "New File",
                image: images.newfile[0],
                activeImage: images.newfile[1],
                action: function(cli, file, path) {
                    cli.setCommandText("newfile " + file);
                    cli.focus();
                }
            };
            folderActions.push(action);

            action = {
                name: "New Directory",
                image: images.mkdir[0],
                activeImage: images.mkdir[1],
                action: function(cli, file, path) {
                    cli.setCommandText("mkdir " + file);
                    cli.focus();
                }
            };
            folderActions.push(action);

            action = {
                name: "Delete",
                image: images.del[0],
                activeImage: images.del[1],
                action: function(cli, file, path) {
                    cli.setCommandText("del " + file);
                    cli.focus();
                }
            };
            folderActions.push(action);

            action = {
                name: "Paste to Command Line",
                image: images.paste[0],
                activeImage: images.paste[1],
                action: function(cli, file, path) {
                    cli.appendCommandText(" " + file);
                }
            };
            folderActions.push(action);

            this.folderActionElements = {};
            var fae = this.folderActionElements;

            var toplabel = new th.Label({text: "", className: "folderDetailLabel"});
            toplabel.addCss("background-color", "rgb(37,34,33)");
            fae.toplabel = toplabel;

            var actionlabel = new th.Label({text: "", className: "fileActionLabel"});
            // I don't know why these two lines are needed. The definitions
            // in editor_th.css don't seem to be taking effect here.
            actionlabel.addCss("background-color", "rgb(37,34,33)");
            actionlabel.addCss("color", "rgb(150, 150, 150)");
            fae.actionPanel = new exports.ActionPanel(exports.FolderActionIcon, this, actionlabel,
                                    folderActions, 27, 27, 4);

            fae.actionlabel = actionlabel;

        },

        createList: function(items) {
            var list = this._super(items);
            this.getScene().bus.bind("mousedown", list, this.listclick, this);
            return list;
        },

        listclick: function(e) {
            var list = e.thComponent;
            var width = list.bounds.width;

            // The icn-action image is 31 pixels wide. The first 13 pixels are
            // the icon that represents actions.
            var hotLeft = width - 31;
            var hotRight = width - 18;
            var listX = e.componentX;
            var item = list.getItemForPosition({ x: e.componentX, y: e.componentY });

            if (item === undefined) {
                return;
            }

            if (item.contents && listX >= hotLeft && listX <= hotRight) {
                var listnum = this.getListPosition(list);
                if (listnum !== null) {
                    this.toggleFolderActions(item, listnum);
                }
            }
        },

        getListPosition: function(list) {
            var sp = this.scrollPanes;
            for (var i = sp.length - 1; i >= 0; i--) {
                if (sp[i].view == list) {
                    return i;
                }
            }
            return null;
        },

        clearActionLabel: function(e) {
            var fae = this.folderActionElements;
            if (fae.actionlabel.text != "") {
                fae.actionlabel.text = "";
                fae.actionlabel.render();
                th.stopEvent(e);
            }
        },

        toggleFolderActions: function(item, listnum, noRender) {
            this.pendingList = null;

            var sp = this.scrollPanes;

            // First, turn off the existing action panel
            if (this.folderActionList !== null && listnum != this.folderActionList) {
                this.toggleFolderActions(null, this.folderActionList, true);
            }

            // Close or set up the panel
            if (sp.length > listnum+1) {
                // var topPanel = sp[listnum+1].topPanel;
                var fae = this.folderActionElements;
                if (sp[listnum+1].view.label) {
                    sp[listnum+1].view.label.addCss("display", "none");
                    sp[listnum+1].view.remove(sp[listnum+1].view.label);
                    delete sp[listnum+1].view.label;
                    sp[listnum+1].render();
                    this.folderActionList = null;
                } else {
                    var topPanel = new th.Panel();
                    topPanel.getPreferredSize = function() {
                        return { width: 20, height: 90 };
                    };
                    topPanel.layoutManager = new th.FlowLayout(th.VERTICAL);
                    topPanel.addCss("height", "90px");
                    topPanel.addCss("background-color", "rgb(37,34,33)");
                    topPanel.addCss("background-image", "url(../images/filebrowser/folderaction_splitter.gif)");
                    topPanel.addCss("background-repeat", "repeat-x");
                    topPanel.addCss("background-position", "left bottom");
                    topPanel.id = "topPanel";
                    // this is important!
                    topPanel.addCss("display", "block");

                    topPanel.toplabel = fae.toplabel;
                    fae.toplabel.text = item.name;
                    topPanel.add([fae.toplabel, fae.actionPanel, fae.actionlabel]);

                    topPanel.bus.bind("mousemove", topPanel, this.clearActionLabel, this);

                    this.folderActionList = listnum;
                    sp[listnum+1].view.addTopLabel(topPanel);
                }

                //if (!noRender) {
                    // I'm not sure why we have to do a entire render.
                    // It turned out that this seems to perform some layout stuff => the topPanel is set right after this
                    sp[listnum+1].view.render();
                    this.render();
                //}
            } else {
                this.pendingList = listnum;
            }
        },

        showChildren: function(newItem, children) {
            this._super(newItem, children);

            if (this.pendingList) {
                this.toggleFolderActions(newItem, this.pendingList);
            }
        },

        getFolderPath: function() {
            if (this.folderActionList == null) {
                return;
            }

            var sp = this.scrollPanes;

            var path = "/" + this.filePanel.currentProject;

            for (var i = 0; i <= this.folderActionList; i++) {
                path += "/" + sp[i].view.selected.name;
            }

            // add trailing slash, which is important for denoting directories.
            path += "/";

            return path;
        }
    }
});

exports.FilePanel = Class.define({
members: {
    init: function() {
        // Old global definitions
        this.heightDiff = null;
        this.currentProject = null;

        // Old members mixed into this
        this.lastSelectedPath = null;
        this.firstdisplay = true;

        this.nodes = [];
        this.connections = [];
        this.subscriptions = [];

        // JS FTW!
        var self = this;

        // Joe's favorite Dojo feature in action, baby!
        this.canvas = dojo.create("canvas", {
            id: "filepopupcanvas",
            tabIndex: -1,
            style: {
                position: "absolute",
                zIndex: 250,
                display: "none"
            }
        }, dojo.body());
        this.nodes.push("filepopupcanvas");

        // create the Thunderhead scene representing the file browser; will consist of various lists in one column on the left,
        // and a horizontal tree component on the right
        this.scene = new th.Scene(this.canvas);

        // container for the scene
        var topPanel = new th.Panel({id: 'file_browser'});

        this.scene.root.add(topPanel);

        // create a scroll pane for the left column, and a top-level container to put in the scroll pane
        this.projects = new th.List({id: "project_list"});
        this.projects.getItemText = function(item) { return item.name; };

        var leftColumnScrollPane = new th.ScrollPane({ id: "project_scrollpane", splitter: true });
        leftColumnScrollPane.add(this.projects);
        leftColumnScrollPane.addCss("border-width", "1px 0px 1px 0px");
        leftColumnScrollPane.addCss("overflow-x", "hidden");
        leftColumnScrollPane.preferredWidth = 186;
        leftColumnScrollPane.preferredHeight = 200;

        topPanel.add(leftColumnScrollPane);

        // the horizontal tree that will display the contents of a selected project
        this.tree = new exports.ActionTree({ id: "htree" , filePanel: this});

        this.tree.getItemText = this.projects.getItemText;

        this.configureActions();

        topPanel.add(this.tree);

        // homegrown layout; sorry, that's how I roll
        topPanel.layout = function() {
            var d = this.d();

            var left = this.children[0];
            var right = this.children[1];

            var pref = left.getPreferredSize();

            left.setBounds(d.i.l, d.i.t, pref.width, d.b.ih);
            right.setBounds(left.bounds.x + left.bounds.width, d.i.t, d.b.iw - left.bounds.width, d.b.ih);
        };

        this.scene.render();

        this.scene.bus.bind("dblclick", this.tree, function(e) {
            var path = this.tree.getSelectedPath();
            if (!path) {
                console.error("Got tree.getSelectedPath == null, bailing out");
                return;
            }

            if (path.length === 0) {
                return;   // bad state, get out
            }

            if (path[path.length - 1].contents) {
                // if we're in a directory, refresh the files in the directory
                // TODO this is commented out because it tends to result
                // in extra columns getting randomly added to the tree
                // the problem appears to be with how it's updating the tree
                // in fetchFiles.
                //this.fetchFiles(path, this.tree);
                return;
            }

            var file = this.getFilePath(path, true);
            console.log("file", file, { filename:file, project:this.currentProject });
            bespin.getComponent("commandLine", function(cli) {
                cli.executeCommand("load /" + this.currentProject + "/" + file);
            }, this);

            var settings = bespin.get("settings");
            if (settings && settings.isSettingOn('keepfilepopuponopen')) {
                // keep the file popup up!
            } else {
                bespin.publish("ui:escape");
            }
        }, this);

        this.scene.bus.bind("itemselected", this.projects, function(e) {
            var item = e.item;
            this.fetchRootFiles(item.name, this.tree);

            this.currentProject = item.name;
        }, this);

        this.refreshProjects();

        var self = this;
        var hitchedRefresh = function() { return self.refreshProjects(); };
        this.subscriptions.push(bespin.subscribe("project:created", hitchedRefresh));
        this.subscriptions.push(bespin.subscribe("project:deleted", hitchedRefresh));
        this.subscriptions.push(bespin.subscribe("project:renamed", hitchedRefresh));

        var fileUpdates = function(e) { self.updatePath(e.project, e.path); };
        this.subscriptions.push(bespin.subscribe("file:saved", fileUpdates));
        this.subscriptions.push(bespin.subscribe("file:removed", fileUpdates));
        this.subscriptions.push(bespin.subscribe("directory:created", fileUpdates));
        this.subscriptions.push(bespin.subscribe("directory:removed", fileUpdates));

        this.connections.push(dojo.connect(this.canvas, "keydown", function(e) {
            var key = bespin.util.keys.Key;
            var path = self.tree.getSelectedPath();

            var list, listNext, listPre;
            if (path === undefined) {
                list = self.projects;
                listNext = self.tree.getList(0);
                listPre = null;
            } else {
                // things to make life much more easy :)
                var index = path.length - 1;
                list = self.tree.getList(index);
                listNext = (self.tree.getListCount() > index ? self.tree.getList(index + 1) : false);
                listPre = (index != 0 ? self.tree.getList(index - 1) : self.projects);
            }

            switch (e.keyCode) {
                case key.LEFT_ARROW:
                    if (!listPre) {
                        break;
                    }
                    listPre.selected.lastSelected = list.selected.name;  // save the selection, if the user comes back to this list
                    list.selected = null;
                    self.tree.repaint();
                    break;
                case key.RIGHT_ARROW:
                    if (!listNext) {
                        break;
                    }
                    if (list.selected.lastSelected) {
                        listNext.selectItemByText(list.selected.lastSelected);
                        listNext.bus.fire("itemselected", { container: listNext, item: list.selected }, listNext);
                    } else {
                        listNext.selected = listNext.items[0];
                        listNext.bus.fire("itemselected", { container: listNext, item: list.selected }, listNext);
                    }
                    break;
                case key.UP_ARROW:
                    list.moveSelectionUp();
                    break;
                case key.DOWN_ARROW:
                    list.moveSelectionDown();
                    break;
                case key.ENTER:
                    self.scene.bus.fire("dblclick", e, self.tree);
                    break;
                case key.ESCAPE:
                    bespin.getComponent("popup", function(popup) {
                        popup.hide();
                    });
                    break;
                case key.J:
                    if (e.ctrlKey || e.metaKey) {
                        bespin.getComponent("commandLine", function(cli) {
                            cli.showPanel("output");
                            cli.focus();
                        });
                    }
                    break;
                default:
                    //console.log("default file panel key event");

                    // send events over to the editor for now
                    // var _event = document.createEvent('HTMLEvents');
                    // _event.initEvent(e, true, true); //event type,bubbling,cancellable
                    // bespin.get('editor').container.dispatchEvent(_event);

                    // stop the event so it doesn't bubble (e.g. Cmd-O doubling up)
                    dojo.stopEvent(e);
                    break;
           }
       }));
    },

    destroy: function() {
        this.subscriptions.forEach(function(sub) {
            bespin.unsubscribe(sub);
        });

        this.connections.forEach(function(conn) {
            dojo.disconnect(conn);
        });

        this.nodes.forEach(function(nodeId) {
            dojo.query("#" + nodeId).orphan();
        });
    },

    configureActions: function() {
        var fileActions = [];
        var action = {
            name: "Edit File",
            image: images.open[0],
            activeImage: images.open[1],
            action: function(cli, file, path) {
                cli.setCommandText("open " + file);
                cli.focus();
            }
        };
        fileActions.push(action);

        action = {
            name: "Paste to Command Line",
            image: images.paste[0],
            activeImage: images.paste[1],
            action: function(cli, file, path) {
                cli.appendCommandText(" " + file);
            }
        };
        fileActions.push(action);

        action = {
            name: "Delete",
            image: images.del[0],
            activeImage: images.del[1],
            action: function(cli, file, path) {
                cli.setCommandText("del " + file);
                cli.focus();
            }
        };
        fileActions.push(action);

        this.fileActionPanel = new th.Panel();
        var fileActionPanel = this.fileActionPanel;
        fileActionPanel.addCss("background-color", "rgb(37,34,33)");

        var toplabel = new th.Label({text: "", className: "fileDetailLabel"});
        toplabel.addCss("background-color", "rgb(37,34,33)");
        fileActionPanel.toplabel = toplabel;

        fileActionPanel.layoutManager = new th.FlowLayout(th.VERTICAL);
        fileActionPanel.add(toplabel);

        var actionlabel = new th.Label({text: "", className: "fileActionLabel"});
        // I don't know why these two lines are needed. The definitions
        // in editor_th.css don't seem to be taking effect here.
        actionlabel.addCss("background-color", "rgb(37,34,33)");
        actionlabel.addCss("color", "rgb(150, 150, 150)");
        fileActionPanel.add(new exports.ActionPanel(exports.FileActionIcon, this, actionlabel, fileActions, 27, 27, 4));
        fileActionPanel.add(actionlabel);

        fileActionPanel.bus.bind("mousemove", fileActionPanel, function(e) {
            if (actionlabel.text != "") {
                actionlabel.text = "";
                actionlabel.render();
                th.stopEvent(e);
            }
        });

        var self = this;
        this.tree.getDetailPanel = function(item) {
            self.getFileDetailPanel(item);
        };
    },

    show: function(coords) {
        this.canvas.width = coords.w;
        this.canvas.height = coords.h;

        dojo.style(this.canvas, {
            display: "block",
            top: coords.t + "px",
            left: coords.l + "px"
        });

        this.scene.render();
        this.canvas.focus();

        if (this.firstdisplay) {
            this.firstdisplay = false;
            var session = bespin.get("editSession");
            var project = session.project;
            this.currentProject = project;
            this.projects.selectItemByText(project);
            var path = session.path;
            this.restorePath(path);
        }
    },

    hide: function() {
        this.canvas.style.display = "none";
    },

    // TODO: this isnt called in this file
    sizeCanvas: function(canvas) {
        if (!this.heightDiff) {
            this.heightDiff = dojo.byId("header").clientHeight + dojo.byId("subheader").clientHeight + dojo.byId("footer").clientHeight;
        }
        var height = window.innerHeight - this.heightDiff + 11;
        dojo.attr(canvas, { width: window.innerWidth, height: height });
    },

    prepareFilesForTree: function(files) {
        if (files.length == 0) {
            return [];
        }

        var name;
        var fdata = [];
        for (var i = 0; i < files.length; i++) {
            name = files[i].name;
            var settings = bespin.get("settings");
            if (settings && settings.isSettingOff('dotmode') && name[0] == '.') {
                continue;
            }
            if (/\/$/.test(name)) {
                fdata.push({
                    name: name.substring(0, name.length - 1),
                    contents: this.fetchFiles.bind(this)
                });
            } else {
                fdata.push({ name: name });
            }
        }

        return fdata;
    },

    getFilePath: function(treePath, noProject) {
        var filepath = (noProject) ? "" : this.currentProject + "/";

        for (var i = 0; i < treePath.length; i++) {
            if (treePath[i] && treePath[i].name) {
                filepath += treePath[i].name + ((i < treePath.length - 1) ? "/" : "");
            }
        }
        return filepath;
    },

    fetchRootFiles: function(project, tree) {
        var self = this;
        bespin.get("server").list(project, null, function(files) {
            tree.setData(self.prepareFilesForTree(files));
            tree.render();
        });
    },

    fetchFiles: function(path, tree) {
        var filepath = this.getFilePath(path);

        var self = this;
        bespin.get("server").list(filepath, null, function(files) {
            tree.updateData(path[path.length - 1], self.prepareFilesForTree(files));
            tree.render();
        });
    },

    updatePath: function(project, filepath) {
        var tree = this.tree;

        if (filepath.substring(filepath.length-1) == "/") {
            filepath = filepath.substring(0, filepath.length - 1);
        }

        var selectedProject = this.projects.selected;
        if (selectedProject) {
            // If the currently selected project is not being displayed
            // we don't need to update. We're only updating what is
            // visible.
            if (selectedProject.name != project) {
                return;
            }
        } else {
            // no project currently being displayed, so there's nothing
            // to update
            return;
        }

        var selectedPath = tree.getSelectedPath();

        if (selectedPath === undefined) {
            selectedPath = [];
        }

        var filepathItems = filepath.split("/");
        var lengthToParent = filepathItems.length - 1;

        // we want to see if the *parent* of the file/directory
        // that has changed is visible and, if so, update that.
        for (var i = 0; i < lengthToParent; i++) {
            var fpitem = filepathItems[i];

            var item = selectedPath[i];

            if (item == undefined || !item.contents) {
                break;
            }

            if (item.name != fpitem) {
                return;
            }
        }

        var fetchPath = this.getFilePath(selectedPath.slice(0,i));

        var self = this;

        var listToUpdate = tree.getList(i);

        bespin.get("server").list(fetchPath, null, function(files) {
            var contents = self.prepareFilesForTree(files);
            fetchPath[fetchPath.length-1].contents = contents;

            if (listToUpdate) {
                listToUpdate.items = contents;
                tree.render();
            } else {
                tree.showChildren(null, contents);
            }
        });
    },

    restorePath: function(newPath) {
        this.lastSelectedPath = this.lastSelectedPath || '';
        newPath = newPath || '';
        var oldPath = this.lastSelectedPath;
        this.lastSelectedPath = newPath;

        if (newPath == oldPath && newPath != '') {
            // the path has not changed
            return;
        }

        newPath = newPath.split('/');
        oldPath = oldPath.split('/');

        this.scene.renderAllowed = false;

        var sameLevel = 0;
        while (sameLevel < Math.min(newPath.length, oldPath.length) && newPath[sameLevel] == oldPath[sameLevel] && newPath[sameLevel] != '') {
            sameLevel ++;
        }

        var fakePath = new Array(newPath.length);
        for (var x = 0; x < newPath.length; x++) {
            var fakeItem = {};
            fakeItem.name = newPath[x];
            if (x != newPath.length - 1) {
                fakeItem.contents = 'fake';
            }
            if (x > this.tree.scrollPanes.length - 1) {
                this.tree.showChildren(null, new Array(fakeItem));
            }
            if (newPath[x] != '') {
                this.tree.scrollPanes[x].view.selectItemByText(newPath[x]);
            }
            fakePath[x] = fakeItem;
        }

        if (newPath.length <= this.tree.scrollPanes.length) {
            this.tree.removeListsFrom(newPath.length);
        }

        var contentsPath = new Array(newPath.length);
        var countSetupPaths = sameLevel;

        // deselect lists if needed
        for (x = newPath.length; x < this.tree.scrollPanes.length; x++) {
            delete this.tree.getList(x).selected;
        }

        // get the data for the lists
        for (x = sameLevel; x < newPath.length; x++) {
            var selected = this.tree.scrollPanes[x].view.selected;
            if (selected && selected.contents && dojo.isArray(selected.contents)) {
                // restore filelist from local memory (the filelists was ones fetched)
                if (x > this.tree.scrollPanes.length - 1) {
                    this.tree.showChildren(null, selected.contents);
                } else {
                    this.tree.replaceList(x, selected.contents);
                }
                this.tree.getList(x).selectItemByText(fakePath[x].name);
                countSetupPaths++;
            } else {
                // load filelist form this.server
                var filepath = this.getFilePath(fakePath.slice(0, x));

                var self = this;
                // Closure creator to capture the value of x in index
                bespin.get("server").list(filepath, null, (function(index) {
                    return function(files) {
                        // "this" is the callbackData object!
                        var contents = self.prepareFilesForTree(files);
                        contentsPath[index] = contents;

                        self.tree.replaceList(index, contents);
                        var list = self.tree.getList(index);
                        list.selectItemByText(fakePath[index].name);
                        countSetupPaths++;

                        if (countSetupPaths == newPath.length) {
                            for (var x = 1; x < newPath.length - 1; x++) {
                                // when the path is not restored from the root,
                                // then there are contents without contents!
                                if (contentsPath[x]) {
                                    var list2 = self.tree.getList(x-1);
                                    // todo: I added the if () to fix an error,
                                    // not sure if it was a symptom of something larger
                                    if (list2.selected) {
                                        list2.selected.contents = contentsPath[x];
                                    }
                                }
                            }

                            self.tree.showDetails(fakePath[newPath.length-1]);
                        }
                    };
                })(x));
            }
        }

        this.scene.renderAllowed = true;
        this.scene.render();
    },

    displayProjects: function(projectItems) {

        for (var i = 0; i < projectItems.length; i++) {
            projectItems[i] = {
                name: projectItems[i].name.substring(0, projectItems[i].name.length - 1),
                contents: this.fetchFiles.bind(this)
            };
        }

        this.projects.items = projectItems;
        if (this.currentProject) {
            this.projects.selectItemByText(this.currentProject);
        }
        this.projects.repaint();
    },

    refreshProjects: function() {
        console.log("refreshProjects");

        bespin.get("server").list(null, null, this.displayProjects.bind(this));
    },

    getFileDetailPanel: function(item) {
        if (item) {
            this.fileActionPanel.toplabel.text = item.name;
        } else {
            this.fileActionPanel.toplabel.text = "";
        }
        return this.fileActionPanel;
    }
}});

exports.ActionPanel = Class.define({
type: "ActionPanel",
superclass: th.Panel,
members: {
    init: function(IconType, context, label, actions, width, height, columns, parms) {
        this._super(parms);
        this.label = label;
        this.actions = actions;
        this.context = context;

        for (var i = 0; i < actions.length; i++) {
            var ai = new IconType(actions[i], width, height);
            this.add(ai);
        }

        this.width = width;
        this.height = height;
        this.columns = columns;
    },

    getPreferredSize: function() {
        var d = this.d();
        var width = this.parent.bounds.w;
        var height = d.i.t + d.i.b + this.height * Math.ceil(this.actions.length / this.columns);
        return {width: width, height: height};
    },

    layout: function() {
        var d = this.d();

        var children = this.children;
        var width = this.width;
        var height = this.height;
        var columns = this.columns;

        var x = d.i.l;
        var y = d.i.t;
        var col = 0;

        for (var current = 0; current < children.length; current++) {
            children[current].setBounds(x, y, width, height);
            col += 1;
            if (col == columns) {
                x = d.i.l;
                y += height;
                col = 0;
            } else {
                x += width + 3;
            }
        }
    }

}});

exports.BaseActionIcon = Class.define({
type: "ActionIcon",
superclass: th.Panel,
members: {
    init: function(action, width, height, parms) {
        this._super(parms);
        this.action = action;
        this.width = width;
        this.height = height;

        this.currentImage = this.action.image;

        this.bus.bind("mouseover", this, this._onmouseover, this);
        this.bus.bind("mouseout", this, this._onmouseout, this);
    },

    getPreferredSize: function() {
        return {width: this.width, height: this.height};
    },

    paint: function(ctx) {
        this._super(ctx);
        ctx.drawImage(this.currentImage, 0, 0);
    },

    _onmouseover: function(e) {
        var label = this.parent.label;
        var action = this.action;

        if (label.text != action.name) {
            if (action.activeImage) {
                this.currentImage = action.activeImage;
            }

            label.text = action.name;
            label.render();
            this.parent.render();
        }
    },

    _onmouseout: function(e) {
        if (this.action.currentImage != this.action.image) {
            this.currentImage = this.action.image;
        }
    }
}});

exports.FileActionIcon = Class.define({
type: "ActionIcon",
superclass: exports.BaseActionIcon,
members: {
    init: function(action, width, height, parms) {
        this._super(action, width, height, parms);
        this.bus.bind("mousedown", this, this._onmousedown, this);
    },

    _onmousedown: function(e) {
        var action = this.action.action;
        bespin.getComponent("commandLine", function(cli) {
            var path = this.tree.getSelectedPath();
            var file = "/" + this.currentProject + "/" + this.getFilePath(path, true);
            action(cli, file, path);
        }, this.parent.context);
        th.stopEvent(e);
    }
}});

exports.FolderActionIcon = Class.define({
type: "ActionIcon",
superclass: exports.BaseActionIcon,
members: {
    init: function(action, width, height, parms) {
        this._super(action, width, height, parms);
        this.bus.bind("mousedown", this, this._onmousedown, this);
    },

    _onmousedown: function(e) {
        var action = this.action.action;
        bespin.getComponent("commandLine", function(cli) {
            action(cli, this.getFolderPath(), null);
        }, this.parent.context);
        th.stopEvent(e);
    }
}});

