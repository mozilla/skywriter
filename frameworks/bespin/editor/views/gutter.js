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

var SC = require('sproutcore/runtime:package').SC;
var canvas = require('editor/mixins/canvas');

var GUTTER_INSETS = { left: 5, right: 10, bottom: 6 };
var LINE_INSETS = { bottom: 6 };

exports.GutterView = SC.View.extend(canvas.Canvas, {
    classNames: 'sc-gutter-view',
    tagName: 'canvas',

    /**
     * @property{EditorView}
     * The associated editor view.
     */
    editorView: null,

    /**
     * @property{Number}
     * The number of rows displayed in the text view, which is the number of
     * rows displayed in the gutter.
     */
    rowCount: 0,

    /**
     * @property
     * Theme information for the gutter. Currently exposed properties are
     * gutterStyle, lineNumberColor, and lineNumberFont.
     *
     * TODO: Convert to SproutCore's theme system.
     */
    theme: {
        gutterStyle: "#4c4a41",
        lineNumberColor: "#e5c138",
        lineNumberFont: "10pt Monaco, Lucida Console, monospace",
        editorTextFont: "10pt Monaco, Lucida Console, monospace",
        lineHeight: 22
    },

    /**
     * @property
     *
     * Layout for GutterViews is read-only and determined by the text height
     * and width.
     */ 
    layout: function(key, value) {
        var origin = this._origin;
        if (!SC.none(value)) {
            origin.left = value.left;
            origin.top  = value.top;
        }

        var canvas = this.$()[0];
        if (SC.none(canvas)) {
            // Lie until we know for sure...
            return {
                left:   origin.left,
                top:    origin.top,
                width:  0,
                height: 0
            };
        }

        var rowCount = this.get('rowCount');
        return {
            left:   origin.left,
            top:    origin.top,
            width:  GUTTER_INSETS.left
                    + rowCount.toString().length * this.get('_charWidth')
                    + GUTTER_INSETS.right,
            height: rowCount * this.get('_lineHeight')
        };
    }.property('_charWidth', '_lineHeight', 'rowCount').cacheable(),

    _origin: { left: 0, top: 0 },

    layerFrame: function() {
        return {
            x:      0,
            y:      0,
            width:  this.get('layout').width,
            height: this.get('parentView').get('frame').height
        };
    }.property('layout', 'parentView'),

    // The width of one character.
    _charWidth: function() {
        return this.getCharacterWidth(this.get('theme').editorTextFont);
    }.property('theme').cacheable(),

    // The height of one character.
    _lineHeight: function() {
        var theme = this.get('theme');
        var userLineHeight = theme.lineHeight;
        return !SC.none(userLineHeight) ? userLineHeight
            : this.guessLineHeight(theme.editorTextFont);
    }.property('theme').cacheable(),

    drawRect: function(ctx, visibleFrame) {
        var theme = this.get('theme');
        ctx.fillStyle = theme.gutterStyle;
        ctx.fillRect(0, visibleFrame.y, visibleFrame.width,
            visibleFrame.height);

        var lineHeight = this.get('_lineHeight');
        var firstVisibleRow = Math.floor(visibleFrame.y / lineHeight);
        var lastLineToRender
            = Math.min(this.get('rowCount') - 1,
                Math.ceil((visibleFrame.y + visibleFrame.height)
                / lineHeight));

        for (var currentLine = firstVisibleRow;
            currentLine <= lastLineToRender; currentLine++) {
            // TODO: breakpoints

            ctx.fillStyle = theme.lineNumberColor;
            ctx.font = theme.lineNumberFont;
            ctx.fillText("" + (currentLine + 1), GUTTER_INSETS.left,
                (currentLine + 1) * lineHeight - LINE_INSETS.bottom);
        }
    },

    _bespin_gutterView_parentViewFrameDidChange: function() {
        this.propertyWillChange('layerFrame');
        this.propertyDidChange('layerFrame', this.get('layerFrame'));
    }.observes('*parentView.frame'),

    _bespin_gutterView_rowCountDidChange: function() {
        this.updateLayout();

        // Actually only needs to be done if scrolled to the bottom and more
        // rows are going to be added, but eh...
        this.set('layerNeedsUpdate', true);
    }.observes('rowCount'),

    _bespin_gutterView_frameDidChange: function() {
        this.set('layerNeedsUpdate', true);
    }.observes('frame')
});

