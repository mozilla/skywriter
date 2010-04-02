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

var SC = require("sproutcore/runtime").SC;
var console = require('bespin:console').console;
var util = require("bespin:util/util");
var m_promise = require("bespin:promise");

var pathUtil = require("Filesystem:path");

var Promise = m_promise.Promise;

// Does a binary search on a sorted array, returning
// the *first* index in the array with the prefix
exports._prefixSearch = function(arr, find) {
    var low = 0;
    var high = arr.length - 1;
    var findlength = find.length;
    var i;
    var lowmark = null;
    var sub;
    
    while (low <= high) {
        i = parseInt((low + high) / 2, 10);
        sub = arr[i].substring(0, findlength);
        if (i == lowmark) {
            return i;
        }
        
        if (sub == find) {
            lowmark = i;
            high = i - 1;
        } else {
            if (sub < find) {
                low = i + 1;
            } else {
                high = i - 1;
            }
        }
    }
    return lowmark;
};

// Standard binary search
exports._binarySearch = function(arr, find) {
    var low = 0;
    var high = arr.length - 1;
    var i;
    var current;
    
    while (low <= high) {
        i = parseInt((low + high) / 2, 10);
        current = arr[i];
        if (current < find) {
            low = i + 1;
        } else if (current > find) {
            high = i - 1;
        } else {
            return i;
        }
    }
    return null;
};

exports.NEW = { name: "NEW" };
exports.LOADING = { name: "LOADING" };
exports.READY = { name: "READY" };

exports.Filesystem = SC.Object.extend({
    // FileSource for this filesytem
    source: null,
    
    // list of filenames
    _files: null,
    
    status: exports.NEW,
    _loadingPromises: null,
    
    init: function() {
        var source = this.get("source");
        if (typeof(source) == "string") {
            this.set("source", SC.objectForPropertyPath(source));
        }

        if (!this.get("source")) {
            throw new Error("Directory must have a source.");
        }
        
        this._loadingPromises = [];
    },
    
    _load: function() {
        var pr = new Promise();
        if (this.status === exports.READY) {
            pr.resolve();
        } else if (this.status === exports.LOADING) {
            this._loadingPromises.push(pr);
        } else {
            this.set("status", exports.LOADING);
            this._loadingPromises.push(pr);
            this.get("source").loadAll().then(this._fileListReceived.bind(this));
        }
        return pr;
    },
    
    _fileListReceived: function(filelist) {
        filelist.sort();
        this._files = filelist;
        this.set("status", exports.READY);
        var lp = this._loadingPromises;
        while (lp.length > 0) {
            var pr = lp.pop();
            pr.resolve();
        }
    },
    
    /*
     * Get a list of all files in the filesystem.
     */
    listAll: function() {
        return this._load().then(function() {
            return this._files;
        }.bind(this));
    },
    
    /*
     * Loads the contents of the file at path. When the promise is
     * resolved, the contents are passed in.
     */
    loadContents: function(path) {
        path = pathUtil.trimLeadingSlash(path);
        var source = this.get("source");
        return source.loadContents(path);
    },
    
    /*
     * Save a contents to the path provided. If the file does not
     * exist, it will be created.
     */
    saveContents: function(path, contents) {
        var pr = new Promise();
        path = pathUtil.trimLeadingSlash(path);
        var source = this.get("source");
        var self = this;
        source.saveContents(path, contents).then(function() {
            self.exists(path).then(function(exists) {
                if (!exists) {
                    self._files.push(path);
                    self._files.sort();
                }
                pr.resolve();
            });
        });
        return pr;
    },
    
    /*
     * get a File object that provides convenient path
     * manipulation and access to the file data.
     */
    getFile: function(path) {
        return new exports.File(this, path);
    },
    
    /*
     * Returns a promise that will resolve to true if the given path
     * exists.
     */
    exists: function(path) {
        path = pathUtil.trimLeadingSlash(path);
        var pr = new Promise();
        this._load().then(function() {
            var result = exports._binarySearch(this._files, path);
            console.log("Binary search for: ", path, " in ", this._files);
            pr.resolve(result !== null);
        }.bind(this));
        return pr;
    },
    
    /*
     * Deletes the file or directory at a path.
     */
    remove: function(path) {
        var pr = new Promise();
        var self = this;
        var source = this.get("source");
        source.remove(path).then(function() {
            self._load().then(function() {
                var position = exports._binarySearch(self._files, path);
                if (position === null) {
                    pr.reject(new Error("Cannot find path " + path + " to remove"));
                    return;
                }
                self._files.splice(position, 1);
                pr.resolve();
            });
        });
        return pr;
    },
    
    /*
     * Lists the contents of the directory at the path provided.
     * Returns a promise that will be given a list of file 
     * and directory names for the contents of the directory.
     * Directories are distinguished by a trailing slash.
     */
    listDirectory: function(path) {
        path = pathUtil.trimLeadingSlash(path);
        var pr = new Promise();
        this._load().then(function() {
            var files = this._files;
            var index = exports._prefixSearch(files, path);
            if (index === null) {
                pr.reject(new Error('Path ' + path + ' not found.'));
                return;
            }
            var result = [];
            var numfiles = files.length;
            var pathlength = path.length;
            var lastSegment = null;
            for (var i = index; i < numfiles; i++) {
                var file = files[i];
                if (file.substring(0, pathlength) != path) {
                    break;
                }
                var segmentEnd = file.indexOf("/", pathlength) + 1;
                if (segmentEnd == 0) {
                    segmentEnd = file.length;
                }
                var segment = file.substring(pathlength, segmentEnd);
                if (segment == "") {
                    continue;
                }
                
                if (segment != lastSegment) {
                    lastSegment = segment;
                    result.push(segment);
                }
            }
            pr.resolve(result);
        }.bind(this));
        return pr;
    },
    
    /*
     * Creates a directory at the path provided. Nothing is
     * passed into the promise callback.
     */
    makeDirectory: function(path) {
        path = pathUtil.trimLeadingSlash(path);
        if (!pathUtil.isDir(path)) {
            path += "/";
        }
        
        var self = this;
        var pr = new Promise();
        this._load().then(function() {
            var source = self.get("source");
            source.makeDirectory(path).then(function() {
                self._files.push(path);
                // O(n log n), eh? but all in C so it's possible
                // that this may be quicker than binary search + splice
                self._files.sort();
                pr.resolve();
            });
        });
        return pr;
    }
});

exports.File = function(fs, path) {
    this.fs = fs;
    this.path = path;
};

exports.File.prototype = {
    parentdir: function() {
        return pathUtil.parentdir(this.path);
    },
    
    loadContents: function() {
        return this.fs.loadContents(this.path);
    },
    
    saveContents: function(contents) {
        return this.fs.saveContents(this.path, contents);
    },
    
    exists: function() {
        return this.fs.exists(this.path);
    },
    
    remove: function() {
        return this.fs.remove(this.path);
    },
    
    extension: function() {
        return pathUtil.fileType(this.path);
    }
};

exports.DirectoryOld = SC.Object.extend({
    // the FileSource that is used for this directory
    source: null,

    // the parent of this directory, null if this is a root
    parent: null,

    // name of this directory -- does not include the parent segments
    name: null,

    // set of subdirectories
    directories: null,

    // set of files
    files: null,

    // whether or not we have data for this directory
    status: exports.NEW,

    contents: function() {
        return this.get("directories").concat(this.get("files"));
    }.property('directories', 'files'),

    init: function() {
        var source = this.get("source");
        if (typeof(source) == "string") {
            this.set("source", SC.objectForPropertyPath(source));
        }

        if (!this.get("source")) {
            throw new Error("Directory must have a source.");
        }

        if (!this.get("name")) {
            if (this.get("parent")) {
                throw new Error("Directories must have a name, except for the root");
            }
            this.set("name", "/");
        }
        if (!this.get("directories")) {
            this.set("directories", []);
        }
        if (!this.get("files")) {
            this.set("files", []);
        }
    },

    /**
     * Populates this directory object asynchronously with data.
     * If everything goes well, onSuccess is called with this directory
     * object as the argument. Otherwise, onFailure is called with an
     * Error object containing a message.
     *
     * Call loadDirectory on the FileSource with the parameters
     * path, directory handler delegate (this), and the onSuccess and onFailure
     * callbacks.
     *
     * @param deep{bool} If "deep" is set, then the entire directory tree
     *        rooted at this location is returned.
     */
    load: function(deep) {
        // TODO: There is a bug here because we assume that this directory
        // is deeply loaded, which may not be the case ...
        if (this.get("status") == exports.READY) {
            var pr = new Promise();
            pr.resolve(this);
            return pr;
        }

        if (this.get("status") == exports.LOADING) {
            return this._loadPromise;
        }

        this._loadPromise = new Promise();
        this.set("status", exports.LOADING);

        this.get("source").loadDirectory(this, deep).then(
            function(data) {
                this.populateDirectory(data);
                this._loadPromise.resolve(this);
            }.bind(this),
            function(error) {
                error.directory = this;
                this._loadPromise.reject(error);
            }.bind(this)
        );

        return this._loadPromise;
    },

    /**
     * Retrieve the object at the path given, and load it (if it's
     * a directory)
     */
    loadPath: function(path) {
        var pr;
        var obj = this.getObject(path);
        if (!obj) {
            pr = new Promise();
            pr.reject(new Error("Cannot find " + path));
            return pr;
        }
        if (pathUtil.isDir(path)) {
            return obj.load();
        } else {
            pr = new Promise();
            pr.resolve(obj);
            return pr;
        }
    },

    _getItem: function(name) {
        var isDir = util.endsWith(name, "/");
        var collection;
        if (isDir) {
            collection = this.get("directories");
        } else {
            collection = this.get("files");
        }
        return collection.findProperty("name", name);
    },

    /**
     * Retrieves an object (File or Directory) under this Directory
     * at the path given. If necessary, it will create objects along
     * the way.
     */
    getObject: function(path) {
        if (path == "/") {
            return this;
        }
        
        path = pathUtil.trimLeadingSlash(path);
        var segments = path.split("/");
        var isDir = pathUtil.isDir(path);
        if (isDir) {
            segments.pop();
        }
        var curDir = this;
        for (var i = 0; i < segments.length - 1; i++) {
            var segment = segments[i] + "/";
            var nextDir = curDir._getItem(segment);
            if (!nextDir) {
                // When the directory has been loaded, if
                // we don't know about the given name,
                // we're not going to create it.
                if (curDir.get("status") == exports.READY) {
                    return null;
                }
                nextDir = exports.Directory.create({
                    source: curDir.get("source"),
                    name: segment,
                    parent: curDir
                });
                curDir.get("directories").push(nextDir);
            }
            curDir = nextDir;
        }

        var lastSegment = segments[i];
        if (isDir) {
            lastSegment += "/";
        }
        var retval = curDir._getItem(lastSegment);
        if (!retval) {
            if (curDir.get("status") == exports.READY) {
                return null;
            }
            if (isDir) {
                retval = exports.Directory.create({
                    name: lastSegment,
                    source: curDir.get("source"),
                    parent: curDir
                });
                curDir.get("directories").push(retval);
            } else {
                retval = exports.File.create({
                    name: lastSegment,
                    directory: curDir
                });
                curDir.get("files").push(retval);
            }
        }
        return retval;
    },

    /*
     * Retrieves an object (file or directory), loading intermediate
     * directories along the way and ensuring that the end object
     * actually exists on the server.
     *
     * @param path{string}
     */
    loadObject: function(path) {
        var pr = new Promise();
        var segments = path.split("/");
        var isDir = pathUtil.isDir(path);
        if (isDir) {
            segments.pop();
        }

        var curDir = this;

        // loop over the segments and get each object synchronously,
        // if we can
        for (var i = 0; i < segments.length; i++) {
            var status = curDir.get("status");
            if (status != exports.READY) {
                break;
            }
            var item = this._getItem(segments[i] + (isDir ? "/" : ""));
            if (!item) {
                pr.reject({message:
                    segments[i] + " not found in " + curDir.get("path")});
                return pr;
            }

            // is this a directory?
            if (item.loadObject) {
                if (i+1 === segments.length) {
                    if (isDir) {
                        pr.resolve(item);
                    } else {
                        pr.reject(new Error(segments[i] + " is a file found " +
                            "where a directory was expected in path " + path));
                    }

                    return pr;
                }

                curDir = item;
            } else {
                if (i+1 != segments.length || isDir) {
                    pr.reject(new Error(segments[i] + " is a file found " +
                        "where a directory was expected in path " + path));
                    return pr;
                } else {
                    pr.resolve(item);
                    return pr;
                }
            }
        }

        // we've gotten as far as we can synchronously.
        // now we'll aggressively load everything underneath
        curDir.load(true).then(function() {
            segments.splice(0, i);
            var subPath = segments.join("/");
            if (isDir) {
                subPath += "/";
            }

            var obj = curDir.getObject(subPath);
            if (SC.none(obj)) {
                pr.reject(new Error(path + " not found"));
                return;
            }

            if (!isDir) {
                if (obj.loadObject) {
                    pr.reject(new Error(path + " is a directory found where " +
                        "a file was expected in " + path));
                    return;
                }
            } else if (!obj.loadObject) {
                pr.reject(new Error(path + " is a file where a directory " +
                    "was expected in " + path));
                return;
            }

            pr.resolve(obj);
        }, function(error) {
            pr.reject(error);
        });
        return pr;
    },

    path: function() {
        var parent = this.get("parent");
        if (parent) {
            return pathUtil.combine(parent.get("path"), this.get("name"));
        }
        return this.get("name");
    }.property().cacheable(),

    /**
     * The originPath finds the path within the same file source.
     * So, if you have a hierarchy of directories built from different
     * sources, this path is guaranteed to only include the parts of
     * the path from the same source as this directory.
     *
     * If you're looking up a file on a server, for example, you would
     * use this path.
     *
     * At the moment, originPath is not truly implemented (it just returns
     * the path). However, filesources should use this.
     */
    originPath: function() {
        return this.get("path");
    }.property().cacheable(),

    toString: function() {
        return "Directory " + this.get("name");
    },

    /**
     * Generally by a FileSource to put the data in this Directory.
     * It contains an array of objects. Each one needs to minimally have
     * a name. If the name ends with "/" it is assumed to be a directory.
     * Object references will be properly filled in (parent and source
     * on directories, directory on files).
     */
    populateDirectory: function(data) {
        this.set("status", exports.READY);

        var files = [], dirSpecs = {};
        var source = this.get("source");
        data.forEach(function(item) {
            var name = item.name;
            if (!name) {
                console.error("Bad data, no directory/file name: ", item);
                return;
            }

            var match = /^([^\/]+\/)(.*)/.exec(name);
            if (match === null) {
                item.directory = this;
                files.push(exports.File.create(item));
                return;
            }

            var dirName = match[1], subpath = match[2];
            if (!(dirName in dirSpecs)) {
                item.name = dirName;
                item.parent = this;
                item.source = source;
                dirSpecs[dirName] = { item: item, subpaths: [] };
            }

            if (subpath.length > 0) {
                dirSpecs[dirName].subpaths.push({ name: subpath });
            }
        }.bind(this));

        var directories = [];
        for (dirName in dirSpecs) {
            var dirSpec = dirSpecs[dirName];
            var dir = exports.Directory.create(dirSpec.item);
            dir.populateDirectory(dirSpec.subpaths);
            directories.push(dir);
        }

        this.set("directories", directories);
        this.set("files", files);
    },

    /**
     * Recursively delivers the paths rooted at this directory to a matcher
     * object.
     *
     * @return A promise to load all the subdirectories and deliver them to the
     *         matcher.
     */
    sendToMatcher: function(matcher, prefix) {
        if (this.get('status') !== exports.READY) {
            throw new Error("Attempt to send a directory to a matcher " +
                "before the directory was ready");
        }

        if (SC.none(prefix)) {
            prefix = this.get('name');
        }

        var subdirs = this.get('directories');
        var paths = this.get('files').concat(subdirs).map(function(obj) {
            return { name: prefix + obj.get('name') };
        });

        matcher.addItems(paths);

        var promise = new Promise();
        if (subdirs.length === 0) {
            promise.resolve();
            return promise;
        }

        var promises = subdirs.map(function(dir) {
            return dir.sendToMatcher(matcher, prefix + dir.get('name'));
        });

        m_promise.group(promises).then(function() {
            promise.resolve();
        });

        return promise;
    },

    /*
     * Removes this directory and everything underneath it.
     * @return a promise resolved when the deletion is done.
     */
    remove: function() {
        var pr = new Promise();
        this.get("source").remove(this).then(function() {
            var parent = this.get("parent");
            var dirlist = parent.get("directories");
            dirlist.removeObject(this);
            pr.resolve();
        }.bind(this), function(error) {
            pr.reject(error);
        });
        return pr;
    },

    /**
     * Writes a new file to this directory with the given contents, possibly
     * overwriting an existing file with the same name.
     *
     * @param newFile{File} The file object to write.
     * @param contents{string} The contents of the file.
     *
     * @return A promise to return the new file that was written, which may be
     *     a different object from @newFile if a file already existed with the
     *     supplied name.
     */
    writeFile: function(newFile, contents) {
        var promise = new Promise();

        var filename = newFile.get('name');
        this.loadObject(filename + "/").then(function() {
                promise.reject(new Error("Attempt to write a file named '" +
                    filename + "', but a directory exists named '" + filename +
                    "/'"));
            }, function() { // rejected; i.e. the directory didn't exist
                var files = this.get('files');
                var fileCount = files.length;
                for (var i = 0; i < fileCount; i++) {
                    var existingFile = files[i];
                    if (existingFile.get('name') !== filename) {
                        continue;
                    }

                    existingFile.saveContents(contents).then(function() {
                        promise.resolve(existingFile);
                    });

                    return;
                }

                newFile.set('directory', this);
                this.get('files').push(newFile);
                newFile.saveContents(contents).then(function() {
                    promise.resolve(newFile);
                });
            }.bind(this));

        return promise;
    },
    
    /*
     * creates a directory at the path provided.
     * 
     * @param path{string} path under this directory to create
     * 
     * @return a promise that is resolved when the directory has
     *       been created. The new directory object will be passed
     *       to the callback function.
     */
    makeDirectory: function(path) {
        var promise = new Promise();
        
        if (!pathUtil.isDir(path)) {
            path = path + "/";
        }
        var parentpath = pathUtil.parentdir(path);
        var parentdir = this.getObject(parentpath);
        
        if (!parentdir) {
            promise.reject(new Error("Parent directory " + parentpath + " does not exist"));
            return promise;
        }
        
        var dirname = path.substring(parentpath.length);
        
        var dirobj;
        
        if (parentdir.get("status") === exports.READY) {
            dirobj = parentdir.getObject(dirname);
            if (dirobj) {
                promise.reject(new Error("Directory " + path + " already exists"));
                return promise;
            }
        }
        
        var source = parentdir.get("source");
        
        dirobj = exports.Directory.create({
            name: dirname,
            parent: parentdir,
            source: source
        });
        
        source.makeDirectory(dirobj).then(function(addedDirectory) {
            var directories = parentdir.get("directories");
            addedDirectory.set("status", exports.READY);
            directories.pushObject(addedDirectory);
            // this should probably be a binary search insertion
            directories.sort(function(a, b) {
                var nameA = a.name;
                var nameB = b.name;
                if (nameA < nameB) { return -1; }
                if (nameA > nameB) { return 1; }
                return 0;
            });
            promise.resolve(addedDirectory);
        }, function(error) {
            promise.reject(error);
        });
        return promise;
    }
});

exports.FileOld = SC.Object.extend({
    // the directory this belongs to
    directory: null,

    // name of this file, does not include directory
    name: null,

    source: function() {
        return this.get("directory").get("source");
    }.property(),

    path: function() {
        return pathUtil.combine(this.get("directory").get("path"), this.get("name"));
    }.property().cacheable(),

    dirname: function() {
        return this.get("directory").get("path");
    }.property().cacheable(),

    ext: function() {
        return pathUtil.fileType(this.get("name"));
    }.property(),

    /**
     * See Directory.originPath
     */
    originPath: function() {
        return this.get("path");
    }.property().cacheable(),

    loadContents: function() {
        var source = this.get("source");
        return source.loadContents(this);
    },

    saveContents: function(newcontents) {
        var source = this.get("source");
        return source.saveContents(this, newcontents);
    },

    /*
     * remove this file.
     *
     * @return a promise resolved when the file is removed
     */
    remove: function() {
        var pr = new Promise();
        this.get("source").remove(this).then(function() {
            var filelist = this.get("directory").get("files");
            console.log("Remove from directory: ", this);
            filelist.removeObject(this);
            pr.resolve();
        }.bind(this), function(error) {
            pr.reject(error);
        });
        return pr;
    }
});
