var dryice = require('./dryice').DryIce;

var plugin      = dryice.Plugin;
var platform    = dryice.Platform;
var test        = dryice.Test;
var doc         = dryice.Doc;

var version     = '0.9a3'

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

/*desc('Generates tags for Bespin using jsctags');
task('tags', [], function (params) {
    platform.generateTags();
});*/

namespace('dist', function () {
    desc('Generate distributable packages for all platforms');
    task('all', [], function (params) {
        platform.dist();
    });

    desc('Generate browser distributable package');
    task('browser', [], function () {
        platform.dist('browser');
    });

    desc('Generate desktop distributable package');
    task('desktop', [], function () {
        platform.dist('xulrunner');
    });

    desc('Generate bookmarklet distributable package');
    task('bookmarklet', [], function () {
        platform.dist('bookmarklet');
    });
});

namespace('plugin', function () {
    desc('foo');
    task('foo', [], function () {
        sys.puts('doing plugin:foo task');
        sys.puts(sys.inspect(arguments));
    });
});

