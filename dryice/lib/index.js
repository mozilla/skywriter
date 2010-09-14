"use strict";
require.paths.unshift(  '../../platform/common/plugins/boot',
                        '../../platform/common/plugins/supported');
var exports = module.exports;



var Platform = require('./platform').Platform;
//exports.doc         = require('./doc');
//exports.test         = require('./test');
exports.platform = new Platform();

