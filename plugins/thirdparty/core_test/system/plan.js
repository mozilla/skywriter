// ==========================================================================
// Project:   CoreTest Unit Testing Library
// Copyright: ©2010 Apple Inc. All rights reserved.
// License:   Licened under MIT license (see license.js)
// ==========================================================================


var utils = require('utils'),
    Promise = require('promise', 'bespin').Promise,
    Ct = require('core');
    
require('system/module'); // add Ct.Module

/**
  Describes a test plan.  A plan contains modules and tests.  To run it, call
  Ct.run(plan), which will generate a schedule to execute based on the 
  promises.
  
  @extends Object
*/
Ct.Plan = utils.extend({

  init: function(name) {
    this.name = name;
    this.modules = [];
  },

  /**
    Always returns receiver.  Used by modules to lookup the plan.
    
    @returns {Ct.Plan} receiver
  */
  plan: function() {
     return this;
  },
  
  // current module being described
  currentModule: null,

  /**
    Get or set the logger for the plan.  If you do not set a logger, then 
    a plan will use the logger defined at Ct.logger or create a new 
    Ct.DefaultLogger instead.
    
    @param {Ct.DefaultLogger} newLogger
      (Optional) new logger.  Instance must subclass Ct.DefaultLogger
      
    @returns {Ct.DefaultLogger|Ct.Plan} logger as getter, receiver as setter
  */
  logger: function(newLogger) {
    var ret, DefaultLogger;
    
    if (arguments.length>0) {
      this._logger = newLogger;
      return this;
      
    } else {
      ret = this._logger;
      if (!ret) ret = this._logger = (Ct.logger || Ct.defaultLogger);
      return ret ; 
    }
  },
  
  /**
    Add a new module to the plan.  Additional calls to setup(), teardown(),
    and test() will be passed along to this module until you call module()
    again to start a new module.
    
    @param {String} moduleName
      Human readable description of the new module
      
    @param {Hash} opts 
      (Optional) hash containing a setup and/or teardown property to be set
      as a the standard setup/teardown handlers
      
    @returns {Ct.Module|Ct.Plan} current module as getter, plan as setter
  */
  module: function(moduleName, opts) {
    var mod ;

    if (arguments.length === 0) return this._module();
    
    if (utils.T_STRING === typeof moduleName) {
      mod = new Ct.Module(moduleName);
    } else mod = moduleName ;
    
    mod.parent(this);
    this.currentModule = mod;
    this.modules.push(mod);

    if (opts && opts.setup) this.setup(opts.setup);
    if (opts && opts.teardown) this.teardown(opts.teardown);
    return this.currentModule ;
  },
  
  
  _module: function() {
    if (!this.currentModule) this.module('default');
    return this.currentModule;
  },

  /**
    Configure the setup handler for the current module.  If no module is 
    currently defined, a new module will be opened named "default" and the 
    setup handler will be added to it.
    
    @param {Function} handler 
      The setup handler
      
    @returns {Ct.Plan} receiver
  */
  setup: function(handler) {
    this._module().setup(handler);
    return this;
  },

  /**
    Configure the teardown handler for the current module.  If no module is 
    currently defined, a new module will be opened named "default" and the 
    setup handler will be added to it.
    
    @param {Function} handler 
      The teardown handler
      
    @returns {Ct.Plan} receiver
  */
  teardown: function(handler) {
    this._module().teardown(handler);
    return this;
  },

  /**
    Add a test to the current module.  If no module is currently set, starts 
    a new module named "defaulted" and adds the test to it.
    
    @param {String} testName
      Human readable description of the test
      
    @param {Function} handler 
      The test function
      
    @returns {Ct.Plan} receiver
  */
  test: function(testName, handler) {
    this._module().test(testName, handler);
    return this;
  },
  
  /**
    Runs the plan outside of the common CoreTest schedule.  Normally you will
    not use this method; it is really intended for testing the CoreTest API 
    itself.
    
    Instead you should always use CoreTest.run(plan) to schedule the plan as
    part of the global CoreTest schedule.
    
    @param {Hash} filter
      (Optional) nested hash of module names and tests to filter
      
    @returns {Promise} the final promise for the plan schedule 
  */
  run: function(filter) {
    var pr  = new utils.Promise(),
        ret = this.schedule(pr, filter);
        
    // cleanup memory when finished
    ret.then(function() { pr.destroy(); });
    pr.resolve();

    return ret;
  },

  /**
    Adds the current plan to the schedule represented by the promise, 
    optionally filtering tests according to the passed nested hash.  Normally
    you do not call this method directly.  It is called instead when you run
    the plan.
    
    @param {Promise} pr
      Initial schedule promise
      
    @param {Hash} filter
      (Optional) nested hash of module names and tests to filter
      
    @returns {Promise} new schedule promise to replace the one passed in
  */
  schedule: function(pr, filter) {
    
    var modules = this.modules,
        len   = modules.length,
        idx;
        
    if (len<=0) return pr; // nothing to do
    
    pr = pr.chainPromise(this._begin.bind(this), this._begin.bind(this));
    for(idx=0;idx<len;idx++) pr = modules[idx].schedule(pr, filter);
    pr = pr.chainPromise(this._end.bind(this), this._end.bind(this));
    
    return pr;
  },
  
  _begin: function() {
    Ct.runningPlan = this;
    this.logger().planDidBegin(this.name);
  },
  
  _end: function() {
    this.logger().planDidEnd(this.name);
    Ct.runningPlan = null;
  }
  
});
