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

/**
 * Web Workers / Gears WorkerPool Abstraction
 */

var WORKER_COUNT = 1;
var WORKER_INDEX = 0;
var CALL_INDEX = 0;
var USE_GEARS = false;

/**
 * These functions are part of a hack to transport code into the worker via a
 * hash (#) url part that is extracted and evaled inside the worker.
 * Sounds like a security hole, but maybe it is not.
 */
var JS_WORKER_SOURCE = dojo.moduleUrl("bespin", "bootstrap_worker.js");
var uriEncodeSource = function(source) {
    return JS_WORKER_SOURCE+"#"+escape(source);
};
var uriDecodeSource = function(uri) {
    return unescape(uri.substr( (JS_WORKER_SOURCE+"#").length ));
};

/**
 * If there is no Worker API yet, try to build one using Google Gears API
 * See: http://www.whatwg.org/specs/web-workers/current-work/
 * noWorker: only set to false if we can set up any kind of worker.
 */
var noWorker = typeof Worker == "undefined" ? true : false;
if (!noWorker) {
    try {
        var testWorker = new Worker(dojo.moduleUrl("bespin.util", "testWorker.js"));
    }
    catch(e) {
        // we could check to see why, but really, if this failed, why assume any
        // worker would succeed? There is, actually, a bug in WebKit that makes
        // its port security checks not always work properly, and this would
        // ensure we do not cause a security violation exception.
        noWorker = true;

        // e = e + "";
        // if (e.indexOf("Worker is not enabled") != -1) {
        //     noWorker = true;
        // }
    }
}

if (noWorker) {
    // this functions initializes Gears only if we need it
    BespinGearsInitializeGears();
    if (window.google && google.gears) {
        USE_GEARS   = true; // OK, gears is here

        var wp = google.gears.factory.create('beta.workerpool');
        var workers = {};
        // The worker class, non standard second source para
        Worker = function(uri, source) {
            this.isGears = true;
            this.id = wp.createWorkerFromUrl(JS_WORKER_SOURCE);
            workers[this.id] = this;
        };

        // we can post messages to the worker
        Worker.prototype = {
            postMessage: function(data) {
                wp.sendMessage(data, this.id);
            }
        };

        // upon receiving a message we call our onmessage callback
        // DOM-Message-Events are not supported
        wp.onmessage = function(a, b, message) {
            var worker = workers[message.sender];
            var cb = worker.onmessage;
            if (cb) {
                cb.call(worker, {
                    data: message.body
                });
            }
        };

        // we got worker, so now, set noWorker to false
        noWorker = false;
    }
}

/**
 * Takes an objects and build a facade object for it.
 * Creates source code for a web worker that implements the same functionality
 * as the original object and sends the source code to the web worker (The
 * source code is created recursively, so complex objects are supported).
 * Methods which are sent to the facade are from now on delegated to the worker.
 *
 * Because all method calls are now async, the methods of the facade object
 * return an object that has a function property called "and" which can invoked
 * to defined a callback that will receive the return value of the method call.
 *
 * The and function takes 4 parameters:<ul>
 * <li>context: the this value of the callback.
 * <li>mutex: (optional) a mutex for the callback (Means that after-callback of
 * the mutex wont be called until after this callback is finished
 * <li>paras: (optional) array of extra parameters for the callback.
 * <li>callback: Callback for the method. First parameter will be the return
 * value of the method
 * </ul>
 *
 * Background APIs:<ul>
 * <li>We prefer to use the web worker API
 * <li>If that is not there we try to use Gears Workers
 * <li>If that is not there code will be executed within the regular context but
 * still be async (using setTimeout)
 * </ul>
 *
 * Limitations: Objects may not include<ul>
 * <li>closures
 * <li>references to DOM nodes
 * <li>circular references
 * </ul>
 */
exports.WorkerFacade = SC.Object.extend({
    obj: null,
    workerCount: WORKER_COUNT,
    libs: [],

    /**
     * Only use workerCount > 1 if the object is stateless
     */
    init: function() {
        // Properties use __name__ notation to avoid conflicts with facade methods
        this.__obj__ = this.obj;
        this.__callbacks__ = {};
        this.__workerCount__ = this.workerCount;

        // __hasWorkers__ is a public API of the facade
        this.__hasWorkers__ = false;

        if (!noWorker) { // We have a Worker implementation
            this.__hasWorkers__ = true;

            var source  = this.createWorkerSource(obj, this.libs);
            var workers = this.createWorkers(source);
            this.__workers__ = workers;
        }

        this.createFacade(obj);
    },

    /**
     * We support pools of workers which share the load
     */
    __getWorker__: function() {
        // round robin scheduling
        var index = WORKER_INDEX++ % this.__workerCount__;
        // TODO maintain a smarter queue based on which workers are actually idle
        return this.__workers__[index];
    },

    /**
     * Create N workers based on source
     */
    createWorkers: function(source) {
        // round robin scheduling
        var self = this;
        var workers = [];

        // The standard callback choose a callback for the particular method using
        // the callIndex that is set upon sending the method
        var cb = function(event) {
            var data  = event.data;
            if (typeof data == "string") {
                data = dojo.fromJson(data);
            }
            var index = data.callIndex;

            var callback = self.__callbacks__[index];
            delete self.__callbacks__[index];
            if (callback) {
                callback(data.returnValue);
            }
        };

        var loadScript = function (index, url) {
            var worker = this;
            bespin.get("server").request('GET', url, null, {
                onSuccess: function (src) {
                    worker.postMessage("__IMPORT_SCRIPT__//"+index+"\n"+src);
                }
            });
        };


        for (var i = 0; i < this.__workerCount__;i++) {
            // console.log("Create worker")
            var worker = new Worker(JS_WORKER_SOURCE, source);
            // console.log("Worker created")

            var onmessage = function(event) {
                var message = event.data;
                if (typeof message == "string") {
                    if (message.indexOf("log=") == 0) {
                        console.log("From Worker: " + message.substr(4)); // dont comment this out :)
                        return
                    }
                    else
                    if (message.indexOf("__IMPORT_SCRIPT__") == 0) {
                        var json = message.substr("__IMPORT_SCRIPT__".length);
                        var paras = dojo.fromJson(json);
                        loadScript.apply(this, paras);
                        return;
                    }
                    else {
                        message = dojo.fromJson(message);
                    }
                }

                if (message.type == "subscribe") {
                    (function () {
                        var index = message.index;
                        var name  = message.name;
                        //console.log("Worker-Sub to " + name);
                        bespin.subscribe(name, function (event) {
                            var ret = {
                                index: index,
                                name:  name,
                                event: event
                            };
                            //console.log("To-Worker-Event: " + name + index)
                            worker.postMessage(USE_GEARS ? ret : dojo.toJson(ret));
                        });
                    })();
                }
                else if (message.type == "publish") {
                    //console.log("From-Worker-Event: "+message.name)
                    bespin.publish(message.name, message.event);
                }
                else {
                    throw message;
                    cb.call(this, event);
                }
            };

            worker.onmessage = onmessage;
            source = "// YOUcannotGuessMe\n" + source;
            window.setTimeout(function() {
                worker.postMessage(source);
            }, 0);
            workers.push(worker);
        }
        return workers;
    },

    // create a shallow facade for object
    createFacade: function(obj) {

        var facade = this;

        for (var prop in obj) {
            // supposedly we dont need "private" methods. Delete if assumption is wrong
            if (prop.charAt(0) != "_") {
                // make a lexical scope
                (function() {
                    var val = obj[prop];
                    var method = prop;
                    // functions are replaced with code to call the worker
                    if (typeof val == "function") {
                        facade[prop] = function() {
                             var self  = this;
                             // each call gets a globally unique index
                             var index = CALL_INDEX++;
                             var paras = Array.prototype.slice.call(arguments);
                             if (this.__hasWorkers__) {
                                 var data = {
                                     callIndex: index,
                                     method: method,
                                     paras:  paras
                                 };
                                 if (!USE_GEARS) {
                                      // here we should really test whether our postMessage supports structured data. Safari 4 does not
                                     data = dojo.toJson(data);
                                 }
                                 // send the method to a worker
                                 // console.log("Contacting worker "+data)
                                 this.__getWorker__().postMessage(data);
                             } else {
                                 // No worker implementation available. Use an async call using
                                 // setTimeout instead
                                 var self = this;
                                 window.setTimeout(function() {
                                     var retVal = self.__obj__[method].apply(self.__obj__, paras);
                                     var callback = self.__callbacks__[index];
                                     delete self.__callbacks__[index];
                                     if (callback) {
                                         callback(retVal);
                                     }
                                 }, 0);
                             }
                             // Return an object to create a "fluid-interface" style callback generator
                             // callback will be applied against context
                             // callback will be part of the mutex
                             // paras is an array of extra paras for the callback
                             return {
                                 and: function(context, mutex, paras, callback) {
                                     var func = arguments[arguments.length - 1]; // always the last para
                                     if (mutex instanceof bespin.worker.Mutex) {
                                         mutex.start();
                                         func = function() {
                                             callback.apply(this, arguments);
                                             mutex.stop();
                                         };
                                     }

                                     self.__callbacks__[index] = function() {
                                         paras = Array.prototype.slice.call(arguments).concat(paras);
                                         func.apply(context, paras);
                                     };
                                 }
                             };
                        };
                    }
                    else {
                        // put instance vars here, too?
                    }
                })();
            }
        }
    },

    // Determines whether there are functions (deeply) inside a JS object
    hasFunctions: function(obj) {
        for (var i in obj) {
            var val = obj[i];
            if (typeof val == "function") {
                return true;
            }
            if (val && typeof val == "object") {
                if (this.hasFunctions(val)) {
                    return true;
                }
            }
        }
        return false;
    },

    // Recursively turn a JS object into its source including functions
    serializeToPortableSource: function(obj) {
        var self   = this;

        var isArray = dojo.isArray(obj);

        var source = isArray ? "[\n" : "{\n";

        for (var prop in obj) {
            // console.log("Serializing "+prop);
            (function() { // lexical scope
                if (prop == "_constructor") { // workaround for unserializable method in dojo
                    return;                  // maybe replace with test for [native code] in string
                }
                var val    = obj[prop];
                var method = prop;
                var src = "";
                if (typeof val == "function") { // serialize function to their string representation
                    src = val.toString();      // toSource() might be better but toString insert nice line breaks
                }
                // if val is an object that included functions we need to call ourselves recursively
                else if (val && typeof val == "object" && self.hasFunctions(val)) {
                    src = self.serializeToPortableSource(val);
                }
                // everything else is turned into JSON
                else {
                    src = dojo.toJson(val);
                }

                // Make sure to encode the property so nobody can insert arbitrary string into our JS
                prop = '"'+prop.replace(/"/g, '\\"', 'g')+'"';

                source += isArray ? "" : prop+": ";

                source += src+",\n";
            })();
        }

        source += isArray ? "]\n" : "}\n";

        return source;
    },

    createWorkerSource: function(obj, libs) {
        var con = function(msg) {
            postMessage("log="+msg);
        };
        var source = "";

        if (libs) {
            var quoted = [];
            dojo.forEach(libs, function(lib) {
                quoted.push("'"+lib+"'");
            });
            source += "importScripts("+quoted.join(", ")+");\n";
        }

        source += "var theObject = "+this.serializeToPortableSource(obj);

        //console.log(source);

        return source;
    }

});

/**
 * Object that maintains a counter of running workers/async processes.
 * Calling after(callback) schedules a function to be called until all async
 * processes are finished.
 * Is Mutex the correct term?
 */
exports.Mutex = SC.Object.extend({
    constructor: function(name, options) {
        this.name  = name;
        this.count = 0;
        this.afterJobs = [];
        this.options   = options || {};
    },
    start: function() {
        this.count = this.count + 1;
    },
    stop: function() {
        this.count = this.count - 1;
        if (this.count == 0) {
            if (this.options.onlyLast) {
                var last = this.afterJobs[this.afterJobs.length-1];
                if (last) {
                    last();
                }
            } else {
                for (var i = 0; i < this.afterJobs.length; ++i) {
                    var job = this.afterJobs[i];
                    job();
                }
            }
            this.afterJobs = [];
        }
    },
    after: function(context, func) {
        this.afterJobs.push(function() {
            func.call(context);
        });
    }
});

// Copyright 2007, Google Inc.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
//  1. Redistributions of source code must retain the above copyright notice,
//     this list of conditions and the following disclaimer.
//  2. Redistributions in binary form must reproduce the above copyright notice,
//     this list of conditions and the following disclaimer in the documentation
//     and/or other materials provided with the distribution.
//  3. Neither the name of Google Inc. nor the names of its contributors may be
//     used to endorse or promote products derived from this software without
//     specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR IMPLIED
// WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
// EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
// PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
// OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
// WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
// OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
// ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// Sets up google.gears.*, which is *the only* supported way to access Gears.
//
// Circumvent this file at your own risk!
//
// In the future, Gears may automatically define google.gears.* without this
// file. Gears may use these objects to transparently fix bugs and compatibility
// issues. Applications that use the code below will continue to work seamlessly
// when that happens.

// Sorry Google for modifying this :)
function BespinGearsInitializeGears() {
  // We are already defined. Hooray!
  if (window.google && google.gears) {
    return;
  }

  var factory = null;

  // Firefox
  if (typeof GearsFactory != 'undefined') {
    factory = new GearsFactory();
  } else {
    // IE
    try {
      factory = new ActiveXObject('Gears.Factory');
      // privateSetGlobalObject is only required and supported on WinCE.
      if (factory.getBuildInfo().indexOf('ie_mobile') != -1) {
        factory.privateSetGlobalObject(this);
      }
    } catch (e) {
      // Safari
      if (navigator.mimeTypes["application/x-googlegears"]) {
        factory = document.createElement("object");
        factory.style.display = "none";
        factory.width = 0;
        factory.height = 0;
        factory.type = "application/x-googlegears";
        document.documentElement.appendChild(factory);
      }
    }
  }

  // *Do not* define any objects if Gears is not installed. This mimics the
  // behavior of Gears defining the objects in the future.
  if (!factory) {
    return;
  }

  // Now set up the objects, being careful not to overwrite anything.
  //
  // Note: In Internet Explorer for Windows Mobile, you can't add properties to
  // the window object. However, global objects are automatically added as
  // properties of the window object in all browsers.
  if (!window.google) {
    google = {};
  }

  if (!google.gears) {
    google.gears = {factory: factory};
  }
}
