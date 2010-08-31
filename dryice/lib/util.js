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

var root;
util.rmtree = function(_path) {
	if(fs.statSync(_path).isFile()) {
		throw new Error(_path + ' is a file. Use fs.unlink instead');
	}
	if(!root) {
		root = _path;
	}
	var filenames = fs.readdirSync(_path);
	var basedir = _path;

	for(name in filenames) {
		var file = basedir + '/' + filenames[name];
		
		if(fs.statSync(file).isDirectory()) {
			util.rmtree(file);
			fs.rmdirSync(file);
		} else {
			fs.unlinkSync(file);
		}
	}
	
	try { 
		if(path.existsSync(root)) {
			fs.rmdirSync(root);		
		}		
	} catch(e) { }
};

