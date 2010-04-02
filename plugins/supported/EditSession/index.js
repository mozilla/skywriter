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
 *   Bespin Team (bespin@mozilla.com)
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

var SC = require("sproutcore/runtime").SC;
var File = require('Filesystem:index').File;
var History = require('EditSession:history').History;
var MultiDelegateSupport = require('DelegateSupport').MultiDelegateSupport;
var TextStorage = require("Editor:models/textstorage").TextStorage;
var catalog = require('bespin:plugins').catalog;
var m_path = require('Filesystem:path');

/*
* A Buffer connects a model and file together.
*/
exports.Buffer = SC.Object.extend(MultiDelegateSupport, {
    _file: null,

    _fileChanged: function() {
        this._refreshSyntaxManager();
        this.notifyDelegates('bufferFileChanged', this._file);
    }.observes('file'),

    _refreshSyntaxManager: function() {
        var syntaxManager = this.get('syntaxManager');
        if (SC.none(syntaxManager)) {
            return;
        }

        var file = this._file;
        if (SC.none(file)) {
            return;
        }
        
        var ext = file.extension();
        if (ext === null) {
            ext = '';
        }
        syntaxManager.setInitialContextFromExt(ext);
    },

    /*
    * The text model that is holding the content of the file.
    */ 
    model: null,

    /**
     * The syntax manager associated with this file.
     */
    syntaxManager: null,
    
    /*
    * The Filesystem.File object that is associated with this Buffer.
    * If this Buffer has not been saved to a file, this will be null.
    * If you change the file object, its contents will be loaded
    * into the model. When creating a new file, you don't want to do
    * this, because you want to register the new File object, but
    * don't want to update the model. If that's the case, use the
    * Buffer.changeFileOnly method.
    */
    file: function(key, newFile) {
        var self = this;
        if (newFile !== undefined) {
            this._file = newFile;
            
            if (SC.none(newFile)) {
                var model = self.get("model");
                model.replaceCharacters(model.range(), "");
            } else {
                newFile.loadContents().then(function(contents) {
                    console.log("SET FILE CONTENTS: ", contents);
                    SC.run(function() {
                        var model = self.get("model");
                        model.replaceCharacters(model.range(), contents);
                    });
                });
            }
        }
        return this._file;
    }.property(),

    init: function() {
        var model = this.get("model");
        if (model == null) {
            this.set("model", TextStorage.create());
        }

        this._refreshSyntaxManager();
    },
    
    /*
    * This is like calling set("file", value) except this returns
    * a promise so that you can take action once the contents have
    * been loaded.
    */
    changeFile: function(newFile) {
        var self = this;
        this.changeFileOnly(newFile);
        
        // are we changing to a new file?
        if (SC.none(newFile)) {
            var model = self.get("model");
            model.replaceCharacters(model.range(), "");
            var pr = new Promise();
            pr.resolve(this);
            return pr;
        }
        
        return newFile.loadContents().then(function(contents) {
            SC.run(function() {
                var model = self.get("model");
                model.replaceCharacters(model.range(), contents);
            });
            return self;
        });
    },
    
    /*
     * Normally, you would just call set("file", fileObject) on a Buffer.
     * However, that will replace the contents of the model (reloading the file), 
     * which is not always what you want. Use this method to change the
     * file that is tracked by this Buffer without replacing the contents of the
     * model.
     */
    changeFileOnly: function(newFile) {
        this._file = newFile;
        this.propertyDidChange("file");
    },
    
    /*
     * reload the existing file contents from the server.
     */
    reload: function() {
        var file = this.get("file");
        var self = this;
        
        return file.loadContents().then(function(contents) {
            var model = self.get("model");
            model.replaceCharacters(model.range(), contents);
            // the following should theoretically work...
            // but does not seem to.
            // model.set("value", contents);
        });
    },
    
    /*
     * Save the contents of this buffer. Returns a promise that resolves
     * once the file is saved.
     */
    save: function() {
        return this._file.saveContents(this.getPath('model.value'));
    },

    /**
     * Saves the contents of this buffer to a new file, and updates the file
     * field of this buffer to point to the result.
     *
     * @param dir{Directory} The directory to save in.
     * @param filename{string} The name of the file in the directory.
     * @return A promise to return the newly-saved file.
     */
    saveAs: function(newFile) {
        var promise = new Promise();
        
        newFile.saveContents(this.getPath('model.value')).then(function() {
            this.changeFileOnly(newFile);
            promise.resolve();
        }.bind(this), function(error) {
            promise.reject(error);
        });

        return promise;
    },

    /**
     * Returns true if the file is untitled (i.e. it is new and has not yet
     * been saved with @saveAs) or false otherwise.
     */
    untitled: function() {
        return SC.none(this._file);
    }
});

exports.EditSession = SC.Object.extend({
    _currentBufferChanged: function() {
        this.get('currentBuffer').addDelegate(this);
    }.observes('currentBuffer'),

    /*
     * The "current" view is the editor component that most recently had
     * the focus.
     */
    currentView: null,
    
    /*
     * The "current" Buffer is the one that backs the currentView.
     */
    currentBuffer: null,
    
    /*
     * The "current" user.
     */
    currentUser: null,

    /**
     * The history object to store file history in.
     */
    history: null,
    
    bufferFileChanged: function(sender, file) {
        if (!SC.none(file)) {
            this.get('history').addPath(file.path);
        }
        catalog.getExtensions("bufferFileChanged").forEach(function (ext) {
            ext.load(function (f) {
                f(file);
            });
        });
    },

    /*
     * figures out the full path, taking into account the current file
     * being edited.
     */
    getCompletePath: function(path) {
        if (path == null) {
            path = "";
        }

        if (path == null || path.substring(0, 1) != "/") {
            var buffer = this.get("currentBuffer");
            var file;
            if (buffer) {
                file = buffer.get("file");
            }
            if (!file) {
                path = "/" + path;
            } else {
                path = m_path.parentdir(file) + path;
            }
        }

        return path;
    },

    loadMostRecentOrNew: function() {
        var recent = this.get('history').getRecent(1);
        if (recent.length === 0) {
            return;
        }
        var files = catalog.getObject("files");
        var file = files.getFile(recent[0]);
        this.get('currentBuffer').changeFile(file);
    },

    init: function() {
        this.set('history', History.create());
    }
});
