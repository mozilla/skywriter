"use strict";
var path 	= require('path');
var fs 		= require('fs');
var util 	= require('./util');
var config 	= require('./config');

var Builder = exports.Builder = function Builder(manifest) {	
	if(!manifest) {
		manifest = 'manifest.json';
	}
    this.manifest = manifest;
	
	var exists = path.existsSync(manifest);
	if(!exists) {
		throw new Error('Manifest file was not found!');
	}
}

Builder.prototype.build = function(outputDir) {
	var manifest = this.manifest;
	
	if(path.existsSync(outputDir)) {
		util.rmtree(outputDir);
	}
	util.mkpath(outputDir);
	
	var files = config.embedded.files;
	
	//write preamble.js on files.js
	//write tiki.js on files.js
	//should go through the config.plugins
	// and build a data structure with the plugins metadata
	
}
