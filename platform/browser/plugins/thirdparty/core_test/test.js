// ==========================================================================
// Project:   CoreTest Unit Testing Library
// Copyright: ©2010 Apple Inc. All rights reserved.
// License:   Licened under MIT license (see license.js)
// ==========================================================================

var Ct    = require('core'),
    utils = require('utils'),
    trimmer = (/^test\s*/) ;

require('system/plan'); // add Ct.Plan
    
/** 
  @file 
  
  Implements the CommonJS API to run a suite of tests.  This looks on the 
  passed object hash and builds a "plan" which can be run to the standard 
  logger.  Looks for a property called "logger" to select the logger.  
  
  Otherwise will use the default logger defined on CoreTest.
*/

// iterates through a single hash and adds any tests. recursively called for
// any nested subgroups.  subgroups are treated as modules
function addTests(mod, tests) {
  
  var key, value ;
  for(key in tests) {

    // limit processing to spec...
    if ((key==='test') || (key.indexOf('test')!==0)) continue;
    
    value = tests[key];
    switch(utils.typeOf(value)) {
      case utils.T_HASH:
        addTests(mod.module(key), value);
        break;
        
      case utils.T_FUNCTION:
        mod.test(key, value);
        break;
        
      default:
        throw utils.fmt("test '%@' must be a function or hash (was %@)", key, utils.typeOf(value));
    }
  }
}

exports.run = function(tests) {
  
  var plan = new Ct.Plan(tests.name || 'unnamed plan');
  if (tests.logger) plan.logger(tests.logger);
 
  // add tests to a default module
  addTests(plan.module(), tests);
  
  Ct.run(plan);
};
