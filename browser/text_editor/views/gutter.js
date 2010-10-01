require.def(['require', 'exports', 'module',
    'skywriter/util/util',
    'skywriter/plugins',
    'text_editor/views/utils/rect',
    'text_editor/views/views/canvas'
], function(require, exports, module,
    util,
    plugins,
    rect,
    canvas
) {

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
 * The Original Code is Skywriter.
 *
 * The Initial Developer of the Original Code is
 * Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Skywriter Team (skywriter@mozilla.com)
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


var catalog = plugins.catalog;


var CanvasView = canvas.CanvasView;

/*
 * A view that renders the gutter for the editor.
 *
 * The domNode attribute contains the domNode for this view that should be
 * added to the document appropriately.
 */
exports.GutterView = function(container, editor) {
    CanvasView.call(this, container, true /* preventDownsize */ );

    this.editor = editor;
    this.domNode.addEventListener('click', this._click.bind(this), false);
};

exports.GutterView.prototype = new CanvasView();

util.mixin(exports.GutterView.prototype, {
    _decorationSpacing: 2,

    drawRect: function(rect, context) {
        var theme = this.editor.themeData.gutter;

        context.fillStyle = theme.backgroundColor;
        context.fillRect(rect.x, rect.y, rect.width, rect.height);

        context.save();

        var paddingLeft = theme.paddingLeft;

        context.translate(paddingLeft - 0.5, -0.5);

        var layoutManager = this.editor.layoutManager;
        var range = layoutManager.characterRangeForBoundingRect(rect);
        var endRow = Math.min(range.end.row,
            layoutManager.textLines.length - 1);
        var lineAscent = layoutManager.fontDimension.lineAscent;

        var decorations = this._loadedDecorations(true);
        var decorationWidths = [];
        for (var i = 0; i < decorations.length; i++) {
            decorationWidths.push(decorations[i].computeWidth(this));
        }

        for (var row = range.start.row; row <= endRow; row++) {
            context.save();

            var rowY = layoutManager.lineRectForRow(row).y;
            context.translate(0, rowY);

            for (var i = 0; i < decorations.length; i++) {
                decorations[i].drawDecoration(this, context, lineAscent, row);
                context.translate(decorationWidths[i] + this._decorationSpacing, 0);
            }
            context.restore();
        }

        context.restore();
    },

    computeWidth: function() {
        var theme = this.editor.themeData.gutter;
        var width = theme.paddingLeft + theme.paddingRight;

        var decorations = this._loadedDecorations(true);
        for (var i = 0; i < decorations.length; i++) {
            width += decorations[i].computeWidth(this);
        }

        width += (decorations.length - 1) * this._decorationSpacing;
        return width;
    },

    _click: function(evt) {
        var point = {x: evt.layerX, y: evt.layerY};
        if (rect.pointInRect(point, this.frame)) {
            var deco = this._decorationAtPoint(point);
            if (deco && ('selected' in deco)) {
                var computedPoint = this.computeWithClippingFrame(point.x, point.y);
                var pos = this.editor.layoutManager.characterAtPoint(computedPoint);
                deco.selected(this, pos.row);
            }
        }
    },

    _loadedDecorations: function(invalidateOnLoaded) {
        var decorations = [];
        var extensions = catalog.getExtensions('gutterDecoration');
        for (var i = 0; i < extensions.length; i++) {
            var promise = extensions[i].load();
            if (promise.isResolved()) {
                promise.then(decorations.push.bind(decorations));
            } else if (invalidateOnLoaded) {
                promise.then(this.invalidate.bind(this));
            }
        }
        return decorations;
    },

    _decorationAtPoint: function(point) {
        var theme = this.editor.themeData.gutter;
        var width = theme.paddingLeft + theme.paddingRight;
        if (point.x > theme.paddingLeft) {
            var decorations = this._loadedDecorations(false);
            var pos = theme.paddingLeft;
            for (var i = 0; i < decorations.length; i++) {
                var deco = decorations[i];
                var w = deco.computeWidth(this);
                if (point.x < pos + w) {
                    return deco;
                }
                pos += w + this._decorationSpacing;
            }
        }
        return null;
    }
});

exports.lineNumbers = {
    drawDecoration: function(gutter, context, lineAscent, row) {
        var editor = gutter.editor;
        var theme = editor.themeData.gutter;
        var layoutManager = editor.layoutManager;

        context.fillStyle = theme.color;
        context.font = editor.font;
        context.fillText('' + (row + 1), 0, lineAscent);
    },

    computeWidth: function(gutter) {
        var layoutManager = gutter.editor.layoutManager;
        var lineCountStr = '' + layoutManager.textLines.length;
        var characterWidth = layoutManager.fontDimension.characterWidth;
        return characterWidth * lineCountStr.length;
    }
};

});
