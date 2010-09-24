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
 *   Bespin Team (skywriter@mozilla.com)
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

var http = require('http');
var fs = require('fs');

var dryice = require('./dryice');
var platform    = dryice.platform;
var test        = dryice.Test;
var doc         = dryice.Doc;
var config 		= dryice.config;

desc('Launch skywriter in the default browser');
task('default', [], function (params) {
    platform.launch('browser');
});

desc('Run tests');
task('test', [], function (params) {
    test.run();
});

desc('Display the documentation in your web browser');
task('doc', [], function (params) {
    doc.display();
});

desc('Generate API documentation');
task('jsdoc', [], function (params) {
    doc.generateAPI();
});

/*desc('Generates tags for Skywriter using jsctags');
task('tags', [], function (params) {
    platform.generateTags();
});*/

namespace('dist', function () {
    desc('Generate distributable packages for all platforms');
    task('all', ['deps:download'], function (params) {
        platform.dist(arguments[0]);
    });

    desc('Generate browser distributable package');
    task('browser', ['deps:download'], function () {
        platform.dist('browser', arguments[0]);
    });

    desc('Generate desktop distributable package');
    task('desktop', ['deps:download'], function () {
        platform.dist('xulrunner', arguments[0]);
    });

    desc('Generate bookmarklet distributable package');
    task('bookmarklet', ['deps:download'], function () {
        platform.dist('bookmarklet', arguments[0]);
    });

    desc('Generate embedded distributable package');
    task('embedded', ['deps:download'], function () {
        platform.dist('embedded', arguments[0]);
    });
});

namespace('deps', function() {
	desc('Download dependencies');
	task('download', [], function() {
		var deps = config.dependencies;
		
		for(name in deps) {
			var file = http.createClient(deps[name].port, deps[name].host);
			var request = file.request('GET', deps[name].uri, {'host': deps[name].host});
			request.end();
			
			request.on('response', function (response) {
				response.setEncoding('utf8');

				response.on('data', function (chunk) {
					//chunk = '"define metadata";({});"end";' + chunk + 'exports.$ = $.noConflict(true);';
					//config.plugins_path.thirdparty + '/' + name + '.js'
				});
			});
		}
	});
});
