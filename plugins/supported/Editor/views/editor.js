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
var GutterView = require('views/gutter').GutterView;
var LayoutManager = require('controllers/layoutmanager').LayoutManager;
var ScrollView = require('views/scroll').ScrollView;
var TextView = require('views/text').TextView;
var EditorUndoController = require('controllers/undo').EditorUndoController;

/**
 * @class
 *
 * A view responsible for laying out a scrollable text view and its associated
 * gutter view, as well as maintaining a layout manager.
 */
exports.EditorView = SC.View.extend(SC.Border, {
    borderStyle: SC.BORDER_GRAY,

    /**
     * @property
     *
     * The gutter view class to use. This field will be instantiated when the
     * child views are created.
     */
    gutterView: GutterView,

    /**
     * @property
     *
     * The layout manager class to use. This field will be instantiated when
     * this object is.
     */
    layoutManager: LayoutManager,

    /**
     * @property
     *
     * The scroll view class to use. This field will be instantiated when the
     * child views are created.
     */
    scrollView: ScrollView,

    /**
     * @property
     *
     * The text view class to use. This field will be instantiated when the
     * child views are created.
     */
    textView: TextView,

    /**
     * @property{EditorUndoController}
     *
     * The undo controller class to use. This field will be instantiated when
     * the child views are created.
     */
    undoController: EditorUndoController,

    _gutterViewFrameChanged: function() {
        this.get('scrollView').adjust({
            left: this.getPath('gutterView.frame').width
        });
    },

    _scrollViewVerticalScrollOffsetChanged: function() {
        this.get('gutterView').adjust({
            top: -this.getPath('scrollView.verticalScrollOffset')
        });
    },

    createChildViews: function() {
        var layoutManager = this.get('layoutManager');

        var gutterView = this.createChildView(this.get('gutterView'), {
            layout:         { left: 0, top: 0 },
            layoutManager:  layoutManager
        });
        this.set('gutterView', gutterView);
        gutterView.addObserver('frame', this, this._gutterViewFrameChanged);

        var scrollViewClass = this.get('scrollView');
        var textViewClass = this.get('textView');
        var scrollView = this.createChildView(scrollViewClass, {
            contentView: textViewClass.extend({
                layoutManager: layoutManager,
                undoController: this.get('undoController')
            }),
            layout: {
                left:   gutterView.get('frame').width,
                bottom: 0,
                top:    0,
                right:  0
            }
        });
        this.set('scrollView', scrollView);
        scrollView.addObserver('verticalScrollOffset', this,
            this._scrollViewVerticalScrollOffsetChanged);

        var textView = scrollView.get('contentView');
        this.set('textView', textView);

        this.set('undoController', this.get('undoController').create({
            textView: textView
        }));

        this.set('childViews', [ gutterView, scrollView ]);
    },

    init: function() {
        this.set('layoutManager', this.get('layoutManager').create());
        return arguments.callee.base.apply(this, arguments);
    }
});

