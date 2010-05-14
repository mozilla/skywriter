// ==========================================================================
// Project:   SproutCore Unit Testing Library
// Copyright: ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licened under MIT license (see license.js)
// ==========================================================================

/** Borrowed from SproutCore Runtime Core */
exports.fmt = function fmt(str) {
  // first, replace any ORDERED replacements.
  var args = arguments;
  var idx  = 1; // the current index for non-numerical replacements
  return str.replace(/%@([0-9]+)?/g, function(s, argIndex) {
    argIndex = (argIndex) ? parseInt(argIndex,0) : idx++ ;
    s =args[argIndex];
    return ((s===null) ? '(null)' : (s===undefined) ? '' : s).toString(); 
  }) ;
};

exports.setupDisplayNames = function() {
  // TODO: setupDisplayNames
};

// ..........................................................
// TYPES
// 

// define standard type constants
var T_ERROR     = 'error',
    T_OBJECT    = 'object',
    T_NULL      = 'null',
    T_CLASS     = 'class',
    T_HASH      = 'hash',
    T_FUNCTION  = 'function',
    T_UNDEFINED = 'undefined',
    T_NUMBER    = 'number',
    T_BOOL      = 'boolean',
    T_ARRAY     = 'array',
    T_STRING    = 'string',
    T_BOOLEAN   = 'boolean',
    
    YES         = true,
    NO          = false,
    K           = function() {}; // empty function

exports.T_ERROR     = T_ERROR;
exports.T_OBJECT    = T_OBJECT;
exports.T_NULL      = T_NULL;
exports.T_CLASS     = T_CLASS;
exports.T_HASH      = T_HASH;
exports.T_FUNCTION  = T_FUNCTION;
exports.T_UNDEFINED = T_UNDEFINED;
exports.T_NUMBER    = T_NUMBER;
exports.T_BOOL      = T_BOOL;
exports.T_ARRAY     = T_ARRAY;
exports.T_STRING    = T_STRING;
exports.T_BOOLEAN   = T_BOOLEAN;
exports.YES         = YES;
exports.NO          = NO;

/**
  Returns true if the passed item is an array.  Works regardless of source
  of array.
*/
var isArray = function(obj) {
  if (obj && obj.isArray) return true; // fast path
  if (!obj) return false;
  if (T_UNDEFINED !== typeof obj.length) {
    if ((typeof obj !== T_FUNCTION) && (typeof obj !== T_STRING) && (obj.constructor !== String)) return true;
  }
  // TODO: add proper check that works across windows...
  return false ;  
};
exports.isArray = isArray;

Array.prototype.isArray = true ;

/**
  Returns a consistant type for the passed item.

  Use this instead of the built-in typeOf() to get the type of an item. 
  It will return the same result across all browsers and includes a bit 
  more detail.  Here is what will be returned:

  | Return Value Constant | Meaning |
  | SC.T_STRING | String primitive |
  | SC.T_NUMBER | Number primitive |
  | SC.T_BOOLEAN | Boolean primitive |
  | SC.T_NULL | Null value |
  | SC.T_UNDEFINED | Undefined value |
  | SC.T_FUNCTION | A function |
  | SC.T_ARRAY | An instance of Array |
  | SC.T_CLASS | A SproutCore class (created using SC.Object.extend()) |
  | SC.T_OBJECT | A SproutCore object instance |
  | SC.T_HASH | A JavaScript object not inheriting from SC.Object |

  @param item {Object} the item to check
  @returns {String} the type
*/  
exports.typeOf = function typeOf(item) {
  if (item === undefined) return T_UNDEFINED ;
  if (item === null) return T_NULL ; 
  
  var ret = typeof(item) ;
  if (ret == "object") {
    if (isArray(item)) ret = T_ARRAY ;
    else if (item instanceof Function) {
      ret = item.isClass ? T_CLASS : T_FUNCTION ;
    } else if ((item instanceof Error) || item.isError) ret = T_ERROR;
    else if (item.isObject) ret = T_OBJECT ;
    else if (item.isClass) ret = T_CLASS;
    else if (item.constructor === Object) ret = T_HASH;
    else if (item.constructor === Number) ret = T_NUMBER;
    else if (item.constructor === String) ret = T_STRING;
    else ret = T_OBJECT;

  } else if (ret === T_FUNCTION) ret = item.isClass ? T_CLASS : T_FUNCTION;
  
  return ret ;
};

// ..........................................................
// OBJECT EXTENSION
// 

// primitive mixin
function _mixin(t, items, skip) {
  
  // copy reference to target object
  var len    = items.length,
      target = t || {},
      idx, options, key, src, copy;

  for (idx=skip; idx < len; idx++ ) {
    if (!(options = items[idx])) continue ;
    for(key in options) {
      if (!options.hasOwnProperty(key)) continue ;

      src  = target[key];
      copy = options[key] ;
      if (target===copy) continue ; // prevent never-ending loop
      if (copy !== undefined) target[key] = copy ;
    }
  }
  
  return target;
}

/**
  Copy the passed properties onto the first parameter.
  
  @param {Hash} t the target object to mixin to
  @param {Hash..} one or more hashes to mix in
  @returns {Hash} the first parameter
*/
exports.mixin = function(t) {
  return _mixin(t, arguments, 1);
};

// used to beget new objects
var K_ = function() {},
    Kproto_ = K_.prototype;

/**
  Take the named object, beget a new instance using prototype inheritence
  then copy props onto it.
  
  @param {Hash} t the object to beget
  @param {Hash..} hashes optional zero or more hashes to copy props from
  @returns {Hash} the begotten object
*/
var beget = function(t) {
  
  // primitives cannot beget()
  if ('object' !== typeof(t)) return t ;
  var ret = Object.create(t);
  if (arguments.length>0) _mixin(ret, arguments, 1);
  return ret ;
};
exports.beget = beget;

// default __init method.  calls init() if defined.  can be overloaded.
var __init = function(args) {
  var init;
  if (init = this.init) init.apply(this, args);  
};

// generate a new constructor function
function _const() {
  return function() {
    this.__init(arguments);
    return this;
  };
}

/**
  Accepts a constructor function and returns a new constructor the extends 
  the passed value.  The new constructor will pass any constructor methods 
  along to an init() method on the prototype, if it is defined.

  Any additional passed arguments will be copied onto the object.
  
  You can also just pass hashes and we'll make up a constructor for you.
  
  @param {Function} F the constructor function to extend
  @param {Hash..} hashes optional zero or more hashes to copy props from
  @returns {Function} the new subclass
*/
exports.extend = function(F) {
  var Ret = _const(), prot;
   
  if ('function' === typeof F) {
    prot = Ret.prototype = beget(F.prototype);
    if (!prot.__init) prot.__init = __init; // needed for setup
    _mixin(prot, arguments, 1);

  // build a NEW object.
  } else {
    prot = Ret.prototype = _mixin({ __init: __init }, arguments, 0);
  }
  
  prot.constructor = Ret ;
  
  return Ret;
};


// ..........................................................
// Coroutine Support
// 

exports.each = function(array, fn) {
  var len ;
  
  // if params are continuables, make into an array 
  if ('function' === typeof array) {
    array = Array.prototype.slice.call(arguments);
    fn = null;
  }
  
  // if no fn is passed, assume array has continuables
  if (!fn) fn = eachIter;
  
  len = array.length;
  return function(done) {
    var idx = -1;
    
    var loop = function(err) {
      if (err) return done(err);
      idx++;
      if (idx>=len) return done(null);
      fn(array[idx], loop);
    };
    
    loop();
  };
};



