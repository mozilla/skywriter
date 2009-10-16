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

DEFAULT_PROFILE = "bespinProfile.json";

var BuilderError = exports.BuilderError = function(message) {
    this.message = message;
}

exports.loadProfile = function(filename) {
    if (!file.exists(filename)) {
        throw new BuilderError("Profile file " + filename + " does not exist.");
    }
    var data = file.read(filename);
    return JSON.parse(data);
}

exports.validateProfile = function(profile) {
    
}

exports.main = function(args) {
    print("Bespin Build System\n");
    
    var profileFilename = args[1] ? args[1] : DEFAULT_PROFILE;
    
    try {
        var profile = exports.loadProfile(profileFilename);

        exports.validateProfile(profile);

        print("Using build profile: ", profileFilename);
        
    } catch (e) {
        if (e instanceof exports.BuilderError) {
            print("Build failed!");
            print (e.message);
            os.exit(1);
        }
    }
    
}