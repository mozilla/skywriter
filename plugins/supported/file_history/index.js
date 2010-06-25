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
var console = require('bespin:console').console;

var Buffer = require('text_editor:models/buffer').Buffer;

var MAX_HISTORY_SIZE = 30;

/**
 * @class
 *
 * A list of recently opened files.
 */
exports.FileHistory = function(session, storage) {
    // The detection code was taken from: http://diveintohtml5.org/everything.html
    var hasLocalStorage = ('localStorage' in window) &&
                                window['localStorage'] !== null;

    if (!storage && !hasLocalStorage) {
        throw new Error('Error FileHistory: No storage given '
                            + 'and localStorage not available.');
    }

    this.storage = storage || window.localStorage;

    this.session = session;
    session.history = this;
};

exports.FileHistory.prototype = {
    /** The edit session, supplied by the app config. */
    session: null,

    /**
     * @property{LocalStorage}
     *
     * The backing store to use. Defaults to HTML 5 local storage.
     */
    storage: null,

    _getStorageName: function() {
        var user = this.session.currentUser;
        return 'bespin.history.' + user;
    },

    _getHistory: function() {
        if (!this.hasStorage) {
            return [];
        }

        var storage = this.storage;
        var value = storage[this._getStorageName()];
        if (value) {
            return JSON.parse(value);
        }

        return [];
    },

    _setHistory: function(newHistory) {
        if (!this.hasStorage) {
            return;
        }

        var storage = this.storage;
        storage[this._getStorageName()] = JSON.stringify(newHistory);
    },

    getRecent: function(max) {
        if (!this.hasStorage) {
            return null;
        }

        var history = this._getHistory();
        return history.slice(max < history.length ? -max : 0);
    },

    getHistoryForPath: function(path) {
        var history = this._getHistory();
        var match = history.filter(function(item) {
            return item.path === path;
        });
        if (match.length == 0) {
            return null;
        } else {
            return match[0];
        }
    },

    /**
     * Updates metadata (the selection boundaries or the scroll position) for a
     * path in the history (if the path is at the top).
     *
     * @param path      The path to update.
     * @param valueObj  The object that is mixed into the current history value.
     */
    update: function(path, valueObj) {
        if (!this.hasStorage) {
            return;
        }

        var history = this._getHistory();
        var lastObject = history[history.length - 1];

        // Check if the lastObject is the current path and otherwise add
        // a new object lastObject to the end of history.
        if (!lastObject || lastObject.path !== path) {
            lastObject = null;

            for (var i = history.length - 1; i >= 0; i--) {
                var historyObj = history[i];
                if (historyObj.path === path) {
                    lastObject = historyObj;
                    history.splice(i, 1);
                    break;
                }
            }

            if (util.none(lastObject)) {
                lastObject = { path: path };
            }

            if (history.length >= MAX_HISTORY_SIZE) {
                history.splice(0, history.length - MAX_HISTORY_SIZE + 1);
            }

            history.push(lastObject);
        }

        util.mixin(lastObject, valueObj);

        this._setHistory(history);
    }
};

Object.defineProperties(exports.FileHistory.prototype, {
     hasStorage: {
        get: function() {
            return this.storage !== null;
        }
    }
});

exports.createFileHistory = function(session) {
    return new FileHistory(session);
};

// Timeout for saving changes to the history.
var UPDATE_TIMEOUT = 1000;

// Stores the setTimeout objects per each file that is currently updated.
var updateTimer = {};
// Stores the valueObj per each file that should get stored in history after
// the timeout is done.
var updateValues = {};

var _updateHistoryProperty = function(valueObj, file, atOnce) {
    var path = file.path;
    // If there is no timeout, then update the value directly and set a new
    // timeout.
    if (util.none(updateTimer[path]) || atOnce) {
        // FIXME: Ensure that the session actually exists!
        env.session.history.update(path, valueObj);

        updateTimer[path] = setTimeout(function() {
            updateTimer[path] = null;
            if (updateValues[path]) {
                env.session.history.update(path, updateValues[path]);
                updateValues[path] = null;
            }
        }, UPDATE_TIMEOUT);
    } else {
        // There is a timeout. Put the new value into a temporary object, that
        // is then stored into history when the timeout function is called.

        if (util.none(updateValues[path])) {
            updateValues[path] = valueObj;
        } else {
            util.mixin(updateValues[path], valueObj);
        }
    }
};

exports.handleEditorChange = function(editor, key, value) {
    // FIXME: Ensure that the session actually exists!
    if (!env.session.history || !editor.buffer.file) {
        return;
    }

    switch (key) {
        case 'buffer':
            var valueObj = {
                selection:  editor.selection,
                scroll:     editor.scrollOffset
            };
            _updateHistoryProperty(valueObj, editor.buffer.file, true);

            // If the new buffer has a file, then update the history so that
            // the new file is the most recent one.
            if (value.file) {
                _updateHistoryProperty({}, value.file);
            }
        break;

        case 'selection':
            _updateHistoryProperty({
                selection: value
            }, editor.buffer.file);
        break;

        case 'scrollOffset':
            _updateHistoryProperty({
                scroll: value
            }, editor.buffer.file);
        break;
    }
};

exports.loadMostRecent = function() {
    // FIXME: Ensure that the session actually exists!
    if (!env.session.history) {
        return;
    }

    var recents = env.session.history.getRecent(1);
    if (recents.length === 0) {
        return;
    }

    var recent = recents[0];
    var file = env.files.getFile(recent.path);

    var buffer = new Buffer(file);
    buffer.loadPromise.then(function() {
        env.editor.buffer = buffer;
    }, function(error) {
        console.error('Failed to load recentFile (', recent.path, '): ' + error);
    })
}
