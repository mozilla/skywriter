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
		fs.rmdirSync(outputDir);
	}

	util.mkpath(outputDir);
	
	var builder = new Builder(this.config, manifest);
	builder.build();
	
	util.copy(cwd + '/LICENSE.txt', outputDir + '/LICENSE.txt');
	
    //copy LICENSE.txt to outputDir/LICENSE.txt
	//copy README-Customizable.txt to outputDir/README.txt
	//copy buildDir/docs && rm -rf buildDir/docs
	//mkdir outputDir/lib
	//copy static/tiki.js to libDir
	//copy static/SkywriterEmbedded.js to libDir/worker.js
	//copytree plugins to outputDir/plugins
	//replace javascript version in outputDir/plugins/boot/skywriter/index.js
	//copy embedded/sample.json to outputDir/
	//copy Jakefile to outputDir/
	//copy dryice to outputDir/dryice
    //compress source code
    //make tar.gz
}

Platform.prototype._updateVersion = function(platformType) {
	var config = this.config;
	var versionFile = config.versionFile;
}

Platform.prototype.launch = function() {
}