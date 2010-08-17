// ==========================================================================
// Project:   SproutCore Unit Testing Library
// Copyright: ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licened under MIT license (see license.js)
// ==========================================================================
/*globals CoreTest exports */

var utils = require('utils'), 
    Promise = require('bespin:promise').Promise,
    CoreTest, Ct;

/** @namespace

  CoreTest is the unit testing library for SproutCore.  It includes a test 
  runner based on QUnit with some useful extensions for testing SproutCore-
  based applications.
  
  You can use CoreTest just like you would use QUnit in your tests directory.
*/
CoreTest = {
  
  /**
    @class

    Error thrown by assertions that have failed.  For these assertions you may
    also set the CoreTest.throwsOnFailure property to false.

    When throwing an error, pass any properties you want copied onto the 
    error. The message, actual, and expected are required to properly log the 
    output.

    h2. Examples

    Throwing an error:

    {{{
      new AssertionError({ message: "foo", expected: "bar", actual: "baz" });
    }}}

    Optional (non-standard) method using parameters:

    {{{
      new AssertionError('actual', 'expected', 'message');
    }}}

    @since SproutCore 1.1
  */
  AssertionError: utils.extend(Error, {

    init: function(actual, expected, message) {
      if (arguments.length === 1) utils.mixin(this, actual);
      else {
        this.actual   = actual;
        this.expected = expected;
        this.message  = message;
      }

      this.desc = this.message;

      var ret = ['AssertionError:'];
      if (this.message) ret.push(this.message);
      if ((this.actual!==undefined) || (this.expected!==undefined)) {
        var act = Ct.dump(this.actual),
            exp = Ct.dump(this.expected);
        ret.push(utils.fmt('(actual = "%@" - expected = "%@")', act, exp));
      }
      this.message = ret.join(' ');

      return this ;
    },

    toString: function() {
      return this.message;
    }

  }),

  // ..........................................................
  // PRIMITIVE API
  // 

  /** @private 
    set or return the current tail promise for the schedule
  */
  _schedule: function(pr) {
    if (arguments.length===0) {
      if (!(pr = this._scheduleTail)) {
        pr = this._scheduleTail = new Promise('CoreTest.head');
        // I don't know what the line below was supposed to do,
        // but tiki no longer has this API. commenting out to
        // see if this is even necessary with the current code.
        // kdangoor 2010/05/14
        // tiki.ready(pr, pr.resolve);

        // Seems like we have to resolve the promise, to tell Ct that a new
        // task can get executed. jviereck 2010/05/27
        pr.resolve();
      }
      return pr ;
    } else {
      this._scheduleTail = pr;
      return this;
    }
  },
  
  /**
    Adds a plan's modules and tests to the current test schedule.  If the 
    schedule has not been started yet, it will begin to run when the browser
    is ready to start handling events.
    
    Normally you will not call this method with any parameters, but instead
    let is schedule the default plan for you instead (which you fill in with
    the test planning API).  
    
    However, if you want to provide your own custom plan or filter the tests
    that will be run, you may want to pass your own plan object and filters.
    
    @param {Plan} plan
      (Optional) Plan to schedule or null if you want to use the default plan
      
    @param {Hash} filter
      (Optional) Nested hash of module names and test names describing the 
      tests you want to actually run.  Only those tests will be added to the
      schedule.
      
    @returns {CoreTest} receiver
  */
  run: function(plan, filter) {
    if (!plan) plan = this._defaultPlan();

    var pr = this._schedule();
    this._schedule(plan.schedule(pr, filter));
    
    // reset default plan once it has been scheduled to run
    if (plan === this.defaultPlan) this.defaultPlan = null ; 
    return this;
  },
  
  /**
    Used for testing.  Adds the passed callback to the schedule, executing it
    after the current end of schedule completes.  Note that if you do not 
    pass a cancelHandler, your successHandler will be invoked in either case.
    
    @param {Object} context 
      (Optional) context object
    
    @param {Function} successHandler
      function to invoke if previous promise succeeds
      
    @param {Function} cancelHandler
      function to invoke if previous promise is cancelled
      
    @returns {Promise} the next promise in the schedule
  */
  then: function(context, successHandler, cancelHandler) {
    
    // normalize arguments
    if (arguments.length<3 && ('function' === typeof context)) {
      cancelHandler = successHandler;
      successHandler = context;
      context = this;
    }  
    if (!cancelHandler) cancelHandler = successHandler;
    
    var pr = this._schedule();
    pr = pr.chainPromise(successHandler.bind(context), cancelHandler.bind(context));
    this._schedule(pr);
    
    return pr ;
  },

  /**
    Primitive method logs an assertion.  All other assertion methods boil down
    to this one.  You can only call this method from within the setup, 
    teardown or test functions of a test.  Outside of these functions, this
    method will throw an exception.
    
    @param {Boolean} pass 
      true if the assertion passed, false if it failed

    @param {String} message
      (Optional) descriptive message
      
    @param {Object} expected
      (Optional) expected value
      
    @param {Object} actual
      (Optional) actual value
      
    @returns {CoreTest} receiver
  */
  assert: function(pass, message, expected, actual) {
    if (!this.currentTest) throw "cannot assert outside of a plan";
    this.currentTest.assert(pass, message, expected, actual);
    return this ;
  },
  
  /**
    Primitive logs an error. (i.e. an exception, not test failure)  
    
    @param {String|Error} err
      The error object or a message to log
    
    @returns {CoreTest} receiver
  */
  error: function(err) {
    if (!this.currentTest) throw "cannot log error outside of a plan";
    this.currentTest.error(err);
    return this ;
  },

  /**
    Primitive logs non-test information.  
    
    @param {String} message
      The message to log
    
    @returns {CoreTest} receiver
  */
  info: function(message) {
    if (!this.currentTest) throw "cannot log error outside of a plan";
    this.currentTest.info(message);
    return this ;
  },
  
  // ..........................................................
  // DEFAULT PLANNING API
  // 
  // these setup and schedule a default plan
  
  
  /**
    The current plan being planned.
    
    @property {Ct.Plan}
  */
  defaultPlan: null,

  _defaultPlan: function() {
    if (!this.defaultPlan) this.defaultPlan = new Ct.Plan('default');
    return this.defaultPlan;
  },
  
  module: function(moduleName, opts) {
    this._defaultPlan().module(moduleName, opts);
    return this;
  },
  
  setup: function(handler) {
    this._defaultPlan().setup(handler);
    return this;
  },

  teardown: function(handler) {
    this._defaultPlan().teardown(handler);
    return this;
  },

  test: function(testName, handler) {
    this._defaultPlan().test(testName, handler);
    return this;
  },
  
  // noop makes it easy to turn of tests - just change test() to notest()
  notest: function(testName, handler) {
    
  },
  
  // ..........................................................
  // LOGGER CONSTANTS
  // 
  
  /** Test is OK */
  OK: 'passed',
  
  /** alternative to OK */
  PASS: 'passed',
  
  /** Test failed */
  FAIL: 'failed',
  
  /** Test raised exception */
  ERROR: 'errors',
  
  /** Test raised warning */
  WARN: 'warnings',

  /** Test logged some info */
  INFO: 'info',
  
  /** In setup mode */
  SETUP_MODE: 'setup',
  
  /** In teardown mode */
  TEARDOWN_MODE: 'teardown',
  
  /** In test mode */
  TEST_MODE: 'test',
  
  /** Test is in planning mode (i.e. not running) */
  PLANNING_MODE: 'planning'
  
};

Ct = CoreTest;

// ..........................................................
// FINAL SETUP
// 

exports = module.exports = Ct;
exports.CoreTest = exports.Ct = Ct;

// Import some other modules required by code referenced here
require('system/dump');
require('system/plan');

// Choose a default logger based on platform.  Used in case no override is
// specified
var DefaultLogger = require('loggers/default');

/**
  Default logger used by a plan if you don't override it by setting Ct.logger
  or Plan.logger
  
  @property {DefaultLogger}
*/
Ct.defaultLogger = new DefaultLogger('default');


utils.setupDisplayNames(CoreTest, 'CoreTest');

