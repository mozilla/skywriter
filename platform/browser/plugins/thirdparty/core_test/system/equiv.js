// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licened under MIT license (see license.js)
// ==========================================================================

var Ct = require('core');

var _equiv; // internal loop function

/** 
  Tests for deep equality of any JavaScript type and structure without 
  unexpected results.  You can extend the behavior of equiv() by patching 
  properties on the equiv() function.  
  
  equiv.typeOf() is a function that will return the equivalence for a 
  particular object.  You can support new types by overriding this method to
  provide your own custom types.
  
  equiv.fn is a hash that contains equivalence tests for various types as 
  returned by equiv.typeOf().  You can change an existing implementation by
  replacing it or add support for new custom types by adding them here and 
  overriding equiv.typeOf().
  
  Note that this code cannot detect cyclical references.  If you include 
  cyclical references in your data structure equiv() may go into an infinite
  loop.
  
  @param {Object} object1
    the first object to compare
    
  @param {Object} object2
    the second object to compare
    
  @param {Object...} object3
    (optional) zero or more additional objects to also compare
    
  @returns {Boolean} true if all passed objects have deep equivalence
*/
Ct.equiv = function(object1, object2, object3) {
  var ret = true, len = arguments.length, t1, idx;
  
  t1 = Ct.equiv.typeOf(object1);
  if (len<2) len = 2; // always look at two args even if one is undefined
  for(idx=1;ret && (idx<len);idx++) ret = _equiv(t1, object1, arguments[idx]);
  return ret ;
};

_equiv = function _equiv(aType, a, b) {
  var func;
  
  // handle some fast fail cases
  if (a === b) return true; 
  if (aType !== Ct.equiv.typeOf(b)) return false;

  // look up comparison function
  func = Ct.equiv.fn[aType];
  if (!func) throw "SC.equiv() does not have comparison for type " + aType;
  return func(a,b);
};

function isArgs (object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

Ct.equiv.typeOf = function typeOf(o) {
  if (typeof o === "string") return "string";
  else if (typeof o === "boolean") return "boolean";
  else if (typeof o === "number") return isNaN(o) ? "nan" : "number";
  else if (typeof o === "undefined") return "undefined";

  // consider: typeof null === object
  else if (o === null) return "null";

  // consider: typeof [] === object
  else if (o instanceof Array) return "array";
  
  // consider: typeof new Date() === object
  else if (o instanceof Date) return "date";

  // consider: /./ instanceof Object;
  //           /./ instanceof RegExp;
  //          typeof /./ === "function"; // => false in IE and Opera,
  //                                          true in FF and Safari
  else if (o instanceof RegExp) return "regexp";

  else if (o instanceof Number) return "number";
  
  else if (o instanceof String) return "string";
  
  else if (o instanceof Boolean) return "boolean";
  
  else if (typeof o === "object") return isArgs(o) ? "arguments": "object";

  else if (o instanceof Function) return "function";
  else return "unknown";
};

// for string, boolean, number and null
function useBasicEquality(b, a) { 
  return a == b;
}

var pHasOwnProperty = Object.prototype.hasOwnProperty;

// for objects and arrays - not arguments
function useObjectEquiv(a, b) {
  
  // let objects implement their own equivalence test.  use it if available
  if (b && b.isEqual && ('function' === typeof b.isEqual)) {
    return b.isEqual(a);
  }
  
  // handle a few fast cases
  if (a.prototype !== b.prototype) return false;
  if (a.constructor !== b.constructor) return false;
  
  // first collect all keys.  Don't used Object.keys() in case we are on a
  // platform without it.
  var keys = [], key, idx, len, ptype;
  for(key in a) {
    if (!pHasOwnProperty.call(a, key)) continue;
    if (!pHasOwnProperty.call(b, key)) return false; // b does not have a.key
    keys.push(key);
  }

  // next, make sure b does not have extra keys
  len = 0 ;
  for(key in b) {
    if (!pHasOwnProperty.call(b,key)) continue;
    len++;
  }
  
  if (len !== keys.length) return false; 

  // has all the same keys, now test each individual keys
  len = keys.length;
  for(idx=0;idx<len;idx++) {
    key = keys[idx];
    ptype = Ct.equiv.typeOf(a[key]);
    
    // methods of objects should generally be ignored as long as the other
    // object also has a method there.  This is because we might end up with
    // two instances - both with methods added that are equivalent but 
    // different instances and therefore would fail a normal test.
    if (ptype === 'function') {
      if (Ct.equiv.typeOf(b[key]) !== 'function') return false;
    } else if (!_equiv(ptype, a[key], b[key])) return false;
  }
  
  return true;
}

var callers = []; // stack to decide between skip/abort functions

Ct.equiv.fn = {
  
  // these primitives will use a truthy == comparison instead of strict === 
  // because we assume typeOf() has already filtered out any objects that 
  // shouldn't be massaged into the same type.
  //
  "string": useBasicEquality,
  "boolean": useBasicEquality,
  "number": useBasicEquality,
  "null": useBasicEquality,
  "undefined": useBasicEquality,

  "nan": function (a) {
      return isNaN(a);
  },

  "date": function (a, b) {
    return a.getTime() === b.getTime();
  },

  "regexp": function (a,b) {
    return a.source === b.source && // the regex itself
           a.global === b.global && // and its modifers (gmi) ...
           a.ignoreCase === b.ignoreCase &&
           a.multiline === b.multiline;
  },

  "function": function (a, b) {
    return a === b ;
  },

  "arguments": function(a,b) {
    if (a.length !== b.length) return false;
    var ret = true, len = a.length, idx;
    for(idx=0;ret && (idx<len);idx++) ret = _equiv(a[idx], b[idx]);  
    return ret ;
  },
  
  "array": useObjectEquiv,
  "object": useObjectEquiv
};

