// ==========================================================================
// Project:   CoreTest Unit Testing Library
// Copyright: ©2010 Apple Inc. All rights reserved.
// License:   Licened under MIT license (see license.js)
// ==========================================================================


var utils = require('utils'),
    Ct = require('core');

require('system/test'); // add Ct.Test

/**
  Describes a single test module.  A test module contains an array of tests 
  which can be scheduled in the overall plan.  It may also contain a setup
  and teardown function to run before/after each test.
*/
Ct.Module = utils.extend({
  
  name: null,
  
  init: function(name) {
    this.name = name;
    this.tasks = [] ; // empty set of tests belonging to this module
  },
  
  /**
    Returns the module's parent when used as a getter, or updates the module
    parent when used as a setter.  A parent may be a Ct.Plan or another 
    module.
    
    @param {Ct.Plan|Ct.Module} newParent
      (Optional) new parent
      
    @returns {Ct.Plan|Ct.Module} parent as getter, receiver as setter
  */
  parent: function(newParent) {
    if (arguments.length===0) return this._parent;
    this._parent = newParent;
    return this;
  },
  
  /**
    The plan that owns the current module.  Computed by asking the module 
    parent.
    
    @returns {Ct.Plan} plan
  */
  plan: function() {
    var parent = this.parent();
    return parent ? parent.plan() : null;
  },
  
  /**
    Set or get the current setup handler for the module.
  */
  setup: function(handler) {
    if (arguments.length===0) return this._setup;
    this._setup = handler;
    return this;
  },
  
  /**
    Set or get the current teardown handler for the module
  */
  teardown: function(handler) {
    if (arguments.length===0) return this._teardown;
    this._teardown = handler;
    return this;
  },
  
  /**
    Add a new test to the module.  If you pass just a function, this will
    create a new Ct.Test object to contain it.
  */
  test: function(testName, handler) {
    if (typeof testName === utils.T_STRING) {
      testName = new Ct.Test(testName, handler);
    }
    testName.module(this);
    this.tasks.push(testName);
  },
  
  /**
    Add a new submodule to the current module.  The returned module instance
    should be used to schedule additional tests.
    
    @param {String|Ct.Module} moduleName
      A module object to add to the current task to a human readable 
      description of the module name to create a new module
      
    @param {Hash} opts
      (Optional) hash containing a default setup/teardown method
      
    @returns {Ct.Module} the new module
  */
  module: function(moduleName, opts) {
    var mod;
    if ('string' === typeof moduleName) {
      mod = new Ct.Module(moduleName);
      if (opts && opts.setup) mod.setup(opts.setup);
      if (opts && opts.teardown) mod.teardown(opts.teardown);
    }
    
    mod.parent(this);
    this.tasks.push(mod); // add to task list
    return mod;
  },
  
  /**
    Returns an array containing the ordered list of modules.  Used by the 
    tests to send to the logger.
    
    @returns {Array} array of module names
  */
  moduleContext: function() {
    var par = this.parent(),
        ret = (par && par.moduleContext) ? par.moduleContext() : null;
    if (!ret) ret = [];
    ret.push(this.name);
    return ret ;
  },
  
  /**
    Schedules all the tests in the current module by attaching to the passed
    promise.  Returns a new promise that should form the room of the plan
    schedule.
  */
  schedule: function(pr, filter) {
    
    // skip if a filter is applied and this module is not included
    if (filter && !filter[this.name]) return pr; 
    else if (filter) filter = filter[this.name];

    var tasks = this.tasks,
        len   = tasks.length,
        idx;
    for(idx=0;idx<len;idx++) pr = tasks[idx].schedule(pr, filter);
    return pr;
  }
  
});
