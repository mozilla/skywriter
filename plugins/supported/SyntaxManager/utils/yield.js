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

require('sproutcore/runtime').SC;
var Promise = require('Promise:core/promise').Promise;
var PromiseUtils = require('Promise:utils/promise');

/**
 * Implements a "yieldable loop", which allows an asynchronous function to be
 * called repeatedly without having to create a new stack frame for every
 * synchronous iteration.
 *
 *   *  Each time around the loop, the condition is checked by calling
 *      cond(promise). cond() must either return true to continue iteration or
 *      resolve the promise and return false to stop iteration.
 *
 *   *  If the condition check passes, exec() is called. It must return a
 *      promise.
 *
 *   *  Once this promise is resolved, next(value, promise) is called with the
 *      value provided by the promise returned by exec(). The next() function
 *      must either resolve the promise and return false to stop iteration or
 *      return true to continue.
 *
 * @return A promise that the loop will be executed, which will resolve to the
 *         value supplied by cond() or next() (when either returns false).
 */
exports.loop = function(cond, exec, next) {
    var loopPromise = new Promise();

    while (cond(loopPromise)) {
        var execPromise = exec();

        var execValue = PromiseUtils.valueIfResolved(execPromise);
        if (execValue === null) {
            // Asynchronous path
            execPromise.then(function(execValue) {
                if (next(execValue, loopPromise)) {
                    exports.loop(cond, exec, next).then(function(loopValue) {
                        loopPromise.resolve(loopValue);
                    });
                }
            });
            return loopPromise;
        }

        // Synchronous path
        if (!next(execValue, loopPromise)) {
            return loopPromise;
        }
    }

    return loopPromise;
};

