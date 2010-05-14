// ==========================================================================
// Project:   CoreTest Unit Testing Library
// Copyright: ©2010 Apple Inc. All rights reserved.
// License:   Licened under MIT license (see license.js)
// ==========================================================================

"use exports module test ok equals expect start stop same run raises";

var Ct = require('core'),
    utils = require('utils');

    
// internal function called to finish a phase
function _finishPhase() {
  var st = Ct.qUnitStatus, pr = st.promise;

  // invoke final handler...
  if (st['final']) st['final']();
  
  // cleanup phase and resolve promise to move on
  st.promise    = st['final'] = null;
  st.isFinished = true;
  st.isRunning  = true;
  if (pr) pr.resolve();
  
}

// starts a new module.  This is basically the same as CoreTest
exports.module = function(moduleName, opts) {
  Ct.module(moduleName);
  
  var setup = opts && opts.setup,
      teardown = opts && opts.teardown;
      
  Ct.setup(function(t) {
    
    var pr = new utils.Promise() ;
    
    var st = {
      test: t,
      promise: pr, // changes as we step through each phase
      isFinished: false, // reset each phase
      expect:  -1, // tests in teardown
      assertions: 0,
      isRunning: true // used by start/stop
    };
    Ct.qUnitStatus = st;

    if (setup) setup();

    st.isFinished = true;
    if (st.isRunning) _finishPhase();
    
    return pr; //make async
  });

  Ct.teardown(function(t) {
    var st = Ct.qUnitStatus,
        pr = new utils.Promise();
        
    st.promise = pr ;
    st.isFinished = false;
    st.isRunning = true;
    
    // final code to run after teardown handler 
    st['final'] = function() {
      if (st.expects>=0) {
        t.equal(st.assertions, st.expects, 'expected assertions');
      }
      Ct.qUnitStatus = null ;
    };

    if (teardown) teardown();
    st.isFinished = true;
    if (st.isRunning) _finishPhase();
    
    return pr; // make async
  });
  
};


// adds a test.  We actually wrap an async test here so we can implement 
// start, stop, and expect
exports.test  = function(testName, handler) {
  
  if (!Ct.defaultPlan) exports.module('default');
  
  Ct.test(testName, function(t) {
    var st = Ct.qUnitStatus,
        pr = new utils.Promise();
        
    st.promise = pr;
    st.isFinished = false;
    st.isRunning  = true;
    
    handler();
    st.isFinished = true;
    if (st.isRunning) _finishPhase();

    return pr; // make this async
  });
  
};

// stops a test from finishing.  must be matched with a call to start() later
exports.stop = function() {
  if (!Ct.qUnitStatus) throw "cannot call stop() outside of a unit test";
  Ct.qUnitStatus.isRunning = false ;
};

// starts a test that was stopped.  Must be called after a call to start()
exports.start = function() {
  var st = Ct.qUnitStatus;

  if (!st) throw "cannot call stop() outside of a unit test";
  if (!st.isRunning && st.isFinished) _finishPhase();
  else st.isRunning = true;
};

// set the expected assertions for the test
exports.expect = function(cnt) {
  if (!Ct.qUnitStatus) throw "cannot call expect() outside of a unit test";
  Ct.qUnitStatus.expects = cnt;
};

// ok assertion
exports.ok = function(value, message) {
  if (!Ct.qUnitStatus) throw "cannot call ok() outside of a unit test";
  if (message === undefined) message = 'ok';
  Ct.qUnitStatus.assertions++;
  Ct.qUnitStatus.test.ok(value, message);
};

// equals assertion
exports.equals = function(actual, expected, message) {
  if (!Ct.qUnitStatus) throw "cannot call equals() outside of a unit test";
  if (message === undefined) message = 'ok';
  Ct.qUnitStatus.assertions++;
  Ct.qUnitStatus.test.equal(actual, expected, message);
};

// same assertion
exports.same = function(actual, expected, message) {
  if (!Ct.qUnitStatus) throw "cannot call same() outside of a unit test";
  if (message === undefined) message = 'same';
  Ct.qUnitStatus.assertions++;
  Ct.qUnitStatus.test.deepEqual(actual, expected, message);
};

exports.raises = function(handler, err, message) {
  if (!Ct.qUnitStatus) throw "cannot call raises() outside of a unit test";
  if (err === true) {
    err = message;
    message = undefined;
  }
  Ct.qUnitStatus.assertions++;
  Ct.qUnitStatus.test['throws'](handler, err, message);
};

exports.run = function() {
  Ct.run();
};


