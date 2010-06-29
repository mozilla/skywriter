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

var rangeutils = require('rangeutils:utils/range');
var scroller = require('views/scroller');
var util = require('bespin:util/util');

var Buffer = require('models/buffer').Buffer;
var CompletionController = require('completion:controller').
    CompletionController;
var EditorSearchController = require('controllers/search').
    EditorSearchController;
var EditorUndoController = require('controllers/undo').EditorUndoController;
var Event = require('events').Event;
var GutterView = require('views/gutter').GutterView;
var LayoutManager = require('controllers/layoutmanager').LayoutManager;
var ScrollerView = scroller.ScrollerCanvasView;
var TextView = require('views/text').TextView;

var _ = require('underscore')._;
var catalog = require('bespin:plugins').catalog;
var keyboardManager = require('keyboard:keyboard').keyboardManager;
var settings = require('settings').settings;

// Caches the theme data for the entire editor (editor, highlighter, and
// gutter).
var editorThemeData = {};

function computeThemeData(themeManager) {
    var plugin = catalog.plugins['text_editor'];
    var provides = plugin.provides;
    var i = provides.length;
    var themeData = {};

    // If a themeManager was passed, try to access the themeData for the
    // `text_editor` plugin.
    if (themeManager) {
        var themestyles = themeManager.themestyles;

        if (themestyles.currentThemeVariables &&
                themestyles.currentThemeVariables['text_editor']) {
            themeData = themestyles.currentThemeVariables['text_editor'];
        }
    }

    while (i--) {
        if (provides[i].ep === 'themevariable') {
            var value = util.mixin(util.clone(provides[i].defaultValue),
                                        themeData[provides[i].name]);

            switch (provides[i].name) {
                case 'gutter':
                case 'editor':
                case 'scroller':
                case 'highlighter':
                    editorThemeData[provides[i].name] = value;
            }
        }
    }
}

// Compute the themeData to make sure there is one when the editor comes up.
computeThemeData();

catalog.registerExtension('themeChange', {
    pointer: computeThemeData
});

/**
 * @class
 *
 * A view responsible for laying out a scrollable text view and its associated
 * gutter view, as well as maintaining a layout manager.
 */
exports.EditorView = function(initialContent) {
    this.elementAppended = new Event();

    this.element = this.container = document.createElement("div");

    var container = this.container;
    container.style.overflow = 'visible';
    container.style.position = 'relative';

    this.scrollOffsetChanged = new Event();
    this.willChangeBuffer = new Event();

    this.selectionChanged = new Event();
    this.textChanged = new Event();

    var gutterView = this.gutterView = new GutterView(container, this);
    var textView = this.textView = new TextView(container, this);
    var verticalScroller = new ScrollerView(this, scroller.LAYOUT_VERTICAL);
    var horizontalScroller = new ScrollerView(this,
        scroller.LAYOUT_HORIZONTAL);
    this.verticalScroller = verticalScroller;
    this.horizontalScroller = horizontalScroller;

    this.completionController = new CompletionController(this);
    this.editorUndoController = new EditorUndoController(this);
    this.searchController = new EditorSearchController(this);

    this._textViewSize = this._oldSize = { width: 0, height: 0 };

    this._themeData = editorThemeData;

    // Create a buffer for the editor and use initialContent as the initial
    // content for the textStorage object.
    this.buffer = new Buffer(null, initialContent);

    // Create all the necessary stuff once the container has been added.
    this.elementAppended.add(function() {
        // Set the font property.
        var fontSize = settings.get('fontsize');
        var fontFace = settings.get('fontface');
        this._font = fontSize + 'px ' + fontFace;

        // Repaint when the theme changes.
        catalog.registerExtension('themeChange', {
            pointer: this._themeVariableChange.bind(this)
        });

        // When the font changes, set our local font property, and repaint.
        catalog.registerExtension('settingChange', {
            match: "font[size|face]",
            pointer: this._fontSettingChanged.bind(this)
        });

        // Likewise when the dimensions change.
        catalog.registerExtension('dimensionsChanged', {
            pointer: this.dimensionsChanged.bind(this)
        });

        // Allow the layout to be recomputed.
        this._dontRecomputeLayout = false;
        this._recomputeLayout();

        var wheelEvent = util.isMozilla ? 'DOMMouseScroll' : 'mousewheel';
        container.addEventListener(wheelEvent, this._onMouseWheel.bind(this),
            false);

        verticalScroller.valueChanged.add(function(value) {
            this.scrollOffset = { y: value };
        }.bind(this));

        horizontalScroller.valueChanged.add(function(value) {
            this.scrollOffset = { x: value };
        }.bind(this));

        this.scrollOffsetChanged.add(function(offset) {
            this._updateScrollOffsetChanged(offset);
        }.bind(this));
    }.bind(this));
};


exports.EditorView.prototype = {
    elementAppended: null,

    textChanged: null,
    selectionChanged: null,

    scrollOffsetChanged: null,
    willChangeBuffer: null,

    _textViewSize: null,

    _textLinesCount: 0,
    _gutterViewWidth: 0,
    _oldSize: null,

    _buffer: null,

    _dontRecomputeLayout: true,

    _themeData: null,

    _layoutManagerSizeChanged: function(size) {
        var fontDimension = this.layoutManager.fontDimension;
        this._textViewSize = {
            width: size.width * fontDimension.characterWidth,
            height: size.height * fontDimension.lineHeight
        };

        if (this._textLinesCount !== size.height) {
            var gutterWidth = this.gutterView.computeWidth();
            if (gutterWidth !== this._gutterViewWidth) {
                this._recomputeLayout(true /* force layout update */);
            } else {
                this.gutterView.invalidate();
            }
            this._textLinesLength = size.height;
        }

        // Clamp the current scrollOffset position.
        this._updateScrollers();
        this.scrollOffset = {};
    },

    _updateScrollers: function() {
        // Don't change anything on the scrollers until the layout is setup.
        if (this._dontRecomputeLayout) {
            return;
        }

        var frame = this.textViewPaddingFrame;
        var width = this._textViewSize.width;
        var height = this._textViewSize.height;
        var scrollOffset = this.scrollOffset;
        var verticalScroller = this.verticalScroller;
        var horizontalScroller = this.horizontalScroller;

        if (height < frame.height) {
            verticalScroller.isVisible = false;
        } else {
            verticalScroller.isVisible = true;
            verticalScroller.proportion = frame.height / height;
            verticalScroller.maximum = height - frame.height;
            verticalScroller.value = scrollOffset.y;
        }

        if (width < frame.width) {
            horizontalScroller.isVisible = false;
        } else {
            horizontalScroller.isVisible = true;
            horizontalScroller.proportion = frame.width / width;
            horizontalScroller.maximum = width - frame.width;
            horizontalScroller.value = scrollOffset.x;
        }
    },

    _onMouseWheel: function(evt) {
        var delta = 0;
        if (evt.wheelDelta) {
            delta = -evt.wheelDelta;
        } else if (evt.detail) {
            delta = evt.detail * 40;
        }

        var isVertical = true;
        if (evt.axis) { // Firefox 3.1 world
            if (evt.axis == evt.HORIZONTAL_AXIS) isVertical = false;
        } else if (evt.wheelDeltaY || evt.wheelDeltaX) {
            if (evt.wheelDeltaX == evt.wheelDelta) isVertical = false;
        } else if (evt.shiftKey) isVertical = false;

        if (isVertical) {
            this.scrollBy(0, delta);
        } else {
            this.scrollBy(delta * 5, 0);
        }

        util.stopEvent(evt);
    },

    scrollTo: function(pos) {
        this.scrollOffset = pos;
    },

    scrollBy: function(deltaX, deltaY) {
        this.scrollOffset = {
            x: this.scrollOffset.x + deltaX,
            y: this.scrollOffset.y + deltaY
        };
    },

    _recomputeLayout: function(forceLayout) {
        // This is necessary as _recomputeLayout is called sometimes when the
        // size of the container is not yet ready (because of FlexBox).
        if (this._dontRecomputeLayout) {
            return;
        }

        var width = this.container.offsetWidth;
        var height = this.container.offsetHeight;

        // Don't recompute unless the size actually changed.
        if (!forceLayout && width == this._oldSize.width
                                    && height == this._oldSize.height) {
            return;
        }

        this._oldSize = {
            width: width,
            height: height
        };

        var gutterWidth = this.gutterView.computeWidth();
        this._gutterViewWidth = gutterWidth;

        this.gutterView.frame = {
            x: 0,
            y: 0,
            width: gutterWidth,
            height: height
        };

        this.textView.frame = {
            x: gutterWidth,
            y: 0,
            width: width - gutterWidth,
            height: height
        };

        // TODO: Get these values from the scroller theme.
        var scrollerPadding = this._themeData.scroller.padding;
        var scrollerSize = this._themeData.scroller.thickness;

        this.horizontalScroller.frame = {
            x: gutterWidth + scrollerPadding,
            y: height - (scrollerSize + scrollerPadding),
            width: width - (gutterWidth + 2 * scrollerPadding + scrollerSize),
            height: scrollerSize
        };

        this.verticalScroller.frame = {
            x: width - (scrollerPadding + scrollerSize),
            y: scrollerPadding,
            width: scrollerSize,
            height: height - (2 * scrollerPadding + scrollerSize)
        };

        // Calls the setter scrollOffset which then clamps the current
        // scrollOffset as needed.
        this.scrollOffset = {};

        this._updateScrollers();
        this.gutterView.invalidate();
        this.textView.invalidate();
        this.verticalScroller.invalidate();
        this.horizontalScroller.invalidate();
    },

    dimensionsChanged: function() {
        this._recomputeLayout();
    },

    /**
     * @property{string}
     *
     * The font to use for the text view and the gutter view. Typically, this
     * value is set via the font settings.
     */
    _font: null,

    _fontSettingChanged: function() {
        var fontSize = settings.get('fontsize');
        var fontFace = settings.get('fontface');
        this._font = fontSize + 'px ' + fontFace;

        // Recompute the layouts.
        this.layoutManager._recalculateMaximumWidth();
        this._layoutManagerSizeChanged(this.layoutManager.size);
        this.textView.invalidate();
    },

    _themeVariableChange: function() {
        // Recompute the entire layout as the gutter might now have a different
        // size. Just calling invalidate() on the gutter wouldn't be enough.
        this._recomputeLayout(true);
    },

    _updateScrollOffsetChanged: function(offset) {
        this.verticalScroller.value = offset.y;
        this.horizontalScroller.value = offset.x;

        this.textView.clippingFrame = { x: offset.x, y: offset.y };

        this.gutterView.clippingFrame = { y: offset.y };

        this._updateScrollers();
        this.gutterView.invalidate();
        this.textView.invalidate();
    },

    /**
     * The text view uses this function to forward key events to the keyboard
     * manager. The editor view is used as a middleman so that it can append
     * predicates as necessary.
     */
    processKeyEvent: function(evt, sender, preds) {
        preds = _(preds).clone();
        preds.completing = this.completionController.isCompleting();
        return keyboardManager.processKeyEvent(evt, sender, preds);
    },

    /**
     * Converts a point in the coordinate system of the document being edited
     * (i.e. of the text view) to the coordinate system of the editor (i.e. of
     * the DOM component containing Bespin).
     */
    convertTextViewPoint: function(pt) {
        var scrollOffset = this.scrollOffset;
        return {
            x: pt.x - scrollOffset.x + this._gutterViewWidth,
            y: pt.y - scrollOffset.y
        };
    },

    // ------------------------------------------------------------------------
    // Helper API:

    /**
     * Replaces the text within a range, as an undoable action.
     *
     * @param {Range} range The range to replace.
     * @param {string} newText The text to insert.
     * @param {boolean} keepSelection True if the selection should be
     *     be preserved, otherwise the cursor is set after newText.
     * @return Returns true if the replacement completed successfully,
     *     otherwise returns false.
     */
    replace: function(range, newText, keepSelection) {
        if (!rangeutils.isRange(range)) {
            throw new Error('replace(): expected range but found "' + range +
                "'");
        }
        if (!util.isString(newText)) {
            throw new Error('replace(): expected text string but found "' +
                text + '"');
        }

        var normalized = rangeutils.normalizeRange(range);

        var view = this.textView;
        var oldSelection = view.getSelectedRange(false);
        return view.groupChanges(function() {
            view.replaceCharacters(normalized, newText);
            if (keepSelection) {
                view.setSelection(oldSelection);
            } else {
                var lines = newText.split('\n');

                var destPosition;
                if (lines.length > 1) {
                    destPosition = {
                        row: range.start.row + lines.length - 1,
                        col: lines[lines.length - 1].length
                    };
                } else {
                    destPosition = rangeutils.addPositions(range.start,
                        { row: 0, col: newText.length });
                }
                view.moveCursorTo(destPosition);
            }
        });
    },

    getText: function(range) {
        if (!rangeutils.isRange(range)) {
            throw new Error('getText(): expected range but found "' + range +
                '"');
        }

        var textStorage = this.layoutManager.textStorage;
        return textStorage.getCharacters(rangeutils.normalizeRange(range));
    },

    /** Scrolls and moves the insertion point to the given line number. */
    setLineNumber: function(lineNumber) {
        if (!util.isNumber(lineNumber)) {
            throw new Error('setLineNumber(): lineNumber must be a number');
        }

        var newPosition = { row: lineNumber - 1, col: 0 };
        this.textView.moveCursorTo(newPosition);
    },

    /** Sets the position of the cursor. */
    setCursor: function(newPosition) {
        if (!rangeutils.isPosition(newPosition)) {
            throw new Error('setCursor(): expected position but found "' +
                newPosition + '"');
        }

        this.textView.moveCursorTo(newPosition);
    },

    /**
     * Group changes so that they are only one undo/redo step.
     * Returns true if the changes were successful.
     */
    changeGroup: function(func) {
        return this.textView.groupChanges(function() {
            func(this);
        }.bind(this));
    },

    /**
     * Adds the supplied tags to the completion manager.
     */
    addTags: function(newTags) {
        this.completionController.tags.add(newTags);
    }
};

Object.defineProperties(exports.EditorView.prototype, {
    themeData: {
        get: function() {
            return this._themeData;
        },

        set: function() {
            throw new Error('themeData can\'t be changed directly.' +
                                ' Use themeManager.');
        }
    },

    font: {
        get: function() {
            return this._font;
        },

        set: function() {
            throw new Error('font can\'t be changed directly.' +
                    ' Use settings fontsize and fontface.');
        }
    },

    buffer: {
        /**
         * Sets a new buffer.
         * The buffer's file has to be loaded when passing to this setter.
         */
        set: function(newBuffer) {
            if (newBuffer === this._buffer) {
                return;
            }

            if (!newBuffer.loadPromise.isResolved()) {
                throw new Error('buffer.set(): the new buffer must first be ' +
                    'loaded!');
            }

            // Was there a former buffer? If yes, then remove some events.
            if (this._buffer !== null) {
                this.layoutManager.sizeChanged.remove(this);
                this.layoutManager.textStorage.changed.remove(this);
                this.textView.selectionChanged.remove(this);
            }

            this.willChangeBuffer(newBuffer);
            catalog.publish(this, 'editorChange', 'buffer', newBuffer);

            this.layoutManager = newBuffer.layoutManager;
            this._buffer = newBuffer;

            var lm = this.layoutManager;
            var tv = this.textView;

            // Watch out for changes to the layoutManager's internal size.
            lm.sizeChanged.add(this,
                this._layoutManagerSizeChanged.bind(this));

            // Map internal events so that developers can listen much easier.
            lm.textStorage.changed.add(this, this.textChanged.bind(this));
            tv.selectionChanged.add(this, this.selectionChanged.bind(this));

            this.textView.setSelection(newBuffer._selectedRange, false);
            this.scrollOffsetChanged(newBuffer._scrollOffset);

            // The layoutManager changed and its size as well. Call the
            // layoutManager.sizeChanged event manually.
            this.layoutManager.sizeChanged(this.layoutManager.size);

            this._recomputeLayout();
        },

        get: function() {
            return this._buffer;
        }
    },

    frame: {
        get: function() {
            return {
                width: this.container.offsetWidth,
                height: this.container.offsetHeight
            };
        }
    },

    textViewPaddingFrame: {
        get: function() {
            var frame = util.clone(this.textView.frame);
            var padding = this.textView.padding;

            frame.width -= padding.left + padding.right;
            frame.height -= padding.top + padding.bottom;
            return frame;
        }
    },

    scrollOffset: {
        set: function(pos) {
            if (pos.x === undefined) pos.x = this.scrollOffset.x;
            if (pos.y === undefined) pos.y = this.scrollOffset.y;

            var frame = this.textViewPaddingFrame;

            if (pos.y < 0) {
                pos.y = 0;
            } else if (this._textViewSize.height < frame.height) {
                pos.y = 0;
            } else if (pos.y + frame.height > this._textViewSize.height) {
                pos.y = this._textViewSize.height - frame.height;
            }

            if (pos.x < 0) {
                pos.x = 0;
            } else if (this._textViewSize.width < frame.width) {
                pos.x = 0;
            } else if (pos.x + frame.width > this._textViewSize.width) {
                pos.x = this._textViewSize.width - frame.width;
            }

            if (pos.x === this.scrollOffset.x && pos.y === this.scrollOffset.y) {
                return;
            }

            this.buffer._scrollOffset = pos;

            this.scrollOffsetChanged(pos);
            catalog.publish(this, 'editorChange', 'scrollOffset', pos);
        },

        get: function() {
            return this.buffer._scrollOffset;
        }
    },

    // -------------------------------------------------------------------------
    // Helper API:

    readOnly: {
        get: function() {
            return this._buffer.model.readOnly;
        },

        set: function(newValue) {
            this._buffer.model.readOnly = newValue;
        }
    },

    focus: {
        get: function() {
            return this.textView.hasFocus;
        },

        set: function(setFocus) {
            if (!util.isBoolean(setFocus)) {
                throw new Error('set focus: expected boolean but found "' +
                                    setFocus + '"');
            }
            this.textView.hasFocus = setFocus;
        }
    },

    selection: {
        /** Returns the currently-selected range. */
        get: function() {
            return util.clone(this.textView.getSelectedRange(false));
        },

        /** Alters the selection. */
        set: function(newSelection) {
            if (!rangeutils.isRange(newSelection)) {
                throw new Error('set selection: position/selection' +
                                    ' must be supplied');
            }

            this.textView.setSelection(newSelection);
        }
    },

    selectedText: {
        /** Returns the text within the given range. */
        get: function() {
            return this.getText(this.selection);
        },

        /** Replaces the current text selection with the given text. */
        set: function(newText) {
            if (!util.isString(newText)) {
                throw new Error('set selectedText: expected string but' +
                    ' found "' + newText + '"');
            }

            return this.replace(this.selection, newText);
        }
    },

    value: {
        /** Returns the current text. */
        get: function() {
            return this.layoutManager.textStorage.value;
        },

        set: function(newValue) {
            if (!util.isString(newValue)) {
                throw new Error('set value: expected string but found "' +
                                        newValue + '"');
            }

            // Use the replace function and not this.model.value = newValue
            // directly as this wouldn't create a new undoable action.
            return this.replace(this.layoutManager.textStorage.range,
                                        newValue, false);
        }
    },

    syntax: {
        /**
         * Returns the initial syntax highlighting context (i.e. the language).
         */
        get: function(newSyntax) {
            return this.layoutManager.syntaxManager.getSyntax();
        },

        /**
         * Sets the initial syntax highlighting context (i.e. the language).
         */
        set: function(newSyntax) {
            if (!util.isString(newSyntax)) {
                throw new Error('set syntax: expected string but found "' +
                                        newValue + '"');
            }

            return this.layoutManager.syntaxManager.setSyntax(newSyntax);
        }
    }
});
