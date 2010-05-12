// ==========================================================================
// Project:   SproutCore Unit Testing Library
// Copyright: ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licened under MIT license (see license.js)
// ==========================================================================

// Borrowed from tiki:index.  We don't want to depend on tiki for any actual
// code so that this can be used in server-side code

var tiki = require('tiki'); // get tiki package
exports = module.exports = tiki.beget(tiki); // borrow tiki API

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

exports.Promise = require('promise', 'tiki');