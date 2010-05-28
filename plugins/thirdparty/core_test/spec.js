// ==========================================================================
// Project:   CoreTest Unit Testing Library
// Copyright: ©2010 Apple Inc. All rights reserved.
// License:   Licened under MIT license (see license.js)
// ==========================================================================
/*globals describe before after it val */
"use exports describe before after it val";

/**
  @file @private
  
  UNFINISHED -
  
  Implements a BDD-style specification API.  Example:
  
  {{{
    describe('some part of the app', function() {
    
      before(function() {
        this.foo = 'bar';
      });
      
      after(function() {
        this.foo = null;
      });
      
      it('should do something', function() {
        val(this.foo).shouldBe('bar');
      });
      
      describe('a nested part of the app', function() {
        before(function() {
          // also sets this.foo = 'bar' before this
          this.bar = 10;
        });
        
        it('should have foo and bar', function() {
          val(this.foo).shouldBe('bar');
          val(this.bar).greaterThan(5);
        });
      });
      
    });
  }}}
*/

var Ct    =  require('core'),
    utils = require('utils'),
    valueOf;

// WARNING: This code is experimental and unfinished.  Do not use it. 

var state = {
  beforeHandlers: [],
  afterHandlers: [],
  mod: null
};

function _cancel(v, pr) {
  pr.reject();
}

function _resolve() {
  
}

/**
  Describes a new context.  In CoreTest terms this will setup a new module 
  on the current plan.
*/
exports.describe = function(desc, handler, context) {

  var plan, mod;
  
  // make a place for handlers on stack
  state.beforeHandlers.push(null);
  state.afterHandlers.push(null);

  // push on a new module or create one
  if (!state.mod) {
    plan = new Ct.Plan('spec');
    mod = state.mod = plan.module(desc);
  } else mod = state.mod = state.mod.module(desc); // nest
  
  handler.call(context); // setup the description

  // extract a list of all handlers currently nested
  var beforeHandlers, afterHandlers, idx, len;
  len = state.beforeHandlers.length;
  beforeHandlers = [];
  for(idx=0;idx<len;idx++) {
    handler = state.beforeHandlers[idx];
    if (handler) beforeHandlers.push(handler);
  }

  len = state.afterHandlers.length;
  afterHandlers = [];
  for(idx=0;idx<len;idx++) {
    handler = state.afterHandlers[idx];
    if (handler) afterHandlers.push(handler);
  }
  

  if (beforeHandlers.length>0) {
    mod.setup(function(test, setupPr) {
      var first = new utils.Promise(),
          pr    = first,
          len   = beforeHandlers.length,
          idx;
          
      for(idx=0;idx<len;idx++) {
        pr = pr.chainPromise(_resolve(beforeHandlers[idx]).bind(test), _cancel.bind(test));
      }
    }, true);
  }
  
  // remove before/after handlers from stack
  state.beforeHandlers.pop();
  state.afterHandlers.pop();

  // we created a plan if this is a top level describe.  If so, schedule it
  if (plan) Ct.run(plan);
};

describe("some foobar", function() {

  before.async(function(test, pr) {
    
  });
  
  it("should do one thing or another", function() {
    val('foo').shouldBe('foo');
  });

});



// root handler for the tdd model.  returns a new assertion object
valueOf = function(val) {
  var ret = utils.beget(valueOf.fn);
  ret.val = val;
  return ret ;
};

// object meaning 'empty' - make an array so it is a unique instance
exports.EMPTY = Ct.EMPTY = ['EMPTY'];

// comparison functions go here
valueOf.fn = {

  inverted: false,
  
  explain: function(pass, verb, expected) {
    var actual = Ct.dump(this.val);
    expected   = Ct.dump(actual);

    if (this.inverted) {
      pass = !pass;
      verb = 'not ' + verb;
    }
    var msg = utils.fmt('%@ should %@ %@', expected, verb, actual);
    
    Ct.assertion(pass, msg);
    return this;
  },
  
  // linker - valueOf('foo').should().be('foo');
  
  shouldBe: function(val) {
    this.inverted = false;
    if (arguments.length===0) return this;
    else return this._shouldBe(val);
  },
  
  _shouldBe: function(val) {
    var v = this.val;
    if (val===Ct.EMPTY) v = v && (v.length!==undefined) && v.length===0;
    else if (val===true) v = !!v;
    else if (val===false) v = !v;
    else v = (v === val);

    return this.explain(v, 'be', val);
  },

  shouldNotBe: function(val) {
    this.inverted = true;
    if (arguments.length===0) return this;
    else return this._shouldBe(val);
  },

  shouldBeTrue: function() {
    return this._shouldBe(true);
  },

  shouldBeFalse: function() {
    return this._shouldBe(false);
  },
  
  shouldBeEmpty: function() {
    return this._shouldBe(Ct.EMPTY);
  },
  
  shouldBeNull: function() {
    return this.shouldBe(null);
  },
  
  shouldNotBeNull: function() {
    return this.shouldNotBe(null);
  },
  
  shouldBeUndefined: function() {
    return this.shouldBe(undefined);
  },
  
  shouldNotBeUndefined: function() {
    return this.shouldNotBe(undefined);
  },
  
  shouldBeSame: function(val) {
    
  },
  
  shouldNotBeSame: function(val) {
    
  },
  
  shouldHave: function(len) {
    
  },
  
  shouldInclude: function(item) {
    this.inverted = false;
    return this.include(item);
  },
  
  shouldNotInclude: function(item) {
    this.inverted = true;
    return this.include(item);
  },
  
  include: function(item) {
    
  },
  
  shouldMatch: function(regex) {
    
  },
  
  shouldNotMatch: function(regex) {
    
  },
  
  shouldFail: function() {
    
  }
  
};



exports = module.exports = valueOf;
exports.valueOf = valueOf;