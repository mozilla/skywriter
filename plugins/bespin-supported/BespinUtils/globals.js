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

var SC = require("sproutcore/runtime").SC;

exports.install = function() {
    /**
     * Array detector.
     * Firefox 3.5 and Safari 4 have this already. Chrome 4 however ...
     * Note to Dojo - your isArray is still broken: instanceof doesn't work with
     * Arrays taken from a different frame/window.
     */
    if (!Array.isArray) {
        Array.isArray = function(data) {
            return (data && Object.prototype.toString.call(data) == "[object Array]");
        };
    }

    if (!Function.prototype.bind) {
        // From Narwhal
        Function.prototype.bind = function () {
            var args = Array.prototype.slice.call(arguments);
            var self = this;
            var bound = function () {
                return self.call.apply(
                    self,
                    args.concat(
                        Array.prototype.slice.call(arguments)
                    )
                );
            };
            bound.name = this.name;
            bound.displayName = this.displayName;
            bound.length = this.length;
            bound.unbound = self;
            return bound;
        };
    }


    /**
     * Hack to allow us to call this.sc_super() in place of the global sc_super();
     */
    SC.Object.prototype.sc_super = function super_name() {
        super_name.caller.base.apply(this, super_name.caller.arguments);
    };

    SC.objectForPropertyPathOriginal = SC.objectForPropertyPath;

    SC.objectForPropertyPath = function(path, root, stopAt) {
        stopAt = (stopAt == undefined) ? path.length : stopAt;
        var hashed = path.split("#");
        if (hashed.length == 1) {
            return SC.objectForPropertyPathOriginal(path, root, stopAt);
        }
        var module = require(hashed[0]);
        if (module === undefined) {
            return undefined;
        }
        stopAt = stopAt - hashed[0].length;
        return SC.objectForPropertyPathOriginal(hashed[1], module, stopAt);
    };
};

