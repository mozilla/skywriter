"use strict";
var path = require('path');
var fs = require('fs');
var util = require('./util');

var Builder = require('./builder').Builder;
//var FileSystem = require('filesystem').FileSystem
//var fs = new FileSystem(filesource);
//var path = require('filesystem/path');

var Platform = exports.Platform = function Platform(config) {
    this.config = config;
}

Platform.prototype.dist = function(type, manifest) {
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
    var buildDir = this.config.buildDir;
    var version = this.config.version.number;
	var cwd = process.cwd();

	var outputDir = buildDir + '/SkywriterEmbedded-' + version;

	if(path.existsSync(outputDir)) {
		util.rmtree(outputDir);
	}

	util.mkpath(outputDir);
	
	var builder = new Builder(this.config, manifest);
	builder.build();
	
	util.copy(cwd + '/LICENSE.txt', outputDir + '/LICENSE.txt');
	util.copy(cwd + '/platform/embedded/README-Customizable.txt', outputDir + '/README.txt');

	var genDocs = path.existsSync(buildDir + '/docs');
	if(genDocs) {
		util.copytree(buildDir + '/docs', outputDir + '/docs');
		util.rmtree(buildDir + '/docs');		
	}

	var lib = outputDir + '/lib';
	fs.mkdirSync(lib, 0755);
	
	//util.copy(cwd + '/platform/embedded/static/tiki.js', lib + '/tiki.js');
	util.copy(cwd + '/platform/embedded/static/SkywriterEmbedded.js', lib + '/worker.js');
	util.copytree(cwd + '/platform/browser/plugins', outputDir + '/plugins');

	util.copy(cwd + '/platform/embedded/sample.json', outputDir + '/sample.json');
	util.copytree(cwd + '/dryice', outputDir + '/dryice');
	util.copy(cwd + '/platform/embedded/Jakefile', outputDir + '/Jakefile');
	
	//replace javascript version in outputDir/plugins/boot/skywriter/index.js
    //compress source code
    //make tar.gz
}

Platform.prototype._updateVersion = function(platformType) {
	var config = this.config;
	var versionFile = config.versionFile;
}

Platform.prototype.launch = function() {
}
