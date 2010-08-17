// ==========================================================================
// Project:   SproutCore Unit Testing Library
// Copyright: ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licened under MIT license (see license.js)
// ==========================================================================
/*globals CoreTest exports module */

// Notify the build tools of the exports we plan to manually define
"use exports CoreTest ok same equal notEqual deepEqual deepNotEqual raises equals shouldThrow plan module setup teardown test htmlbody expect";

// Core exported API
exports = module.exports = require('core');

require('system/ext');

require('system/plan');
require('system/module');
require('system/test');

// Additional public API - these enhance CoreTest
require('system/dump');
require('system/equiv');
require('system/stub');
require('system/suite');

