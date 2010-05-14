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
var ViewClass = require('views/view').View;

exports.ScrollView = {};

exports.ScrollView.prototype = new ViewClass();

/**
 * Constructor for the ScrollView.
 * This takes the node for the ScrollView and the contentView inside of the
 * ScrollView. You shouldn't use this constructor directly...
 */
exports.ScrollView.prototype.constructor = function(node, contentView) {
    // Call the ViewClass constructor to init it.
    ViewClass.call(node);

    contentView.scrollView = this;
    this.contentView = contentView;

    // Observe the events.
    this.contentView.dimensionEvent.add(this.viewDimensionChanged);

    // TODO: observer ths MouseWheel event.

};

util.mixin(exports.ScrollView.prototype, {
    /**
     * The contentView that is inside of the ScrollView.
     */
    contentView: null,

    /**
     *
     */
    clippingFrameEvent: null,

    /**
     *
     */
    horizontalScrollEvent: null,
    verticalScrollEvent: null,

    _verticalScrollValue: 0,
    _horizontalScrollValue: 0,

    _horizontalScrollbar: null,
    _verticalScrollbar: null,

    scrollContentView: true,

    /**
     * Called whenever the dimension of the contentView changed.
     * Notify the scrollers to update there UI.
     */
    viewDimensionChanged: function() {
        if (this._horizontalScrollbar) {
            this._horizontalScrollbar.render();
        }
        if (this._verticalScrollbar) {
            this._verticalScrollbar.render();
        }
    },

    /**
     * Call this funciton if the dimension of the ScrollView changed.
     */
    dimensionChanged: function() {
        ViewClass.prototype.dimensionChanged();
        contentView.dimensionChanged();

        this.clippingFrameEvent();
    }
});

Object.defineProperties(exports.ScrollView.prototype, {
    clippingFrame: {
        get: function() {
            var dim = this.dimension;

            return {
                x: this.verticalScrollValue,
                y: this.horizontalScrollValue,
                width: dim.width,
                height: dim.height
            };
        }
    },

    horizontalScrollValue: {
        get: function() {
            return this._horizontalScrollValue;
        },

        set: function(value) {
            var oldValue = this._horizontalScrollValue;
            var newValue;

            var cvDimension = this.contentView.dimension;
            newValue = Math.max(value, cvDimension.width - this.dimension.width);
            newValue = Math.min(newValue, 0);

            if (oldValue !== newValue) {
                if (scrollContentView) {
                    this.contentView.scrollLeft = newValue;
                }
                this._horizontalScrollValue = newValue;

                this.horizontalScrollEvent(newValue);
                this.clippingFrameEvent();
            }
        }
    },

    verticalScrollValue: {
        get: function() {
            return this._verticalScrollValue;
        },

        set: function(value) {
            var oldValue = this._verticalScrollValue;
            var newValue;

            var cvDimension = this.contentView.dimension;
            newValue = Math.max(value, cvDimension.height - this.dimension.height);
            newValue = Math.min(newValue, 0);

            if (oldValue !== newValue) {
                if (scrollContentView) {
                     this.contentView.scrollTop = newValue;
                }
                this._verticalScrollValue = newValue;

                this.verticalScrollEvent();
                this.clippingFrameEvent();
            }
        }
    },
    
    horizontalScrollbar: {
        set: function (scrollbar) {
            this._horizontalScrollbar = scrollbar;
        }
    },

    verticalScrollbar: {
        set:function(scrollbar) {
            this._verticalScrollbar = scrollbar;
        }
    }
});

/**
 * Constructor for ScrollViews.
 * Note that this function takes as only argument the contentView, that should
 * live inside of the ScrollView. The necessary extra DOM around teh contentView
 * is created automaticly.
 */
exports.putInScrollView = function(contentView) {

    // Some DOM magic:
    // Surround the view.node with a <div>. Take over the className form the
    // view.node, make it position absolute and lay out to the edges.
    var scrollDiv = document.createElement('div');
    var contentViewNode = contentView.node;

    scrollDiv.className = contentViewNode.className;

    contentViewNode.style.position = 'absolute';
    contentViewNode.style.left = '0px';
    contentViewNode.style.right = '0px';
    contentViewNode.style.top = '0px';
    contentViewNode.style.bottom = '0px';

    contentViewNode.style['overflow-x'] = 'hidden';
    contentViewNode.style['overflow-y'] = 'hidden';

    contentViewNode.parentNode.replaceChild(scrollDiv, contentViewNode);
    scrollDiv.appendChild(contentViewNode);

    return new exports.ScrollView(scrollDiv, contentView);
};