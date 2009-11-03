/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

// Bespin build system

var file = require("file");
var os = require("os");
var sandbox = require("sandbox");

var common = require("bespin/builder/common");
var BuilderError = common.BuilderError;
var log = common.log;
var workingset = require("./builder/workingset");


var DEFAULT_PROFILE = "bespinProfile.json";

var PROFILE_FORMAT = '\nA profile is a JSON file containing an array of objects.\n' +
    'Each object must minimally have an "output" defined on it. For example:\n\n' +
    '[{"output": "BespinEmbed.js"}]\n\n' +
    'is a minimally acceptable profile.\n';
    
var STANDARD_INCLUDES = [
    {file: "src/html/loader.js"},
    "ref-send", 
    "sandbox", 
    "narwhal/client", 
    "array", 
    "object", 
    "string", 
    "function", 
    "regexp", 
    "reactor", 
    "date",
    "json", // TODO remove this one. We don't need to include this module.
    "global", 
    "system", 
    "binary",
    {file: "src/html/dojo/dojo.js.uncompressed.js"},
    "sproutcore",
    "bespin",
    {moduleDir: "bespin/boot"},
    {file: "src/bespin-build/launchbespin.js"}
];

/*
* Loads a JSON-format profile from disk.
* @param {String} filename The profile file to load.
* @type Object
*/
exports.loadProfile = function(filename) {
    if (!file.exists(filename)) {
        throw new BuilderError("Profile file " + filename + " does not exist.");
    }
    var data = file.read(filename);
    return JSON.parse(data);
};

/*
* Validates the information in a loaded profile object.
* @param {Object} profile The profile object.
*/
exports.validateProfile = function(profile) {
    if (!Array.isArray(profile)) {
        throw new BuilderError(PROFILE_FORMAT);
    }
    for (var i = 0; i < profile.length; i++) {
        var desc = profile[i];
        if (!desc.output) {
            throw new BuilderError(PROFILE_FORMAT);
        }
        if (!desc.includes) {
            desc.includes = STANDARD_INCLUDES.slice(0);
        }
    }
};


/*
* Creates a new sandbox.Loader with the current path.
*/
exports._getLoader = function() {
    var paths = require.paths.map(function (path) {
        return String(path);
    });
    paths.unshift(file.join(system.prefix, "engines", "browser", "lib"));
    
    return new sandbox.Loader({paths: paths});
};

/*
* Runs the YUI Compressor in a separate process to compress the output file.
* The file is compressed in place.
*/
exports.compressOutput = function(outputfile) {
    log.info("Compressing output");
    outputfile = new file.Path(outputfile);
    var loaderpath = exports._getLoader().find("bespin/builder");
    var pathToMe = new file.Path(loaderpath);
    var pathToCompressor = pathToMe.dirname().dirname().dirname();
    var compressorFilename = pathToCompressor.join("yuicompressor-2.4.2.jar");
    log.debug("Using compressor at " + compressorFilename);
    if (!compressorFilename.exists()) {
        throw new BuilderError("Cannot find the compressor! Should be at " + compressorFilename);
    }
    var uncompressedName = new file.Path(outputfile.toString() + ".uncompressed.js");
    log.debug("Original output at " + uncompressedName);
    outputfile.rename(uncompressedName.basename());
    os.system("java -jar " + compressorFilename + " -o " + outputfile.toString()
        + " " + uncompressedName.toString());
    log.debug("Removing original file");
    file.remove(uncompressedName);
};

/*
* Generates an output script based on one item
* description from the profile.
* @param {Object} description One item from the list of items in a profile.
*/
exports.generateScript = function(description) {
    var outputPath = new file.Path(description.output);
    
    log.info("Generating " + outputPath);
    
    if (!outputPath.dirname().exists()) {
        outputPath.dirname().mkdirs();
    }
    
    // TODO this is temporary because narwhal-jsc doesn't automatically
    // clear the file first.
    if (outputPath.exists()) {
        outputPath.remove();
    }
    
    var set = new workingset.WorkingSet(exports._getLoader(), description.includes);
    
    set.dump(outputPath);
    
    exports.compressOutput(outputPath);
};

/*
* Entry point for the command line interface.
* @param (Array) args The command line arguments.
*/
exports.main = function(args) {
    startTime = new Date().getTime();
    log.level = log.DEBUG;
    
    log.info("Bespin Build System\n");
    
    var profileFilename = args[1] ? args[1] : DEFAULT_PROFILE;
    
    try {
        var profile = exports.loadProfile(profileFilename);

        exports.validateProfile(profile);

        log.info("Using build profile: ", profileFilename);
        
        for (var i = 0; i < profile.length; i++) {
            exports.generateScript(profile[i]);
        }
        
    } catch (e) {
        if (e instanceof BuilderError) {
            log.fatal("Build failed!");
            var message = e.message;
            if (e.rhinoException) {
                message += "\n" + e.rhinoException.getScriptStackTrace();
            }
            log.fatal(message);
            os.exit(1);
        } else {
            throw e;
        }
    }
    
    var runTime = (new Date().getTime() - startTime) / 1000;
    log.info("Build complete! (" + runTime + " seconds)");
};
