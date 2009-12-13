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

var SC = require('sproutcore/runtime').SC;

var bespin = require('index');
var syntax = require('syntax');
var actions = require('actions');
var keys = require('util/keys');
var clipboard = require("util/clipboard");
var cursor = require('cursor');
var scroller = require('editor/views/scroller');
var canvas = require('editor/mixins/canvas');
var pluginCatalog = require("plugins").catalog;
//var command = require("command");
var command = {};

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

/**
 * Add a setting to control is TAB characters are displayed as an arrow
 */
bespin.get("settings").addSetting({
    name: "tabarrow",
    type: "boolean",
    defaultValue: true
});

// The main editor view.
exports.EditorView = SC.View.extend(canvas.Canvas, {
    classNames: 'sc-canvas-view',
    displayProperties: ['value', 'shouldAutoResize'],

    rowLengthCache: [],

    searchString: null,

    // tracks how many cursor toggles since the last full repaint
    toggleCursorFullRepaintCounter: 0,

    // number of milliseconds between cursor blink
    toggleCursorFrequency: 250,

    // is the cursor allowed to toggle? (used by cursorManager.moveCursor)
    toggleCursorAllowed: true,

    LINE_HEIGHT: 23,

    BOTTOM_SCROLL_AFFORDANCE: 30,

    LINE_INSETS: { top: 0, left: 5, right: 0, bottom: 6 },

    FALLBACK_CHARACTER_WIDTH: 10,

    showCursor: true,

    hasFocus: false,

    // Some things need to happen only when we're rendered. This is how we delay
    onInitActions: [],
    inited: false,

    // painting optimization state
    lastLineCount: 0,
    lastCursorPos: null,

    /**
     * @property
     * The padding to leave inside the clipping frame, given as an object with
     * 'bottom' and 'right' properties. Text content is displayed inside this
     * padding as usual, but the cursor cannot enter it. In a BespinScrollView,
     * this feature is used to prevent the cursor from ever going behind the
     * scroll bars.
     */
    padding: { bottom: 0, right: 0 },

    /**
     * @property{Boolean}
     * This property is always true for objects that expose a padding property.
     * The BespinScrollView uses this.
     */
    hasPadding: true,

    // Not cacheable, unfortunately, because it depends on the parent view's
    // frame...
    layerFrame: function() {
        var parentView = this.get('parentView');
        var parentFrame = parentView.get('frame');
        return {
            x:      0,
            y:      0,
            width:  parentFrame.width,
            height: parentFrame.height
        };
    }.property(),

    init: function() {
        var settings = bespin.get("settings");

        var extensions = pluginCatalog.getExtensions("syntax.engine");
        // set model to a default that will work until the real thing is loaded
        this.syntaxModel = syntax.Model.create();

        if (extensions.length > 0) {
            extensions[0].load(function(model) {
                this.syntaxModel = model.create();
            }.bind(this));
        }

        this.selectionHelper = SelectionHelper.create({ editor: this.editor });
        this.actions = actions.Actions.create({ editor: this.editor });

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

        sc_super();
    },

    render: function(context, firstTime) {
        sc_super();

        if (!firstTime) {
            return;
        }

        context.attr("moz-opaque", "true");
        context.attr("tabindex", "1");
    },

    didCreateLayer: function() {
        var canvas = this.$("canvas")[0];

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

        this.set('rowCount', this.get('content').getRowCount());

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
     * @private
     *
     * Converts a point relative to the top left corner of the editor to a
     * row-column pair.
     *
     * @return An object with 'row' and 'col' properties. If the cursor clicked
     *      to the left of the first column, the column property is -1.
     */
    convertClientPointToCursorPoint: function(pos) {
        var settings = bespin.get("settings");
        var x, y;

        var content = this.get("content");
        var charWidth = this.get("charWidth");
        var lineHeight = this.get("lineHeight");

        if (pos.y < 0) { //ensure line >= first
            y = 0;
        } else if (pos.y >= (lineHeight * content.getRowCount())) { //ensure line <= last
            y = content.getRowCount() - 1;
        } else {
            var ty = pos.y;
            y = Math.floor(ty / lineHeight);
        }

        if (pos.x <= this.LINE_INSETS.left) {
            x = -1;
        } else {
            var tx = pos.x - this.LINE_INSETS.left;
            // round vs floor so we can pick the left half vs right half of a character
            x = Math.round(tx / charWidth);

            // With strictlines turned on, don't select past the end of the line
            if (settings.values.strictlines) {
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
     *
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
            // clicked to the left of column 1; show appropriate lineMarker
            // message
            var lineMarker = bespin.get("parser").getLineMarkers()[down.row + 1];
            if (lineMarker) {
                command.showHint(lineMarker.msg);
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

        this.editor.paint();
    },

    toggleCursor: function() {
        if (this.toggleCursorAllowed) {
            this.showCursor = !this.showCursor;
        } else {
            this.toggleCursorAllowed = true;
        }

        this.toggleCursorFullRepaintCounter++;
        if (this.toggleCursorFullRepaintCounter > 0) {
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
        var canvas = this.$("canvas")[0];
        canvas.focus();

        return true;
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

    /**
     *
     */
    setFocus: function(focus) {
        this.onInit(function() {
            if (this.focus != focus) {
                var canvas = this.$("canvas")[0];
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
        var canvas = this.$("canvas")[0];
        return canvas;
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
        var canvas = this.$("canvas")[0];
        var scope = canvas;

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
     * Returns the height in pixels of the content area.
     * TODO: convert to property for improved performance
     */
    getHeight: function() {
        return this.get('lineHeight') * this.get('content').getRowCount() +
            this.get('padding').bottom;
    },

    /**
     * @property{Number}
     * The width of one character in pixels.
     *
     * TODO: When the theme property moves to this view, these properties
     * should become dependent on it.
     */
    charWidth: function() {
        return this.getCharacterWidth(this.editor.theme.editorTextFont);
    }.property(),

    /**
     * @property{Number}
     * The height of one character in pixels.
     *
     * TODO: When the theme property moves to this view, these properties
     * should become dependent on this.
     */
    lineHeight: function(key, value) {
        var theme = this.editor.theme;
        var userLineHeight = theme.lineHeight;
        return !SC.none(userLineHeight) ? userLineHeight :
            this.guessLineHeight(theme.editorTextFont);
    }.property().cacheable(),

    /**
     * @property{Number}
     *
     * Returns the width in pixels of the longest line, plus some padding.
     * Read-only.
     */
    textWidth: function(key, value) {
        return this.get('charWidth') *
            (this.getMaxCols(0, this.get('content').getRowCount() - 1) + 1);
    }.property('content', 'charWidth'),

    /**
     * @property
     *
     * Layout for EditorViews is read-only and determined by the text height
     * and width.
     */
    layout: function(key, value) {
        var origin = this._origin;
        if (!SC.none(value)) {
            origin.left = value.left;
            origin.top  = value.top;
        }

        // FIXME: Until the canvas is set up, we don't know how to measure
        // text, so lie - this should be fixed when the layer becomes a canvas
        // as part of the canvas mixin reworking. --pcw
        var canvas = this.$("canvas")[0];
        if (SC.none(canvas)) {
            return {
                left:   origin.left,
                top:    origin.top,
                width:  32,
                height: 32
            };
        }

        return {
            left:   origin.left,
            top:    origin.top,
            width:  this.LINE_INSETS.left + this.get('textWidth') +
                    this.get('padding').right,
            height: this.get('lineHeight') * this.get('content').getRowCount() +
                    this.get('padding').bottom
        };
    }.property('canvas', 'content', 'lineHeight', 'padding', 'textWidth'),

    _origin: { top: 0, left: 0 },

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

    // TODO: Yuck, this property should go away once the timeout goes away.
    _firstPaint: false,

    /**
     * This is where the editor is painted from head to toe.
     * The optional "fullRefresh" argument triggers a complete repaint of the
     * editor canvas; otherwise, pitiful tricks are used to draw as little as possible.
     */
    drawRect: function(ctx, visibleFrame) {
        var content = this.get("content");

        if (!this._firstPaint) {
            // TODO: Get rid of this. On content change, trigger a layout
            // update.
            this.propertyWillChange('layout');
            this.propertyDidChange('layout', this.get('layout'));
        }

        fullRefresh = true; // FIXME --pcw

        // these are convenience references so we don't have to type so much
        var ed = this.editor;
        var c = this.$("canvas")[0];
        var theme = ed.theme;

        // these are commonly used throughout the rendering process so are defined up here to make it clear they are shared
        var x, y;
        var cy;
        var currentLine;

        var Rect = scroller.Rect;

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

        // cwidth and cheight are set to the dimensions of the canvas
        var cwidth = c.width;
        var cheight = c.height;

        var lineHeight = this.get('lineHeight');

        var firstVisibleRow = Math.floor(visibleFrame.y / lineHeight);
        var visibleRows = Math.ceil(visibleFrame.height / lineHeight);
        var lastLineToRender = Math.min(firstVisibleRow + visibleRows,
            content.getRowCount() - 1);

        var virtualheight = this.getHeight();
        var virtualwidth = this.LINE_INSETS.left + this.get('textWidth');

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

        // if we're doing a full repaint...
        if (refreshCanvas) {
            // ...paint the background color over the whole canvas.
            ctx.fillStyle = theme.backgroundStyle;
            ctx.fillRect(visibleFrame.x, visibleFrame.y,
                visibleFrame.width, visibleFrame.height);
        }

        ctx.save();

        // calculate the first and last visible columns on the screen; these
        // values will be used to try and avoid painting text that the user
        // can't actually see
        // TODO: use clippingFrame to calculate these --pcw
        var charWidth = this.get('charWidth');
        var firstColumn = 0;
        var lastColumn = firstColumn + Math.ceil(cwidth / charWidth);

        // create the state necessary to render each line of text
        y = lineHeight * firstVisibleRow;
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
        for (currentLine = firstVisibleRow; currentLine <= lastLineToRender;
                currentLine++) {
            x = 0;

            // if we aren't repainting the entire canvas...
            if (!refreshCanvas) {
                // ...don't bother painting the line unless it is "dirty"
                // (see above for dirty checking)
                if (!dirty[currentLine]) {
                    y += lineHeight;
                    continue;
                }

                // setup a clip for the current line only; this makes drawing
                // just that piece of the scrollbar easy
                // this is restore()'d in another if (!refreshCanvas) block at
                // the end of the loop
                ctx.save();
                ctx.beginPath();
                // TODO: calculate with clippingFrame --pcw
                ctx.rect(x, y, cwidth, lineHeight);
                ctx.closePath();
                ctx.clip();

                // only repaint the line background if the zebra stripe won't be
                // painted into it
                if ((currentLine % 2) == 1) {
                    ctx.fillStyle = theme.backgroundStyle;
                    // TODO: calculate with clippingFrame --pcw
                    ctx.fillRect(x, y, cwidth, lineHeight);
                }
            }

            // if highlight line is on, paint the highlight color
            if (settings.values.highlightline &&
                    currentLine == ed.cursorManager.getCursorPosition().row) {
                ctx.fillStyle = theme.highlightCurrentLineColor;
                // TODO: calculate with clippingFrame --pcw
                ctx.fillRect(x, y, cwidth, lineHeight);
            // if not on highlight, see if we need to paint the zebra
            } else if ((currentLine % 2) === 0) {
                ctx.fillStyle = theme.zebraStripeColor;
                // TODO: calculate with clippingFrame --pcw
                ctx.fillRect(x, y, cwidth, lineHeight);
            }

            x += this.LINE_INSETS.left;
            cy = y + (lineHeight - this.LINE_INSETS.bottom);

            // paint the selection bar if the line has selections
            var selections = this.selectionHelper.getRowSelectionPositions(currentLine);
            if (selections) {
                tx = x + (selections.startCol * charWidth);
                tw = (selections.endCol == -1) ? (lastColumn - firstColumn) * charWidth : (selections.endCol - selections.startCol) * charWidth;
                ctx.fillStyle = theme.editorSelectedTextBackground;
                ctx.fillRect(tx, y, tw, lineHeight);
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
                    tx = x + index * charWidth;

                    // highlight the area
                    ctx.fillStyle = this.editor.theme.searchHighlight;
                    ctx.fillRect(tx, y, searchStringLength * charWidth, lineHeight);

                    // figure out, whether the selection is in this area. If so, colour it different
                    if (tsel) {
                        var indexStart = index;
                        var indexEnd = index + searchStringLength;

                        if (tsel.startCol < indexEnd && tsel.endCol > indexStart) {
                            indexStart = Math.max(indexStart, tsel.startCol);
                            indexEnd = Math.min(indexEnd, tsel.endCol);

                            ctx.fillStyle = this.editor.theme.searchHighlightSelected;
                            ctx.fillRect(x + indexStart * charWidth, y, (indexEnd - indexStart) * charWidth, lineHeight);
                        }
                    }

                    // print the overpainted text again
                    ctx.fillStyle = this.editor.theme.editorTextColor || "white";
                    ctx.fillText(lineText.substring(index, index + searchStringLength), tx, cy);
                }

            }

            // paint tab information, if applicable and the information should be displayed
            if (settings.values.tabarrow || settings.values.tabshowspace) {
                if (lineMetadata.tabExpansions.length > 0) {
                    for (i = 0; i < lineMetadata.tabExpansions.length; i++) {
                        var expansion = lineMetadata.tabExpansions[i];

                        // the starting x position of the tab character; the existing value of y is fine
                        var lx = x + (expansion.start * charWidth);

                        // check if the user wants us to highlight tabs; useful if you need to mix tabs and spaces
                        var showTabSpace = settings.values.tabshowspace;
                        if (showTabSpace) {
                            var sw = (expansion.end - expansion.start) * charWidth;
                            ctx.fillStyle = this.editor.theme.tabSpace || "white";
                            ctx.fillRect(lx, y, sw, lineHeight);
                        }

                        var showTabNib = settings.values.tabarrow;
                        if (showTabNib) {
                            // the center of the current character position's bounding rectangle
                            cy = y + (lineHeight / 2);
                            var cx = lx + (charWidth / 2);

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

            y += lineHeight;
        }

        // paint the cursor
        if (this.focus) {
            if (this.showCursor) {
                if (ed.theme.cursorType == "underline") {
                    x = this.LINE_INSETS.left +
                        ed.cursorManager.getCursorPosition().col * charWidth;
                    y = (ed.getCursorPos().row * lineHeight) + (lineHeight - 5);
                    ctx.fillStyle = ed.theme.cursorStyle;
                    ctx.fillRect(x, y, charWidth, 3);
                } else {
                    x = this.LINE_INSETS.left +
                        ed.cursorManager.getCursorPosition().col * charWidth;
                    y = (ed.cursorManager.getCursorPosition().row * lineHeight);
                    ctx.fillStyle = ed.theme.cursorStyle;
                    ctx.fillRect(x, y, 1, lineHeight);
                }
            }
        } else {
            x = this.LINE_INSETS.left +
                ed.cursorManager.getCursorPosition().col * charWidth;
            y = (ed.cursorManager.getCursorPosition().row * lineHeight);

            ctx.fillStyle = ed.theme.unfocusedCursorFillStyle;
            ctx.strokeStyle = ed.theme.unfocusedCursorStrokeStyle;
            ctx.fillRect(x, y, charWidth, lineHeight);
            ctx.strokeRect(x, y, charWidth, lineHeight);
        }

        // Paint the cursors of other users
        var session = bespin.get("editSession");
        if (session) {
            var userEntries = session.getUserEntries();
            if (userEntries) {
                userEntries.forEach(function(userEntry) {
                    if (!userEntry.clientData.isMe) {
                        x = this.LINE_INSETS.left +
                            userEntry.clientData.cursor.start.col * charWidth;
                        y = userEntry.clientData.cursor.start.row * lineHeight;
                        ctx.fillStyle = "#ee8c00";
                        ctx.fillRect(x, y, 1, lineHeight);
                        var prevFont = ctx.font;
                        ctx.font = "6pt Monaco, Lucida Console, monospace";
                        ctx.fillText(userEntry.handle, x + 3, y + lineHeight + 4);
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
                x = this.LINE_INSETS.left + 180 * charWidth;
                y = change.start.row * lineHeight;
                ctx.moveTo(x, y);
                x = this.LINE_INSETS.left + change.start.col * charWidth;
                ctx.lineTo(x, y);
                // Line 2
                y += lineHeight;
                ctx.lineTo(x, y);
                // Line 3
                x = this.LINE_INSETS.left;
                ctx.lineTo(x, y);
                // Line 4
                y = (change.end.row + 1) * lineHeight;
                ctx.lineTo(x, y);
                // Line 5
                x = this.LINE_INSETS.left + change.end.col * charWidth;
                ctx.lineTo(x, y);
                // Line 6
                y = change.end.row * lineHeight;
                ctx.lineTo(x, y);
                // Line 7
                x = this.LINE_INSETS.left + 180 * charWidth;
                ctx.lineTo(x, y);
                // Line 8
                y = change.start.row * lineHeight;
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
        if (str && str !== '') {
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

    /**
     * @property{Number}
     * Stores the number of lines in the content.
     *
     * TODO: This is kind of lame, because it updates only on cursor movement.
     * As part of the MVC rework, we should bind this directly to the model.
     */
    rowCount: 0,

    // Scrolls the view so that the given frame (specified in coordinates
    // relative to the top left of this view) is visible. Returns true if
    // scrolling actually occurred and false otherwise.
    _scrollToFrameVisible: function(frame) {
        var clippingFrame = this.get('clippingFrame');
        var padding = this.get('padding');
        var preferredFrame = {
            x:      clippingFrame.x,
            y:      clippingFrame.y,
            width:  clippingFrame.width - padding.right,
            height: clippingFrame.height - padding.bottom
        };

        var targetX;
        var frameRight = frame.x + frame.width;
        if (frame.x < preferredFrame.x) {
            targetX = frame.x;                              // off left side
        } else if (frameRight >= preferredFrame.x + preferredFrame.width) {
            targetX = frameRight - preferredFrame.width;    // off right side
        } else {
            targetX = preferredFrame.x;                     // already visible
        }

        var targetY;
        var frameBottom = frame.y + frame.height;
        if (frame.y < preferredFrame.y) {
            targetY = frame.y;                              // off left side
        } else if (frameBottom >= preferredFrame.y + preferredFrame.height) {
            targetY = frameBottom - preferredFrame.height;  // off right side
        } else {
            targetY = preferredFrame.y;                     // already visible
        }

        if (targetX === preferredFrame.x && targetY === preferredFrame.y) {
            return false;
        }

        // Grab the enclosing scrollable view.
        var scrollable = this;
        do {
            scrollable = scrollable.get('parentView');
            if (scrollable === null) {
                return false;
            }
        } while (scrollable.get('isScrollable') !== true);

        scrollable.scrollToVisible();
        return scrollable.scrollTo(targetX, targetY);
    },

    // Scrolls the view so that the character at the given row and column
    // (specified as an object with 'row' and 'col' properties) is in the top
    // left.
    _scrollToCharVisible: function(pos) {
        var charWidth = this.get('charWidth');
        var lineHeight = this.get('lineHeight');
        return this._scrollToFrameVisible({
            x:      pos.col === 0 ? 0 :     // scroll far left for convenience
                    this.LINE_INSETS.left + pos.col * charWidth,
            y:      pos.row * lineHeight,
            width:  charWidth,
            height: lineHeight
        });
    },

    _scrollToCursorVisible: function() {
        var cursorPos = this.editor.cursorManager.getCursorPosition();
        return this._scrollToCharVisible(cursorPos);
    },

    // Updates the rowCount property.
    _updateRowCount: function() {
        this.set('rowCount', this.get('content').getRowCount());
    },

    /**
     * Called by the cursor object whenever it moves.
     */
    cursorDidMove: function(sender, newPosition) {
        // Create a run loop so that the size adjustment and the position
        // adjustment (which affect the scroll bars through key-value
        // observing) fire at the end of this routine and at the same time.
        // Fixes bug 528089.
        SC.RunLoop.begin();

        this.propertyWillChange('layout');
        this.propertyDidChange('layout', this.get('layout'));

        this._scrollToCursorVisible();
        this._updateRowCount();
        SC.RunLoop.end();
    },

    /**
     * Called whenever the text content changes.
     *
     * TODO: This should be delegated to a separate layout manager object as
     * part of the MVC rework.
     */
    textStorageEdited: function(sender) {
        SC.RunLoop.begin();
        this.notifyPropertyChange('layout', this.get('layout'));
        this._updateRowCount();
        SC.RunLoop.end();
    },

    dispose: function() {
    },

    _bespin_editorView_parentViewFrameDidChange: function() {
        this.propertyWillChange('layerFrame');
        this.propertyDidChange('layerFrame', this.get('layerFrame'));
    }.observes('*parentView.frame')
});

/**
 * The frequency of the cursor blink in milliseconds (defaults to 250)
 */
bespin.subscribe("settings:set:cursorblink", function(event) {
    // get the number of milliseconds
    var ms = parseInt(event.value, 10);
    if (ms) {
        var editor = bespin.get('editor');
        editor.ui.toggleCursorFrequency = ms;
    }
});

/**
 * Change the font size for the editor
 */
bespin.subscribe("settings:set:fontsize", function(event) {
    var editor = bespin.get('editor');
    var fontsize = parseInt(event.value, 10);
    editor.theme.editorTextFont = editor.theme.editorTextFont.replace(/[0-9]{1,}pt/, fontsize+'pt');
    editor.theme.lineNumberFont = editor.theme.lineNumberFont.replace(/[0-9]{1,}pt/, fontsize+'pt');
});

/**
 * Add a setting to affect the editor font size
 */
bespin.get("settings").addSetting({
    name: "fontsize",
    type: "number",
    defaultValue: 10
});

/**
 * Change the Theme object used by the editor
 */
bespin.subscribe("settings:set:theme", function(event) {
    var editor = bespin.get('editor');
    var settings = bespin.get('settings');
    var files = bespin.get('files');
    var theme = event.value;

    var checkSetAndExit = function() {
        var themeSettings = themes[theme];
        if (themeSettings) {
            if (themeSettings != editor.theme) {
                editor.theme = themeSettings;
            }
            return true;
        }
        return false;
    };

    if (theme) {
        // Try to load the theme from the themes hash
        if (checkSetAndExit()) {
            return true;
        }

        // Not in the default themes, load from themes.ThemeName file
        try {
            var req = require;
            // the build system doesn't like dynamic names.
            req.call(window, "themes." + theme);
            if (checkSetAndExit()) {
                return true;
            }
        } catch (e) {
            console.log("Unable to load theme: " + theme, e);
        }

        // Not in themes, load from users directory
        var onSuccess = function(file) {
            try {
                eval(file.content);
            } catch (e) {
                console.log("Error with theme loading: ", e);
            }

            if (!checkSetAndExit()) {
                // TODO: Command line action goes into instructions
                // bespin.get("commandLine").addErrorOutput("Sorry old chap. No theme called '" + theme + "'. Fancy making it?");
                alert("Sorry old chap. No theme called '" + theme + "'. Fancy making it?");
            }
        };

        var onFailure = function() {
            // TODO: Command line action goes into instructions
            // bespin.get("commandLine").addErrorOutput("Sorry old chap. No theme called '" + theme + "'. Fancy making it?");
            alert("Sorry old chap. No theme called '" + theme + "'. Fancy making it?");
        };

        files.loadContents(files.userSettingsProject, "/themes/" + theme + ".js", onSuccess, onFailure);
    }

    return false;
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
        this.ui.setFocus(true);
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
            text = this.editor.model.getChunk(selectionObject);

            if (text && text !== '') {
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
