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

"define metadata";
({
    "description": "Manages a web worker on the browser side",
    "dependencies": { "events": "0.0.0", "underscore": "0.0.0" }
});
"end";

if (window == null) {
    throw new Error('The "worker_manager" plugin can only be loaded in the ' +
        'browser, not a web worker. Use "worker" instead.');
}

var plugins = require('bespin:plugins');
var console = require('bespin:console').console;
var Event = require('events').Event;
var Promise = require('bespin:promise').Promise;

function WorkerManager(pointer) {
    var m = /^([^#:]+)(?::([^#:]+))?#([^#:]+)$/.exec(pointer);
    if (m == null) {
        throw new Error('WorkerManager: invalid pointer specification: "' +
            pointer + '"');
    }

    var packageId = m[1], target = m[3];
    var moduleId = packageId + ":" + (m[2] != null ? m[2] : "index")

    var base = bespin != null && bespin.base != null ? bespin.base : "";
    var worker = new Worker(base + "worker.js");

    worker.onmessage = this._onMessage.bind(this);
    worker.onerror = this._onError.bind(this);

    var msg = {
        op:     'load',
        base:   base,
        pkg:    packageId,
        module: moduleId,
        target: target
    };
    worker.postMessage(JSON.stringify(msg));

    this._worker = worker;
    this._currentId = 0;
}

WorkerManager.prototype = {
    _onError: function(ev) {
        console.error("Web worker failed at file " + ev.filename + ":" +
            ev.lineno);
    },

    _onMessage: function(ev) {
        var msg = JSON.parse(ev.data);
        switch (msg.op) {
        case 'finish':
            if (msg.id === this._currentId) {
                var promise = this._promise;

                // We have to set the promise to null first, in case the user's
                // then() handler on the promise decides to send another
                // message to the object.
                this._promise = null;

                promise.resolve(msg.result);
            }
            break;

        case 'log':
            console[msg.method].apply(console, msg.args);
            break;
        }
    },

    _promise: null,

    /** Terminates the worker. After this call, the worker manager is dead. */
    kill: function() {
        var oldPromise = this._promise;
        if (oldPromise != null) {
            oldPromise.reject("killed");
            this._promise = null;
        }

        this._worker.terminate();
        this._worker = null;
    },

    send: function(method, args) {
        var oldPromise = this._promise;
        if (oldPromise != null) {
            oldPromise.reject("interrupted");
            this._currentId++;
        }

        var id = this._currentId;
        var promise = new Promise();
        this._promise = promise;

        var msg = { op: 'invoke', id: id, method: method, args: args };
        this._worker.postMessage(JSON.stringify(msg));

        return promise;
    },
};

exports.WorkerManager = WorkerManager;

