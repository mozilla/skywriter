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
var logger = require("logger");
var term = require("term");

var log = new logger.Logger(new term.Stream(system));

log.format = function(severity, args) {
    var message = Array.prototype.join.apply(args, [""]);
    if (severity < 2) {
        message = "\0red(" + message + "\0)";
    } else if (severity == 4) {
        message = "debug: " + message;
    }
    return message + "\n";
};

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

var BuilderError = exports.BuilderError = function(message) {
    this.message = message;
};

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
* Takes references to directories and expands them out to individual
* files that need to be copied. For example, a filespec with a
* moduleDir will look up the module referenced and then recursively
* add all of the files in the directory containing that module.
* Returns a new array with the include filespecs.
* 
* @param {sandbox.Loader} loader to find the files 
* @type Array new array
*/
exports.expandIncludes = function(loader, includes) {
    var out = [];
    for (var i = 0; i < includes.length; i++) {
        var filespec = includes[i];
        if (typeof(filespec) == "string" || filespec.file) {
            out.push(filespec);
            continue;
        }
        
        if (filespec.moduleDir) {
            var parts = filespec.moduleDir.split(/\//);
            parts.pop();
            var packageName = parts.join("/");
            try {
                var path = loader.find(filespec.moduleDir);
            } catch (e) {
                throw new BuilderError("Unable to find module " + filespec.moduleDir 
                    + " for a moduleDir include");
            }
            path = new file.Path(path).dirname();
            var items = file.listTree(path);
            for (var j = 0; j < items.length; j++) {
                var fullname = items[j];
                // we don't care about directories or non-js files
                if (fullname == "" || (/\/$/.exec(fullname)) || !(/\.js$/.exec(fullname))) {
                    continue;
                }
                fullname = packageName + "/" + fullname;
                
                fullname = fullname.replace(/\.js$/, "");
                
                // at some point, we'll likely have a more flexible way to 
                // exclude certain files.
                if (fullname.indexOf("/tests/") > -1) {
                    continue;
                }
                out.push(fullname);
            }
        }
    }
    return out;
};

/*
* Retrieves/augments the file contents for the filespec provided.
* The filespec can be a string, in which case it's assumed to be
* a module. Modules are looked up on the module path, and the
* contents are wrapped to be properly registered with the client-side
* module sandbox.
* 
* If filespec is an object with a "file" property, then that
* file's contents will be returned directly.
* @param {Object} loader: Narwhal sandbox.Loader to find files.
* @param {String|Object} filespec File to return contents of.
* @type String
*/
exports.getFileContents = function(loader, filespec) {
    var path, wrap, contents;
    
    if (typeof(filespec) === "string") {
        // handle modules
        try {
            path = loader.find(filespec);
        } catch (e) {
            throw new BuilderError("Could not find included module: " + filespec);
        }
        wrap = true;
        path = new file.Path(path);
    } else if (filespec.file) {
        // handle files
        path = new file.Path(filespec.file);
        if (!path.exists()) {
            throw new BuilderError("Could not find included file: " 
                + filespec.file);
        }
        wrap = false;
    }
    
    if (wrap) {
        contents = 'require.register({"' + filespec +
        '":{"factory":function(require,exports,module,system,print){';
    } else {
        contents = "";
    }
    
    contents += file.read(path);
    
    if (wrap) {
        contents += '},"depends":[]}});';
    }
    
    return contents;
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
    
    var loader = exports._getLoader();
    
    // TODO this is temporary because narwhal-jsc doesn't automatically
    // clear the file first.
    if (outputPath.exists()) {
        outputPath.remove();
    }
    
    var outputFile = file.open(outputPath.toString(), "w");
    
    var includes = exports.expandIncludes(loader, description.includes);
    
    for (var i = 0; i < includes.length; i++) {
        var filespec = includes[i];
        
        if (log.level == log.DEBUG) {
            log.debug("Generating output for " + JSON.stringify(filespec));
        }
        
        var contents = exports.getFileContents(loader, filespec);
        outputFile.write(contents);
        outputFile.write("\n");
    }
    outputFile.close();
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
        if (e instanceof exports.BuilderError) {
            log.fatal("Build failed!");
            log.fatal(e.message);
            os.exit(1);
        }
    }
    
    var runTime = (new Date().getTime() - startTime) / 1000;
    log.info("Build complete! (" + runTime + " seconds)");
};
