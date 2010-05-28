// ==========================================================================
// Project:   CoreTest Unit Testing Library
// Copyright: ©2010 Apple Inc. All rights reserved.
// License:   Licened under MIT license (see license.js)
// ==========================================================================


var utils       = require('utils'),
    Ct          = require('core'),
    Promise     = require('promise', 'bespin').Promise,
    Assertable  = require('assert').xCoreTestAssertable;

require('system/dump'); // add Ct.dump
 
/**
  Describes a single test.  To run a test must be scheduled as part of a 
  module.  If the test is async then the handler will be passed a promise 
  which is much resolve or cancel for the test run to continue.
*/
Ct.Test = utils.extend(Assertable, {
  
  /**
    Human readable test description.  This will be used when logging test
    results.
    
    @param {String}
  */
  name: null,

  /**
    true if this test should be run asynchronously.  All tests have a promise 
    associated with them that must resolve when they finish execution to 
    cause the next step to begin.  When you run a test asynchronously, you
    must resolve this promise yourself.  Otherwise it will resolve 
    automatically when your test handler finishes executing.
    
    Defaults to false.
    
    @property {Boolean}  
  */
  async: false,

  /**
    Set an alternate context to run the handler.  You can use this to control
    the value of "this" when your handler runs.  The setup and teardown 
    functions for a test will also have this same context when run.
    
    If no context is set, the test object itself will be used as the value of
    "this".
    
    @property {Object}
  */
  context: null,

  /**
    The current test execution mode.  Normally this value will remain 
    Ct.PLANNING_MODE, but when the test is actually running it will be one of
    Ct.SETUP_MODE, Ct.TEARDOWN_MODE, or Ct.TEST_MODE.  This is mostly used by
    the logger API to determine how a test result should be logged.
  */
  mode: Ct.PLANNING_MODE,

  /**
    Returns the plan that this test current belongs to.  Computed from the
    plan's module.
    
    @returns {Ct.Plan}
  */
  plan: function() {
    var mod = this.module();
    return mod ? mod.plan() : null;
  },

  /**
    Returns the module the test belongs to.  You can also set the module by
    passing it as a parameter to this method.  If you set the module returns
    the receiver.
    
    @param {Ct.Module} newModule
      (Optional) new module to set for this test
      
    @returns {Ct.Module|Ct.Test} module as getter, receiver as setter
  */
  module: function(newModule) {
    if (arguments.length===0) return this._module;    
    this._module = newModule;
    return this;
  },

  /**
    Returns the current logger for the test.  This is actually computted from
    the current plan.
    
    @returns {Ct.DefaultLogger} CoreTest logger instance
  */
  logger: function() {
    return this.plan().logger();  
  },
  

  // ..........................................................
  // PRIMITIVE API
  // 

  /**
    Set the number of expected assertions for the current phase.
  */
  expect: function(assertCount) {
    if (arguments.length === 0) return this._expectedAsserts;
    this._expectedAsserts = assertCount;
    return this;
  },
  
  /** 
    Primitive to assert a given test.  This will invoke the proper callback on
    the test plan logger as long as you are actually running a test.  
    
    @param {Boolean} pass
      truthy value indicating whether the assertion should pass or fail
    
    @param {String} message
      (Optional) log message describing the assertion
      
    @param {Object} actual
      (Optinal) actual value to log [no comparison will be performed]

    @param {Object} expected
      (Optional) expected value to log [no comparison will be performed]
    
    @returns {Ct.Test} receiver
  */
  assert: function(pass, message, actual, expected) {
    
    if (this.mode === Ct.PLANNING_MODE) {
      throw utils.fmt("Cannot assert while test is not running (%@)", this);
    }
    
    var logger   = this.logger(),
        plan     = this.plan(),
        raises   = plan ? plan.throwsOnFailure : false,
        showVars = arguments.length > 2,
        str;

    if (!pass) this.didFail = true; 
    this._actualAsserts++;
    
    if (showVars) {
      actual = Ct.dump(actual);
      expected = Ct.dump(expected);
    }

    if (pass) {
      str = showVars ? '%@ (actual = %@, expected = %@)' : '%@';
      logger.pass(this, utils.fmt(str, message, actual, expected));

    } else if (raises) {
      throw new Ct.AssertionError(actual, expected, message);

    } else {
      str = showVars ? '%@ (actual = %@, expected = %@)' : '%@';
      logger.fail(this, utils.fmt(str, message, actual, expected));
    }
    
    return this;
  },
  
  /**
    Primitive to log an error messages.  This is invoked if the test 
    encounters an unexpected exception while running.
  
    @param {String|Error} message message or exception to log
    @returns {Ct.Test} receiver
  */
  error: function(message) {
    if (this.mode === Ct.PLANNING_MODE) {
      throw utils.fmt("Cannot assert error while test is not running (%@)", this);
    }

    this.didFail = true ;
    this.logger().error(this, message);
    return this;
  },

  /**
    Adds some info to the logger.  Not a test - just some output.
    
    @param {String} the message to log
    @returns {Ct.Test} receiver
  */
  info: function(message) {
    if (this.mode === Ct.PLANNING_MODE) {
      throw utils.fmt("Cannot log info while test is not running (%@)", this);
    }
    this.logger().info(this, message);
    return this;
  },
  
  /**
    Schedules the current test to run after the passed promise resolves.  This
    will invoke a setup/teardown function, returning the final promise that 
    will resolve when the test as finished running.
    
    Normally you will not call this directly; it will be called by the owner
    module during scheduling.
    
    @param {Promise} pr the promise
    @param {Hash} filter 
      (Optional) hash of test names and a boolean value to select which to run
      
    @returns {Promise} the next promise for the schedule
  */
  schedule: function(pr, filter) {
    
    // skip if filter is included and this test is not part of it
    if (filter && !filter[this.name]) return pr;
    
    var mod     = this.module(),
        testId  = mod.name + ':' + this.name,
        ret     = new Promise(testId), // resolves when test has finished
        setupPr = new Promise(testId+'::setup'),
        testPr  = new Promise(testId+'::test'),
        teardownPr = new Promise(testId+'::teardown'),
        setupHandler, teardownHandler, testHandler, breakPr;
        
    setupHandler = this._phase(Ct.SETUP_MODE, mod.setup(), setupPr);
    testHandler = this._phase(Ct.TEST_MODE, this.handler, testPr);
    teardownHandler = this._phase(Ct.TEARDOWN_MODE, mod.teardown(), teardownPr);

    // force take a break between each test to avoid timer overruns
    breakPr = new Promise();
    pr.then(function() { setTimeout(function() { breakPr.resolve(); }, 1); });
    
    breakPr.then(setupHandler.bind(this));
    setupPr.then(testHandler.bind(this), teardownHandler.bind(this));
    testPr.then(teardownHandler.bind(this), teardownHandler.bind(this));
    teardownPr.then(ret.resolve.bind(ret), ret.resolve.bind(ret));
    return ret ;
  },
  
  // ..........................................................
  // PRIVATE METHODS
  // 

  /**
    @constructor
    
    Set the test name and (optionally) handler and async value.  A test 
    must have a handler to actually run.
    
    @param {String} name
      Human readable description of the test
      
    @param {Function} handler
      A handler to invoke when running the test
    
    @returns {void}
  */
  init: function(name, handler) {
    this.name = this.testName = name; // testName is needed for logging
    if (arguments.length>1) {
      this.handler = handler;
    }
    
    this.tests = [] ; // empty set of tests belonging to this module
  },
  
  toString: function() {
    var mod = this.module();
    mod = (mod && mod.name) ? mod.name : '(unknown module)';
    return utils.fmt("Ct.Test<%@:%@>", mod, this.name);  
  },
  
  /** @private
    Generate a handler function to invoke a particlar phase of the test 
    (setup, teardown or the test itself)
  */
  _phase: function(mode, handler, pr) {
    var test = this;
    return function() {

      // handle cleanup
      var mod = this.module(), hpr;
      
      if (mod && mod.moduleContext) mod = mod.moduleContext();
      this.moduleNames = mod || [];

      this.mode = mode;
      this.didFail = false ; 
      this._actualAsserts = 0 ;
      this._expectedAsserts = -1;
      Ct.currentTest = this;
      
      try { 
        if (handler) hpr = handler.call(test.context || test, test);
      } catch(e) {
        this.error(e);
        this.didFail = true;
      }

      // treat async if a promise was returned.  schedule followups
      if (hpr && hpr.then) {
        this._hookupAsync(hpr, pr);
      } else {
        if (!this.didFail) this._verifyAsserts(); 
        this.mode = Ct.PLANNING_MODE;
        Ct.currentTest = null;
        if (this.didFail) pr.reject(); else pr.resolve();
      }
    };
  },
  
  _bind: function(f) {
    var target = this;
    return function() {
      return f.apply(target, arguments);
    };
  },
  
  // listen for success/cancel handlers on promise.  Note that this must use
  // only the CommonJS promise API since we don't know the source of the 
  // promise that will be returned.
  _hookupAsync: function(hpr, pr) {
    var ok = this._bind(function() {
      this._verifyAsserts();
      this.mode = Ct.PLANNING_MODE ;
      Ct.currentTest = null;
      pr.resolve();
    });

    var cancel = this._bind(function() {
      this.mode = Ct.PLANNING_MODE;
      Ct.currentTest = null;
      pr.reject();
    });
    
    hpr.then(ok, cancel);
  },
  
  // if test is configured to expect some assertions, test for them.  If the
  // test has already failed for some reason, don't bother since it will 
  // fail anyway
  _verifyAsserts: function() {
    if (this.didFail) return; // nothing to do
    if (this._expectedAsserts>=0) {
      this.equal(this._actualAsserts, this._expectedAsserts, 'expected assertions');
    }
  }
  
});
