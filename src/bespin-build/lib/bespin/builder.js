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

var DEFAULT_PROFILE = "bespinProfile.json";

var PROFILE_FORMAT = '\nA profile is a JSON file containing an array of objects.\n' +
    'Each object must minimally have an "output" defined on it. For example:\n\n' +
    '[{"output": "BespinEmbed.js"}]\n\n' +
    'is a minimally acceptable profile.\n';
    
var STANDARD_INCLUDES = [
    {file: "src/html/loader.js"},
    {file: "src/bespin-build/preloads.js"},
    "narwhal/client"
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
            desc.includes = STANDARD_INCLUDES;
        }
    }
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
    var path;
    if (typeof(filespec) === "string") {
        // handle modules
        try {
            path = loader.find(filespec);
        } catch (e) {
            throw new BuilderError("Could not find included module: " + filespec);
        }
        var contents = 'require.register({"' + filespec +
            '":{"factory":function(require,exports,module,system,print){';
        contents += file.read(path);
        contents += '},"depends":[]}});';
        return contents;
    } else if (filespec.file) {
        // handle files
        path = new file.Path(filespec.file);
        if (!path.exists()) {
            throw new BuilderError("Could not find included file: " 
                + filespec.file);
        }
        return path.read();
    }
};

/*
* Creates a new sandbox.Loader with the current path.
*/
exports._getLoader = function() {
    return new sandbox.Loader({paths: require.paths});
};

/*
* Generates an output script based on one item
* description from the profile.
* @param {Object} description One item from the list of items in a profile.
*/
exports.generateScript = function(description) {
    var outputPath = new file.Path(description.output);
    if (!outputPath.dirname().exists()) {
        outputPath.dirname().mkdirs();
    }
};

/*
* Entry point for the command line interface.
* @param (Array) args The command line arguments.
*/
exports.main = function(args) {
    print("Bespin Build System\n");
    
    var profileFilename = args[1] ? args[1] : DEFAULT_PROFILE;
    
    try {
        var profile = exports.loadProfile(profileFilename);

        exports.validateProfile(profile);

        print("Using build profile: ", profileFilename);
        
        for (var i = 0; i < profile.length; i++) {
            exports.generateScript(profile[i]);
        }
        
    } catch (e) {
        if (e instanceof exports.BuilderError) {
            print("Build failed!");
            print (e.message);
            os.exit(1);
        }
    }
    
};
