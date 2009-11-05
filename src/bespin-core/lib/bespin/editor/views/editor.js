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

var SC = require('sproutcore');

var bespin = require('bespin');
var syntax = require('bespin/syntax');
var actions = require('bespin/actions');
var keys = require('bespin/util/keys');
var clipboard = require("bespin/util/clipboard");
var cursor = require('bespin/cursor');
var scroller = require('bespin/editor/views/scroller');

var SelectionHelper = SC.Object.extend({
    editor: null,

    // returns an object with the startCol and endCol of the selection.
    // If the col is -1 on the endPos, the selection goes for the entire line
    // returns undefined if the row has no selection
    getRowSelectionPositions: function(rowIndex) {
        var startCol;
        var endCol;

        var selection = this.editor.getSelection();
        if (!selection) {
            return undefined;
        }
        if ((selection.endPos.row < rowIndex) || (selection.startPos.row > rowIndex)) {
            return undefined;
        }

        startCol = (selection.startPos.row < rowIndex) ? 0 : selection.startPos.col;
        endCol = (selection.endPos.row > rowIndex) ? -1 : selection.endPos.col;

        return { startCol: startCol, endCol: endCol };
    }
});

// The main editor view.
exports.EditorView = SC.View.extend({
    classNames: 'sc-canvas-view',
    displayProperties: ['value', 'shouldAutoResize'],
    tagName: 'canvas',

    rowLengthCache: [],

    searchString: null,

    // tracks how many cursor toggles since the last full repaint
    toggleCursorFullRepaintCounter: 0,

    // number of milliseconds between cursor blink
    toggleCursorFrequency: 250,

    // is the cursor allowed to toggle? (used by cursorManager.moveCursor)
    toggleCursorAllowed: true,

    horizontalScrollCanvas: null,
    verticalScrollCanvas: null,

    LINE_HEIGHT: 23,

    BOTTOM_SCROLL_AFFORDANCE: 30,

    GUTTER_INSETS: { top: 0, left: 6, right: 10, bottom: 6 },

    LINE_INSETS: { top: 0, left: 5, right: 0, bottom: 6 },

    FALLBACK_CHARACTER_WIDTH: 10,

    DEBUG_GUTTER_WIDTH: 18,

    DEBUG_GUTTER_INSETS: { top: 2, left: 2, right: 2, bottom: 2 },

    showCursor: true,

    hasFocus: false,

    // Some things need to happen only when we're rendered. This is how we delay
    onInitActions: [],
    inited: false,

    // painting optimization state
    lastLineCount: 0,
    lastCursorPos: null,

    init: function() {
        var settings = bespin.get("settings");

        var pluginCatalog = bespin.get("plugins");
        var ep = pluginCatalog.getExtensionPoint("syntax.engine");
        // set model to a default that will work until the real thing is loaded
        this.syntaxModel = syntax.Model.create();

        if (ep.extensions.length > 0) {
            ep.extensions[0].load(function(model) {
                this.syntaxModel = model.create();
            }.bind(this));
        }

        this.selectionHelper = SelectionHelper.create({ editor: this.editor });
        this.actions = actions.Actions.create({ editor: this.editor });

        // this.lineHeight;        // reserved for when line height is calculated dynamically instead of with a constant; set first time a paint occurs
        // this.charWidth;         // set first time a paint occurs
        // this.visibleRows;       // the number of rows visible in the editor; set each time a paint occurs
        // this.firstVisibleRow;   // first row that is visible in the editor; set each time a paint occurs

        // this.selectMouseDownPos;        // position when the user moused down
        // this.selectMouseDetail;         // the detail (number of clicks) for the mouse down.

        // In the old Bespin, if we acted as a component, the onmousewheel
        // should only be listened to inside of the editor canvas. In the new
        // world where everything builds off the embedded bespin, we should work
        // out what to do with a failed scroll when we find it.
        // var scope = this.editor.actsAsComponent ? this.editor.canvas : window;
        // And we don't need it here. And it wouldn't work anyway
        // var scope = this.editor.canvas;

        var wheelEventName = (window.onmousewheel ? "onmousewheel" : "DOMMouseScroll");

        setTimeout(function() {
            this.toggleCursor();
        }.bind(this), this.toggleCursorFrequency);

        this.sc_super();
    },

    render: function(context, firstTime) {
        // TODO: Shouldn't we only do this if !firstTime
        context.attr('moz-opaque', 'true');
        context.attr("tabindex", "1");
        context.push('canvas tag not supported by your browser');
    },

    didCreateLayer: function() {
        var canvas = this.$()[0];
        this.set("canvas", canvas);

        SC.Event.add(canvas, "blur", this, function(ev) {
            this.focus = true;
            return true;
        });

        SC.Event.add(canvas, "focus", this, function(ev) {
            this.focus = true;
            return true;
        });

        // Nail the clipboard
        var editorWrapper = EditorWrapper.create({
            editor: this.editor,
            ui: this
        });
        clipboard.setup(editorWrapper);

        // TODO: There has to be a better way for the controller to know
        // when it's safe to call installKeyListener() than this...
        this.onInitActions.forEach(function(action) {
            action();
        });
        this.inited = true;
    },

    onInit: function(action) {
        if (this.inited) {
            action();
            return;
        }
        this.onInitActions.push(action);
    },

    /**
     * col is -1 if user clicked in gutter; clicking below last line maps to last line
     */
    convertClientPointToCursorPoint: function(pos) {
        var settings = bespin.get("settings");
        var x, y;

        var content = this.get("content");

        if (pos.y < 0) { //ensure line >= first
            y = 0;
        } else if (pos.y >= (this.lineHeight * content.getRowCount())) { //ensure line <= last
            y = content.getRowCount() - 1;
        } else {
            var ty = pos.y;
            y = Math.floor(ty / this.lineHeight);
        }

        if (pos.x <= (this.get('gutterWidth') + this.LINE_INSETS.left)) {
            x = -1;
        } else {
            var tx = pos.x - this.get('gutterWidth') - this.LINE_INSETS.left;
            // round vs floor so we can pick the left half vs right half of a character
            x = Math.round(tx / this.charWidth);

            // With strictlines turned on, don't select past the end of the line
            if ((settings && settings.isSettingOn('strictlines'))) {
                var maxcol = this.getRowScreenLength(y);

                if (x >= maxcol) {
                    x = this.getRowScreenLength(y);
                }
            }
        }
        return { row: y, col: x };
    },

    /**
     * @private
     * Translates the coordinates for a mouse event into absolute coordinates,
     * taking the scrolled position of the canvas into account.
     */
    absoluteCoordinatesForEvent: function(ev) {
        return this.convertFrameFromView({ x: ev.clientX, y: ev.clientY });
    },

    setSelection: function(e) {
        var content = this.get("content");
        var absolutePoint = this.absoluteCoordinatesForEvent(e);
        var clientY = absolutePoint.y, clientX = absolutePoint.x;

        if (!this.selectMouseDownPos) {
            return;
        }

        var down = cursor.copyPos(this.selectMouseDownPos);

        var point = { x: clientX, y: clientY };
        // TODO: translate according to clippingFrame... for now.
        var up = this.convertClientPointToCursorPoint(point);

        if (down.col == -1) {
            down.col = 0;
            // clicked in gutter; show appropriate lineMarker message
            var lineMarker = bespin.get("parser").getLineMarkers()[down.row + 1];
            if (lineMarker) {
                bespin.get("commandLine").showHint(lineMarker.msg);
            }
        }
        if (up.col == -1) {
            up.col = 0;
        }

        //we'll be dealing with the model directly, so we need model positions.
        var modelstart = this.editor.getModelPos(down);
        var modelend = this.editor.getModelPos(up);

        //to make things simpler, go ahead and check if it is reverse
        var backwards = false;
        if (modelend.row < modelstart.row || (modelend.row == modelstart.row && modelend.col < modelstart.col)) {
            backwards = true; //need to know so that we can maintain direction for shift-click select

            var temp = modelstart;
            modelstart = modelend;
            modelend = temp;
        }

        //validate
        if (!content.hasRow(modelstart.row)) {
            modelstart.row = content.getRowCount() - 1;
        }

        if (!content.hasRow(modelend.row)) {
            modelend.row = content.getRowCount() - 1;
        }

        //get detail
        var detail = this.selectMouseDetail;
        var startPos, endPos;

        //single click
        if (detail == 1) {
            if (cursor.posEquals(modelstart, modelend)) {
                this.editor.setSelection(undefined);
            } else {
                //we could use raw "down" and "up", but that would skip validation.
                this.editor.setSelection({
                    startPos: this.editor.getCursorPos(backwards ? modelend : modelstart),
                    endPos: this.editor.getCursorPos(backwards ? modelstart : modelend)
                });
            }

            this.editor.moveCursor(this.editor.getCursorPos(backwards ? modelstart : modelend));
        } else if (detail == 2) { //double click
            var row = content.rows[modelstart.row];
            var cursorAt = row[modelstart.col];

            // the following is an ugly hack. We should have a syntax-specific set of "delimiter characters"
            // which are treated like whitespace for findBefore and findAfter.
            // to keep it at least a LITTLE neat, I have moved the comparator for double-click into its own function,
            // and have left model alone.
            var isDelimiter = function(item) {
                var delimiters = ["=", " ", "\t", ">", "<", ".", "(", ")", "{", "}", ":", '"', "'", ";"];
                if (delimiters.indexOf(item) > -1) {
                    return true;
                }
                return false;
            };

            var comparator;
            if (!cursorAt) {
                // nothing to see here. We must be past the end of the line.
                // Per Gordon's suggestion, let's have double-click EOL select the line, excluding newline
                this.editor.setSelection({
                    startPos: this.editor.getCursorPos({row: modelstart.row, col: 0}),
                    endPos: this.editor.getCursorPos({row: modelstart.row, col: row.length})
                });
            } else if (isDelimiter(cursorAt.charAt(0))) { // see above. Means empty space or =, >, <, etc. that we want to be clever with
                comparator = function(letter) {
                    if (isDelimiter(letter)) {
                        return false;
                    }
                    return true;
                };

                startPos = content.findBefore(modelstart.row, modelstart.col, comparator);
                endPos = content.findAfter(modelend.row, modelend.col, comparator);

                this.editor.setSelection({
                    startPos: this.editor.getCursorPos(backwards ? endPos : startPos),
                    endPos: this.editor.getCursorPos(backwards ? startPos : endPos)
                });

                //set cursor so that it is at selection end (even if mouse wasn't there)
                this.editor.moveCursor(this.editor.getCursorPos(backwards ? startPos : endPos));
            } else {
                comparator = function(letter) {
                    if (isDelimiter(letter)) {
                        return true;
                    }
                    return false;
                };

                startPos = content.findBefore(modelstart.row, modelstart.col, comparator);
                endPos = content.findAfter(modelend.row, modelend.col, comparator);

                this.editor.setSelection({
                    startPos: this.editor.getCursorPos(backwards ? endPos : startPos),
                    endPos: this.editor.getCursorPos(backwards ? startPos : endPos)
                });

                //set cursor so that it is at selection end (even if mouse wasn't there)
                this.editor.moveCursor(this.editor.getCursorPos(backwards ? startPos : endPos));
            }
        } else if (detail > 2) { //triple plus duluxe
            // select the line
            startPos = {row: modelstart.row, col: 0};
            endPos = {row: modelend.row, col: 0};
            if (this.editor.model.hasRow(endPos.row + 1)) {
                endPos.row = endPos.row + 1;
            } else {
                endPos.col = this.editor.model.getRowArray(endPos.row).length;
            }

            startPos = this.editor.getCursorPos(startPos);
            endPos = this.editor.getCursorPos(endPos);

            this.editor.setSelection({
                startPos: backwards ? endPos : startPos,
                endPos: backwards ? startPos: endPos
            });
            this.editor.moveCursor(backwards ? startPos : endPos);
        }

        //finally, and the LAST thing we should do (otherwise we'd mess positioning up)
        //scroll down, up, right, or left a bit if needed.

        //up and down. optimally, we should have a timeout or something to keep checking...
        if (clientY < 0) {
            // TODO: tell enclosing ScrollView --pcw 
        } else if (clientY >= this.getHeight()) {
            // TODO: tell enclosing ScrollView --pcw
        }

        this.editor.paint();
    },

    toggleCursor: function() {
        if (this.toggleCursorAllowed) {
            this.showCursor = !this.showCursor;
        } else {
            this.toggleCursorAllowed = true;
        }

        if (++this.toggleCursorFullRepaintCounter > 0) {
            this.toggleCursorFullRepaintCounter = 0;
            this.editor.paint(true);
        } else {
            this.editor.paint();
        }

        // Trigger this to kick off again soon
        setTimeout(function() {
            this.toggleCursor();
        }.bind(this), this.toggleCursorFrequency);
    },

    ensureCursorVisible: function(softEnsure) {
        // TODO
    },

    /**
     * TODO: Is this ever called?
     */
    handleFocus: function(e) {
        var content = this.get("content");
        content.clear();
        content.insertCharacters({ row: 0, col: 0 }, e.type);
        return true;
    },

    mouseDragged: function(e) {
        if (this.selectMouseDownPos) {
            this.setSelection(e);
        }
        return true;
    },

    mouseDown: function(e) {
        var absolutePoint = this.absoluteCoordinatesForEvent(e);
        var clientY = absolutePoint.y, clientX = absolutePoint.x;

        var point;
        if (this.editor.debugMode) {
            if (clientX < this.DEBUG_GUTTER_WIDTH) {
                console.log("Clicked in debug gutter");
                point = { x: clientX, y: clientY };
                var p = this.convertClientPointToCursorPoint(point);

                var editSession = bespin.get("editSession");
                if (p && editSession) {
                    bespin.getComponent("breakpoints", function(breakpoints) {
                        breakpoints.toggleBreakpoint({ project: editSession.project, path: editSession.path, lineNumber: p.row });
                        this.editor.paint(true);
                    }, this);
                }
                return true;
            }
        }

        this.selectMouseDetail = e.detail;
        if (e.shiftKey) {
            this.selectMouseDownPos = (this.editor.selection) ? this.editor.selection.startPos : this.editor.getCursorPos();
            this.setSelection(e);
        } else {
            point = { x: clientX, y: clientY };

            this.selectMouseDownPos = this.convertClientPointToCursorPoint(point);
        }

        // I'm not sure why we should need to manually set focus to the canvas;
        // it happens automatically when there is no mouseDown event handler
        this.get('canvas').focus();

        return this.handleMouse(e);
    },

    mouseUp: function(e) {
        if (this.selectMouseDownPos) {
            this.setSelection(e);
            this.selectMouseDownPos = undefined;
            this.selectMouseDetail = undefined;
            return false;
        }

        return true;
    },

    click: function(e) {
        e.type = "click";
        return this.handleMouse(e);
    },

    handleMouse: function(e) {
        /*
        // Right click for pie menu
        if (e.button == 2) {
            bespin.getComponent("piemenu", function(piemenu) {
                piemenu.show(null, false, e.clientX, e.clientY);
            });
            return false;
        }
        */

        var absolutePoint = this.absoluteCoordinatesForEvent(e);
        var clientY = absolutePoint.y, clientX = absolutePoint.x;

        var scrolled = false;

        var w = this.editor.container.clientWidth;
        var h = this.editor.container.clientHeight;

        var p = { x: clientX, y:clientY };

        return true;
    },

    /**
     *
     */
    setFocus: function(focus) {
        this.onInit(function() {
            if (this.focus != focus) {
                var canvas = this.get('canvas');
                if (focus) {
                    canvas.focus();
                } else {
                    canvas.blur();
                }
                this.focus = focus;
            }
        }.bind(this));
    },

    /**
     *
     */
    hasFocus: function(focus) {
        return this.focus;
    },

    /**
     * Accessor for the DOM element to which we attach keyboard event handlers.
     * This could be seen as leakage of implementation details, so please
     * document usage of this function here.
     * <p>Used by clipboard.js to adding cut and paste hacks
     */
    _getFocusElement: function() {
        return this.get('canvas');
    },

    /**
     *
     */
    installKeyListener: function(listener) {
        this.onInit(function() {
            this.realInstallKeyListener(listener);
        }.bind(this));
    },

    realInstallKeyListener: function(listener) {
        // TODO: Why would we ever want to take over keypresses for the whole
        // window????
        // var scope = this.editor.opts.actsAsComponent ? this.editor.canvas : window;
        var scope = this.get('canvas');

        if (this.oldkeydown) {
            SC.Event.remove(scope, "keydown", this, this.oldkeydown);
        }
        if (this.oldkeypress) {
            SC.Event.remove(scope, "keypress", this, this.oldkeypress);
        }

        this.oldkeydown = function(ev) {
            listener.onkeydown(ev);
            return true;
        };
        this.oldkeypress = function(ev) {
            listener.onkeypress(ev);
            return true;
        };

        SC.Event.add(scope, "keydown", this, this.oldkeydown);
        SC.Event.add(scope, "keypress", this, this.oldkeypress);

        var Key = keys.Key;

        // Modifiers, Key, Action
        listener.bindKeyStringSelectable("", keys.Key.LEFT_ARROW, this.actions.moveCursorLeft, "Move Cursor Left");
        listener.bindKeyStringSelectable("", keys.Key.RIGHT_ARROW, this.actions.moveCursorRight, "Move Cursor Right");
        listener.bindKeyStringSelectable("", keys.Key.UP_ARROW, this.actions.moveCursorUp, "Move Cursor Up");
        listener.bindKeyStringSelectable("", keys.Key.DOWN_ARROW, this.actions.moveCursorDown, "Move Cursor Down");

        // Move Left: Mac = Alt+Left, Win/Lin = Ctrl+Left
        listener.bindKeyForPlatform({
            MAC: "ALT LEFT_ARROW",
            WINDOWS: "CTRL LEFT_ARROW"
        }, this.actions.moveWordLeft, "Move Word Left", true /* selectable */);

        // Move Right: Mac = Alt+Right, Win/Lin = Ctrl+Right
        listener.bindKeyForPlatform({
            MAC: "ALT RIGHT_ARROW",
            WINDOWS: "CTRL RIGHT_ARROW"
        }, this.actions.moveWordRight, "Move Word Right", true /* selectable */);

        // Start of line: All platforms support HOME. Mac = Apple+Left, Win/Lin = Alt+Left
        listener.bindKeyStringSelectable("", keys.Key.HOME, this.actions.moveToLineStart, "Move to start of line");
        listener.bindKeyForPlatform({
            MAC: "APPLE LEFT_ARROW",
            WINDOWS: "ALT LEFT_ARROW"
        }, this.actions.moveToLineStart, "Move to start of line", true /* selectable */);

        // End of line: All platforms support END. Mac = Apple+Right, Win/Lin = Alt+Right
        listener.bindKeyStringSelectable("", keys.Key.END, this.actions.moveToLineEnd, "Move to end of line");
        listener.bindKeyForPlatform({
            MAC: "APPLE RIGHT_ARROW",
            WINDOWS: "ALT RIGHT_ARROW"
        }, this.actions.moveToLineEnd, "Move to end of line", true /* selectable */);

        listener.bindKeyString("CTRL", keys.Key.K, this.actions.killLine, "Kill entire line");
        listener.bindKeyString("CMD", keys.Key.L, this.actions.gotoLine, "Goto Line");
        listener.bindKeyString("CTRL", keys.Key.L, this.actions.moveCursorRowToCenter, "Move cursor to center of page");

        listener.bindKeyStringSelectable("", keys.Key.BACKSPACE, this.actions.backspace, "Backspace");
        listener.bindKeyStringSelectable("CTRL", keys.Key.BACKSPACE, this.actions.deleteWordLeft, "Delete a word to the left");

        listener.bindKeyString("", keys.Key.DELETE, this.actions.deleteKey, "Delete");
        listener.bindKeyString("CTRL", keys.Key.DELETE, this.actions.deleteWordRight, "Delete a word to the right");

        listener.bindKeyString("", keys.Key.ENTER, this.actions.newline, "Insert newline");
        listener.bindKeyString("CMD", keys.Key.ENTER, this.actions.newlineBelow, "Insert newline at end of current line");
        listener.bindKeyString("", keys.Key.TAB, this.actions.insertTab, "Indent / insert tab");
        listener.bindKeyString("SHIFT", keys.Key.TAB, this.actions.unindent, "Unindent");
        listener.bindKeyString("CMD", keys.Key.SQUARE_BRACKET_CLOSE, this.actions.indent, "Indent");
        listener.bindKeyString("CMD", keys.Key.SQUARE_BRACKET_OPEN, this.actions.unindent, "Unindent");

        listener.bindKeyString("", keys.Key.ESCAPE, this.actions.escape, "Clear fields and dialogs");

        listener.bindKeyString("CMD", keys.Key.A, this.actions.selectAll, "Select All");

        // handle key to jump between editor and other windows / commandline
        listener.bindKeyString("CMD", keys.Key.I, this.actions.toggleQuickopen, "Toggle Quickopen");
        listener.bindKeyString("CMD", keys.Key.J, this.actions.focusCommandline, "Open Command line");
        listener.bindKeyString("CMD", keys.Key.O, this.actions.focusFileBrowser, "Open File Browser");
        listener.bindKeyString("CMD", keys.Key.F, this.actions.cmdFilesearch, "Search in this file");
        listener.bindKeyString("CMD", keys.Key.G, this.actions.findNext, "Find Next");
        listener.bindKeyString("SHIFT CMD", keys.Key.G, this.actions.findPrev, "Find Previous");
        listener.bindKeyString("CTRL", keys.Key.M, this.actions.togglePieMenu, "Open Pie Menu");

        listener.bindKeyString("CMD", keys.Key.Z, this.actions.undo, "Undo");
        listener.bindKeyString("SHIFT CMD", keys.Key.Z, this.actions.redo, "Redo");
        listener.bindKeyString("CMD", keys.Key.Y, this.actions.redo, "Redo");

        listener.bindKeyStringSelectable("CMD", keys.Key.UP_ARROW, this.actions.moveToFileTop, "Move to top of file");
        listener.bindKeyStringSelectable("CMD", keys.Key.DOWN_ARROW, this.actions.moveToFileBottom, "Move to bottom of file");
        listener.bindKeyStringSelectable("CMD", keys.Key.HOME, this.actions.moveToFileTop, "Move to top of file");
        listener.bindKeyStringSelectable("CMD", keys.Key.END, this.actions.moveToFileBottom, "Move to bottom of file");

        listener.bindKeyStringSelectable("", keys.Key.PAGE_UP, this.actions.movePageUp, "Move a page up");
        listener.bindKeyStringSelectable("", keys.Key.PAGE_DOWN, this.actions.movePageDown, "Move a page down");

        // For now we are punting and doing a page down, but in the future we will tie to outline mode and move in block chunks
        listener.bindKeyStringSelectable("ALT", keys.Key.UP_ARROW, this.actions.movePageUp, "Move up a block");
        listener.bindKeyStringSelectable("ALT", keys.Key.DOWN_ARROW, this.actions.movePageDown, "Move down a block");

        listener.bindKeyString("CMD ALT", keys.Key.LEFT_ARROW, this.actions.previousFile);
        listener.bindKeyString("CMD ALT", keys.Key.RIGHT_ARROW, this.actions.nextFile);

        // Other key bindings can be found in commands themselves.
        // For example, this:
        // Refactor warning: Below used to have an action - publish to "editor:newfile",
        // cahnged to this.editor.newfile but might not work as assumed.
        // listener.bindKeyString("CTRL SHIFT", keys.Key.N, this.editor.newfile, "Create a new file");
        // has been moved to the 'newfile' command withKey
        // Also, the clipboard.js handles C, V, and X
    },

    /**
     * Returns the width in pixels of the entire content area.
     */
    getWidth: function() {
        return this.get('gutterWidth') + this.get('textWidth');
    },

    /**
     * Returns the height in pixels of the content area.
     */
    getHeight: function() {
        return this.lineHeight * this.get('content').getRowCount();
    },

    // TODO: convert to property
    getCharWidth: function(ctx) {
        if (ctx.measureText) {
            return ctx.measureText("M").width;
        } else {
            return this.FALLBACK_CHARACTER_WIDTH;
        }
    },

    // TODO: convert to property
    getLineHeight: function(ctx) {
        var lh = -1;
        if (ctx.measureText) {
            var t = ctx.measureText("M");
            if (t.ascent) {
                lh = Math.floor(t.ascent * 2.8);
            }
        }
        if (lh == -1) {
            lh = this.LINE_HEIGHT;
        }
        return lh;
    },

    gutterWidth: function() {
        var width = this.GUTTER_INSETS.left + this.GUTTER_INSETS.right
            + this.get('content').getRowCount().toString().length
            * this.charWidth;
        if (this.editor.debugMode)
            width += this.DEBUG_GUTTER_WIDTH;
        return width;
    }.property('content'),

    // Returns the width in pixels of the longest line.
    textWidth: function() {
        // TODO: Don't look through every row to determine the width every
        // time. This is expensive. Cache instead. --pcw
        return this.charWidth
            * this.getMaxCols(0, this.get('content').getRowCount() - 1);
    }.property('content'),

    /**
     * Returns the dimensions of the entire content area of the editor.
     * This can only be safely called in the paint() function after charWidth
     * and lineHeight have been calculated and stored in this object.
     *
     * TODO: Allow this to be called from anywhere - the way paint() stores
     * vital state is confusing. --pcw
     */
    computeLayout: function(minimumSize) {
        var frame = this.get('frame');
        return {
            left:   frame.x,
            top:    frame.y,
            width:  minimumSize != null
                    ? Math.max(this.getWidth(), minimumSize.width)
                    : this.getWidth(),
            height: minimumSize != null
                    ? Math.max(this.getHeight(), minimumSize.height)
                    : this.getHeight()
        };
    },

    /**
     * Override for the View class's layoutStyle property that doesn't
     * reflect the layout position in the DOM. This prevents flicker resulting
     * from the base class's implementation of this function moving the canvas
     * around as the user scrolls.
     */
    layoutStyle: function(key, value) { 
        return {};
    }.property().cacheable(),

    /**
     * Forces a resize of the canvas
     */
    resetCanvas: function() {
        // FIXME: No-op for now --pcw
    },

    /**
     * Wrap the normal fillText for the normal case
     */
    fillText: function(ctx, text, x, y) {
        ctx.fillText(text, x, y);
    },

    /**
     * Set the transparency to 30% for the fillText (e.g. readonly mode uses this)
     */
    fillTextWithTransparency: function(ctx, text, x, y) {
        ctx.globalAlpha = 0.3;
        ctx.fillText(text, x, y);
        ctx.globalAlpha = 1.0;
    },

    // Adjusts the width and height values of the canvas to fill the parent
    // view.
    resizeCanvasIfNeeded: function() {
        var canvas = this.get('canvas');
        var parentLayer = this.get('parentView').get('layer');

        // At first these are zero, so we can't use them.
        if (parentLayer.clientWidth !== 0 && parentLayer.clientHeight !== 0) {
            if (parentLayer.clientWidth !== canvas.width)
                canvas.width = parentLayer.clientWidth;
            if (parentLayer.clientHeight !== canvas.height)
                canvas.height = parentLayer.clientHeight;
        }
    },

    /**
     * @private
     * Returns the width and height of the containing view (typically a
     * ScrollView). This is used as the minimum size of the drawing area.
     */
    computeContainerSize: function() {
        var parentLayer = this.get('parentView').get('layer');
        var size = {
            width:  parentLayer.clientWidth,
            height: parentLayer.clientHeight
        };
        return size.width == 0 && size.height == 0 ? null : size;
    },

    /**
     * @private
     * Adjusts the width and height of the canvas to match the given size, if
     * needed.
     */
    resizeCanvasToFit: function(size) {
        var canvas = this.get('canvas');
        if (size.width !== canvas.width)
            canvas.width = size.width;
        if (size.height !== canvas.height)
            canvas.height = size.height;
    },

    /**
     * This is where the editor is painted from head to toe.
     * The optional "fullRefresh" argument triggers a complete repaint of the
     * editor canvas; otherwise, pitiful tricks are used to draw as little as possible.
     */
    paint: function(ctx, fullRefresh) {
        var content = this.get("content");

        fullRefresh = true; // FIXME --pcw

        // these are convenience references so we don't have to type so much
        var ed = this.editor;
        var c = this.get('canvas');
        var theme = ed.theme;

        // these are commonly used throughout the rendering process so are defined up here to make it clear they are shared
        var x, y;
        var cy;
        var currentLine;
        var lastLineToRender;

        var Rect = scroller.Rect;

        this.resizeCanvasIfNeeded();

        // SETUP STATE
        // if the user explicitly requests a full refresh, give it to 'em
        var refreshCanvas = fullRefresh;

        if (!refreshCanvas) {
            refreshCanvas = (this.selectMouseDownPos);
        }

        if (!refreshCanvas) {
            // if the line count has changed, full refresh
            refreshCanvas = (this.lastLineCount != content.getRowCount());
        }

        // save the number of lines for the next time paint
        this.lastLineCount = content.getRowCount();

        // get the line and character metrics; calculated for each paint because
        // this value can change at run-time
        ctx.font = theme.editorTextFont;
        this.charWidth = this.getCharWidth(ctx);
        this.lineHeight = this.getLineHeight(ctx);

        // TODO: This really shouldn't be done in paint(), instead do it
        // lazily whenever the layout changes.
        // This depends on charWidth and lineHeight being set properly above.
        var containerSize = this.computeContainerSize();
        if (containerSize != null)
            this.resizeCanvasToFit(containerSize);
        var layout = this.computeLayout(containerSize);
        this.adjust(layout);

        // cwidth and cheight are set to the dimensions of the parent node of
        // the canvas element; we'll resize the canvas element
        // itself a little bit later in this function
        var cwidth = this.getWidth();
        var cheight = this.getHeight();

        // only paint those lines that can be visible
        // TODO: calculate using clippingFrame --pcw
        this.visibleRows = Math.ceil(cheight / this.lineHeight);
        this.firstVisibleRow = 0;
        lastLineToRender = this.firstVisibleRow + this.visibleRows;
        if (lastLineToRender > (content.getRowCount() - 1)) {
            lastLineToRender = content.getRowCount() - 1;
        }

        var virtualheight = this.getHeight();
        var virtualwidth = this.get('textWidth');

        // if the current scrolled positions are different than the scroll
        // positions we used for the last paint, refresh the entire canvas
        // TODO --pcw

        // get debug metadata
        // var breakpoints = {};
        // var lineMarkers = bespin.get("parser").getLineMarkers();

        if (this.editor.debugMode && bespin.get("editSession")) {
            bespin.getComponent("breakpoints", function(bpmanager) {
                var points = bpmanager.getBreakpoints(bespin.get('editSession').project, bespin.get('editSession').path);
                points.forEach(function(point) {
                    breakpoints[point.lineNumber] = point;
                });
            });
        }

        // START RENDERING

        // if we're not doing a full repaint, work out which rows are "dirty"
        // and need to be repainted
        if (!refreshCanvas) {
            var dirty = content.getDirtyRows();

            // if the cursor has changed rows since the last paint, consider the previous row dirty
            if ((this.lastCursorPos) &&
                (this.lastCursorPos.row != ed.cursorManager.getCursorPosition().row)) {
                dirty[this.lastCursorPos.row] = true;
            }

            // we always repaint the current line
            dirty[ed.cursorManager.getCursorPosition().row] = true;
        }

        // save this state for the next paint attempt (see above for usage)
        this.lastCursorPos = cursor.copyPos(ed.cursorManager.getCursorPosition());

        // take snapshot of current context state so we can roll back later on
        ctx.save();

        // Translate the canvas based on the layout position.
        ctx.translate(layout.left, layout.top);

        // if we're doing a full repaint...
        if (refreshCanvas) {
            // ...paint the background color over the whole canvas and...
            ctx.fillStyle = theme.backgroundStyle;
            ctx.fillRect(0, 0, layout.width, layout.height);

            // ...paint the gutter
            ctx.fillStyle = theme.gutterStyle;
            ctx.fillRect(0, 0, this.get('gutterWidth'), layout.height);
        }

        // the Math.round(this.yoffset) makes the painting nice and not to go over 2 pixels
        // see for more informations:
        //  - https://developer.mozilla.org/en/Canvas_tutorial/Applying_styles_and_colors, section "Line styles"
        //  - https://developer.mozilla.org/@api/deki/files/601/=Canvas-grid.png

        // paint the line numbers
        if (refreshCanvas) {
            //line markers first
            if (bespin.get("parser")) {
                for (currentLine = this.firstVisibleRow; currentLine <= lastLineToRender; currentLine++) {
                    if (lineMarkers[currentLine]) {
                        y = this.lineHeight * (currentLine - 1);
                        cy = y + (this.lineHeight - this.LINE_INSETS.bottom);
                        ctx.fillStyle = this.editor.theme["lineMarker" + lineMarkers[currentLine].type + "Color"];
                        ctx.fillRect(0, y, this.get('gutterWidth'),
                            this.lineHeight);
                    }
                 }
            }
            y = (this.lineHeight * this.firstVisibleRow);

            for (currentLine = this.firstVisibleRow; currentLine <= lastLineToRender; currentLine++) {
                x = 0;

                // if we're in debug mode...
                if (this.editor.debugMode) {
                    // ...check if the current line has a breakpoint
                    if (breakpoints[currentLine]) {
                        var bpx = x + this.DEBUG_GUTTER_INSETS.left;
                        var bpy = y + this.DEBUG_GUTTER_INSETS.top;
                        var bpw = this.DEBUG_GUTTER_WIDTH - this.DEBUG_GUTTER_INSETS.left - this.DEBUG_GUTTER_INSETS.right;
                        var bph = this.lineHeight - this.DEBUG_GUTTER_INSETS.top - this.DEBUG_GUTTER_INSETS.bottom;

                        var bpmidpointx = bpx + parseInt(bpw / 2, 10);
                        var bpmidpointy = bpy + parseInt(bph / 2, 10);

                        ctx.strokeStyle = "rgb(128, 0, 0)";
                        ctx.fillStyle = "rgb(255, 102, 102)";
                        ctx.beginPath();
                        ctx.arc(bpmidpointx, bpmidpointy, bpw / 2, 0, Math.PI*2, true);
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();
                    }

                    // ...and push the line number to the right, leaving a space
                    // for breakpoint stuff
                    x += this.DEBUG_GUTTER_WIDTH;
                }

                x += this.GUTTER_INSETS.left;

                cy = y + (this.lineHeight - this.LINE_INSETS.bottom);

                ctx.fillStyle = theme.lineNumberColor;
                ctx.font = this.editor.theme.lineNumberFont;
                //console.log(currentLine + " " + x + " " + cy);
                ctx.fillText(currentLine + 1, x, cy);

                y += this.lineHeight;
            }
         }

        // and now we're ready to translate the horizontal axis; while we're at
        // it, we'll setup a clip to prevent any drawing outside
        // of code editor region itself (protecting the gutter). this clip is
        // important to prevent text from bleeding into the gutter.
        ctx.save();
        ctx.beginPath();
        ctx.rect(this.get('gutterWidth'), 0.0,
            cwidth - this.get('gutterWidth'), cheight);
        ctx.closePath();
        ctx.clip();

        // calculate the first and last visible columns on the screen; these
        // values will be used to try and avoid painting text that the user
        // can't actually see
        // TODO: use clippingFrame to calculate these --pcw
        var firstColumn = 0;
        var lastColumn = firstColumn + (Math.ceil((cwidth
            - this.get('gutterWidth')) / this.charWidth));

        // create the state necessary to render each line of text
        y = (this.lineHeight * this.firstVisibleRow);
        // the starting column of the current region in the region render loop below
        var cc;
        // the ending column in the same loop
        var ce;
        // counter variable used for the same loop
        var ri;
        // length of the text in the region; used in the same loop
        var regionlen;
        var tx, tw, tsel;
        var settings = bespin.get("settings");
        var searchStringLength = (this.searchString ? this.searchString.length : -1);

        // paint each line
        for (currentLine = this.firstVisibleRow; currentLine <= lastLineToRender; currentLine++) {
            x = this.get('gutterWidth');

            // if we aren't repainting the entire canvas...
            if (!refreshCanvas) {
                // ...don't bother painting the line unless it is "dirty"
                // (see above for dirty checking)
                if (!dirty[currentLine]) {
                    y += this.lineHeight;
                    continue;
                }

                // setup a clip for the current line only; this makes drawing
                // just that piece of the scrollbar easy
                // this is restore()'d in another if (!refreshCanvas) block at
                // the end of the loop
                ctx.save();
                ctx.beginPath();
                // TODO: calculate with clippingFrame --pcw
                ctx.rect(x, y, cwidth, this.lineHeight);
                ctx.closePath();
                ctx.clip();

                // only repaint the line background if the zebra stripe won't be
                // painted into it
                if ((currentLine % 2) == 1) {
                    ctx.fillStyle = theme.backgroundStyle;
                    // TODO: calculate with clippingFrame --pcw
                    ctx.fillRect(x, y, cwidth, this.lineHeight);
                }
            }

            // if highlight line is on, paint the highlight color
            if ((settings && settings.isSettingOn('highlightline')) &&
                    (currentLine == ed.cursorManager.getCursorPosition().row)) {
                ctx.fillStyle = theme.highlightCurrentLineColor;
                // TODO: calculate with clippingFrame --pcw
                ctx.fillRect(x, y, cwidth, this.lineHeight);
            // if not on highlight, see if we need to paint the zebra
            } else if ((currentLine % 2) == 0) {
                ctx.fillStyle = theme.zebraStripeColor;
                // TODO: calculate with clippingFrame --pcw
                ctx.fillRect(x, y, cwidth, this.lineHeight);
            }

            x += this.LINE_INSETS.left;
            cy = y + (this.lineHeight - this.LINE_INSETS.bottom);

            // paint the selection bar if the line has selections
            var selections = this.selectionHelper.getRowSelectionPositions(currentLine);
            if (selections) {
                tx = x + (selections.startCol * this.charWidth);
                tw = (selections.endCol == -1) ? (lastColumn - firstColumn) * this.charWidth : (selections.endCol - selections.startCol) * this.charWidth;
                ctx.fillStyle = theme.editorSelectedTextBackground;
                ctx.fillRect(tx, y, tw, this.lineHeight);
            }

            var lineMetadata = content.getRowMetadata(currentLine);
            var lineText = lineMetadata.lineText;
            var searchIndices = lineMetadata.searchIndices;

            // the following two chunks of code do the same thing; only one
            // should be uncommented at a time

            // CHUNK 1: this code just renders the line with white text and is for testing
            // ctx.fillStyle = "white";
            // ctx.fillText(this.editor.model.getRowArray(currentLine).join(""), x, cy);

            // CHUNK 2: this code uses the SyntaxModel API to render the line
            // syntax highlighting

            var lineInfo = this.syntaxModel.getSyntaxStylesPerLine(lineText, currentLine, this.editor.language);

            // Define a fill that is aware of the readonly attribute and fades out if applied
            var readOnlyAwareFill = ed.readonly ? this.fillTextWithTransparency : this.fillText;

            for (ri = 0; ri < lineInfo.regions.length; ri++) {
                var styleInfo = lineInfo.regions[ri];

                for (var style in styleInfo) {
                    if (!styleInfo.hasOwnProperty(style)) {
                        continue;
                    }

                    var thisLine = "";

                    var styleArray = styleInfo[style];
                    var currentColumn = 0; // current column, inclusive
                    for (var si = 0; si < styleArray.length; si++) {
                        var range = styleArray[si];

                        for ( ; currentColumn < range.start; currentColumn++) {thisLine += " ";}
                        thisLine += lineInfo.text.substring(range.start, range.stop);
                        currentColumn = range.stop;
                    }

                    ctx.fillStyle = this.editor.theme[style] || "white";
                    ctx.font = this.editor.theme.editorTextFont;
                    readOnlyAwareFill(ctx, thisLine, x, cy);
                }
            }

            // highlight search string
            if (searchIndices) {
                // in some cases the selections are -1 => set them to a more "realistic" number
                if (selections) {
                    tsel = { startCol: 0, endCol: lineText.length };
                    if (selections.startCol != -1) {
                        tsel.startCol = selections.startCol;
                    }
                    if (selections.endCol != -1) {
                        tsel.endCol = selections.endCol;
                    }
                } else {
                    tsel = false;
                }

                for (var i = 0; i < searchIndices.length; i++) {
                    var index = ed.cursorManager.getCursorPosition({col: searchIndices[i], row: currentLine}).col;
                    tx = x + index * this.charWidth;

                    // highlight the area
                    ctx.fillStyle = this.editor.theme.searchHighlight;
                    ctx.fillRect(tx, y, searchStringLength * this.charWidth, this.lineHeight);

                    // figure out, whether the selection is in this area. If so, colour it different
                    if (tsel) {
                        var indexStart = index;
                        var indexEnd = index + searchStringLength;

                        if (tsel.startCol < indexEnd && tsel.endCol > indexStart) {
                            indexStart = Math.max(indexStart, tsel.startCol);
                            indexEnd = Math.min(indexEnd, tsel.endCol);

                            ctx.fillStyle = this.editor.theme.searchHighlightSelected;
                            ctx.fillRect(x + indexStart * this.charWidth, y, (indexEnd - indexStart) * this.charWidth, this.lineHeight);
                        }
                    }

                    // print the overpainted text again
                    ctx.fillStyle = this.editor.theme.editorTextColor || "white";
                    ctx.fillText(lineText.substring(index, index + searchStringLength), tx, cy);
                }

            }

            // paint tab information, if applicable and the information should be displayed
            if (settings && (settings.isSettingOn("tabarrow") || settings.isSettingOn("tabshowspace"))) {
                if (lineMetadata.tabExpansions.length > 0) {
                    for (i = 0; i < lineMetadata.tabExpansions.length; i++) {
                        var expansion = lineMetadata.tabExpansions[i];

                        // the starting x position of the tab character; the existing value of y is fine
                        var lx = x + (expansion.start * this.charWidth);

                        // check if the user wants us to highlight tabs; useful if you need to mix tabs and spaces
                        var showTabSpace = settings && settings.isSettingOn("tabshowspace");
                        if (showTabSpace) {
                            var sw = (expansion.end - expansion.start) * this.charWidth;
                            ctx.fillStyle = this.editor.theme.tabSpace || "white";
                            ctx.fillRect(lx, y, sw, this.lineHeight);
                        }

                        var showTabNib = settings && settings.isSettingOn("tabarrow");
                        if (showTabNib) {
                            // the center of the current character position's bounding rectangle
                            cy = y + (this.lineHeight / 2);
                            var cx = lx + (this.charWidth / 2);

                            // the width and height of the triangle to draw representing the tab
                            tw = 4;
                            var th = 6;

                            // the origin of the triangle
                            tx = parseInt(cx - (tw / 2), 10);
                            var ty = parseInt(cy - (th / 2), 10);

                            // draw the rectangle
                            ctx.globalAlpha = 0.3; // make the tab arrow subtle
                            ctx.beginPath();
                            ctx.fillStyle = this.editor.theme.plain || "white";
                            ctx.moveTo(tx, ty);
                            ctx.lineTo(tx, ty + th);
                            ctx.lineTo(tx + tw, ty + parseInt(th / 2, 10));
                            ctx.closePath();
                            ctx.fill();
                            ctx.globalAlpha = 1.0;
                        }
                    }
                }
            }
            
            y += this.lineHeight;
        }

        // paint the cursor
        if (this.focus) {
            if (this.showCursor) {
                if (ed.theme.cursorType == "underline") {
                    x = this.get('gutterWidth') + this.LINE_INSETS.left
                        + ed.cursorManager.getCursorPosition().col
                        * this.charWidth;
                    y = (ed.getCursorPos().row * this.lineHeight) + (this.lineHeight - 5);
                    ctx.fillStyle = ed.theme.cursorStyle;
                    ctx.fillRect(x, y, this.charWidth, 3);
                } else {
                    x = this.get('gutterWidth') + this.LINE_INSETS.left
                        + ed.cursorManager.getCursorPosition().col
                        * this.charWidth;
                    y = (ed.cursorManager.getCursorPosition().row * this.lineHeight);
                    ctx.fillStyle = ed.theme.cursorStyle;
                    ctx.fillRect(x, y, 1, this.lineHeight);
                }
            }
        } else {
            x = this.get('gutterWidth') + this.LINE_INSETS.left
                + ed.cursorManager.getCursorPosition().col * this.charWidth;
            y = (ed.cursorManager.getCursorPosition().row * this.lineHeight);

            ctx.fillStyle = ed.theme.unfocusedCursorFillStyle;
            ctx.strokeStyle = ed.theme.unfocusedCursorStrokeStyle;
            ctx.fillRect(x, y, this.charWidth, this.lineHeight);
            ctx.strokeRect(x, y, this.charWidth, this.lineHeight);
        }

        // Paint the cursors of other users
        var session = bespin.get("editSession");
        if (session) {
            var userEntries = session.getUserEntries();
            if (userEntries) {
                userEntries.forEach(function(userEntry) {
                    if (!userEntry.clientData.isMe) {
                        x = this.gutterWidth + this.LINE_INSETS.left + userEntry.clientData.cursor.start.col * this.charWidth;
                        y = userEntry.clientData.cursor.start.row * this.lineHeight;
                        ctx.fillStyle = "#ee8c00";
                        ctx.fillRect(x, y, 1, this.lineHeight);
                        var prevFont = ctx.font;
                        ctx.font = "6pt Monaco, Lucida Console, monospace";
                        ctx.fillText(userEntry.handle, x + 3, y + this.lineHeight + 4);
                        ctx.font = prevFont;
                    }
                }.bind(this));
            }
        }

        // Paint the 'change' overlays. This is the polygon that we draw for
        // each change that has been reported to us in ui.setChanges()
        //                _____1__________
        //  _______3_____|2    _____7_____|8
        // |4_________5_______|6
        //
        if (this.changes) {
            this.changes.forEach(function(change) {
                // TODO: Make this part of the theme
                ctx.strokeStyle = "#211A16";
                ctx.beginPath();
                // Line 1 (starting at column 180 - should do better)
                x = this.gutterWidth + this.LINE_INSETS.left + 180 * this.charWidth;
                y = change.start.row * this.lineHeight;
                ctx.moveTo(x, y);
                x = this.gutterWidth + this.LINE_INSETS.left + change.start.col * this.charWidth;
                ctx.lineTo(x, y);
                // Line 2
                y += this.lineHeight;
                ctx.lineTo(x, y);
                // Line 3
                x = this.gutterWidth + this.LINE_INSETS.left;
                ctx.lineTo(x, y);
                // Line 4
                y = (change.end.row + 1) * this.lineHeight;
                ctx.lineTo(x, y);
                // Line 5
                x = this.gutterWidth + this.LINE_INSETS.left + change.end.col * this.charWidth;
                ctx.lineTo(x, y);
                // Line 6
                y = change.end.row * this.lineHeight;
                ctx.lineTo(x, y);
                // Line 7
                x = this.gutterWidth + this.LINE_INSETS.left + 180 * this.charWidth;
                ctx.lineTo(x, y);
                // Line 8
                y = change.start.row * this.lineHeight;
                ctx.lineTo(x, y);
                ctx.stroke();
            }.bind(this));
        }

        // scroll bars - x axis
        ctx.restore();

        // scrollbars - y axis
        ctx.restore();
    },

    /**
     * returns metadata about the string that represents the row;
     * converts tab characters to spaces
     */
    getRowString: function(row) {
        var content = this.get("content");
        return content.getRowMetadata(row).lineText;
    },

    getRowScreenLength: function(row) {
        return this.getRowString(row).length;
    },

    /**
     * returns the maximum number of display columns across all rows
     */
    getMaxCols: function(firstRow, lastRow) {
        var cols = 0;
        for (var i = firstRow; i <= lastRow; i++) {
            cols = Math.max(cols, this.getRowScreenLength(i));
        }
        return cols;
    },

    setSearchString: function(str) {
        var content = this.get("content");
        if (str && str != '') {
            this.searchString = str;
        } else {
            delete this.searchString;
        }

        content.searchStringChanged(this.searchString);

        this.editor.paint(true);
    },

    /**
     * This is a huge hack that experiments with marking changes
     */
    setChanges: function(changes) {
        this.changes = changes;
        console.log("changes=", this.changes);
    },

    dispose: function() {
    }
});

/**
 * A wrapper for the functionality that we are exposing to the clipboard
 * editor.
 */
var EditorWrapper = SC.Object.extend({
    /**
     * The things we are proxying to
     */
    editor: null,
    ui: null,

    /**
     * Proxy to the UI's setFocus()
     */
    focus: function() {
        this.ui.setFocus();
    },

    /**
     * Proxy to the UI's definition of if it has focus
     */
    hasFocus: function() {
        return this.ui.hasFocus();
    },

    /**
     * We need to add cut and paste handlers to something this provides an
     * element.
     */
    getFocusElement: function() {
        return this.ui._getFocusElement();
    },

    /**
     * i.e. cut, except that we don't affect the clipboard
     */
    removeSelection: function() {
        var selectionObject = this.editor.getSelection();
        var text = null;

        if (selectionObject) {
            var text = this.editor.model.getChunk(selectionObject);

            if (text && text != '') {
                this.ui.actions.beginEdit('cut');
                this.ui.actions.deleteSelection(selectionObject);
                this.ui.actions.endEdit();
            }
        }

        return text;
    },

    /**
     * Return the current selection
     * i.e. copy, except that we don't affect the clipboard
     */
    getSelection: function() {
        return this.editor.getSelectionAsText();
    },

    /**
     * Replace the current selection, or insert at the cursor
     * i.e. paste, except that the contents does not come from the clipboard
     */
    replaceSelection: function(text) {
        var args = cursor.buildArgs();
        args.chunk = text;
        if (args.chunk) {
            this.ui.actions.beginEdit('paste');
            this.ui.actions.insertChunk(args);
            this.ui.actions.endEdit();
        }
    },

    /**
     * Turn on the key combinations to access the clipboard.manual class
     * which basically only works with the editor only. Not in favour.
     * TODO: Really this should be an implementation like DOMEvents and
     * HiddenWorld.
     */
    installEditorOnly: function() {
        this.editor.bindKey("copySelection", "CMD C");
        this.editor.bindKey("pasteFromClipboard", "CMD V");
        this.editor.bindKey("cutSelection", "CMD X");
    }
});
