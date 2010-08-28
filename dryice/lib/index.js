require.paths.unshift(  '../../platform/common/plugins/boot',
                        '../../platform/common/plugins/supported');
var exports = module.exports;

var config = {
                version			: {	'number': '0.9a2',
                            	 	'name'  : 'Edison',
                            		'api'   : 4
								},
                buildDir		: 'tmp', 
				prebuiltDir		: 'tmp/prebuilt',
				versionFile		: '../../platform/common/plugins/boot/skywriter/index.js'
            };

var Platform = require('./platform').Platform;
//exports.doc         = require('./doc');
//exports.test         = require('./test');
exports.platform = new Platform(config);

