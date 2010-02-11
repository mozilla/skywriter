// This is Kris Zyp's implementation of the CommonJS Promises spec
// (not yet ratified as of this writing). This is taken from the Narwhal
// repository.

// this is based on the CommonJS spec for promises:
// http://wiki.commonjs.org/wiki/Promises

// A typical usage:
// A default Promise constructor can be used to create a self-resolving deferred/promise:
// var Promise = require("Promise:core/promise").Promise;
//    var promise = new Promise();
// asyncOperation(function(){
//    Promise.resolve("successful result");
// });
//    promise -> given to the consumer
//
//    A consumer can use the promise
//    promise.then(function(result){
//        ... when the action is complete this is executed ...
//   },
//   function(error){
//        ... executed when the promise fails
//  });
//
// Alternately, a provider can create a deferred and resolve it when it completes an action.
// The deferred object a promise object that provides a separation of consumer and producer to protect
// promises from being fulfilled by untrusted code.
// var defer = require("Promise:core/promise").defer;
//    var deferred = defer();
// asyncOperation(function(){
//    deferred.resolve("successful result");
// });
//    deferred.promise -> given to the consumer
//
//    Another way that a consumer can use the promise (using promise.then is also allowed)
// var when = require("Promise:core/promise").when;
// when(promise,function(result){
//        ... when the action is complete this is executed ...
//   },
//   function(error){
//        ... executed when the promise fails
//  });

var printStackTrace = require("bespin:util/stacktrace").printStackTrace;

try {
    var enqueue = require("event-queue").enqueue;
}
catch(e) {
    // squelch the error, and only complain if the queue is needed
}
if (!enqueue) {
	enqueue = function(func){
		func();
	};
}

/**
 * Default constructor that creates a self-resolving Promise. Not all promise implementations
 * need to use this constructor.
 */
var Promise = function(canceller) {
};

/**
 * Promise implementations must provide a "then" function.
 */
Promise.prototype.then = function(resolvedCallback, errorCallback, progressCallback){
    throw new TypeError("The Promise base class is abstract, this function must be implemented by the Promise implementation");
};

/**
 * If an implementation of a promise supports a concurrency model that allows
 * execution to block until the promise is resolved, the wait function may be
 * added.
 */
/**
 * If an implementation of a promise can be cancelled, it may add this function
 */
 // Promise.prototype.cancel = function(){
 // };

Promise.prototype.get = function(propertyName){
    return this.then(function(value){
        return value[propertyName];
    });
};

Promise.prototype.put = function(propertyName, value){
    return this.then(function(object){
        return object[propertyName] = value;
    });
};

Promise.prototype.call = function(functionName /*, args */){
    return this.then(function(value){
        return value[propertyName].apply(value, Array.prototype.slice.call(arguments, 1));
    });
};

/** Dojo/NodeJS methods*/
Promise.prototype.addCallback = function(callback){
    return this.then(callback);
};

Promise.prototype.addErrback = function(errback){
    return this.then(function(){}, errback);
};

/*Dojo methods*/
Promise.prototype.addBoth = function(callback){
    return this.then(callback, callback);
};

Promise.prototype.addCallbacks = function(callback, errback){
    return this.then(callback, errback);
};

/*NodeJS method*/
Promise.prototype.wait = function(){
    return exports.wait(this);
};

Deferred.prototype = Promise.prototype;
// A deferred provides an API for creating and resolving a promise.
exports.Promise = exports.Deferred = exports.defer = defer;
function defer(){
    return new Deferred();
}

var contextHandler = exports.contextHandler = {};

function Deferred(canceller, rejectImmediately){
    var result, finished, isError, waiting = [], handled;
    var promise = this.promise = new Promise();
    var currentContextHandler = contextHandler.getHandler && contextHandler.getHandler();

    function notifyAll(value){
        if(finished){
            throw new Error("This deferred has already been resolved");
        }
        result = value;
        finished = true;
        if(rejectImmediately && isError && waiting.length === 0){
        	throw result;
        }
        for(var i = 0; i < waiting.length; i++){
            notify(waiting[i]);
        }
    }
    function notify(listener){
        var func = (isError ? listener.error : listener.resolved);
        if(func){
            handled = true;
        	enqueue(function(){
		    	if(currentContextHandler){
		    		currentContextHandler.resume();
		    	}
		        try{
	                var newResult = func(result);
		            if(newResult && typeof newResult.then === "function"){
		                newResult.then(listener.deferred.resolve, listener.deferred.reject);
		                return;
        		    }
        		    listener.deferred.resolve(newResult);
		        }
		        catch(e){
		            console.error("promise caught exception ", e);
		            console.log(printStackTrace({e: e}));
		        	listener.deferred.reject(e);
		        }
		        finally{
		        	if(currentContextHandler){
		        		currentContextHandler.suspend();
		        	}
		        }
        	});
        }
        else{
        	listener.deferred[isError ? "reject" : "resolve"](result);
        }
    }
    // calling resolve will resolve the promise
    this.resolve = this.callback = this.emitSuccess = function(value){
        notifyAll(value);
    };

    var reject = function(error){
        isError = true;
        notifyAll(error);
    };

    // calling error will indicate that the promise failed
    this.reject = this.errback = this.emitError = rejectImmediately ? reject : function(error){
    	return enqueue(function(){
    		reject(error);
    	});
    }
    // call progress to provide updates on the progress on the completion of the promise
    this.progress = function(update){
        for(var i = 0; i < waiting.length; i++){
            var progress = waiting[i].progress;
            progress && progress(update);
        }
    }
    // provide the implementation of the promise
    this.then = promise.then = function(resolvedCallback, errorCallback, progressCallback){
        var returnDeferred = new Deferred(promise.cancel, true);
        var listener = {resolved: resolvedCallback, error: errorCallback, progress: progressCallback, deferred: returnDeferred};
        if(finished){
            notify(listener);
        }
        else{
            waiting.push(listener);
        }
        return returnDeferred.promise;
    };

    if(canceller){
        this.cancel = promise.cancel = function(){
            var error = canceller();
            if(!(error instanceof Error)){
                error = new Error(error);
            }
            reject(error);
        }
    }

    // provide a function to optimize synchronous actions
    this.valueIfResolved = function() {
        return finished ? result : null;
    };
};

function perform(value, async, sync){
    try{
        if(value && typeof value.then === "function"){
            value = async(value);
        }
        else{
            value = sync(value);
        }
        if(value && typeof value.then === "function"){
            return value;
        }
        var deferred = new Deferred();
        deferred.resolve(value);
        return deferred.promise;
    }catch(e){
        console.error("promise caught exception: ", e);
        console.log(printStackTrace({e: e}));
        var deferred = new Deferred();
        deferred.reject(e);
        return deferred.promise;
    }

}
/**
 * Promise manager to make it easier to consume promises
 */

/**
 * Registers an observer on a promise.
 * @param value     promise or value to observe
 * @param resolvedCallback function to be called with the resolved value
 * @param rejectCallback  function to be called with the rejection reason
 * @param progressCallback  function to be called when progress is made
 * @return promise for the return value from the invoked callback
 */
exports.whenPromise = function(value, resolvedCallback, rejectCallback, progressCallback){
    return perform(value, function(value){
        return value.then(resolvedCallback, rejectCallback, progressCallback);
    },
    function(value){
        return resolvedCallback(value);
    });
};
/**
 * Registers an observer on a promise.
 * @param value     promise or value to observe
 * @param resolvedCallback function to be called with the resolved value
 * @param rejectCallback  function to be called with the rejection reason
 * @param progressCallback  function to be called when progress is made
 * @return promise for the return value from the invoked callback or the value if it
 * is a non-promise value
 */
exports.when = function(value, resolvedCallback, rejectCallback, progressCallback){
    if(value && typeof value.then === "function"){
    	return exports.whenPromise(value, resolvedCallback, rejectCallback, progressCallback);
    }
    return resolvedCallback(value);
};

/**
 * Gets the value of a property in a future turn.
 * @param target    promise or value for target object
 * @param property      name of property to get
 * @return promise for the property value
 */
exports.get = function(target, property){
    return perform(target, function(target){
        return target.get(property);
    },
    function(target){
        return target[property]
    });
};

/**
 * Invokes a method in a future turn.
 * @param target    promise or value for target object
 * @param methodName      name of method to invoke
 * @param args      array of invocation arguments
 * @return promise for the return value
 */
exports.post = function(target, methodName, args){
    return perform(target, function(target){
        return target.call(property, args);
    },
    function(target){
        return target[methodName].apply(target, args);
    });
};

/**
 * Sets the value of a property in a future turn.
 * @param target    promise or value for target object
 * @param property      name of property to set
 * @param value     new value of property
 * @return promise for the return value
 */
exports.put = function(target, property, value){
    return perform(target, function(target){
        return target.put(property, value);
    },
    function(target){
        return target[property] = value;
    });
};


/**
 * Waits for the given promise to finish, blocking (and executing other events)
 * if necessary to wait for the promise to finish. If target is not a promise
 * it will return the target immediately. If the promise results in an reject,
 * that reject will be thrown.
 * @param target   promise or value to wait for.
 * @return the value of the promise;
 */
exports.wait = function(target){
    if(!queue){
        throw new Error("Can not wait, the event-queue module is not available");
    }
    if(target && typeof target.then === "function"){
        var isFinished, isError, result;
        target.then(function(value){
            isFinished = true;
            result = value;
        },
        function(error){
            isFinished = true;
            isError = true;
            result = error;
        });
        while(!isFinished){
            queue.processNextEvent(true);
        }
        if(isError){
            throw result;
        }
        return result;
    }
    else{
        return target;
    }
};

/**
 * Takes an array of promises and returns a promise that that is fulfilled once all
 * the promises in the array are fulfilled
 * @param group  The array of promises
 * @return the promise that is fulfilled when all the array is fulfilled
 */
exports.group = function(group){
	var deferred = defer();
	if(!(group instanceof Array)){
		group = Array.prototype.slice.call(arguments);
	}
	var fulfilled = 0;
	var length = group.length;
	
	// if the original array has nothing in it, we can just
	// return now.
	if (!length) {
	    deferred.resolve([]);
	    return deferred.promise;
	}
	
	var results = [];
	group.forEach(function(promise, index){
		exports.when(promise, function(value){
			results[index] = value;
			fulfilled++;
			if(fulfilled === length){
				deferred.resolve(results);
			}
		},
		deferred.reject);
	});
	return deferred.promise;
};
