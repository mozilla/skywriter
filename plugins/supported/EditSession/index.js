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
var History = require('EditSession:history').History;
var MultiDelegateSupport = require('DelegateSupport').MultiDelegateSupport;
var TextStorage = require("Editor:models/textstorage").TextStorage;
var catalog = require('bespin:plugins').catalog;

/*
* A Buffer connects a model and file together.
*/
exports.Buffer = SC.Object.extend(MultiDelegateSupport, {
    _file: null,

    _fileChanged: function() {
        this.notifyDelegates('bufferFileChanged', this._file);
    }.observes('file'),

    /*
    * The text model that is holding the content of the file.
    */ 
    model: null,
    
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
        if (newFile != undefined) {
            this._file = newFile;
            newFile.loadContents().then(function(result) {
                var model = self.get("model");
                model.set("value", result.contents);
            });
        }
        return this._file;
    }.property(),

    init: function() {
        var model = this.get("model");
        if (model == null) {
            this.set("model", TextStorage.create());
        }
    },
    
    /*
    * This is like calling set("file", value) except this returns
    * a promise so that you can take action once the contents have
    * been loaded.
    */
    changeFile: function(newFile) {
        var self = this;
        this.changeFileOnly(newFile);
        return newFile.loadContents().then(function(result) {
            var model = self.get("model");
            model.set("value", result.contents);
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
     * Save the contents of this buffer. Returns a promise that resolves
     * once the file is saved.
     */
    save: function() {
        return this._file.saveContents(this.model.get("value"));
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

    /**
     * The history object to store file history in.
     */
    history: null,
    
    bufferFileChanged: function(sender, file) {
        this.get('history').addPath(file.get('path'));
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
                path = file.get("dirname") + path;
            }
        }

        return path;
    },

    loadMostRecentOrNew: function() {
        var recent = this.get('history').getRecent(1);
        if (recent.length === 0) {
            return;
        }

        var files = catalog.getObject('files');
        this.get('currentBuffer').changeFile(files.getObject(recent[0]));
    },

    init: function() {
        this.set('history', History.create());
    }
});
