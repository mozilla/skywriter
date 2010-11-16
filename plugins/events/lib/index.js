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
 * The Original Code is Mozilla Skywriter.
 *
 * The Initial Developer of the Original Code is
 * Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Patrick Walton (pwalton@mozilla.com)
 *   Kevin Dangoor (kdangoor@mozilla.com)
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

define(function(require, exports, module) {
    
exports.init = function() {
};

exports.deinit = function() {
};

exports.Event = function(opts) {
    opts = opts || {};
    var keyElement = opts.keyElement;
    
    var handlers = [];
    var evt = function() {
        var args = arguments;
        if (keyElement) {
            keyValue = args[keyElement];
        }
        handlers.forEach(function(handler) { 
            if (keyElement && handler.match) {
                if (handler.match != keyValue) {
                    return;
                }
            }
            handler.func.apply(null, args);
        });
    };

    /**
     * Adds a new handler via
     *  a) evt.add(handlerFunc)
     *  b) evt.add(handlerObj)
     * 
     * handlerObj should have a "func" property on it, which is the function that is called
     * it can have a "ref" property which is the object that the handler is conceptually
     * related to
     * it can also have a "match" property. This is a string that is tested
     * against the key value of the event, if there is one.
     */
    evt.add = function(handler) {
        if (typeof(handler) == "function") {
            handler = {
                ref: handler,
                func: handler
            };
        }
        handlers.push(handler);
    };

    evt.remove = function(ref) {
        var notEqual = function(other) { return ref !== other.ref; };
        handlers = handlers.filter(notEqual);
    };

    evt.removeAll = function() {
        handlers = [];
    };

    return evt;
};


});
