/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is
 * Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var catalog = require("bespin:plugins").catalog;
var SC = require("sproutcore/runtime").SC;
var Ct = require("core_test");
var DefaultLogger = require('loggers/default', 'core_test');
var BrowserLogger = require("core_test:loggers/browser");
var group = require("bespin:promise").group;
var test = require("core_test:test");
var utils = require("core_test:utils");

var lastTest = null;

var textDiv, textNode;    

// convert a string into HTML-escaped text.
var _text = function(str) {
  if (!textNode) textNode = document.createTextNode('');
  if (!textDiv) {
    textDiv = document.createElement('div');
    textDiv.appendChild(textNode);
  }
  
  textNode.nodeValue = str;
  return textDiv.innerHTML.toString().replace(/\n/g, '<br>');
};

// knows how to emit a single assertion
var AssertionEntry = SC.Object.extend({
  // expects status, message
  template: '<div class="plugindev_assertion %@1"><span class="name">%@2</span><span class="status">%@1</span></div>',
  
  emit: function() {
    return utils.fmt(this.template, _text(this.status), _text(this.message));
  }

});

// knows how to emit a single test (along with its assertions)
var TestEntry = SC.Object.extend({
  init: function() {
    this.assertions = [];
    this.status = { passed: 0, failed: 0, errors: 0, warnings: 0 };
  },
  
  // add an assertion to the log - also updates stats on the assertion
  add: function(status, message) {
    var entry = AssertionEntry.create({owner: this, status: status, 
        message: message});
    this.assertions.push(entry);
    if (this.status[status] !== undefined) this.status[status]++;
    if (this.plan()[status] !== undefined) this.plan()[status]++;
    this.owner.pass(status === 'passed');
    this.plan().assertions++;
    
    return entry ;
  },
  
  plan: function() { return this.owner.plan(); },
  
  
  // expects status, name, assertions, passed, failed, errors, warnings
  template: ['<div class="plugindev_test %@1">',
    '<span class="name">%@2</span>',
    '<span class="status">',
      '<span class="passed">%@4</span>',
      '<span class="warnings">%@7</span>',
      '<span class="failed">%@5</span>',
      '<span class="errors">%@6</span>',
    '</span>',
    '%@3',
  '</div>'].join(''),
  
  // emits the result
  emit: function() {
    var statsum = [], 
        status  = this.status, 
        assertions = [], 
        key, len, idx ;
        
    for(key in status) {
        if (status[key]>0) statsum.push(_text(key));
    }
    
    len = this.assertions.length;
    for(idx=0;idx<len;idx++) assertions.push(this.assertions[idx].emit());
    assertions = assertions.join('');
    
    return utils.fmt(this.template, statsum, _text(this.name), assertions, status.passed, status.failed, status.errors, status.warnings);
  }
  
});

// knows how to emit a module
var ModuleEntry = SC.Object.extend({
  
  init: function() {
    this.entries = []; // add another module or test here
    this._modules = {}; // for lookup
    this._tests = {}; // for lookup
    this.didPass = true;
  },

  // add or get module by name
  module: function(moduleName) {
    if (this._modules[moduleName]) return this._modules[moduleName];
    var ret = ModuleEntry.create({owner: this, name: moduleName});
    this._modules[moduleName] = ret;
    this.entries.push(ret);
    return ret ;
  },
  
  // add or get a test by name
  test: function(testName) {
    if (this._tests[testName]) return this._tests[testName];
    var ret = TestEntry.create({owner: this, name: testName});
    this._tests[testName] = ret ;
    this.entries.push(ret);
    this.plan().tests++;
    return ret ;
  },
  
  pass: function(aFlag) {
    if (!aFlag) this.didPass = false;
    this.owner.pass(aFlag);
  },
  
  plan: function() { return this.owner.plan(); },
  
  template: ['<div class="plugindev_module %@3">',
    '<span class="name">%@1</span>',
    '%@2',
  '</div>'].join(''),
  
  emit: function() {
    var assertions = [],
        key, len, idx;
        
    len = this.entries.length;
    for(idx=0;idx<len;idx++) assertions.push(this.entries[idx].emit());
    assertions = assertions.join('');
    
    var passed = this.didPass ? 'passed' : '';
    return utils.fmt(this.template, _text(this.name), assertions, passed);
  }

});

// knows how to emit a full plan
var PlanEntry = SC.Object.extend({
  
  init: function() {
    this.entries = [];
    this._modules = {};
    this.passed = this.errors = this.failed = this.warnings = 0;
    this.tests = this.assertions = 0 ;
  },
  
  pass: function() { 
    // noop
  },
  
  plan: function() { return this; },
  
  module: function(moduleName) {
    if (this._modules[moduleName]) return this._modules[moduleName];
    var ret = ModuleEntry.create({owner: this, name: moduleName});
    this._modules[moduleName] = ret ;
    this.entries.push(ret);
    return ret;
  },
  
  template: ['<div class="plugindev_plan">',
    '<span class="name">%@1</span>',
    '%@2',
  '</div>'].join(''),
  
  emit: function() {
    var assertions = [],
        key, len, idx;
        
    len = this.entries.length;
    for(idx=0;idx<len;idx++) assertions.push(this.entries[idx].emit());
    assertions = assertions.join('');
    
    return utils.fmt(this.template, _text(this.name), assertions);
  }

});

var TestOutputLogger = SC.Object.extend({
    // The request that this test run is associated with
    request: null,
    /**
      The next logger in the chain.  Set with then().

      @type {Ct.DefaultLogger}
    */
    next: null,
    
    init: function() {
        this.plans = [];

        this.status = { 
          passed: 0, 
          failed: 0, 
          errors: 0, 
          warnings: 0, 
          tests: 0, 
          assertions: 0 
        }; 
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
    
    emit: function(plan) {
      var status = this.status, 
          ret, idx, key;

      ret = plan.emit();
      
      this.request.output(ret);

      for(key in status) {
        if (!status.hasOwnProperty(key)) continue;
        status[key] += plan[key];
      }
    },
    
    begin: function(planName) {
      var plan = PlanEntry.create({name: planName});
      this.plans.push(plan);
      this.currentPlan = plan;
    },
    
    summarize: function() {
        var status = this.status;
        var ret = ['<div class="plugindev_summary">'];
        ret.push(utils.fmt('Completed %@ assertions in %@ tests: ', status.assertions, status.tests));
        ret.push(utils.fmt('<span class="passed">%@ passed</span>', status.passed));

        var key, hasErrors;
        hasErrors = (status.failed + status.errors + status.warnings)>0;
        if (hasErrors) {
          for(key in status) {
            if (!status.hasOwnProperty(key) || (key==='passed')) continue;
            if ((key==='tests') || (key==='assertions')) continue;
            ret.push(utils.fmt('<span class="%@1">%@2 %@1</span>', key, status[key]));
          }
        }
        ret.push('</div>');
        return ret.join("");
    },

    end: function(planName) {
      this.emit(this.currentPlan); 
      this.currentPlan = null;
      this.request.done(this.summarize());
    },


    add: function(status, testInfo, message) {

      var plan = this.currentPlan;
      if (!plan) throw "add called outside of plan";

      var testName = testInfo.testName,
          moduleNames = testInfo.moduleNames,
          len = moduleNames ? moduleNames.length : 0,
          idx, cur ;

      if (len===0) {
        moduleNames = ['default']; len = 1;  
      }

      cur = plan;
      for(idx=0;idx<len;idx++) cur = cur.module(moduleNames[idx]);
      cur = cur.test(testName);
      cur.add(status, message);
    },
    
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

exports.testrunner = function(env, args, request) {
    var plugin, testModule;
    
    var testspec = args.testmodule;
    if (!testspec) {
        if (lastTest == null) {
            testspec = "all";
        } else {
            testspec = lastTest;
        }
    }
    lastTest = testspec;
    
    var testsToRun = [];
    if (testspec == "all") {
        for (var pluginName in catalog.plugins) {
            plugin = catalog.plugins[pluginName];
            if (plugin.testmodules) {
                plugin.testmodules.forEach(function(testModule) {
                    testsToRun.push(pluginName + ":" + testModule);
                });
            }
        }
    } else if (testspec.indexOf(":") > 0) {
        testsToRun.push(testspec);
    } else {
        plugin = catalog.plugins[testspec];
        if (plugin == undefined) {
            request.doneWithError("Unknown plugin: " + testspec);
            return;
        }
        if (plugin.testmodules) {
            plugin.testmodules.forEach(function(testModule) {
                testsToRun.push(testspec + ":" + testModule);
            });
        }
    }
    
    // TODO make it ensure that the modules are all loaded
    var plan = new Ct.Plan(testspec);
    var logger = TestOutputLogger.create({request: request});
    plan.logger(logger);
    
    var promises = [];
    
    testsToRun.forEach(function(testmodule) {
        var pluginName = testmodule.split(":")[0];
        promises.push(tiki.async(pluginName));
    });
    
    var pr = group(promises);
    pr.then(function() {
        testsToRun.forEach(function(testmodule) {
            var mod = require(testmodule);
            // test.run(mod);
            var ctmod = plan.module(testmodule);
            for (var key in mod) {
                // limit processing to spec...
                if ((key==='test') || (key.indexOf('test')!==0)) continue;
            
                ctmod.test(key, mod[key]);
            }
        });
        Ct.run(plan);
    });
    request.async();
};
