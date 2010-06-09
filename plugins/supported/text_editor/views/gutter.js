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

var util = require('bespin:util/util');

var CanvasView = require('views/canvas').CanvasView;

/*
 * A view that renders the gutter for the editor.
 *
 * The domNode attribute contains the domNode for this view that should be
 * added to the document appropriately.
 */
exports.GutterView = function(container, editor) {
    CanvasView.call(this, container, true /* preventDownsize */ );

    this.editor = editor;
};

exports.GutterView.prototype = new CanvasView();

util.mixin(exports.GutterView.prototype, {
    drawRect: function(rect, context) {
        var theme = this.editor.themeData.gutter;

        context.fillStyle = theme.backgroundColor;
        context.fillRect(rect.x, rect.y, rect.width, rect.height);

        context.save();

        var paddingLeft = theme.paddingLeft;
        context.translate(paddingLeft, 0);

        var layoutManager = this.editor.layoutManager;
        var range = layoutManager.characterRangeForBoundingRect(rect);
        var endRow = Math.min(range.end.row,
            layoutManager.textLines.length - 1);
        var lineAscent = layoutManager.fontDimension.lineAscent;

        context.fillStyle = theme.color;
        context.font = this.editor.font;

        for (var row = range.start.row; row <= endRow; row++) {
            // TODO: breakpoints
            context.fillText('' + (row + 1), -0.5,
                layoutManager.lineRectForRow(row).y + lineAscent - 0.5);
        }

        context.restore();
    },

    computeWidth: function() {
        var theme = this.editor.themeData.gutter;
        var paddingWidth = theme.paddingLeft + theme.paddingRight;

        var lineNumberFont = this.editor.font;

        var layoutManager = this.editor.layoutManager;
        var lineCount = layoutManager.textLines.length;
        var lineCountStr = '' + lineCount;

        var characterWidth = layoutManager.fontDimension.characterWidth;
        var strWidth = characterWidth * lineCountStr.length;

        return strWidth + paddingWidth;
    }
});
