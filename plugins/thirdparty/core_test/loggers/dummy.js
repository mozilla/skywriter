// ==========================================================================
// Project:   CoreTest Unit Testing Library
// Copyright: ©2010 Apple Inc. All rights reserved.
// License:   Licened under MIT license (see license.js)
// ==========================================================================

var utils = require('utils'),
    Ct    = require('core');
    
require('loggers/default'); // add Ct.DefaultLogger
    

/**
  DummyLogger simply logs any results into an internal array.  Most useful 
  for testing log output then testing the test framework itself.
  
  @extends Ct.DefaultLogger
*/
Ct.DummyLogger = utils.extend(Ct.DefaultLogger, 
  /** @scope Ct.DummyLogger.prototype */{
  
  name: 'dummy',

  BEGIN: 'begin',
  
  END: 'end',
  
  TEST: 'test',
  
  /**
    Populated with items describing the log history.  Each item in this 
    array witll be a hash contains the following properties:
    
     - plan: name of the plan
     - module: name of the module
     - test: name of the test
     - message: message
  
    @property {Array}
  */
  history: null,

  /**
    Resets the log history
  */
  reset: function() {
    this.history = [];
  },
  
  init: function() {
    Ct.DefaultLogger.prototype.init.apply(this, arguments);
    this.reset();
  },

  /**
    Looks for a message matching a passed template.  Returns the message if 
    found or null if none matches.
  */
  find: function(templ) {
    var hist = this.history,
        len  = hist ? hist.length : 0,
        idx, item, key, isMatch;
        
    for(idx=0;idx<len;idx++) {
      item = hist[idx];
      isMatch = true; 
      for(key in templ) {
        if (!templ.hasOwnProperty(key)) continue;
        if (item[key] !== templ[key]) isMatch = false;
      }
      if (isMatch) return item;
    }
    
    return null;
  },
  
  /**
    Evaluates the current history against the passed templates, logging
    assertions against the named test
  */
  expect: function(test, templs) {
    var hist = this.history,
        len  = hist ? hist.length : 0,
        idx, item, templ, key;

    // normalize arguments
    if (arguments.length===1) {
      templs = test;
      test   = Ct;
    }

    test.equal(hist.length, templs.length, 'history.length');
    
    for(idx=0;idx<len;idx++) {
      item = hist[idx];
      templ = templs[idx];
      if (!templ) continue; // allow null|undefined to skip items
      
      for(key in templ) {
        if (!templ.hasOwnProperty(key)) continue;
        test.deepEqual(item[key], templ[key], utils.fmt('history[%@].%@', idx, key));
      }
    }
        
  },
  
  /**
    Temporarily redirect logging to this logger.  This will schedule the 
    redirect; not perform it immediately.
  */
  redirect: function() {
    Ct.then(this, this._redirect);
    return this;
  },
  
  _redirect: function() {
    this.previousLogger = Ct.logger;
    Ct.logger = this;  
  },
  
  /** 
    Restore a redirected logger.  This will schedule the restore; not perform
    it immediately.
  */
  restore: function() {
    Ct.then(this, this._restore);
    return this;
  },
  
  _restore: function() {
    Ct.logger = this.previousLogger;
    this.previousLogger = null;
  },
  
  // ..........................................................
  // CORE API - Overide in your subclass
  // 
  
  begin: function(planName) {
    this.history.push({ plan: planName, kind: this.BEGIN });
    this.currentPlan = planName;
  },
  
  end: function(planName) {
    this.history.push({ plan: planName, kind: this.END }) ;
    this.currentPlan = null;
  },
  
  add: function(status, testInfo, message) {
    this.history.push({
      kind: this.TEST,
      plan: this.currentPlan,
      modules: testInfo.moduleNames,
      test: testInfo.testName,
      status: status,
      message: message,
      mode: testInfo.mode
    });
  }
  
});

// make available to those directly importing this module
exports = module.exports = Ct.DummyLogger;
exports.DummyLogger = Ct.DummyLogger;

