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

var scroller = require("editor/views/scroller");

exports.BespinScrollView = SC.ScrollView.extend({
    hasHorizontalScroller: true,
    autohidesHorizontalScroller: false,
    horizontalScrollerView: scroller.BespinScrollerView,
    hasVerticalScroller: true,
    autohidesVerticalScroller: false,
    verticalScrollerView: scroller.BespinScrollerView,

    tile: function() {
        var hScroller = this.get('horizontalScrollerView');
        var vScroller = this.get('verticalScrollerView');
        var hScrollerVisible = this.get('isHorizontalScrollerVisible');
        var vScrollerVisible = this.get('isVerticalScrollerVisible');
        var hScrollerThickness = hScroller.get('scrollerThickness');
        var vScrollerThickness = vScroller.get('scrollerThickness');

        if (hScrollerVisible) {
            var hScroller = this.get('horizontalScrollerView');
            hScroller.set('layout', { 
                left: 0,
                bottom: 0,
                right: vScrollerVisible ? vScrollerThickness : 0,
                height: hScrollerThickness
            });
        }
        if (vScrollerVisible) {
            var vScroller = this.get('verticalScrollerView');
            vScroller.set('layout', {
                top: 0,
                right: 0,
                bottom: hScrollerVisible ? hScrollerThickness : 0,
                width: vScrollerThickness
            });
        }

        this.get('containerView').set('layout',
            { left: 0, bottom: 0, top: 0, right: 0 });
    }
});

