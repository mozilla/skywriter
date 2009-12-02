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

var gutter = require('editor/views/gutter');
var scroller = require('editor/views/scroller');

exports.BespinScrollView = SC.ScrollView.extend({
    _gutterViewInstantiated: false,

    gutterView: gutter.GutterView,

    hasHorizontalScroller: true,
    autohidesHorizontalScroller: false,
    horizontalScrollerView: scroller.BespinScrollerView,
    hasVerticalScroller: true,
    autohidesVerticalScroller: false,
    verticalScrollerView: scroller.BespinScrollerView,

    horizontalScrollerThickness: 24,
    verticalScrollerThickness: 24,

    tile: function() {
        var gutterView = this.get('gutterView');
        if (this._gutterViewInstantiated === false) {
            // It would be cleaner, theoretically, to do this in
            // createChildViews(), but there's no way to call sc_super() in
            // that function, because the SproutCore ScrollView's
            // createChildViews() implementation isn't written in an
            // extensible way...
            this._gutterViewInstantiated = true;

            var thisBespinScrollView = this;
            gutterView = this.createChildView(gutterView, {
                rowCountBinding: "*parentView.contentView.rowCount",
                didCreateLayer: function() {
                    // Before the canvas is created, the gutter view has no
                    // choice but to lie about its dimensions, because it has
                    // no canvas with which to measureText(). So, once it's
                    // created, we need to tile, in order to give the
                    // view a chance to report its dimensions accurately.
                    thisBespinScrollView.tile();
                    this.set('layerNeedsUpdate', true);
                }
            });
            this.childViews.push(gutterView);
            this.set('gutterView', gutterView);

            // Retile whenever the gutter frame changes.
            gutterView.addObserver('frame', this, this.tile);

            // Stop for now and wait until the gutter view's layer is created.
            return; 
        }

        var gutterFrame = gutterView.get('frame');
        this.get('containerView').set('layout',
            { left: gutterFrame.width, bottom: 0, top: 0, right: 0 });

        var hScroller = this.get('horizontalScrollerView');
        var vScroller = this.get('verticalScrollerView');
        var hScrollerVisible = this.get('isHorizontalScrollerVisible');
        var vScrollerVisible = this.get('isVerticalScrollerVisible');

        var hScrollerThickness = this.get('horizontalScrollerThickness');
        var vScrollerThickness = this.get('verticalScrollerThickness');
        if (hScrollerVisible) {
            hScroller = this.get('horizontalScrollerView');
            hScroller.set('scrollerThickness', hScrollerThickness);
            hScroller.set('padding', {
                top:    0,
                bottom: 6,
                left:   6,
                right:  6 + vScrollerThickness
            });
            hScroller.set('layout', { 
                left:   gutterFrame.width,
                bottom: 0,
                right:  0,
                height: hScrollerThickness
            });
        }
        if (vScrollerVisible) {
            vScroller = this.get('verticalScrollerView');
            vScroller.set('scrollerThickness', vScrollerThickness);
            vScroller.set('padding', {
                left:   0,
                right:  6,
                top:    6,
                bottom: 6 + hScrollerThickness
            });
            vScroller.set('layout', {
                top:    0,
                right:  0,
                bottom: 0,
                width:  vScrollerThickness
            });
        }

        var contentView = this.get('contentView');
        if (contentView.get('hasPadding') === true) {
            this.get('contentView').set('padding', {
                bottom: hScrollerThickness + 6,
                right:  vScrollerThickness + 6
            });
        }
    },

    _bespin_BespinScrollView_verticalScrollOffsetDidChange: function() {
        this.get('gutterView').adjust({
            left:   0,
            top:    -Math.min(this.get('verticalScrollOffset'),
                        this.get('maximumVerticalScrollOffset'))
        });
    }.observes('verticalScrollOffset')
});

