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

var fs = require('fs');
var sys = require('sys');
var path = require('path');
var EventEmitter = require('events').EventEmitter;

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
	
	var infd = fs.openSync(src, 'r');
	var size = fs.fstatSync(infd).size;
	var outfd = fs.openSync(dst, 'w');
	
	fs.sendfileSync(outfd, infd, 0, size);
	
	fs.closeSync(infd);
	fs.closeSync(outfd);
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
			util.copytree(file, newdst);
		} else {
			util.copy(file, newdst);
		}
	}
};

var rlevel = 0;
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
			rlevel++;
			util.rmtree(file);
			rlevel--;
			
			fs.rmdirSync(file);
		} else {
			fs.unlinkSync(file);
		}
	}
	
	if(rlevel == 0) {
		if(path.existsSync(root)) {
			fs.rmdirSync(root);
		}
	}
};

