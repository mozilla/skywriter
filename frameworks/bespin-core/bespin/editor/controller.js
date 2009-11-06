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

var SC = require("sproutcore");
var bespin = require("bespin");

var util = require("bespin/util/util");
var canvas = require("bespin/util/canvas");
var cookie = require("bespin/util/cookie");
var keys = require("bespin/util/keys");

var settings = require("bespin/settings");
var editorEvents = require("bespin/events");
var cursor = require("bespin/cursor");
var model = require("bespin/model");
var history = require("bespin/history");
var view = require("bespin/editor/views/editor");
var scroller = require("bespin/editor/views/scroller");

/**
 * bespin.editor.API is the root object, the API that others should be able to
 * use
 */
exports.EditorController = SC.Object.extend({
    // TODO: was only used for opts.dontfocus which in turn (see below)
    // opts: {},

    containerBinding: '.editorView.layer',

    requires: {
        settings: 'settings',
        commandLine: 'commandLine',
        session: 'session',
        file: 'file'
    },

    init: function() {
        // fixme: this stuff may not belong here
        this.debugMode = false;

        this.model = model.DocumentModel.create({ editor: this });

        this.cursorManager = cursor.CursorManager.create({ editor: this });

        // TODO: Should we change this name from 'ui'? Seems confusing... --pcw
        this.ui = SC.ScrollView.create({
            contentView: view.EditorView.extend({
                editor: this,
                content: this.model
            }),
            hasHorizontalScroller: true,
            autohidesHorizontalScroller: false,
            horizontalScrollerView: scroller.BespinScrollerView,
            hasVerticalScroller: true,
            autohidesVerticalScroller: false,
            verticalScrollerView: scroller.BespinScrollerView
        });
        this.editorView = this.ui.contentView;

        console.log(this.ui); //contentViewFrameDidChange = function() { console.log("contentViewFrameDidChange"); };

        this.theme = require("bespin/theme")['default'];

        this.editorKeyListener = exports.DefaultEditorKeyListener.create({ editor: this });
        this.historyManager = history.HistoryManager.create({ editor: this });
        editorEvents.subscribe();

        this.editorView.installKeyListener(this.editorKeyListener);

        // TODO: We can't do this without explanation. In the past we Ben/Dion
        // were doing this because in a few places they were using !contents
        // to detect if something had been loaded. and "" == false, so they
        // 'primed' it like this. We should use contents !== undefined.
        //this.model.insertCharacters({ row: 0, col: 0 }, " ");

        // TODO: We're repainting fairly often do we need to add this?
        // var self = this;
        // dojo.connect(window, 'resize', function() {
        //     self.paint();
        // });

        // this.paint();

        var test1 = {
            value: 1
        };

        console.log(test1.value == 1);
        test1.value = 2;
        console.log(test1.value == 2);
        test1.value++;
        console.log(test1.value == 3);

        var test2 = {
            _value:1
        };
        test2.__defineGetter__("value", function() {
            return this._value;
        });
        test2.__defineSetter__("value", function(value) {
            this._value = value;
        });

        console.log(test2.value == 1);
        test2.value = 2;
        console.log(test2.value == 2);
        test2.value++;
        console.log(test2.value == 3);

        this.sc_super();
    },

    /**
     * Returns the contents of the editor
     */
    getContent: function() {
        return this.model.getDocument();
    },

    /**
     * Takes the content and inserts it fresh into the document
     */
    setContent: function(content) {
        return this.model.insertDocument(content);
    },

    /**
     * Pass in the line number to jump to (and refresh)
     */
    setLineNumber: function(linenum) {
        this.moveAndCenter(linenum);
    },

    /**
     * Talk to the Bespin settings structure and pass in the key/value
     */
    setSetting: function(key, value) {
        this.settings.setValue(key, value);
    },

    /**
     * Track changes in the document
     */
    onchange: function(callback) {
        bespin.subscribe("editor:document:changed", callback);
    },

    /**
     * Execute a given command
     */
    executeCommand: function(command) {
        try {
            this.commandLine.executeCommand(command);
        } catch (e) {
            // catch the command prompt errors
        }
    },

    /**
     * Ensures that the start position is before the end position; reading
     * directly from the selection property makes no such guarantee
     */
    getSelection: function(selection) {
        selection = (selection != undefined) ? selection : this.selection;
        if (!selection) {
            return undefined;
        }

        var startPos = selection.startPos;
        var endPos = selection.endPos;

        // ensure that the start position is always before the end position
        if ((endPos.row < startPos.row) || ((endPos.row == startPos.row) && (endPos.col < startPos.col))) {
            var foo = startPos;
            startPos = endPos;
            endPos = foo;
        }

        return {
            startPos: cursor.copyPos(startPos),
            endPos: cursor.copyPos(endPos),
            startModelPos: this.getModelPos(startPos),
            endModelPos: this.getModelPos(endPos)
        };
    },

    /**
     *
     */
    getCursorPos: function(modelPos) {
        return this.cursorManager.getCursorPosition(modelPos);
    },

    /**
     *
     */
    getModelPos: function(pos) {
        return this.cursorManager.getModelPosition(pos);
    },

    /**
     * Queries the DOM to determine the absolute position and size of the
     * container element and returns it as a SproutCore layout object.
     */
    computeLayout: function() {
        var layout = {
            left:   0,
            top:    0,
            width:  this.container.clientWidth,
            height: this.container.clientHeight
        };

        var container = this.container;
        while (container !== null) {
            layout.left += container.offsetLeft + container.clientLeft;
            layout.top += container.offsetTop + container.clientTop;
            container = container.offsetParent;
        }

        console.log("computeLayout", layout);

        return layout;
    },

    /**
     *
     */
    moveCursor: function(pos) {
        this.cursorManager.moveCursor(pos);
    },

    /**
     * restore the state of the editor
     */
    resetView: function(data) {
        this.cursorManager.moveCursor(data.cursor);
        this.setSelection(data.selection);
        this.ui.horizontalScrollOffset = 0;
        this.ui.verticalScrollOffset = 0;
    },

    basicView: function() {
        this.cursorManager.moveCursor({row: 0, col: 0});
        this.setSelection(undefined);
        this.ui.horizontalScrollOffset = 0;
        this.ui.verticalScrollOffset = 0;
    },

    getCurrentView: function() {
        return {
            cursor: this.getCursorPos(),
            offset: {
                x: this.horizontalScrollOffset,
                y: this.verticalScrollOffset
            },
            selection: this.selection
        };
    },

    getState: function() {
        return { cursor: this.getCursorPos(), selection: this.getSelection() };
    },

    setState: function(data) {
        this.cursorManager.moveCursor(data.cursor);
        this.setSelection(data.selection);
        this.editorView.ensureCursorVisible();
        this.paint(false);
    },

    /**
     * Basic setting
     */
    defaultTabSize: 4,

    /**
     * be gentle trying to get the tabstop from settings
     */
    getTabSize: function() {
        var size = this.defaultTabSize;
        var tabsize = parseInt(this.settings.getValue("tabsize"), 10);
        if (tabsize > 0) {
            size = tabsize;
        }
        return size;
    },

    /**
     * helper to get text
     */
    getSelectionAsText: function() {
        var selectionText = '';
        var selectionObject = this.getSelection();
        if (selectionObject) {
            selectionText = this.model.getChunk(selectionObject);
        }
        return selectionText;
    },

    setSelection: function(selection) {
        this.selection = selection;
    },

    paint: function(fullRefresh) {
        var canvasElem = this.editorView.get("canvas");
        if (!canvasElem) {
            return;
        }
        var ctx = canvas.fix(canvasElem.getContext("2d"));
        this.editorView.paint(ctx, fullRefresh);
    },

    changeKeyListener: function(newKeyListener) {
        this.editorView.installKeyListener(newKeyListener);
        this.editorKeyListener = newKeyListener;
    },

    /**
     * This does not set focus to the editor; it indicates that focus has been
     * set to the underlying canvas
     */
    setFocus: function(focus) {
        this.editorView.setFocus(focus);
    },

    /**
     * Prevent user edits
     */
    setReadOnly: function(readonly) {
        this.readonly = readonly;
    },

    /**
     * Anything that this editor creates should be gotten rid of.
     * Useful when you will be creating and destroying editors more than once.
     */
    dispose: function() {
        // TODO: Isn't bespin.editor == this?
        // clipboard.uninstall();
        this.ui.dispose();
    },

    /**
     * Add key listeners
     * e.g. bindkey('moveCursorLeft', 'ctrl b');
     */
    bindKey: function(action, keySpec, selectable) {
        console.warn("Use of editor.bindKey(", action, keySpec, selectable, ") seems doomed to fail");
        var keyObj = keys.fillArguments(keySpec);
        var key = keyObj.key;
        var modifiers = keyObj.modifiers;

        if (!key) {
            // TODO: shouldn't we complain or something?
            return;
        }

        var keyCode = keys.toKeyCode(key);

        // -- try an editor action first, else fire off a command
        var actionDescription = "Execute command: '" + action + "'";
        action = this.editorView.actions[action] || function() {
            bespin.commandLine.executeCommand(command, true);
        };

        if (keyCode && action) {
            if (selectable) {
                // register the selectable binding too (e.g. SHIFT + what you passed in)
                this.editorKeyListener.bindKeyStringSelectable(modifiers, keyCode, action, actionDescription);
            } else {
                this.editorKeyListener.bindKeyString(modifiers, keyCode, action, actionDescription);
            }
        }
    },

    /**
     * Ensure that a given command is executed on each keypress
     */
    bindCommand: function(command, keySpec) {
        var keyObj = keys.fillArguments(keySpec);
        var keyCode = keys.toKeyCode(keyObj.key);
        var action = function() {
            this.commandLine.executeCommand(command, true);
        };
        var actionDescription = "Execute command: '" + command + "'";

        this.editorKeyListener.bindKeyString(keyObj.modifiers, keyCode, action, actionDescription);
    },

    /**
     * Observe a request to move the editor to a given location and center it
     * TODO: There is probably a better location for this. Move it.
     */
    moveAndCenter: function(row) {
        if (!row) {
            return; // short circuit
        }

        var linenum = row - 1; // move it up a smidge

        this.cursorManager.moveCursor({ row: linenum, col: 0 });

        // If the line that we are moving to is off screen, center it, else just move in place
        if ((linenum < this.editorView.firstVisibleRow) ||
            (linenum >= this.editorView.firstVisibleRow
                + this.editorView.visibleRows)) {
            this.editorView.actions.moveCursorRowToCenter();
        }
    },

    /**
     * Observe a request for a new file to be created
     */
    newFile: function(project, path, content) {
        project = project || this.session.project;
        path = path || "new.txt";
        var self = this;

        var onSuccess = function() {
            // If collaboration is turned on, then session.js takes care of
            // updating the editor with contents, setting it here might break
            // the synchronization process.
            // See the note at the top of session.js:EditSession.startSession()
            if (this.settings.isSettingOff("collaborate")) {
                self.model.insertDocument(content || "");
                self.cursorManager.moveCursor({ row: 0, col: 0 });
                self.setFocus(true);
            }

            bespin.publish("editor:openfile:opensuccess", {
                project: project,
                file: {
                    name: path,
                    content: content || "",
                    timestamp: new Date().getTime()
                }
            });

            bespin.publish("editor:dirty");
        };

        this.file.newFile(project, path, onSuccess);
    },

    /**
     * Observe a request for a file to be saved and start the cycle:
     * <ul>
     * <li>Send event that you are about to save the file (savebefore)
     * <li>Get the last operation from the sync helper if it is up and running
     * <li>Ask the file system to save the file
     * <li>Change the page title to have the new filename
     * <li>Tell the command line to show the fact that the file is saved
     * </ul>
     */
    saveFile: function(project, filename, onSuccess, onFailure) {
        project = project || this.session.project;
        filename = filename || this.session.path; // default to what you have

        // saves the current state of the editor to a cookie
        var name = 'viewData_' + project + '_' + filename.split('/').join('_');
        var value = JSON.stringify(this.getCurrentView());
        cookie.set(name, value, { expires: 7 });

        var file = {
            name: filename,
            content: this.model.getDocument(),
            timestamp: new Date().getTime()
        };

        var newOnSuccess = function() {
            document.title = filename + ' - editing with Bespin';
            this.commandLine.showHint('Saved file: ' + file.name);

            bespin.publish("editor:clean");

            if (util.isFunction(onSuccess)) {
                onSuccess();
            }
        };

        var newOnFailure = function(xhr) {
            this.commandLine.showHint('Save failed: ' + xhr.responseText);
            if (util.isFunction(onFailure)) {
                onFailure();
            }
        };

        bespin.publish("editor:savefile:before", { filename: filename });

        this.file.saveFile(project, file, newOnSuccess, newOnFailure);
    },

    /**
     * Observe a request for a file to be opened and start the cycle.
     * <ul>
     * <li>Send event that you are opening up something (openbefore)
     * <li>Ask the file system to load a file (editFile)
     * <li>If the file is loaded send an opensuccess event
     * <li>If the file fails to load, send an openfail event
     * </ul>
     * @param project The project that contains the file to open. null implies
     * the current project
     * @param filename The path to a file inside the given project
     * @param options Object that determines how the file is opened. Values
     * should be under one of the following keys:<ul>
     * <li>fromFileHistory: If a file is opened from the file history then it
     * will not be added to the history.
     * TODO: Surely it should be the job of the history mechanism to avoid
     * duplicates, and potentially promote recently opened files to the top of
     * the list however they were opened?
     * <li>reload: Normally a request to open the current file will be ignored
     * unless 'reload=true' is specified in the options
     * <li>line: The line number to place the cursor at
     * <li>force: If true, will open the file even if it does not exist
     * <li>content: if force===true and the file does not exist then the given
     * content will be used to populate the new file
     * </ul>
     * TODO: Should we have onSuccess and onFailure callbacks?
     */
    openFile: function(project, filename, options) {
        var onFailure, onSuccess;
        var self = this;

        project = project || this.session.project;
        filename = filename || this.session.path;
        options = options || {};
        var fromFileHistory = options.fromFileHistory || false;

        // Short circuit if we are already open at the requested file
        if (this.session.checkSameFile(project, filename) && !options.reload) {
            if (options.line) {
                this.commandLine.executeCommand('goto ' + options.line, true);
            }
            return;
        }

        // If the current buffer is dirty, for now, save it
        if (this.dirty && !this.session.shouldCollaborate()) {
            onFailure = function(xhr) {
                this.commandLine.showHint("Trying to save current file. Failed: " + xhr.responseText);
            };

            onSuccess = function() {
                self.openFile(project, filename, options);
            };

            this.saveFile(null, null, onSuccess, onFailure);
            return;
        }

        if (options.force) {
            this.file.whenFileDoesNotExist(project, filename, {
                execute: function() {
                    self.newFile(project, filename, options.content || "");
                },
                elseFailed: function() {
                    // TODO: clone options to avoid changing original
                    options.force = false;
                    self.openFile(project, filename, options);
                }
            });
            return;
        }

        onFailure = function() {
            bespin.publish("editor:openfile:openfail", {
                project: project,
                filename: filename
            });
        };

        onSuccess = function(file) {
            // TODO: We shouldn't need to to this but originally there was
            // no onFailure, and this is how failure was communicated
            if (!file) {
                onFailure();
                return;
            }

            // If collaboration is turned on, we won't know the file contents
            if (file.content !== undefined) {
                self.model.insertDocument(file.content);
                self.cursorManager.moveCursor({ row: 0, col: 0 });
                self.setFocus(true);
            }

            this.session.setProjectPath(project, filename);

            if (options.line) {
                this.commandLine.executeCommand('goto ' + options.line, true);
            }

            self._addHistoryItem(project, filename, fromFileHistory);

            bespin.publish("editor:openfile:opensuccess", { project: project, file: file });
        };

        bespin.publish("editor:openfile:openbefore", { project: project, filename: filename });

        this.file.editFile(project, filename, onSuccess, onFailure);
    },

    /**
     * Manage the file history.
     * TODO: The responsibility for managing history is split between here and
     * session. It's not totally clear where it should live. Refactor.
     */
    _addHistoryItem: function(project, filename, fromFileHistory) {
        // Get the array of lastused files
        var lastUsed = this.settings.getObject("_lastused");
        if (!lastUsed) {
            lastUsed = [];
        }

        // We want to add this to the top
        var newItem = { project: project, filename: filename };

        if (!fromFileHistory) {
            this.session.addFileToHistory(newItem);
        }

        // Remove newItem from down in the list and place at top
        var cleanLastUsed = [];
        lastUsed.forEach(function(item) {
            if (item.project != newItem.project || item.filename != newItem.filename) {
                cleanLastUsed.unshift(item);
            }
        });
        cleanLastUsed.unshift(newItem);
        lastUsed = cleanLastUsed;

        // Trim to 10 members
        if (lastUsed.length > 10) {
            lastUsed = lastUsed.slice(0, 10);
        }

        // Maybe this should have a _ prefix: but then it does not persist??
        this.settings.setObject("_lastused", lastUsed);
    }
});
/**
 * Core key listener to decide which actions to run
 */
exports.DefaultEditorKeyListener = SC.Object.extend({
    editor: null,
    skipKeypress: false,
    defaultKeyMap: {},

    // Allow for multiple key maps to be defined
    keyMapDescriptions: { },

    init: function() {
        this.keyMap = this.defaultKeyMap;
    },

    bindKey: function(keyCode, metaKey, ctrlKey, altKey, shiftKey, action, name) {
        this.defaultKeyMap[[keyCode, metaKey, ctrlKey, altKey, shiftKey]] =
            (typeof action == "string") ?
                function() {
                    var toFire = toFire(action);
                    bespin.publish(toFire.name, toFire.args);
                } : action.bind(this.editor.editorView.actions);
        if (name) {
            this.keyMapDescriptions[[keyCode, metaKey, ctrlKey, altKey, shiftKey]] = name;
        }
    },

    bindKeyForPlatform: function(keysForPlatforms, action, name, isSelectable) {
        var platform = util.getOS();

        // default to Windows (e.g. Linux often the same)
        var platformKeys = keysForPlatforms[platform] || keysForPlatforms.WINDOWS;
        if (!platformKeys) {
            return;
        }

        var args = keys.fillArguments(platformKeys);
        var bindFunction = (isSelectable) ? "bindKeyStringSelectable" : "bindKeyString";

        this[bindFunction](args.modifiers, keys.toKeyCode(args.key), action, name);
    },

    bindKeyString: function(modifiers, keyCode, action, name) {
        var ctrlKey = (modifiers.toUpperCase().indexOf("CTRL") != -1);
        var altKey = (modifiers.toUpperCase().indexOf("ALT") != -1);
        var metaKey = (modifiers.toUpperCase().indexOf("META") != -1) || (modifiers.toUpperCase().indexOf("APPLE") != -1);
        var shiftKey = (modifiers.toUpperCase().indexOf("SHIFT") != -1);

        // Check for the platform specific key type
        // The magic "CMD" means metaKey for Mac (the APPLE or COMMAND key)
        // and ctrlKey for Windows (CONTROL)
        if (modifiers.toUpperCase().indexOf("CMD") != -1) {
            if (util.isMac) {
                metaKey = true;
            } else {
                ctrlKey = true;
            }
        }
        return this.bindKey(keyCode, metaKey, ctrlKey, altKey, shiftKey, action, name);
    },

    bindKeyStringSelectable: function(modifiers, keyCode, action, name) {
        this.bindKeyString(modifiers, keyCode, action, name);
        this.bindKeyString("SHIFT " + modifiers, keyCode, action);
    },

    /*
     * This is taken from th.KeyHelpers
     */
    getPrintableChar: function(e) {
        if (e.charCode > 255) {
            return false;
        }
        if (e.charCode < 32) {
            return false;
        }
        if ((e.altKey || e.metaKey || e.ctrlKey) && (e.charCode > 65 && e.charCode < 123)) {
            return false;
        }
        return String.fromCharCode(e.charCode);
    },

    onkeydown: function(e) {
        // handle keys only if editor has the focus!
        if (!this.editor.editorView.hasFocus()) {
            console.log("ignoring keyboard event, we don't have focus", e);
            return;
        }

        var args = {
            event: e,
            pos: cursor.copyPos(this.editor.cursorManager.getCursorPosition())
        };
        this.skipKeypress = false;
        this.returnValue = false;

        var action = this.keyMap[[e.keyCode, e.metaKey, e.ctrlKey, e.altKey, e.shiftKey]];

        var hasAction = false;

        if (util.isFunction(action)) {
            hasAction = true;
            try {
                action(args);
            } catch (ex) {
                console.log("Action caused an error! ", ex);
            }
            this.lastAction = action;
        }

        // If a special key is pressed OR if an action is assigned to a given key (e.g. TAB or BACKSPACE)
        if (e.metaKey || e.ctrlKey || e.altKey) {
            this.skipKeypress = true;
            this.returnValue = true;
        }

        // stop going, but allow special strokes to get to the browser
        if (hasAction || !keys.passThroughToBrowser(e)) {
            util.stopEvent(e);
        }
    },

    onkeypress: function(e) {
        // handle keys only if editor has the focus!
        if (!this.editor.editorView.hasFocus()) {
            console.log("ignoring keyboard event, we don't have focus", e);
            return;
        }

        if ( (e.metaKey || e.ctrlKey) && e.charCode >= 48 /*0*/ && e.charCode <= 57 /*9*/) {
            return; // let APPLE || CTRL 0 through 9 get through to the browser
        }

        var charToPrint = this.getPrintableChar(e);

        if (charToPrint) {
            this.skipKeypress = false;
        } else if (this.skipKeypress) {
            if (!keys.passThroughToBrowser(e)) {
                util.stopEvent(e);
            }
            return this.returnValue;
        }

        var args = {
            event: e,
            pos: cursor.copyPos(this.editor.cursorManager.getCursorPosition())
        };
        var actions = this.editor.editorView.actions;

        if (charToPrint) {
            args.newchar = String.fromCharCode(e.charCode);
            actions.insertCharacter(args);
        } else { // Allow user to move with the arrow continuously
            var action = this.keyMap[[e.keyCode, e.metaKey, e.ctrlKey, e.altKey, e.shiftKey]];

            if (this.lastAction == action) {
                delete this.lastAction;
            } else if (typeof action == "function") {
               action(args);
            }
        }

        util.stopEvent(e);
    }
});

/**
 * Given an <code>eventString</code> parse out the arguments and configure an
 * event object.
 * <p>For example:<ul>
 * <li><code>command:execute;name=ls,args=bespin</code>
 * <li><code>command:execute</code>
 * </ul>
 */
var toFire = function(eventString) {
    var event = {};
    if (eventString.indexOf(';') < 0) { // just a plain command with no args
        event.name = eventString;
    } else { // split up the args
        var pieces = eventString.split(';');
        event.name = pieces[0];
        event.args = util.queryToObject(pieces[1], ',');
    }
    return event;
};

/**
 * Run the trim command before saving the file
 */
bespin.subscribe("settings:set:trimonsave", function(event) {
    var settings = bespin.get('settings');
    if (settings.isValueOn(event.value)) {
        _trimOnSave = bespin.subscribe("editor:savefile:before", function(event) {
            bespin.get("commandLine").executeCommand('trim', true);
        });
    } else {
        bespin.unsubscribe(_trimOnSave);
    }
});
// Store the subscribe handler away
var _trimOnSave;

/**
 * When a file is opened successfully change the project and file status
 * area, then change the window title, and change the URL hash area
 */
bespin.subscribe("editor:openfile:opensuccess", function(event) {
    var session = bespin.get('editSession');
    var project = event.project || session.project;
    var filename = event.file.name;

    try {
        // reset the state of the editor based on saved cookie
        var name = 'viewData_' + project + '_' + filename.split('/').join('_');
        var data = cookie.get(name);
        if (data) {
            bespin.get('editor').resetView(JSON.parse(data));
        } else {
            bespin.get('editor').basicView();
        }
    } catch (e) {
        console.log("Error setting in the view: ", e);
    }

    document.title = filename + ' - editing with Bespin';

    bespin.publish("url:change", { project: project, path: filename });

    // Set the session path and change the syntax highlighter
    // when a new file is opened
    if (event.file.name == null) {
        console.error("event.file.name falsy");
    }

    if (event.project) {
        session.project = event.project;
    }
    session.path = event.file.name;

    var fileType = util.path.fileType(event.file.name);
    if (fileType) {
        bespin.publish("settings:language", { language: fileType });
    }

    // If a file (such as BespinSettings/config) is loaded that you want to auto
    // syntax highlight, here is where you do it
    // FUTURE: allow people to add in their own special things
    var mapName = project + "/" + filename;
    if (specialFileMap[mapName]) {
        bespin.publish("settings:language", {
            language: specialFileMap[mapName]
        });
    }
});

/**
 *
 */
var specialFileMap = {
    'BespinSettings/config': 'js'
};

/**
 * Add in emacs key bindings
 */
bespin.subscribe("settings:set:keybindings", function(event) {
    var editor = bespin.get('editor');
    if (event.value == "emacs") {
        editor.bindKey("moveCursorLeft", "ctrl b");
        editor.bindKey("moveCursorRight", "ctrl f");
        editor.bindKey("moveCursorUp", "ctrl p");
        editor.bindKey("moveCursorDown", "ctrl n");
        editor.bindKey("moveToLineStart", "ctrl a");
        editor.bindKey("moveToLineEnd", "ctrl e");
    }
});
