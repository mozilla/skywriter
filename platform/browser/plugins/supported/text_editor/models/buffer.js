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

var env = require('environment').env;

var util = require('bespin:util/util');

var Promise = require('bespin:promise').Promise;
var TextStorage = require('models/textstorage').TextStorage;
var LayoutManager = require('controllers/layoutmanager').LayoutManager;
var UndoManager = require('undomanager').UndoManager;

/**
 * A Buffer connects a model and file together. It also holds the layoutManager
 * that is bound to the model. The syntaxManager can get accessed via the
 * layoutManager as well.
 *
 * Per opened file there is one buffer which means that one buffer is
 * corresponding to one file on the disk. If you open different file, you have
 * to create a new buffer for that file.
 *
 * To create a buffer that is (not yet) bound to a file, just create the Buffer
 * without a file passed.
 */
exports.Buffer = function(file, initialContent) {
    this._file = file;
    this._model = new TextStorage(initialContent);
    this._layoutManager = new LayoutManager({
        textStorage: this._model
    });

    this.undoManager = new UndoManager();

    // If a file is passed, then load it. This is the same as calling reload.
    if (file) {
        this.reload().then(function() {
            this._updateSyntaxManagerInitialContext();
        }.bind(this));
    } else {
        this.loadPromise = new Promise();
        this.loadPromise.resolve();
    }

    // Restore the state of the buffer (selection + scrollOffset).
    // TODO: Refactor this code into the ViewState.
    var history = (env.session ? env.session.history : null);
    var item, selection, scrollOffset;

    // If
    //  1.  Check if a history exists and the buffer has a file (-> path)
    //  2.  Ask the history object for the history for the current file.
    //      If no history is found, null is returned.
    if (history && file &&                                  // 1.
            (item = history.getHistoryForPath(file.path))   // 2.
    ) {
        // There is no state saved in the buffer and the history object
        // has a state saved.
        selection = item.selection;
        scrollOffset = item.scroll;
    }

    // Use the saved values from the history or the default values.
    this._selectedRange = selection || {
        start: { row: 0, col: 0 },
        end: { row: 0, col: 0 }
    };

    this._scrollOffset = scrollOffset || { x: 0, y: 0 };
};

exports.Buffer.prototype = {
    /**
     * The undoManager where the undo/redo stack is stored and handled.
     */
    undoManager: null,

    loadPromise: null,

    _scrollOffset: null,
    _selectedRange: null,
    _selectedRangeEndVirtual: null,

    /**
     * The syntax manager associated with this file.
     */
    _layoutManager: null,

    /**
     * The file object associated with this buffer. The file instance can only
     * be assigned when constructing the buffer or calling saveAs.
     */
    _file: null,

   /**
    * The text model that is holding the content of the file.
    */
    _model: null,

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
            this._file = newFile;
            this._updateSyntaxManagerInitialContext();
            promise.resolve();
        }.bind(this), function(error) {
            promise.reject(error);
        });

        return promise;
    },

    /**
     * Reload the existing file contents from the server.
     */
    reload: function() {
        var file = this._file;
        var self = this;

        var pr;
        pr =  file.loadContents().then(function(contents) {
            self._model.value = contents;
        });
        this.loadPromise = pr;
        return pr;
    },

    _updateSyntaxManagerInitialContext: function() {
        var ext = this._file.extension();
        var syntaxManager = this._layoutManager.syntaxManager;
        syntaxManager.setSyntaxFromFileExt(ext === null ? '' : ext);
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
    layoutManager: {
        get: function() {
            return this._layoutManager;
        }
    },

    syntaxManager: {
        get: function() {
            this._layoutManager.syntaxManager;
        }
    },

    file: {
        get: function() {
            return this._file;
        }
    },

    model: {
        get: function() {
            return this._model;
        }
    }
});
