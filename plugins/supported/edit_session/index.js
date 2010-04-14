/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an 'AS IS' basis,
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

var Promise = require('bespin:promise').Promise;
var catalog = require('bespin:plugins').catalog;

var SC = require('sproutcore/runtime').SC;

var File = require('filesystem:index').File;
var MultiDelegateSupport = require('delegate_support').MultiDelegateSupport;
var TextStorage = require('text_editor:models/textstorage').TextStorage;
var m_path = require('filesystem:path');

var History = require('edit_session:history').History;

/*
* A Buffer connects a model and file together.
*/
exports.Buffer = SC.Object.extend(MultiDelegateSupport, {
    _file: null,

    _fileChanged: function() {
        this.notifyDelegates('bufferFileChanged', this._file);
    }.observes('file'),

    _modelChanged: function() {
        this.notifyDelegates('bufferModelChanged', this.get('model'));
    }.observes('model'),

    /*
    * The text model that is holding the content of the file.
    */
    model: null,

    /**
     * The syntax manager associated with this file.
     */
    syntaxManager: null,

    /*
    * The filesystem.File object that is associated with this Buffer.
    * If this Buffer has not been saved to a file, this will be null.
    * If you change the file object, its contents will be loaded
    * into the model. When creating a new file, you don't want to do
    * this, because you want to register the new File object, but
    * don't want to update the model. If that's the case, use the
    * Buffer.changeFileOnly method.
    */
    file: function(key, newFile) {
        if (newFile !== undefined) {
            this._file = newFile;

            if (SC.none(newFile)) {
                this.set('model', TextStorage.create());
            } else {
                newFile.loadContents().then(function(contents) {
                    console.log('SET FILE CONTENTS: ', contents);
                    SC.run(function() {
                        this.set('model', TextStorage.create({
                            initialValue: contents
                        }));
                    }.bind(this));
                }.bind(this));
            }
        }
        return this._file;
    }.property(),

    init: function() {
        var model = this.get('model');
        if (model == null) {
            this.set('model', TextStorage.create());
        }
    },

    /*
    * This is like calling set('file', value) except this returns
    * a promise so that you can take action once the contents have
    * been loaded.
    */
    changeFile: function(newFile) {
        this.changeFileOnly(newFile);

        // are we changing to a new file?
        if (SC.none(newFile)) {
            this.set('model', TextStorage.create());
            var pr = new Promise();
            pr.resolve(this);
            return pr;
        }

        return newFile.loadContents().then(function(contents) {
            SC.run(function() {
                var model = TextStorage.create({ initialValue: contents });
                this.set('model', model);
            }.bind(this));
            return this;
        }.bind(this));
    },

    /*
     * Normally, you would just call set('file', fileObject) on a Buffer.
     * However, that will replace the contents of the model (reloading the file),
     * which is not always what you want. Use this method to change the
     * file that is tracked by this Buffer without replacing the contents of the
     * model.
     */
    changeFileOnly: function(newFile) {
        this._file = newFile;
        this.propertyDidChange('file');
    },

    /*
     * reload the existing file contents from the server.
     */
    reload: function() {
        var file = this.get('file');
        var self = this;

        return file.loadContents().then(function(contents) {
            this.set('model', TextStorage.create({ initialValue: contents }));
        }.bind(this));
    },

    /*
     * Save the contents of this buffer. Returns a promise that resolves
     * once the file is saved.
     */
    save: function() {
        return this._file.saveContents(this.get('model').getValue());
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

        newFile.saveContents(this.get('model').getValue()).then(function() {
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
    _currentBuffer: null,
    _currentView: null,

    _currentBufferChanged: function() {
        var oldBuffer = this._currentBuffer;
        if (!SC.none(oldBuffer)) {
            oldBuffer.removeDelegate(this);
        }

        var newBuffer = this.get('currentBuffer');
        this._currentBuffer = newBuffer;
        newBuffer.addDelegate(this);
    }.observes('currentBuffer'),

    _currentViewChanged: function() {
        var oldView = this._currentView;
        if (!SC.none(oldView)) {
            oldView.removeDelegate(this);
        }

        var newView = this.get('currentView');
        this._currentView = newView;
        newView.addDelegate(this);
    }.observes('currentView'),

    _updateHistoryProperty: function(key, value) {
        var file = this._currentBuffer.get('file');
        if (!SC.none(file)) {
            this.get('history').update(file.path, key, value);
        }
    },

    /**
     * @property
     *
     * The 'current' buffer is the one that backs the current view.
     */
    currentBuffer: null,

    /*
     * The 'current' user.
     */
    currentUser: null,

    /**
     * @property{TextView}
     *
     * The 'current' view is the editor component that most recently had
     * the focus.
     */
    currentView: null,

    /**
     * The history object to store file history in.
     */
    history: null,

    bufferFileChanged: function(sender, file) {
        if (!SC.none(file)) {
            this.get('history').addPath(file.path);

            var ext = file.extension();
            var view = this._currentView;
            var syntaxManager = view.getPath('layoutManager.syntaxManager');
            syntaxManager.setInitialContextFromExt(ext === null ? '' : ext);
        }

        catalog.getExtensions('bufferFileChanged').forEach(function (ext) {
            ext.load(function (f) {
                f(file);
            });
        });
    },

    bufferModelChanged: function(sender, newModel) {
        this._currentView.setPath('layoutManager.textStorage', newModel);
    },

    /*
     * figures out the full path, taking into account the current file
     * being edited.
     */
    getCompletePath: function(path) {
        if (path == null) {
            path = '';
        }

        if (path == null || path.substring(0, 1) != '/') {
            var buffer = this._currentBuffer;
            var file;
            if (buffer) {
                file = buffer.get('file');
            }
            if (!file) {
                path = '/' + path;
            } else {
                path = file.parentdir() + path;
            }
        }

        return path;
    },

    loadMostRecentOrNew: function() {
        var recents = this.get('history').getRecent(1);
        if (recents.length === 0) {
            return;
        }

        var recent = recents[0];

        // We have to save these values here, because they're going to get
        // clobbered when the new file is loaded and the editor readjusts the
        // selection to the beginning. (Not much we can do about this: the
        // text view is rightfully paranoid about the model shifting underneath
        // it...)
        var scroll = recent.scroll, selection = recent.selection;

        var files = catalog.getObject('files');
        var file = files.getFile(recent.path);
        this._currentBuffer.changeFile(file).then(function() {
            var view = this._currentView;
            if (!SC.none(scroll)) {
                view.scrollTo(scroll);
            }
            if (!SC.none(selection)) {
                view.setSelection(selection);
            }
        }.bind(this));
    },

    /**
     * Called by the text view whenever the current selection changes.
     */
    textViewChangedSelection: function(sender, newSelection) {
        this._updateHistoryProperty('selection', newSelection);
    },

    /**
     * Called by the text view whenever it scrolls.
     */
    textViewWasScrolled: function(sender, point) {
        this._updateHistoryProperty('scroll', point);
    },

    init: function() {
        this.set('history', History.create());
    }
});

