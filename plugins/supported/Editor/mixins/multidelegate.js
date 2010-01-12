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

/**
 * @namespace
 *
 * This mixin provides support for delegate objects. It's similar to
 * SC.DelegateSupport but is simpler and allows multiple delegates.
 */
exports.MultiDelegateSupport = {
    /**
     * @property{Array}
     *
     * The set of delegates.
     */
    delegates: [],

    /**
     * Adds a delegate to the list of delegates.
     */
    addDelegate: function(delegate) {
        this.set('delegates', this.get('delegates').concat(delegate));
    },

    /**
     * @protected
     *
     * For each delegate that implements the given method, calls it, passing
     * this object as the first parameter along with any other parameters
     * specified.
     */
    notifyDelegates: function(method) {
        var args = [ this ];
        for (var i = 1; i < arguments.length; i++) {
            args.push(arguments[i]);
        }

        this.get('delegates').forEach(function(delegate) {
            if (delegate.respondsTo(method)) {
                delegate[method].apply(delegate, args);
            }
        });
    }
};

