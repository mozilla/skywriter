"use strict";
var fs = require('fs');
var sys = require('sys');
var path = require('path');

var util = exports;

util.mkpath = function(_path) {
	var dirs = _path.split('/');
	var d = './';
	
	for(dir in dirs) {
		d += dirs[dir] + '/';
		
		if(!path.existsSync(d)) {
			fs.mkdirSync(d, 0755);
		}
	}
};

util.copy = function(src, dst) {
	if(!path.existsSync(src)) {
		throw new Error(src + ' does not exists. Nothing to be copied');
	}
	
	if(fs.statSync(src).isDirectory()) {
		throw new Error(src + ' is a directory. It must be a file');
	}
	
	if(src == dst) {
		throw new Error(src + ' and ' + dst + 'are identical');
	}

	var reader = fs.createReadStream(src);
    var writer = fs.createWriteStream(dst);
	sys.pump(reader, writer);
};

util.copytree = function(src, dst) {
	if(!path.existsSync(src)) {
		throw new Error(src + ' does not exists. Nothing to be copied');
	}
	
	if(!fs.statSync(src).isDirectory()) {
		throw new Error(src + ' must be a directory');
	}
	
	var filenames = fs.readdirSync(src);
	var basedir = src;
	
	if(!path.existsSync(dst)) {
		fs.mkdirSync(dst, 0755);
	}
	
	for(name in filenames) {
		var file = basedir + '/' + filenames[name];
		var newdst = dst + '/' + filenames[name];
		
		if(fs.statSync(file).isDirectory()) {
			fs.mkdirSync(newdst, 0755);
			util.copytree(file, newdst);
		} else {
			var reader = fs.createReadStream(file);
			var writer = fs.createWriteStream(newdst);
			sys.pump(reader, writer);	
		}
	}
};

util.rmtree = function(path) {

};

