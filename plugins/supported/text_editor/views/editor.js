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

var util = require('bespin:util/util');

var catalog = require('bespin:plugins').catalog;
var Event = require('events').Event;
var settings = require('settings').settings;
var m_scratchcanvas = require('bespin:util/scratchcanvas');

var TextView = require('views/text').TextView;
var GutterView = require('views/gutter').GutterView;
var LayoutManager = require('controllers/layoutmanager').LayoutManager;
var EditorSearchController = require('controllers/search').EditorSearchController;

var Buffer = require('models/buffer').Buffer;

var Scroller = require('views/scroller');
var ScrollerView = Scroller.ScrollerCanvasView;

var EditorUndoController = require('controllers/undo').EditorUndoController;

var themestyles = require('theme_manager:themestyles');

/**
 * Cache with all the theme data for the entire editor (gutter, editor, highlighter).
 */
var editorThemeData = {};

var computeThemeData = function() {
    var plugin = catalog.plugins['text_editor'];
    var provides = plugin.provides;
    var i = provides.length;

    if (themestyles.currentThemeVariables &&
            themestyles.currentThemeVariables['text_editor']) {
        themeData = themestyles.currentThemeVariables['text_editor'];
    } else {
        themeData = {};
    }

    while (i--) {
        if (provides[i].ep === 'themevariable') {
            var value = util.mixin(util.clone(provides[i].defaultValue),
                                        themeData[provides[i].name]);

            switch (provides[i].name) {
                case 'gutter':
                case 'editor':
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
 * gutter view, as well as maintaining a layout manager. This really needs
 * to change so that it's not taking the container as a parameter.
 */
exports.EditorView = function() {
    // TODO: This is for debug purpose only and should go away again.
    bespin.editor = this;

    this.elementAppended = new Event();

    this.element = this.container = document.createElement("div");

    var container = this.container;
    container.style.overflow = 'hidden';
    container.style.position = 'relative';

    this.scrollChanged = new Event();
    this.willChangeBuffer = new Event();

    // Create an empty buffer to make sure there is a buffer for this editor.
    this.buffer = new Buffer(null);

    var gutterView = this.gutterView = new GutterView(container, this);
    var textView = this.textView = new TextView(container, this);
    var verticalScroller = this.verticalScroller = new ScrollerView(this, Scroller.LAYOUT_VERTICAL);
    var horizontalScroller = this.horizontalScroller = new ScrollerView(this, Scroller.LAYOUT_HORIZONTAL);

    this.editorUndoController = new EditorUndoController(this);
    this.searchController = new EditorSearchController(this);

    this._textViewSize = {
        width: 0,
        height: 0
    };

    this.themeData = editorThemeData;

    // Create all the necessary stuff once the container has been added.
    this.elementAppended.add(function() {
        // Set the font property.
        this.font = settings.get('fontsize') + 'px ' + settings.get('fontface');

        // Watch out for the themeChange event to then repaint stuff.
        catalog.registerExtension('themeChange', {
            pointer: this._themeVariableChange.bind(this)
        });

        // Watch out for the set fontSize/face event to repaint stuff and set
        // the font property on the editor.
        catalog.registerExtension('settingChange', {
            match: "font[size|face]",
            pointer: this._fontSettingChanged.bind(this)
        });

        // When adding an container that is managed by FlexBox, the size is not
        // available at once. After a small delay it is.
        setTimeout(function() {
            // Allow the layout to be recomputed.
            this._dontRecomputeLayout = false;
            this._recomputeLayout();
        }.bind(this), 0);

        // Other event to listen to.
        window.addEventListener('resize', this.dimensionChanged.bind(this), false);
        container.addEventListener(util.isMozilla ? 'DOMMouseScroll' : 'mousewheel', this.onMouseWheel.bind(this), false);

        var wheelEvent = util.isMozilla ? 'DOMMouseScroll' : 'mousewheel';
        container.addEventListener(wheelEvent, this.onMouseWheel.bind(this), false);
        verticalScroller.valueChanged.add(function(value) {
            this.scrollOffset = { y: value };
        }.bind(this));

        horizontalScroller.valueChanged.add(function(value) {
            this.scrollOffset = { x: value };
        }.bind(this));
    }.bind(this));
};


exports.EditorView.prototype = {
    elementAppended: null,

    horizontalScrollOffset: null,
    verticalScrollOffset: null,

    scrollChanged: null,
    willChangeBuffer: null,

    _textViewSize: null,

    _textLinesCount: 0,
    _gutterViewWidth: 0,

    _buffer: null,

    _dontRecomputeLayout: true,

    themeData: null,

    // for debug purpose only
    newBuffer: function() {
        var oldBuffer = this.buffer;
        this.buffer = new Buffer();
        return oldBuffer;
    },

    layoutManagerSizeChanged: function(size) {
        if (this._textLinesCount !== size.height) {
            var gutterWidth = this.gutterView.computeWidth();
            if (gutterWidth !== this._gutterViewWidth) {
                this._recomputeLayout();
            } else {
                this.gutterView.invalidate();
            }
            this._textLinesLength = size.height;
        }

        this._textViewSize = {
            width: size.width * this.layoutManager.fontDimension.characterWidth,
            height: size.height * this.layoutManager.fontDimension.lineHeight
        };

        this._updateScrollers();
    },

    _updateScrollers: function() {
        // Don't change anything on the scrollers until the layout is setup.
        if (this._dontRecomputeLayout) {
            return;
        }

        var frame = this.textViewPaddingFrame;
        var width = this._textViewSize.width;
        var height = this._textViewSize.height;
        var verticalScroller = this.verticalScroller;
        var horizontalScroller = this.horizontalScroller;

        if (height < frame.height) {
            verticalScroller.isVisible = false;
        } else {
            verticalScroller.isVisible = true;
            verticalScroller.proportion = frame.height / height;
            verticalScroller.maximum = height - frame.height;
        }

        if (width < frame.width) {
            horizontalScroller.isVisible = false;
        } else {
            horizontalScroller.isVisible = true;
            horizontalScroller.proportion = frame.width / width;
            horizontalScroller.maximum = width - frame.width;
        }
    },

    onMouseWheel: function(evt) {
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

    _recomputeLayout: function() {
        // This is necessary as _recomputeLayout is called sometimes when the
        // size of the container is not yet ready (because of FlexBox).
        if (this._dontRecomputeLayout) {
            return;
        }

        var width = this.container.offsetWidth;
        var height = this.container.offsetHeight;

        var gutterWidth = this._gutterViewWidth = this.gutterView.computeWidth();
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

        // TODO: Get this values from the scroller theme.
        var scrollerPadding = 5;
        var scrollerSize = 17;

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

        this._updateScrollers();

        this.gutterView.invalidate();
        this.textView.invalidate();
        this.verticalScroller.invalidate();
        this.horizontalScroller.invalidate();
    },

    dimensionChanged: function() {
        this._recomputeLayout();
    },

    /**
     * @property{string}
     *
     * The font to use for the text view and the gutter view. Typically, this
     * value is set via the font settings.
     */
    font: null,

    _fontSettingChanged: function() {
        this.font = settings.get('fontsize') + 'px ' + settings.get('fontface');

        // Recompute the layouts.
        this.layoutManager._recalculateMaximumWidth();
        this._recomputeLayout();
        this.textView.invalidate();
    },

    _themeVariableChange: function() {
        // Recompute the entire layout as the gutter now might has a different
        // size. Just calling invalidate() on the gutter wouldn't be enough.
        this._recomputeLayout();
        this.textView.invalidate();
    }
};

Object.defineProperties(exports.EditorView.prototype, {
    buffer: {
        set: function(newBuffer) {
            if (newBuffer === this._buffer) {
                return;
            }

            // In some cases the buffer is set before the UI is initialized.
            if (this.textView) {
                this.layoutManager.sizeChanged.remove(this);
            }

            this.willChangeBuffer(newBuffer);
            this.layoutManager = newBuffer.layoutManager;
            this._buffer = newBuffer;

            this.layoutManager.sizeChanged.add(this,
                                        this.layoutManagerSizeChanged.bind(this));

            if (this.textView) {
                this.textView.setSelection(newBuffer._selectedRange);
            }

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
            }
        }
    },

    textViewPaddingFrame: {
        get: function() {
            var frame = util.clone(this.textView.frame);
            var padding = this.textView.padding;
            var charWidth = this.layoutManager.fontDimension.characterWidth;

            frame.width -= padding.left + padding.right + charWidth;
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

            this.verticalScroller.value = pos.y;
            this.horizontalScroller.value = pos.x;

            this.textView.clippingFrame = {
                x: pos.x,
                y: pos.y
            };

            this.gutterView.clippingFrame = {
                y: pos.y
            };

            this.gutterView.invalidate();
            this.textView.invalidate();
        },

        get: function() {
            return this.buffer._scrollOffset;
        }
    },
});
