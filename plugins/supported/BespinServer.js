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
({});
"end";

var bespin = require("bespin");
var util = require("bespin:util/util");
var cookie = require("bespin:util/cookie");
var SC = require("sproutcore/runtime").SC;

/**
 * The Server object implements the Bespin Server API (See
 * https://wiki.mozilla.org/BespinServerAPI) giving the client access to the
 * backend store. The FileSystem object uses this to talk back.
 */
exports.server = SC.Object.create({
    SERVER_BASE_URL: window.SERVER_BASE_URL == undefined ? '/server' : SERVER_BASE_URL,

    // Stores the outstanding asynchronous tasks that we've submitted
    _jobs: {},

    _jobsCount: 0,

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
                console.group("Error calling options." + functionName + " from server.request");
                console.log(options);
                console.log(options[functionName].toString());
                console.error(ex);
                console.trace();
                console.groupEnd();

                // If got an exception on success it's really a failure
                if (functionName == "onSuccess" && util.isFunction(options.onFailure)) {
                    try {
                        options.onFailure({ responseText: ex.toString() });
                    } catch (ex2) {
                        console.group("Error calling options.onFailure from server.request");
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

        var onreadystatechange = function() {
            if (xhr.readyState == 4) {
                if (xhr.status && xhr.status !== 0 && (xhr.status >= 200 && xhr.status < 300)) {
                    var response = xhr.responseText;

                    if (options.evalJSON && response) {
                        try {
                            response = JSON.parse(response);
                        } catch (syntaxException) {
                            console.log("Couldn't eval the JSON: " + response + " (SyntaxError: " + syntaxException + ")");
                        }
                    }

                    var handled = server._callCallback(options, "onSuccess", [ response, xhr ]);

                    if (!handled && options.log) {
                        console.log(options.log);
                    }
                } else {
                    handled = server._callCallback(options, 'on' + xhr.status, [ xhr ]);
                    if (!handled) {
                        server._callCallback(options, 'onFailure', [ xhr ]);
                    }
                }
            }
        };

        xhr.onreadystatechange = onreadystatechange;
        xhr.open(method, this.SERVER_BASE_URL + url, true); // url must have leading /

        this.protectXhrAgainstCsrf(xhr);

        xhr.setRequestHeader("Content-Type", 'application/x-www-form-urlencoded');
        if (options.headers) {
            for (var key in options.headers) {
                if (options.headers.hasOwnProperty(key)) {
                    xhr.setRequestHeader(key, options.headers[key]);
                }
            }
        }

        xhr.send(payload);
    },

    /**
     * There are 2 ways of doing CSRF protection, to get the token using
     * getAntiCsrfToken() and setting it into the request using the correct
     * header, or by just calling this function
     */
    protectXhrAgainstCsrf: function(xhr) {
        xhr.setRequestHeader("X-Domain-Token", this.getAntiCsrfToken());
    },

    /**
     * Provide the Anti CSRF token to anyone wanting to do XHR requests.
     * See also, the comments against protectXhrAgainstCsrf
     * @see protectXhrAgainstCsrf()
     */
    getAntiCsrfToken: function() {
        var token = cookie.get("Domain-Token");
        if (!token) {
            token = util.randomPassword();
            cookie.set("Domain-Token", token);
        }
        return token;
    },

    /**
     * As request() except that the response is fetched without a connection,
     * instead using the /messages URL
     */
    requestDisconnected: function(method, url, payload, instruction, options) {
        options.evalJSON = true;
        // The response that we get from the server isn't a 'done it' response
        // any more - it's just a 'working on it' response.
        options.originalOnSuccess = options.onSuccess;

        var self = this;
        options.onSuccess = function(response, xhr) {
            if (response.jobid == null) {
                console.error("Missing jobid", response);
                options.onFailure(xhr);
                return;
            }

            if (response.taskname) {
                console.log("Server is running : " + response.taskname);
            }

            self._jobs[response.jobid] = {
                jobid: response.jobid,
                options: options
            };
            self._jobsCount++;
            self._checkPolling();
        };

        this.request(method, url, payload, options);
    },

    /**
     * Do we need to set off another poll?
     */
    _checkPolling: function() {
        if (this._jobsCount == 0) {
            return;
        }
        if (this._timeout != null) {
            return;
        }

        this._poll();
    },

    _processResponse: function(message) {
        if (message.jobid === undefined) {
            console.warn("Missing jobid in message", message);
            return;
        }

        var job = this._jobs[message.jobid];
        if (!job) {
            console.debug("job unknown. page reload?", message, this);
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
                job.options.originalOnSuccess(job.partials.join("<br/>"));
            } else {
                // We're done, and all we have is what we've just
                // been sent, so just call originalOnSuccess
                job.options.originalOnSuccess(message.output);
            }
        }
        else {
            if (util.isFunction(job.options.onPartial)) {
                // In progress, and we have somewhere to send the
                // messages that we've just been sent
                job.options.onPartial(message.output);
            } else {
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
     * Starts up message retrieve for this user. Call this only once.
     */
    _poll: function() {
        var self = this;

        this.request('POST', '/messages/', null, {
            evalJSON: true,
            onSuccess: function(messages) {

                for (var i = 0; i < messages.length; i++) {
                    self._processResponse(messages[i]);
                }

                setTimeout(function() {
                    self._checkPolling();
                }, 1000);
            },
            onFailure: function(message) {
                self._processResponse(message);

                setTimeout(function() {
                    self._checkPolling();
                }, 1000);
            }
        });
    },

    /**
     * Generic system to read resources from a URL and return the read data to
     * a callback.
     */
    fetchResource: function(name, onSuccess, onFailure) {
        this.request('GET', name, null, {
            onSuccess: onSuccess,
            onFailure: onFailure
        });
    },

    /**
     * Try to login to the backend system.
     * @param user is the username
     * @param pass is the password
     * @param onSuccess fires when the user is logged in
     * @param onFailure fires when the user failed to login
     */
    login: function(user, pass, onSuccess, onFailure) {
        var url = "/register/login/" + user;
        this.request('POST', url, "password=" + encodeURI(pass), {
            onSuccess: onSuccess,
            on401: onFailure,
            log: 'Login complete.'
        });
    },

    /**
     * Signup / Register the user to the backend system
     * @param user is the username
     * @param pass is the password
     * @param email is the email
     * @param onSuccess fires when the user is logged in
     * @param notloggedin fires when not logged in
     * @param userconflict fires when the username exists
     */
    signup: function(user, pass, email, opts) {
        opts = opts || {};
        var url = "/register/new/" + user;
        var data = "password=" + encodeURI(pass) + "&email=" + encodeURI(email);
        this.request('POST', url, data, opts);
    },

    /**
     * Logout from the backend
     * @param onSuccess fires after the logout attempt
     */
    logout: function(onSuccess) {
        var url = "/register/logout/";
        this.request('POST', url, null, {
            log: 'Logout complete.',
            onSuccess: onSuccess
        });
    },

    /**
     * Return info on the current logged in user
     * @param onSuccess fires after the user attempt
     * @param notloggedin fires if the user isn't logged in
     */
    currentuser: function(whenLoggedIn, whenNotloggedin, otherFailure) {
        var url = "/register/userinfo/";
        return this.request('GET', url, null, {
            onSuccess: whenLoggedIn,
            on401: whenNotloggedin,
            evalJSON: true,
            onFailure: otherFailure
        });
    },

    /**
     * List the path in the given project
     * @param project is the project to list
     * @param path is the path to list out
     * @param onSuccess fires if the list returns something
     * @param onFailure fires if there is an error getting a list from the server
     */
    list: function(project, path, onSuccess, onFailure) {
        project = project || '';
        var url = util.path.combine('/file/list/', project, path || '/');
        var opts = {
            onSuccess: onSuccess,
            evalJSON: true,
            log: "Listing files in: " + url
        };
        if (util.isFunction(onFailure)) {
            opts.onFailure = onFailure;
        }

        this.request('GET', url, null, opts);
    },

    /**
     * List *all* files in the given project.
     * Be *aware*: this will be a huge json-result!
     * @param project is the project to list all files from
     * @param onSuccess fires if the list returns something
     * @param onFailure fires if there is an error getting a list from the server
     */
    listAllFiles: function(project, onSuccess, onFailure) {
        project = project || '';
        var url = util.path.combine('/file/list_all/', project, '/');
        var opts = {
            onSuccess: onSuccess,
            evalJSON: true,
            log: "Listing all files in: " + url
        };
        if (util.isFunction(onFailure)) {
            opts.onFailure = onFailure;
        }

        this.request('GET', url, null, opts);
    },

    /**
     * Return the list of projects that you have access too
     * @param onSuccess gets fired with the project list
     */
    projects: function(onSuccess) {
        this.request('GET', '/file/list/', null, {
            onSuccess: onSuccess,
            evalJSON: true
        });
    },

    /**
     * Save the given file
     * @param project is the project to save
     * @param path is the path to save to
     * @param contents fires after the save returns
     * @param lastOp contains the last edit operation
     */
    saveFile: function(project, path, contents, lastOp, opts) {
        if (!project || !path) {
            return;
        }
        opts = opts || {};
        opts.log = 'Saved file "' + project + '/' + path+ '"';

        var url = util.path.combine('/file/at', project, (path || ''));
        if (lastOp) {
            url += "?lastEdit=" + lastOp;
        }

        this.request('PUT', url, contents, opts);
    },

    /**
     * Load the given file
     * @param project is the project to load from
     * @param path is the path to load
     * @param onSuccess fires after the file is loaded
     */
    loadFile: function(project, path, onSuccess, onFailure) {
        project = project || '';
        path = path || '';
        var url = util.path.combine('/file/at', project, path);
        var opts = { onSuccess: onSuccess };
        if (util.isFunction(onFailure)) {
            opts.onFailure = onFailure;
        }

        this.request('GET', url, null, opts);
    },

    /**
     * Remove the given file
     * @param project is the project to remove from
     * @param path is the path to remove
     * @param onSuccess fires if the deletion works
     * @param onFailure fires if the deletion failed
     */
    removeFile: function(project, path, onSuccess, onFailure) {
        project = project || '';
        path = path || '';
        var url = util.path.combine('/file/at', project, path);
        var opts = { onSuccess: onSuccess };
        if (util.isFunction(onFailure)) {
            opts.onFailure = onFailure;
        }

        this.request('DELETE', url, null, opts);
    },

    /**
     * Create a new directory
     * @param project is the project to save
     * @param path is the path to save to
     * @param onSuccess fires if the deletion works
     * @param onFailure fires if the deletion failed
     */
    makeDirectory: function(project, path, onSuccess, onFailure) {
        if (!project) {
            return;
        }

        var url = util.path.combineAsDirectory('/file/at', project, (path || ''));
        var opts = {};
        if (util.isFunction(onSuccess)) {
            opts.onSuccess = onSuccess;
        } else {
            opts.log = "Made a directory: [project=" + project + ", path=" + path + "]";
        }
        if (util.isFunction(onFailure)) {
            opts.onFailure = onFailure;
        }

        this.request('PUT', url, null, opts);
    },

    /**
     * Removed a directory
     * @param project is the project to save
     * @param path is the path to save to
     * @param onSuccess fires if the deletion works
     * @param onFailure fires if the deletion failed
     */
    removeDirectory: function(project, path, onSuccess, onFailure) {
        if (!project) {
            return;
        }
        if (!path) {
            path = '';
        }

        var url = util.path.combineAsDirectory('/file/at', project, path);
        var opts = {};
        if (util.isFunction(onSuccess)) {
            opts.onSuccess = onSuccess;
        } else {
            opts.log = "Removed directory: [project=" + project + ", path=" + path + "]";
        }
        if (util.isFunction(onFailure)) {
            opts.onFailure = onFailure;
        }

        this.request('DELETE', url, null, opts);
    },

    /**
     * Returns JSON object with the key of filename, and the value of an array
     * of usernames:
     * { "foo.txt": ["ben"], "SomeAjaxApp/foo.txt": ["dion"] }
     * @param onSuccess fires after listing the open files
     */
    listOpen: function(onSuccess) {
        this.request('GET', '/file/listopen/', null, {
            onSuccess: onSuccess,
            evalJSON: true,
            log: 'List open files.'
        });
    },

    /**
     * Close the given file (remove from open sessions)
     * @param project is the project to close from
     * @param path is the path to close
     * @param onSuccess fires after the file is closed
     */
    closeFile: function(project, path, onSuccess) {
        path = path || '';
        var url = util.path.combine('/file/close', project, path);
        this.request('POST', url, null, { onSuccess: onSuccess });
    },

    /**
     * Search for files within the given project
     * @param project is the project to look from
     * @param searchstring to compare files with
     * @param onSuccess fires after the file is closed
     */
    searchFiles: function(project, searchkey, includeFolders, onSuccess) {
        var url = util.path.combine('/file/search', project + '?q=' + encodeURI(searchkey));
        if (includeFolders.length > 0) {
            url += '&i=' + encodeURI(includeFolders.join(';'));
        }
        var opts = {
            onSuccess: onSuccess,
            evalJSON: true,
            log: "Listing searchfiles for: " + project + ", searchkey: " + searchkey
        };
        this.request('GET', url, null, opts);
    },

    /**
     * Get the list of edit actions
     * @param project is the project to edit from
     * @param path is the path to edit
     * @param onSuccess fires after the edit is done
     */
    editActions: function(project, path, onSuccess) {
        path = path || '';
        var url = util.path.combine('/edit/list', project, path);
        this.request('GET', url, null, {
            onSuccess: onSuccess,
            log: "Edit Actions Complete."
        });
    },

    /**
     * Get the list of edit after actions
     * @param project is the project to edit from
     * @param path is the path to edit
     * @param onSuccess fires after the edit is done
     */
    editAfterActions: function(project, path, index, onSuccess) {
        path = path || '';
        var url = util.path.combine('/edit/recent', index, project, path);
        this.request('GET', url, null, {
            onSuccess: onSuccess,
            log: "Edit After Actions Complete."
        });
    },

    /**
     * Store actions to the edit queue
     * @param project is the project
     * @param path is the path
     * @param actions contain the actions to store
     * TODO: Is this needed? It's not being called. We should either delete it
     * or document why we need the cruft
     */
    doAction: function(project, path, actions) {
        path = path || '';
        var url = util.path.combine('/edit', project, path);

        var sp = "[" + actions.join(",") + "]";

        this.request('PUT', url, sp, {
            onSuccess: function() { }
        });
    },

    /**
     * Export the project as either a zip file or tar + gz
     * @param project is the project to export
     * @param archivetype is either zip | tgz
     */
    exportProject: function(project, archivetype) {
        if (util.include(['zip','tgz','tar.gz'], archivetype)) {
            var iframe = document.createElement("iframe");
            iframe.src = util.path.combine('/project/export', project + "." + archivetype);
            iframe.style.display = 'none';
            iframe.style.height = iframe.style.width = "0";
            document.getElementsByTagName("body")[0].appendChild(iframe);
        }
    },

    /**
     * Import the given file into the given project
     * @param project is the project to export
     * @param url is the URL to the file to import
     * @param archivetype is either zip | tgz
     */
    importProject: function(project, url, opts) {
        if (opts) {
            // wrap the import success call in an event to say that the import is complete
            var userCall = opts.onSuccess;
            opts.onSuccess = function(text, xhr) {
                userCall(text, xhr);
                bespin.publish("project:imported", {
                    project: project,
                    url: url
                });
            };
        }

        this.request('POST', '/project/fromurl/' + project, url, opts || {});
    },

    /**
     * Import the given file into the given project
     * @param currentProject is the current name of the project
     * @param newProject is the new name
     */
    renameProject: function(currentProject, newProject, opts) {
        if (!opts) {
            opts = {
                log: "Renaming project from " + currentProject + " to " + newProject
            };
        }

        if (currentProject && newProject) {
            this.request('POST', '/project/rename/' + currentProject + "/", newProject, opts);
        }
    },

    /**
     * - GET /settings/ to list all settings for currently logged in user as json dict
     * - GET /settings/[setting] to get the value for a single setting as json string
     * - POST /settings/ with HTTP POST DATA (in standard form post syntax) to
     *   set the value for a collection of settings (all values are strings)
     * - DELETE /settings/[setting] to delete a single setting
     */
    listSettings: function(onSuccess) {
        if (typeof onSuccess == "function") {
            this.request('GET', '/settings/', null, {
                onSuccess: onSuccess,
                evalJSON: true
            });
        }
    },

    getSetting: function(name, onSuccess) {
        if (typeof onSuccess == "function") {
            this.request('GET', '/settings/' + name, null, {
                onSuccess: onSuccess
            });
        }
    },

    setSetting: function(name, value, onSuccess) {
        var settings = {};
        settings[name] = value;
        this.setSettings(settings, onSuccess);
    },

    setSettings: function(settings, onSuccess) {
        this.request('POST', '/settings/', util.objectToQuery(settings), {
            onSuccess: onSuccess
        });
    },

    unsetSetting: function(name, onSuccess) {
        this.request('DELETE', '/settings/' + name, null, { onSuccess: onSuccess });
    },

    /**
     * Starts up message retrieve for this user. Call this only once.
     */
    fileTemplate: function(project, path, templateOptions, opts) {
        var url = util.path.combine('/file/template', project, path);
        this.request('PUT', url, JSON.stringify(templateOptions), opts || {});
    },

    /**
     * Create a new project based on a template. templateOptions
     * must include templateName to specify which template to use.
     * templateOptions can include other values that will be plugged
     * in to the template.
     */
    projectTemplate: function(project, templateOptions, opts) {
        var url = util.path.combine('/project/template/', project, "");
        this.request('POST', url, JSON.stringify(templateOptions), opts || {});
    },

    lost: function(values, opts) {
        opts = opts || {};
        var url = '/register/lost/';
        this.request('POST', url, util.objectToQuery(values), opts);
    },

    changePassword: function(username, newPassword, verifyCode, opts) {
        var url = "/register/password/" + username;
        var query = { newPassword: newPassword, code: verifyCode };
        this.request('POST', url, util.objectToQuery(query), opts || {});
    },

    rescan: function(project, instruction, opts) {
        var url = '/project/rescan/' + encodeURI(project);
        this.requestDisconnected('POST', url, {}, instruction, opts);
    }
});
