"use strict";
var path = require('path');
var fs = require('fs');
var util = require('./util');

var Builder = exports.Builder = function Builder(config, manifest) {
	this.config = config;
	
	if(!manifest) {
		manifest = 'manifest.json';
	}
    this.manifest = manifest;
	
	var exists = path.existsSync(manifest);
	if(!exists) {
		throw new Error('Manifest file was not found!');
	}
}

Builder.prototype.build = function() {
	var prebuiltDir = this.config.prebuiltDir;
	var manifest = this.manifest;
	
	util.mkpath(prebuiltDir);
}
