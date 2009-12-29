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
var BespinScrollerView = require('views/scroller').BespinScrollerView;

exports.ScrollView = SC.ScrollView.extend({
    _containerViewLaidOut: false,

    autohidesHorizontalScroller: false,
    autohidesVerticalScroller: false,
    borderStyle: SC.BORDER_NONE,
    hasHorizontalScroller: true,
    hasVerticalScroller: true,
    horizontalScrollerThickness: 24,
    horizontalScrollerView: BespinScrollerView,
    verticalScrollerThickness: 24,
    verticalScrollerView: BespinScrollerView,

    tile: function() {
        if (!this._containerViewLaidOut) {
            var containerView = this.get('containerView');
            containerView.adjust({ left: 0, bottom: 0, top: 0, right: 0 });
            containerView.updateLayout();
            this._containerViewLaidOut = true;
        }

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
                left:   0,
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
    }
});

