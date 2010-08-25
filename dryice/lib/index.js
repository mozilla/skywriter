require.paths.unshift(  '../../platform/common/plugins/boot',
                        '../../platform/common/plugins/supported');
var exports = module.exports;

var config = {
                version: {  'number': '0.9a2',
                            'name'  : 'Edison',
                            'api'   : 4
                        },
                build_dir: 'tmp'
            };

var Platform = require('./platform').Platform;

//exports.plugin      = require('./plugin');
//exports.doc         = require('./doc');
exports.platform = new Platform(config);

