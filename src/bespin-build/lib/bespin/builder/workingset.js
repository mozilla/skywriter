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

var file = require("file");

var common = require("./common");
var BuilderError = common.BuilderError;
var log = common.log;

var WorkingSet = exports.WorkingSet = function(loader, includes) {
    this.loader = loader;
    this.includes = this._expandIncludes(includes);
};

WorkingSet.prototype = {
    /*
    * Takes references to directories and expands them out to individual
    * files that need to be copied. For example, a filespec with a
    * moduleDir will look up the module referenced and then recursively
    * add all of the files in the directory containing that module.
    * Returns a new array with the include filespecs.
    * 
    * @param {Array includes} filespecs to expand out 
    * @type Array new array
    */
    _expandIncludes: function(includes) {
        var loader = this.loader;
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
    },

    /*
    * Retrieves/augments the file contents for the filespec provided.
    * The filespec can be a string, in which case it's assumed to be
    * a module. Modules are looked up on the module path, and the
    * contents are wrapped to be properly registered with the client-side
    * module sandbox.
    * 
    * If filespec is an object with a "file" property, then that
    * file's contents will be returned directly.
    * @param {String|Object} filespec File to return contents of.
    * @type String
    */
    _getFileContents: function(filespec) {
        var loader = this.loader;
        
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
    },
    
    /*
    * Dumps this working set into a single .js file.
    * 
    * @param {String|Path} outputPath where to drop the output
    */
    dump: function(outputPath) {
        var includes = this.includes;
        
        var outputFile = file.open(outputPath.toString(), "w");

        for (var i = 0; i < includes.length; i++) {
            var filespec = includes[i];

            if (log.level == log.DEBUG) {
                log.debug("Generating output for " + JSON.stringify(filespec));
            }

            var contents = this._getFileContents(filespec);
            outputFile.write(contents);
            outputFile.write("\n");
        }
        outputFile.close();
    }
};

