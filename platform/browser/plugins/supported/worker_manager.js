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
    "dependencies": {
        "canon": "0.0.0",
        "events": "0.0.0",
        "underscore": "0.0.0"
    },
    "provides": [
        {
            "ep": "command",
            "name": "worker",
            "description": "Low-level web worker control (for plugin development)"
        },
        {
            "ep": "command",
            "name": "worker restart",
            "description": "Restarts all web workers (for plugin development)",
            "pointer": "#workerRestartCommand"
        }
    ]
});
"end";

if (window == null) {
    throw new Error('The "worker_manager" plugin can only be loaded in the ' +
        'browser, not a web worker. Use "worker" instead.');
}

var proxy = require('bespin:proxy');
var plugins = require('bespin:plugins');
var console = require('bespin:console').console;
var _ = require('underscore')._;
var Event = require('events').Event;
var Promise = require('bespin:promise').Promise;
var env = require('environment').env;

var workerManager = {
    _workers: [],

    add: function(workerSupervisor) {
        this._workers.push(workerSupervisor);
    },

    remove: function(workerSupervisor) {
        this._workers = _(this._workers).without(workerSupervisor);
    },

    restartAll: function() {
        var workers = this._workers;
        _(workers).invoke('kill');
        _(workers).invoke('start');
    }
};

function WorkerSupervisor(pointer) {
    var m = /^([^#:]+)(?::([^#:]+))?#([^#:]+)$/.exec(pointer);
    if (m == null) {
        throw new Error('WorkerSupervisor: invalid pointer specification: "' +
            pointer + '"');
    }

    var packageId = m[1], target = m[3];
    var moduleId = packageId + ":" + (m[2] != null ? m[2] : "index");
    var base = bespin != null && bespin.base != null ? bespin.base : "";

    this._packageId = packageId;
    this._moduleId = moduleId;
    this._base = base;
    this._target = target;

    this._worker = null;
    this._currentId = 0;

    this.started = new Event();
}

WorkerSupervisor.prototype = {
    _onError: function(ev) {
        this._worker = null;
        workerManager.remove(this);

        console.error("WorkerSupervisor: worker failed at file " +
            ev.filename + ":" + ev.lineno + "; fix the worker and use " +
            "'worker restart' to restart it");
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

    /** An event that fires whenever the worker is started or restarted. */
    started: null,

    /**
     * Terminates the worker. After this call, the worker can be restarted via
     * a call to start().
     */
    kill: function() {
        var oldPromise = this._promise;
        if (oldPromise != null) {
            oldPromise.reject("killed");
            this._promise = null;
        }

        this._worker.terminate();
        this._worker = null;
        workerManager.remove(this);
    },

    /**
     * Invokes a method on the target running in the worker and returns a
     * promise that will resolve to the result of that method.
     */
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

    /**
     * Starts the worker. Immediately after this method is called, the
     * "started" event will fire.
     */
    start: function() {
        if (this._worker != null) {
            throw new Error("WorkerSupervisor: worker already started");
        }

        var base = this._base, target = this._target;
        var packageId = this._packageId, moduleId = this._moduleId;

        var worker = new proxy.Worker(base + "BespinEmbedded.js");

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

        workerManager.add(this);

        this.started();
    }
};

function workerRestartCommand(args, req) {
    workerManager.restartAll();
}

exports.WorkerSupervisor = WorkerSupervisor;
exports.workerManager = workerManager;
exports.workerRestartCommand = workerRestartCommand;

