"use strict";
var path	= require('path');
var fs 		= require('fs');
var util 	= require('./util');
var config 	= require('./config');

var Builder = require('./builder').Builder;

var Platform = exports.Platform = function Platform() {
  
}

Platform.prototype.dist = function(type, manifest) {
	if(!manifest) {
		manifest = 'manifest.json';
	}

	var exists = path.existsSync(manifest);
	if(!exists) {
		throw new Error('Manifest file was not found!');
	}
	
	manifest = JSON.parse(fs.readFileSync(manifest, 'utf8'));
	
	
    switch(type) {
        case 'embedded':
            this._distEmbedded(manifest);
            break;
        case 'bookmarklet':
            this._distBookmarklet(manifest);
            break;
        case 'xulrunner':
            this._distXulRunner(manifest);
            break;
    }
}

Platform.prototype._distEmbedded = function(manifest) {
    var version = config.version.number;
	var outputDir = manifest.output_dir + '-' + version;

	if(path.existsSync(outputDir)) {
		util.rmtree(outputDir);
	}

	util.mkpath(outputDir);
	
	//Run build process
	var builder = new Builder(manifest.plugins);
	builder.build(outputDir + '/prebuilt');
	
	util.copy('LICENSE.txt', outputDir + '/LICENSE.txt');
	util.copy('platform/embedded/README-Customizable.txt', outputDir + '/README.txt');

	/*var genDocs = path.existsSync(outputDir + '/docs');
	if(genDocs) {
		util.copytree(outputDir + '/docs', outputDir + '/docs');
		util.rmtree(buildDir + '/docs');		
	}*/

	var lib = outputDir + '/lib';
	fs.mkdirSync(lib, 0755);
	
	//util.copy('platform/embedded/static/tiki.js', lib + '/tiki.js');
	util.copy('platform/embedded/static/worker.js', lib + '/worker.js');
	util.copytree('dryice', lib + '/dryice');
	
	util.copytree('platform/browser/plugins', outputDir + '/plugins');
	//util.copytree('platform/common/plugins', outputDir + '/plugins');
	
	util.copy('platform/embedded/sample.json', outputDir + '/sample.json');
	util.copy('platform/embedded/Jakefile', outputDir + '/Jakefile');
	
	this._updateVersion(outputDir + '/plugins/boot/skywriter/index.js', 'embedded');
    //compress source code
    //make tar.gz
}

Platform.prototype._updateVersion = function(versionFile, platform) {
	var data = fs.readFileSync(versionFile, 'utf8');
	
	data = data.replace('VERSION_NUMBER', config.version.number);
	data = data.replace('VERSION_CODENAME', config.version.name);
	data = data.replace('API_VERSION', config.version.api);
	data = data.replace('PLATFORM', platform);
	
	fs.writeFileSync(versionFile, data, 'utf8');
}

Platform.prototype.launch = function() {
}
