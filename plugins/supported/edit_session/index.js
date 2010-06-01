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

var util = require('bespin:util/util');

var File = require('filesystem:index').File;
var TextStorage = require('text_editor:models/textstorage').TextStorage;
var Buffer = require('text_editor:models/buffer').Buffer;
var m_path = require('filesystem:path');
var Event = require("events").Event;

var History = require('edit_session:history').History;

/**
 * A Buffer connects a model and file together.
 */
exports.Buffer = function(session, model, syntaxManager) {
    this.session = session;
    
    if (model == null) {
        this.model = new TextStorage;
    } else {
        this.model = model;
    }

    this.syntaxManager = syntaxManager;
};

exports.Buffer.prototype = {
    _file: null,

   /**
    * The filesystem.File object that is associated with this Buffer.
    * If this Buffer has not been saved to a file, this will be null.
    * If you change the file object, its contents will be loaded
    * into the model. When creating a new file, you don't want to do
    * this, because you want to register the new File object, but
    * don't want to update the model. If that's the case, use the
    * Buffer.changeFileOnly method.
    */
    setFile: function(newFile) {
        if (newFile !== this._file) {
            this._file = newFile;

            if (util.none(newFile)) {
                this.model = new TextStorage;
            } else {
                newFile.loadContents().then(function(contents) {
                    console.log('SET FILE CONTENTS: ', contents);
                    this.model = new TextStorage(contents);
                }.bind(this));
            }

            this.session.bufferFileChanged(this, this._file);
        }
    },

    getFile: function() {
        return this._file;
    },

   /**
    * The text model that is holding the content of the file.
    */
    _model: null,

    /**
     * The syntax manager associated with this file.
     */
    syntaxManager: null,

   /**
    * This is like calling set('file', value) except this returns
    * a promise so that you can take action once the contents have
    * been loaded.
    */
    changeFile: function(newFile) {
        this.changeFileOnly(newFile);

        // are we changing to a new file?
        if (util.none(newFile)) {
            this.model = new TextStorage;
            var pr = new Promise();
            pr.resolve(this);
            return pr;
        }

        return newFile.loadContents().then(function(contents) {
            this.model = new TextStorage(contents);
            return this;
        }.bind(this));
    },

    /**
     * Normally, you would just call set('file', fileObject) on a Buffer.
     * However, that will replace the contents of the model (reloading the file),
     * which is not always what you want. Use this method to change the
     * file that is tracked by this Buffer without replacing the contents of the
     * model.
     */
    changeFileOnly: function(newFile) {
        this.file = newFile;
    },

    /**
     * reload the existing file contents from the server.
     */
    reload: function() {
        var file = this._file;
        var self = this;

        return file.loadContents().then(function(contents) {
            this.model = new TextStorage(contents);
        }.bind(this));
    },

    /**
     * Save the contents of this buffer. Returns a promise that resolves
     * once the file is saved.
     */
    save: function() {
        return this._file.saveContents(this._model.value);
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

        newFile.saveContents(this._model.value).then(function() {
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
        return util.none(this._file);
    }
};

Object.defineProperties(exports.Buffer.prototype, {
    model: {
        set: function(newModel) {
            if (this._model !== newModel) {
                this._model = newModel;
                this.session.bufferModelChanged(this, this._model);
            }
        },
        get: function() {
            return this._model;
        }
    }
});

exports.EditSession = function() {
    this.history = new History();
};

exports.EditSession.prototype = {
    /**
     * @property{TextView}
     *
     * The 'current' view is the editor component that most recently had
     * the focus.
     */
    _currentView: null,

    _updateHistoryProperty: function(key, value) {
        var file = this._currentBuffer.file;
        if (!util.none(file)) {
            this.history.update(file.path, key, value);
        }
    },

    /**
     * @type{string}
     * The name of the user, or null if no user is logged in.
     */
    currentUser: null,

    /**
     * The history object to store file history in.
     */
    history: null,

    /**
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
                file = buffer.file;
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
        var recents = this.history.getRecent(1);
        if (recents.length === 0) {
            return;
        }

        var recent = recents[0];

        var file = catalog.getObject("files").getFile(recent.path);

        // We have to save these values here, because they're going to get
        // clobbered when the new file is loaded and the editor readjusts the
        // selection to the beginning. (Not much we can do about this: the
        // text view is rightfully paranoid about the model shifting underneath
        // it...)
        var scroll = recent.scroll, selection = recent.selection;

        // Setup the promise that is resolved when the file's content is loaded.
        var fileLoadedPromise = new Promise();
        fileLoadedPromise.then(function() {
            var view = this._currentView;
            if (!util.none(selection)) {
                view.setSelection(selection);
            }
            if (!util.none(scroll)) {
                view.scrollTo(scroll);
            }
        }.bind(this));

        this._currentView.buffer = new Buffer(file, fileLoadedPromise);
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
    }
};

Object.defineProperties(exports.EditSession.prototype, {
    currentView: {
        set: function(newView) {
            var oldView = this._currentView;
            if (newView !== oldView) {
                this._currentView = newView;
            }
        },
        
        get: function() {
            return this._currentView;
        }
    }
});

/*
 * set up a session based on a view. This seems a bit convoluted and is
 * likely to change.
 */
exports.createSession = function(view, user) {
    var session = new exports.EditSession();
    if (view) {
        session.currentView = view.textView;
    }
    if (user) {
        session.currentUser = user;
    }
    return session;
};
