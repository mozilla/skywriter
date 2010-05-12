// ==========================================================================
// Project:   CoreTest Unit Testing Library
// Copyright: ©2010 Apple Inc. All rights reserved.
// License:   Licened under MIT license (see license.js)
// ==========================================================================

"use exports DefaultLogger";

var utils = require('utils'),
    Ct    = require('core'),
    hasConsole = 'undefined' !== typeof console; 

/**
  Defines a logger class for logging test output.  You can subclass this 
  logger to redirect test output to another source.  All test loggers by 
  default can be chained, allowing you to both log to a console and capture
  output for Selenium, for example.

  To implement a logger, you need to implement the following methods:
  
  - begin(planName)
  - end(planName)
  - add(Ct.PASS | Ct.FAIL | Ct.WARN | Ct.ERROR,  testInfo, message)

  To setup a logger, just create the logger using LoggerName.create('name').
  To chain loggers use then().
  
  {{{
    LoggerA = Ct.DefaultLogger.create('default');
    LoggerB = Ct.BrowserLogger.create('browser').then(LoggerA);
  }}}
  
*/
Ct.DefaultLogger = utils.extend(/** @scope Ct.DefaultLogger.prototype */{
  
  /**
    The name of the logger.  Can be used for output.
  */
  name: 'unknown',
  
  /**
    The next logger in the chain.  Set with then().
    
    @type {Ct.DefaultLogger}
  */
  next: null,

  init: function(name) {
    this.name = name;
  },

  /**
    Sets the next logger in the chain; returns receiver
    
    @param {Ct.DefaultLogger} the next logger
    @returns {Ct.DefaultLogger} the current logger
  */
  then: function(next) {
    this.next = next; 
    return this ;
  },
  
  // ..........................................................
  // CORE API - Overide in your subclass
  // 
  
  /**
    Called when a new plan begins to run.  This can be used to setup any 
    default settings.  Only one plan can run at a time.
    
    Override this method in your subclass
    
    @param {String} planName the name of the plan to invoke
    @returns {void}
  */
  begin: function(planName) {
    var state = this.state;
    if (!state) state = this.state = {};
    
    if (state.isRunning) throw "logger only supports one plan at a time";
    state.isRunning = true;
    
    if (hasConsole && console.group) console.group(planName);
  },
  
  /**
    Called when a plan is finished funning.  This should be used to cleanup 
    any outstanding info and generate a final report based on collected stats
    
    Override this method in your subclass
    
    @param {String} planName the name of the plan to the invoke
    @returns {void}
  */
  end: function(planName) {
    var state = this.state, loc;
    if (!state || !state.isRunning) throw "plan must be running to end it";
    
    if (hasConsole && console.groupEnd) {
      if (state.testName) console.groupEnd(state.testName);

      // end nested modules
      loc = state.moduleNames ? state.moduleNames.length : -1;
      while(--loc >= 0) console.groupEnd(state.moduleNames[loc]);

      console.groupEnd(planName);
      console.log((planName||'') + ' plan complete.');
    }

    this.state = null; // clear state
  },
  
  /**
    Called to log an assertion out.  First param is the status, second is the
    message.  Override this method in your subclass
    
    @param {String} status 
      status of the message.  Must be Ct.PASS, Ct.FAIL, Ct.ERROR, Ct.WARN
      
    @param {Hash} testInfo
      describes the test.  has moduleName, testName, mode.  mode is one of 
      Ct.SETUP_MODE, Ct.TEARDOWN_MODE, Ct.TEST_MODE
      
    @param {String} message
      optional message explaining the status
      
    @returns {void}
  */
  add: function(status, testInfo, message) {
    
    var state = this.state, 
        testName, moduleNames, testMode, msg, len, idx, loc;
    
    if (!state || !state.isRunning) throw "plan must be running to log it";

    if (!hasConsole) return; // nothing to do

    moduleNames = testInfo.moduleNames;
    if (!moduleNames || moduleNames.length===0) moduleNames = ['default'];

    testName   = testInfo.testName || 'default';
    testMode   = testInfo.mode || 'test';

    // find where the old and new set of modules names diverge
    if (!state.moduleNames) loc = 0;
    else {
      len = state.moduleNames.length;
      loc = -1;
      for(idx=0;(loc<0) && (idx<len); idx++) {
        if (state.moduleNames[idx] !== moduleNames[idx]) loc = idx; 
      }
      if (loc<0) loc = len;
    }
    
    // end current module and start new one if needed
    if (loc !== moduleNames.length) {
      
      // exit current modules if there are any
      idx = state.moduleNames ? state.moduleNames.length : 0;
      if (console.groupEnd && (idx>loc)) {
        console.groupEnd(state.testName);
        while(--idx >= loc) console.groupEnd(state.moduleNames[idx]);
      }
      
      // begin new module if needed
      len = moduleNames.length;
      if (console.group && (loc<len)) {
        for(idx=loc;idx<len;idx++) console.group(moduleNames[idx]);
        console.group(testName);
      }
      
      state.moduleNames = moduleNames;
      state.testName = testName;

    // if module did not change, but test changed, handle that on its own
    } else if (state.testName !== testName) {
      if (state.testName && console.groupEnd) {
        console.groupEnd(state.testName);
      }
      
      if (console.group) console.group(testName);
      state.testName = testName ;
    }

    // now log the message itself
    if (testMode !== Ct.TEST_MODE) {
      msg = utils.fmt('%@: %@ in %@', status, message, testMode);
    } else msg = utils.fmt('%@: %@', status, message);

    switch(status) {
      case Ct.ERROR:
      case Ct.FAIL:
        if (console.error) console.error(msg);
        else console.log(msg);
        break;
        
      case Ct.WARN:
        if (console.warn) console.warn(msg);
        else console.log(msg);
        break;
        
      default:
        if (console.info) console.info(msg);
        else console.log(msg);
    }
  },
  
  // ..........................................................
  // PUBLIC API - entry points to send log
  // 

  /**
    Called whenever a new plan begins to execute.
  */
  planDidBegin: function(planName) {
    this.begin(planName);
    if (this.next) this.next.planDidBegin(plan);
    return this;
  },

  /**
    Called when a plan ends.
  */
  planDidEnd: function(planName) {
    this.end(planName);
    if (this.next) this.next.planDidEnd(plan);
    return this;
  },

  /**
    Called when an assertion passes
  */
  pass: function(testInfo, msg) {
    this.add(Ct.PASS, testInfo, msg);
    if (this.next) this.next.pass(testInfo, msg);
    return this;
  },

  /**
    Called when an assertion fails
  */
  fail: function(testInfo, msg) {
    this.add(Ct.FAIL, testInfo, msg);
    if (this.next) this.next.fail(testInfo, msg);
    return this;
  },

  /**
    Called when an assertion has an error
  */
  error: function(testInfo, msg) {
    this.add(Ct.ERROR, testInfo, msg) ;
    if (this.next) this.next.error(testInfo, msg);
    return this;
  },

  /**
    Called when an assertion as a warning
  */
  warn: function(testInfo, msg) {
    this.add(Ct.WARN, testInfo, msg) ;
    if (this.next) this.next.warn(testInfo, msg);
  },
  
  info: function(testInfo, msg) {
    this.add(Ct.INFO, testInfo, msg) ;
    if (this.next) this.next.info(testInfo, msg);
  }

});

// make available to those directly importing this module
exports = module.exports = Ct.DefaultLogger;
exports.DefaultLogger = Ct.DefaultLogger;

