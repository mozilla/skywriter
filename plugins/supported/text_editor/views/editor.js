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

var Scroller = require('views/scroller');
var ScrollerView = Scroller.ScrollerCanvasView;

// var EditorUndoController = require('controllers/undo').EditorUndoController;


/**
 * @class
 *
 * A view responsible for laying out a scrollable text view and its associated
 * gutter view, as well as maintaining a layout manager. This really needs
 * to change so that it's not taking the container as a parameter.
 */
exports.EditorView = function() {

    bespin.editor = this;

    this.elementAppended = new Event();


    // On construction, only the basic div for the editor is created. The
    // other stuff goes in here after the element has been appended to a parent.
    this.element = this.container = document.createElement("div");

    var container = this.container;
    container.style.overflow = 'hidden';
    container.style.position = 'relative';

    var layoutManager = this.layoutManager = new LayoutManager();

    this.scrollChanged = new Event();

    var searchController = this.searchController = new EditorSearchController()

    var gutterView = this.gutterView = new GutterView(container, this);
    var textView = this.textView = new TextView(container, this);
    var verticalScroller = this.verticalScroller = new ScrollerView(this, Scroller.LAYOUT_VERTICAL);
    var horizontalScroller = this.horizontalScroller = new ScrollerView(this, Scroller.LAYOUT_HORIZONTAL);

    this._scrollOffset = {
        x: 0, y: 0
    }

    this._textViewSize = {
        width: 0,
        height: 0
    };

    // Create all the necessary stuff once the container has been added.
    this.elementAppended.add(function() {
        this._fontSettingChanged();
        this._themeVariableDidChange();

        setTimeout(function() {
            this.recomputeLayout();
        }.bind(this), 0)

        window.addEventListener('resize', this.dimensionChanged.bind(this), false);
        container.addEventListener(util.isMozilla ? 'DOMMouseScroll' : 'mousewheel', this.onMouseWheel.bind(this), false);

        layoutManager.sizeChanged.add(function(size) {
            console.log('layoutManagerSizeChanged');
            if (this._textLinesCount !== size.height) {
                var gutterWidth = gutterView.computeWidth();
                if (gutterWidth !== this._gutterViewWidth) {
                    this.recomputeLayout();
                } else {
                    gutterView.setNeedsDisplay();
                }
                this._textLinesLength = size.height;
            }

            var frame = this.textViewPaddingFrame;
            var width = size.width * layoutManager.characterWidth;
            var height = size.height * layoutManager.lineHeight;

            this._textViewSize = {
                width: width,
                height: height
            };

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
        }.bind(this));
    }.bind(this));
};


exports.EditorView.prototype = {
    elementAppended: null,

    horizontalScrollOffset: null,
    verticalScrollOffset: null,

    scrollChanged: null,

    _textViewSize: null,

    _textLinesCount: 0,
    _gutterViewWidth: 0,

    _scrollOffset: null,

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

    get textViewPaddingFrame() {
        var frame = util.clone(this.textView.frame);
        var padding = this.textView.padding;
        var charWidth = this.layoutManager.characterWidth;

        frame.width -= padding.left + padding.right + charWidth;
        frame.height -= padding.top + padding.bottom;
        return frame;
    },

    set scrollOffset(pos) {
        if (pos.x === undefined) pos.x = this._scrollOffset.x;
        if (pos.y === undefined) pos.y = this._scrollOffset.y;

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

        if (pos.x === this._scrollOffset.x && pos.y === this._scrollOffset.y) {
            return;
        }

        this._scrollOffset = pos;

        this.verticalScroller.value = pos.y;
        this.horizontalScroller.value = pos.x;

        this.textView.clippingFrame = {
            x: pos.x,
            y: pos.y
        };

        this.gutterView.clippingFrame = {
            y: pos.y
        };

        this.gutterView.setNeedsDisplay();
        this.textView.setNeedsDisplay();
    },

    scrollTo: function(pos) {
        this.scrollOffset = pos;
    },

    scrollBy: function(deltaX, deltaY) {
        this.scrollOffset = {
            x: this._scrollOffset.x + deltaX,
            y: this._scrollOffset.y + deltaY
        };
    },

    get frame() {
        return {
            width: this.container.offsetWidth,
            height: this.container.offsetHeight
        }
    },

    recomputeLayout: function() {
        var width = this.container.offsetWidth;
        var height = this.container.offsetHeight;

        var gutterWidth = this._gutterViewWidth = this.gutterView.computeWidth();
        this.gutterView.setFrame({
            x: 0,
            y: 0,
            width: gutterWidth,
            height: height
        }, true);

        this.textView.setFrame({
            x: gutterWidth,
            y: 0,
            width: width - gutterWidth,
            height: height
        }, true);

        // TODO: Get this values from the scroller theme.
        var scrollerPadding = 5;
        var scrollerSize = 17;

        this.horizontalScroller.setFrame({
            x: gutterWidth + scrollerPadding,
            y: height - (scrollerSize + scrollerPadding),
            width: width - (gutterWidth + 2 * scrollerPadding + scrollerSize),
            height: scrollerSize
        });

        this.verticalScroller.setFrame({
            x: width - (scrollerPadding + scrollerSize),
            y: scrollerPadding,
            width: scrollerSize,
            height: height - (2 * scrollerPadding + scrollerSize)
        });

        this.gutterView.setNeedsDisplay();
        this.textView.setNeedsDisplay();
        this.verticalScroller.setNeedsDisplay();
        this.horizontalScroller.setNeedsDisplay();
    },

    dimensionChanged: function() {
        this.recomputeLayout();
    },

    /**
     * @property{string}
     *
     * The font to use for the text view and the gutter view. Typically, this
     * value is set via the font settings.
     */
    font: '10pt Monaco, Lucida Console, monospace',

    _fontSettingChanged: function() {
        var fontSize = settings.get('fontsize');
        var fontFace = settings.get('fontface');
        var font = fontSize + 'px ' + fontFace;
        this.font = font;

        var canvas = m_scratchcanvas.get();
        var layoutManager = this.layoutManager;

        // Measure a large string to work around the fact that width and height
        // are truncated to the nearest integer in the canvas API.
        var str = '';
        for (var i = 0; i < 100; i++) {
            str += 'M';
        }

        var width = canvas.measureStringWidth(this.font, str) / 100;

        layoutManager.characterWidth = width;

        layoutManager.lineHeight = Math.floor(fontSize * 1.6);
        layoutManager.lineAscent = Math.floor(fontSize * 1.3);

        // Recompute the layouts.
        this.layoutManager._recomputeEntireLayout();
        // TODO: add this back again.
        //this.gutterView._recomputeLayout();
        this.textView.setNeedsDisplay();
    },

    _themeVariableDidChange: function() {
        var theme = {};

        var plugin = catalog.plugins['text_editor'];
        var provides = plugin.provides;
        var i = provides.length;

        while (i--) {
            if (provides[i].ep === 'themevariable') {
                var value = provides[i].value || provides[i].defaultValue;

                switch (provides[i].name) {
                    case 'gutter':
                        this.gutterView._theme = value;
                        break;
                    case 'editor':
                        this.textView._theme = value;
                        break;
                    case 'highlighter':
                        this.layoutManager._theme = value;
                    break;
                }
            }
        }

        var lines = this.layoutManager.textStorage.lines;
        this.layoutManager.updateTextRows(0, lines.length - 1);

        this.textView.setNeedsDisplay();
        // TODO: Add this back.
        //this.gutterView._recomputeLayout();
    },
};

// exports.EditorView = SC.View.extend(SC.Border, {
//     _fontChanged: function() {
//         var fontSize = settings.get('fontsize');
//         var canvas = m_scratchcanvas.get();
//         var layoutManager = this.layoutManager;
//
//         // Measure a large string to work around the fact that width and height
//         // are truncated to the nearest integer in the canvas API.
//         var str = '';
//         for (var i = 0; i < 100; i++) {
//             str += 'M';
//         }
//
//         var width = canvas.measureStringWidth(this.font, str) / 100;
//
//         layoutManager.set('characterWidth', width);
//
//         layoutManager.set('lineHeight', Math.floor(fontSize * 1.6));
//         layoutManager.set('lineAscent', Math.floor(fontSize * 1.3));
//
//         // Recompute the layouts.
//         this.layoutManager._recomputeEntireLayout();
//         this.gutterView._recomputeLayout();
//         this.textView.setNeedsDisplay();
//     }.observes('font'),
//
//     _fontSizeChanged: function() {
//         var fontSize = settings.get('fontsize');
//         var fontFace = settings.get('fontface');
//         var font = fontSize + 'px ' + fontFace;
//         this.set('font', font);
//     },
//
//     borderStyle: SC.BORDER_GRAY,
//
//     /**
//      * @property{string}
//      *
//      * The font to use for the text view and the gutter view. Typically, this
//      * value is set via the font settings.
//      */
//     font: '10pt Monaco, Lucida Console, monospace',
//
//     _themeVariableDidChange: function() {
//         var theme = {};
//
//         var plugin = catalog.plugins['text_editor'];
//         var provides = plugin.provides;
//         var i = provides.length;
//
//         while (i--) {
//             if (provides[i].ep === 'themevariable') {
//                 var value = provides[i].value || provides[i].defaultValue;
//
//                 switch (provides[i].name) {
//                     case 'gutter':
//                         this.setPath('gutterView._theme', value);
//                         break;
//                     case 'editor':
//                         this.setPath('textView._theme', value);
//                         break;
//                     case 'highlighter':
//                         this.setPath('layoutManager._theme', value);
//                     break;
//                 }
//             }
//         }
//
//         SC.run(function() {
//             // Refresh the entire editor.
//             var lines = this.layoutManager.textStorage.lines;
//             this.layoutManager.updateTextRows(0, lines.length - 1);
//
//             this.textView.setNeedsDisplay();
//             this.gutterView._recomputeLayout();
//         }.bind(this))
//     },
//
//     /**
//      * @property
//      *
//      * The gutter view class to use. This field will be instantiated when the
//      * child views are created.
//      */
//     gutterView: GutterView,
//
//     /**
//      * @property
//      *
//      * The layout manager class to use. This field will be instantiated when
//      * this object is.
//      */
//     layoutManager: LayoutManager,
//
//     /**
//      * @property
//      *
//      * The scroll view class to use. This field will be instantiated when the
//      * child views are created.
//      */
//     scrollView: ScrollView,
//
//     /**
//      * @property{EditorSearchController}
//      *
//      * The search controller class to use. This field will be instantiated when
//      * the child views are created.
//      */
//     searchController: EditorSearchController,
//
//     /**
//      * @property
//      *
//      * The text view class to use. This field will be instantiated when the
//      * child views are created.
//      */
//     textView: TextView,
//
//     /**
//      * @property{EditorUndoController}
//      *
//      * The undo controller class to use. This field will be instantiated when
//      * the child views are created.
//      */
//     undoController: EditorUndoController,
//
//     _gutterViewFrameChanged: function() {
//         this.get('scrollView').adjust({
//             left: this.getPath('gutterView.frame').width
//         });
//     },
//
//     _scrollViewVerticalScrollOffsetChanged: function() {
//         // FIXME: property binding?
//         this.setPath('gutterView.verticalScrollOffset',
//             this.getPath('scrollView.verticalScrollOffset'));
//     },
//
//     createChildViews: function() {
//         var layoutManager = this.get('layoutManager');
//
//         var scrollViewClass = this.get('scrollView');
//
//         var gutterView = this.createChildView(this.get('gutterView'), {
//             editor: this,
//             layoutManager: layoutManager
//         });
//         this.set('gutterView', gutterView);
//         gutterView.addObserver('frame', this, this._gutterViewFrameChanged);
//
//         var textViewClass = this.get('textView');
//         var scrollView = this.createChildView(scrollViewClass, {
//             containerView: SC.ContainerView.extend({
//                 hasCustomScrolling: true
//             }),
//
//             contentView: textViewClass.extend({
//                 editor: this,
//                 layoutManager: layoutManager,
//                 searchController: this.get('searchController')
//             }),
//
//             layout: {
//                 left:   gutterView.get('frame').width,
//                 bottom: 0,
//                 top:    0,
//                 right:  0
//             }
//         });
//
//         this.set('scrollView', scrollView);
//         scrollView.addObserver('verticalScrollOffset', this,
//             this._scrollViewVerticalScrollOffsetChanged);
//
//         var textView = scrollView.get('contentView');
//         this.set('textView', textView);
//
//         this.set('undoController', this.get('undoController').create({
//             textView: textView
//         }));
//
//         this.get('searchController').set('textView', textView);
//
//         this.set('childViews', [ gutterView, scrollView ]);
//
//         catalog.registerExtension('settingChange', {
//             match: "font[size|face]",
//             pointer: this._fontSizeChanged.bind(this)
//         });
//
//         catalog.registerExtension('themeChange', {
//             pointer: this._themeVariableDidChange.bind(this)
//         });
//
//         // Compute settings related stuff.
//         this._fontSizeChanged();
//         this._themeVariableDidChange();
//     },
//
//     init: function() {
//         this.set('layoutManager', this.get('layoutManager').create());
//         this.set('searchController', this.get('searchController').create());
//         return arguments.callee.base.apply(this, arguments);
//     }
// });

