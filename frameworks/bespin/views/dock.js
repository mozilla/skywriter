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

var SC = require('sproutcore/runtime').SC;

exports.DOCK_BOTTOM = 'bottom';

/**
 * @class
 *
 * A dock view contains and maintains layout for a center view that fills its
 * boundaries and, optionally, a docked view along the bottom.
 *
 * TODO: Allow views on the left, right, and top.
 * TODO: Allow more than one view on each side.
 */
exports.DockView = SC.View.extend({
    classNames: [ 'bespin-dock-view' ],

    centerView: SC.View,
    dockedViews: [],

    /**
     * Instantiates a view, adds it to the set of docked views, and returns it.
     * You should use this method over adding views to the dockedViews array
     * directly, because this method installs observers on the docked view that
     * are necessary to keep the subviews properly sized.
     *
     * This method does not call appendChild(), so you will probably want to
     * call that after calling this.
     */
    addDockedView: function(view, index) {
        var dockedViews = this.get('dockedViews');

        if (SC.none(index)) {
            index = dockedViews.length;
        }

        var thisDockView = this;
        var dockedView = this.createChildView(view, {
            layoutView: this,
            rootElementPath: [ index ],
            _bespin_dockView_frameDidChange: function() {
                thisDockView._updateChildLayout();
            }.observes('frame')
        });

        dockedViews[index] = dockedView;
        return dockedView;
    },

    createChildViews: function() {
        var centerView = this.createChildView(this.get('centerView'), {
            layoutView: this
        });
        this.set('centerView', centerView);
        var childViews = [ centerView ];

        var dockedViews = this.get('dockedViews');
        for (var i = 0; i < dockedViews.length; i++) {
            childViews.push(this.addDockedView(dockedViews[i], i));
        }

        this.set('childViews', childViews);
        return this;
    },

    _updateChildLayout: function() {
        var layout = { left: 0, bottom: 0, top: 0, right: 0 };
        this.get('dockedViews').forEach(function(item) {
            var frame = item.get('frame');
            var dock = item.get('dock');
            switch (dock) {
            case exports.DOCK_BOTTOM:
                layout.bottom += frame.height;
                break;
            default:
                throw "invalid 'dock' property: " + dock;
                break;  // silence jslint
            }
        });
        this.get('centerView').adjust(layout);
    },

    renderLayout: function(context, firstTime) {
        this._updateChildLayout();
        arguments.callee.base.apply(this, arguments);
    }
});

