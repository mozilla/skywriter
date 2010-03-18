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

var console = require('bespin:console').console;
var Trace = require('bespin:util/stacktrace').Trace;

/**
 * A promise can be in one of 2 states.
 * The ERROR and SUCCESS states are terminal, the PENDING state is the only
 * start state.
 */
var ERROR = -1;
var PENDING = 0;
var SUCCESS = 1;

/**
 * Create an unfulfilled promise
 */
exports.Promise = function () {
    this._status = PENDING;
    this._value = undefined;
    this._onSuccessHandlers = [];
    this._onErrorHandlers = [];
};

/**
 * Take the specified action of fulfillment of a promise, and (optionally)
 * a different action on promise rejection.
 */
exports.Promise.prototype.then = function(onSuccess, onError) {
    if (onSuccess !== null && onSuccess !== undefined) {
        this._onSuccessHandlers.push(onSuccess);
    }
    if (onError !== null && onError !== undefined) {
        this._onErrorHandlers.push(onError);
    }

    if (this._status !== PENDING) {
        this._callHandlers();
    }

    return this;
};

/**
 * Supply the fulfillment of a promise
 */
exports.Promise.prototype.resolve = function(data) {
    if (this._status != PENDING) {
        console.groupCollapsed('Promise already closed');
        console.error('Attempted resolve() with ', data);
        console.error('Previous status = ', this._status, ', previous value = ', this._value);
        console.trace();
        console.groupEnd();
    }
    this._status = SUCCESS;
    this._value = data;
    this._callHandlers();
    return this;
};

/**
 * Renege on a promise
 */
exports.Promise.prototype.reject = function(error) {
    if (this._status != PENDING) {
        console.group('Promise already closed');
        console.error('Attempted reject() with ', error);
        console.error('Previous status = ', this._status, ', previous value = ', this._value);
        console.trace();
        console.groupEnd();
    }
    this._status = ERROR;
    this._value = error;
    this._callHandlers();
    return this;
};

/**
 * Internal method to be called whenever we have handlers to call.
 * @private
 */
exports.Promise.prototype._callHandlers = function() {
    if (this._status === PENDING) {
        throw new Error('call handlers in pending');
    }
    var list = (this._status === SUCCESS) ?
        this._onSuccessHandlers :
        this._onErrorHandlers;

    list.forEach(function(handler) {
        handler.call(null, this._value);
    }.bind(this));

    this._onSuccessHandlers.length = 0;
    this._onErrorHandlers.length = 0;
};

/**
 * Demand that a promise be fulfilled within a certain timespan.
 * TODO: There is a change that the promise will be rejected/resolved after this
 * has fired. It's not clear what we should do in this case. It depends on how
 * this method is being used.
 */
exports.Promise.prototype.timeout = function(millis) {
    if (this._status === PENDING) {
        return;
    }
    setTimeout(function() {
        if (this._status === PENDING) {
            this.reject(new Error("Timeout after " + millis + "ms"));
        }
    }.bind(this), millis);
};

/**
 * Takes an array of promises and returns a promise that that is fulfilled once
 * all the promises in the array are fulfilled
 * @param group The array of promises
 * @return the promise that is fulfilled when all the array is fulfilled
 */
exports.group = function(promiseList) {
    if (!(promiseList instanceof Array)) {
        promiseList = Array.prototype.slice.call(arguments);
    }

    // If the original array has nothing in it, return now to avoid waiting
    if (promiseList.length === 0) {
        return new Promise().resolve([]);
    }

    var promise = new Promise();
    var results = [];
    var fulfilled = 0;

    var onSuccessFactory = function(index) {
        return function(data) {
            results[index] = data;
            fulfilled++;
            if (fulfilled === promiseList.length) {
                promise.resolve(results);
            }
        };
    };

    promiseList.forEach(function(promise, index) {
        promise.then(onSuccessFactory(index), promise.reject);
    });

    return promise;
};
