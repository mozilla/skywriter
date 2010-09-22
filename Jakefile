var http = require('http');

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
		for(dep in config.dependencies) {
			var file = http.createClient(dep.port, dep.host);
			
			var request = file.request('GET', dep.uri);
			request.end();
			
			request.on('response', function (response) {
			  response.setEncoding('utf8');
			  response.on('data', function (chunk) {
			    console.log('BODY: ' + chunk);
			  });
			});
		}
		//donwload and install jquery in thirdparty plugins from config.deps
		//download and install tiki
	});
});
