"use strict";
//var FileSystem = require('filesystem').FileSystem
//var path = require('filesystem/path');
var path = require('path');
var fs = require('fs');
var filesource;//require('');
//var fs = new FileSystem(filesource);

var Platform = exports.Platform = function Platform(config) {
    this.config = config;
}

Platform.prototype.dist = function(type) {
    switch(type) {
        case 'embedded':
            this._distEmbedded();
            break;
        case 'bookmarklet':
            this._distBookmarklet();
            break;
        case 'xulrunner':
            this._distXulRunner();
            break;
    }
}

Platform.prototype._distEmbedded = function() {
    var buildDir = this.config.build_dir;
    var version = this.config.version.number;

    //we need use promises here ?
    path.exists(buildDir, function(exists) {
        if(!exists) {
            fs.mkdirSync(buildDir, 0766);
        }

        var outputDir = buildDir + '/SkywriterEmbedded-' + version;

        path.exists(outputDir, function(exists) {
            if(exists) {
                fs.rmdirSync(outputDir);
            }

            fs.mkdirSync(outputDir, 0766);
            //copy files
            //replace javascript version
            //compress source code
            //make tar.gz
        });
    });
}

Platform.prototype.launch = function() {
}

