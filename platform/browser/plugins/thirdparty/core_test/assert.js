// ==========================================================================
// Project:   CoreTest Unit Testing Library
// Copyright: ©2010 Apple Inc. All rights reserved.
// License:   Licened under MIT license (see license.js)
// ==========================================================================

var Ct    = require('core'),
    utils = require('utils'),
    assert = {};

require('system/equiv'); // add Ct.equiv

/** @file

  Implements a CommonJS compatible assertion API.  Combined with the CommonJS
  standard "test" module, you can implement generic tests that should run on
  any CommonJS platform.
  
  h2. Example

  {{{
    var assert = require('assert', 'core_test'),

    exports.testFooIsBar = function() {
      assert.ok('foo' typeof 'bar', 'this will actually fail') ;
    };
    
    // other tests here - beginning with the word "test"
    
    // run tests like this
    require('test', 'core_test').run(exports);
  }}}
  
*/

// ..........................................................
// PUBLIC API
// 

/**
  Core assertion API defined as a mixin.  This API is mixed into the Ct.Test
  object and also wrapped here to export the standardized API.
*/
exports.xCoreTestAssertable = assert;
exports.AssertionError = Ct.AssertionError;

/**
  Tests whether a value is truthy (as determined by !!guard).  This is 
  equivalent to assert.equal(true, guard).  To test for strict equality use 
  assert.strictEqual(true, guard).
  
  @param {Object} value
    value to test
  
  @param {String} message
    optional message
    
  @returns {void}
*/
assert.ok = function ok(value, message) {
  this.assert(!!value, message, !!value, true);
};

/**
  Tests whether two value are coersively equal (i.e. ==).  To test for strict
  equality use assert.strictEqual(actual, expected).
  
  @param {Object} actual
    The computed value to test
    
  @param {Object} expected
    The expected value
    
  @param {String} message
    optional message 
    
  @returns {void}
*/
assert.equal = function(actual, expected, message) {
  message = (message||'') + ' should be equal';
  return this.assert(actual==expected, message, actual, expected);
};

/**
  Tests whether two value are coersively not equal (i.e. ==).  To test for 
  strict inequality use assert.strictNotEqual(actual, expected).
  
  @param {Object} actual
    The computed value to test
    
  @param {Object} expected
    The expected value
    
  @param {String} message
    optional message 
    
  @returns {void}
*/
assert.notEqual = function(actual, expected, message) {
  message = (message||'') + ' should not be equal';
  return this.assert(actual != expected, message, actual, expected);
};


/**
  Tests whether two value are equal by recursively evaluating each property on 
  both objects.
  
  @param {Object} actual
    The computed value to test
    
  @param {Object} expected
    The expected value
    
  @param {String} message
    optional message 
    
  @returns {void}
*/
assert.deepEqual = function(actual, expected, message) {
  message = message + ' should be deep equal';
  return this.assert(Ct.equiv(actual, expected), message, actual, expected);
};

/**
  Tests that two value are not equal by recursively evaluating each property 
  on both objects.
  
  @param {Object} actual
    The computed value to test
    
  @param {Object} expected
    The expected value
    
  @param {String} message
    optional message 
    
  @returns {void}
*/
assert.notDeepEqual = function(actual, expected, message) {
  message = message + ' should not be deep equal';
  return this.assert(!Ct.equiv(actual, expected), message, actual, expected);
};

/**
  Tests that two value are strictly equal (i.e. ===).  To test for coercive
  equality use assert.equal(actual, expected).
  
  @param {Object} actual
    The computed value to test
    
  @param {Object} expected
    The expected value
    
  @param {String} message
    optional message 
    
  @returns {void}
*/
assert.strictEqual = function(actual, expected, message) {
  message = message + ' should be strictly';
  return this.assert(actual === expected, message, actual, expected);
};

/**
  Tests whether two value are not strictly equal (i.e. ==).  To test for 
  coercive inequality use assert.notEqual(actual, expected).
  
  @param {Object} actual
    The computed value to test
    
  @param {Object} expected
    The expected value
    
  @param {String} message
    optional message 
    
  @returns {void}
*/
assert.notStrictEqual = function(actual, expected, message) {
  message = message + ' should not be strictly equal';
  return this.assert(actual !== expected, message, actual, expected);
};


function _throws (context, shouldThrow, block, err, message) {
  var exception = null,
      didThrow = false,
      typeMatters = true,
      pass;

  // normalize
  if (err) {
    if ('string' === typeof err) {
      message = err;
      err     = null;
      typeMatters = false;
    }
  } else typeMatters = false ;

  message = message || "";

  // no execute the passed function and save results
  try {
    block();
  } catch (e) {
    didThrow = true;
    exception = e;
  }

  // handle case where we expected it throw...
  if (shouldThrow) {
    
    if (typeMatters) {
      if ("function" === typeof err) {
        pass = didThrow && (exception instanceof err);
      } else {
        pass = didThrow && (exception === err);
      }
      
      message = message + " expected exception of type " + err.toString();

    } else {
      pass = didThrow ;
      message = message + " expected exception";
    }

  // did not expect an exception of specified type (or any one)
  } else {
    
    if (typeMatters) {
      if ("function" === typeof err) {
        pass = !(didThrow || (exception instanceof err));
      } else {
        pass = !(didThrow || (exception === err));
      }

      message = message+" did not expect exception of type "+err.toString();
    
    } else {
      pass = !didThrow;
      message = message + " did not expect exception";
    }
  }
  
  if (err && err.name) err = err.name;
  context.assert(pass, message, exception, err);
}

/**
  Invokes the passed function, expecting it to throw an exception.  If you 
  pass an Error object as a second parameter, then verifies that the thrown
  exception matches the passed type.
  
  @param {Function} func
    Callback to invoke
    
  @param {Error} errorOpt
    (Optional) exception to test against
    
  @param {String} message
    (Optional) message 
    
  @returns {void}
*/
assert['throws'] = function(func, errorOpt, message) {
  return _throws(this, true, func, errorOpt, message);
};

/**
  Invokes the passed function, expecting it to not throw an exception.  If you 
  pass an Error object as a second parameter, then verifies that if an 
  exception is throw, it does not match the specified type.  This is useful
  for example if you want to verify that a specific error condition does NOT
  occur.
  
  @param {Function} func
    Callback to invoke
    
  @param {Error} errorOpt
    (Optional) exception to test against
    
  @param {String} message
    (Optional) message 
    
  @returns {void}
*/
assert.doesNotThrow = function(func, errorOpt, message) {
  return _throws(this, false, func, errorOpt, message);
};

// ..........................................................
// EXPORT STANDARD API
// 

// bind assertion API to CoreTest namespace
function _bind(key) {
  var func = assert[key];
  return function() { return func.apply(Ct, arguments); };
}

for(var k in assert) {
  if (!assert.hasOwnProperty(k)) continue ;
  exports[k] = _bind(k);
}
