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

var bespin = require('bespin');
var console = require('bespin:console').console;
var Promise = require('bespin:promise').Promise;
var catalog = require('bespin:plugins').catalog;

var util = require('bespin:util/util');
var cookie = require('bespin:util/cookie');

exports.createServer = function(base_url) {
    exports.server = new exports.BespinServer(base_url);
    
    // start polling
    exports.server._poll();

    return exports.server;
};

exports.BespinServer = function(base_url) {
    this.base_url = base_url || '';
};

/**
 * The Server object implements the Bespin Server API (See
 * https://wiki.mozilla.org/BespinServerAPI) giving the client access to the
 * backend store. The FileSystem object uses this to talk back.
 */
exports.BespinServer.prototype = {
    // Stores the outstanding asynchronous tasks that we've submitted
    _jobs: {},

    _jobsCount: 0,

    // interval parameters
    _interval: {
        lo:   200,  // the lowest interval in ms
        hi:   5000, // the highest interval in ms
        step: 100,  // the change step in ms
        threshold: 3,    // number of response items
        current:   5000, // the current interval in ms
        handle:    null
    },

    /**
     * This is a nasty hack to call callback like onSuccess and if there is some
     * syntax problem to do something other than swallow the error
     */
    _callCallback: function(options, functionName, args) {
        if (util.isFunction(options[functionName])) {
            try {
                options[functionName].apply(null, args);
                return true;
            } catch (ex) {
                console.group('Error calling options.' + functionName + ' from server.request');
                console.log(options);
                console.log(options[functionName].toString());
                console.error(ex);
                console.trace();
                console.groupEnd();

                // If got an exception on success it's really a failure
                if (functionName == 'onSuccess' && util.isFunction(options.onFailure)) {
                    try {
                        options.onFailure({ responseText: ex.toString() });
                    } catch (ex2) {
                        console.group('Error calling options.onFailure from server.request');
                        console.error(ex2);
                        console.trace();
                        console.groupEnd();
                    }
                }
            }
        }

        return false;
    },

    /**
     * The core way to access the backend system.
     * Similar to the Prototype Ajax.Request wrapper
     * @param method is the HTTP method (GET|POST|PUT|DELETE)
     * @param url is the sub url to hit (after the base url)
     * @param payload is what to send up for POST requests
     * @param options is how you pass in various callbacks.
     *   options['evalJSON'] = true or false to auto eval
     *   options['onSuccess'] = the main success callback
     *   options['onFailure'] = call for general failures
     *   options['on' + STATUS CODE] = call for specific failures
     *   options['log'] = just log the following
     */
    request: function(method, url, payload, options) {
        var server = this;
        var xhr = new XMLHttpRequest();
        options = options || {};

        var pr = null;
        if (!options.onSuccess) {
            pr = new Promise();
        }

        var onreadystatechange = function() {
            if (xhr.readyState == 4) {
                if (xhr.status && xhr.status !== 0 && (xhr.status >= 200 && xhr.status < 300)) {
                    var response = xhr.responseText;

                    if (options.evalJSON && response) {
                        try {
                            response = JSON.parse(response);
                        } catch (syntaxException) {
                            console.log('Couldn\'t eval the JSON: ' + response + ' (SyntaxError: ' + syntaxException + ')');
                        }
                    }

                    if (pr) {
                        pr.resolve(response);
                    } else {
                        var handled = server._callCallback(options, 'onSuccess', [ response, xhr ]);

                        if (!handled && options.log) {
                            console.log(options.log);
                        }
                    }
                } else {
                    if (pr) {
                        var error = new Error(xhr.responseText + ' (Status ' + xhr.status + ")");
                        error.xhr = xhr;
                        pr.reject(error);
                    } else {
                        handled = server._callCallback(options, 'on' + xhr.status, [ xhr ]);
                        if (!handled) {
                            server._callCallback(options, 'onFailure', [ xhr ]);
                        }
                    }
                }
            }
        };

        xhr.onreadystatechange = onreadystatechange;
        xhr.open(method, this.base_url + url, true); // url must have leading /

        this.protectXhrAgainstCsrf(xhr);

        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        if (options.headers) {
            for (var key in options.headers) {
                if (options.headers.hasOwnProperty(key)) {
                    xhr.setRequestHeader(key, options.headers[key]);
                }
            }
        }

        xhr.send(payload);
        return pr;
    },

    /**
     * There are 2 ways of doing CSRF protection, to get the token using
     * getAntiCsrfToken() and setting it into the request using the correct
     * header, or by just calling this function
     */
    protectXhrAgainstCsrf: function(xhr) {
        xhr.setRequestHeader('X-Domain-Token', this.getAntiCsrfToken());
    },

    /**
     * Provide the Anti CSRF token to anyone wanting to do XHR requests.
     * See also, the comments against protectXhrAgainstCsrf
     * @see protectXhrAgainstCsrf()
     */
    getAntiCsrfToken: function() {
        var token = cookie.get('Domain-Token');
        if (!token) {
            token = util.randomPassword();
            cookie.set('Domain-Token', token);
        }
        return token;
    },

    /**
     * As request() except that the response is fetched without a connection,
     * instead using the /messages URL
     */
    requestDisconnected: function(method, url, payload, options) {
        options = options || {};
        options.evalJSON = true;
        // The response that we get from the server isn't a 'done it' response
        // any more - it's just a 'working on it' response.
        options.originalOnSuccess = options.onSuccess;

        var pr = new Promise();
        options.promise = pr;

        var self = this;

        this.request(method, url, payload, options).then(function(response, xhr) {
            if (response.jobid == null) {
                console.error('Missing jobid', response);
                var error = new Error('Server returned ' + xhr.status);
                error.xhr = xhr;
                pr.reject(error);
                return;
            }

            if (response.taskname) {
                console.log('Server is running : ' + response.taskname);
            }

            self._jobs[response.jobid] = {
                jobid: response.jobid,
                options: options
            };
            self._jobsCount++;
            //self._checkPolling();
        });

        return pr;
    },

    /**
     * Do we need to set off another poll?
     */
    /*
    _checkPolling: function() {
        if (this._jobsCount == 0) {
            return;
        }
        if (this._timeout != null) {
            return;
        }

        this._poll();
    },
    */

    _processResponse: function(message) {
        if (!('jobid' in message)) {
            if ('msgtargetid' in message) {
                var target = catalog.getExtensionByKey(
                                'msgtargetid', message.msgtargetid);
                if (target) {
                    target.load(function (f) {
                        f(message);
                    });
                } else {
                    console.log('UNPROCESSED MSG FROM ' + message.from +
                        ' FOR ' + message.msgtargetid + ': ' + message.text);
                }
            } else {
                console.warn('Missing jobid in message', message);
            }
            return;
        }

        var job = this._jobs[message.jobid];
        if (!job) {
            console.debug('job unknown. page reload?', message, this);
            return;
        }

        // TODO: Errors come through with message.error=true, but we're not
        // currently doing anything with that. It's complicated by the
        // need for a partial error system, and the question about how we
        // treat messages that errored half way through
        if (message.asyncDone) {
            if (Array.isArray(job.partials)) {
                // We're done, and we've got outstanding messages
                // that we need to pass on. We aggregate the
                // messages and call originalOnSuccess
                job.partials.push(message.output);
                job.options.promise.resolve(job.partials.join('<br/>'));
            } else {
                // We're done, and all we have is what we've just
                // been sent, so just call originalOnSuccess
                job.options.promise.resolve(message.output);
            }
        }
        else {
            if (util.isFunction(job.options.onPartial)) {
                // In progress, and we have somewhere to send the
                // messages that we've just been sent
                job.options.onPartial(message.output);
            } else {
                if (util.none(job.partials)) {
                    job.partials = [];
                }

                // In progress, and no-where to send the messages,
                // so we store them for onSuccess when we're done
                job.partials.push(message.output);
            }
        }

        if (message.asyncDone) {
            if (this._jobsCount > 0) {
                this._jobsCount--;
            }
            delete this._jobs[message.jobid];
        }
    },

    /**
     * Starts up message retrieve for this user.
     */
    _poll: function(payload) {
        if (payload) {
            this._doPoll(payload);
            return;
        }
        // ask mobwrite
        var mobwriteInstance = catalog.getExtensions('mobwriteinstance');
        if (mobwriteInstance && mobwriteInstance.length) {
            // always use the first instance
            var self = this;
            mobwriteInstance[0].load(function (mobwrite) {
                self._doPoll(mobwrite.collect());
            });
            return;
        }
        // the default
        this._doPoll(null);
    },

    /**
     * Starts I/O for the message retrieval.
     */
    _doPoll: function(mobwritePayload) {
        /*
        if (mobwritePayload) {
            console.log('FROM mobwrite:\n' + mobwritePayload);
        }
        */
        var self = this;
        this.request('POST', '/messages/', mobwritePayload, {
            evalJSON: true
        }).then(function(messages) {
                var interval = self._interval;
                // kill the current timeout
                if (interval.handle) {
                    clearTimeout(interval.handle);
                    interval.handle = null;
                }

                // process all messagesf
                for (var i = 0; i < messages.length; i++) {
                    self._processResponse(messages[i]);
                }

                // schedule next poll, if not scheduled yet
                if (!interval.handle) {
                    self._schedulePoll(messages.length);
                }
            },
            function(message) {
                self._processResponse(message);
                self._schedulePoll(0);
            }
        );
    },

    /**
     * Schedules the next poll.
     */
    _schedulePoll: function(n) {
        var self = this;
        var interval = this._interval;
        var current  = interval.current;
        // kill the current timeout
        if (interval.handle) {
            clearTimeout(interval.handle);
            interval.handle = null;
        }
        // do we need to update the polling interval?
        if (n <= 1) {
            // we got nothing: poll less frequently
            current += interval.step;
        } else if (n >= interval.threshold) {
            // we got a lot: poll more frequently
            current = current / n * interval.threshold;
        }
        // clip new interval, and make sure that number of ms is whole
        current = Math.min(interval.hi, Math.max(interval.lo, Math.ceil(current)));
        // save new polling interval
        interval.current = current;
        // schedule the next poll
        interval.handle = setTimeout(function() {
            self._poll();
        }, current);
    },

    /**
     * Schedule the next poll.
     */
    schedulePoll: function (ms, payload) {
        var self = this;
        var interval = this._interval;
        if (typeof ms == 'number' && (!interval.handle || ms < interval.current)) {
            // kill the current timeout
            if (interval.handle) {
                clearTimeout(interval.handle);
                interval.handle = null;
            }
            // save new polling interval
            interval.current = Math.max(ms, 0);
            // schedule the next poll
            interval.handle = setTimeout(function() {
                self._poll(payload);
            }, ms);
        }
    }
};
