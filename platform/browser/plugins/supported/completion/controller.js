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

var ctags = require('ctags');
var range = require('rangeutils:utils/range');
var CompletionUI = require('completion:ui').CompletionUI;
var catalog = require('bespin:plugins').catalog;
var env = require('environment').env;

function CompletionController(editorView) {
    this._editorView = editorView;
    editorView.selectionChanged.add(this._selectionChanged.bind(this));
    editorView.willChangeBuffer.add(this._willChangeBuffer.bind(this));

    // Prebind _syntaxChanged so that we can attach and detach it.
    this._syntaxChanged = this._syntaxChanged.bind(this);

    this.tags = new ctags.Tags();
    this.ui = new CompletionUI(editorView.element);
}

CompletionController.prototype = {
    _buffer: null,
    _completionEngine: null,
    _completions: null,
    _stem: null,

    _hideCompletions: function() {
        this.ui.hide();
    },

    _selectionChanged: function(newRange) {
        var engine = this._completionEngine;
        if (engine == null || !range.isZeroLength(newRange)) {
            return;
        }

        var layoutManager = this._buffer.layoutManager;
        var textStorage = layoutManager.textStorage;
        var syntaxManager = layoutManager.syntaxManager;

        var pos = newRange.start;
        var row = pos.row, col = pos.col;
        var line = textStorage.lines[row];
        var prefix = line.substring(0, col), suffix = line.substring(col);

        var completions = engine.getCompletions(prefix, suffix, syntaxManager);
        if (completions == null) {
            this._hideCompletions();
            return;
        }

        var tags = completions.tags;
        this._stem = completions.stem;
        this._showCompletions(tags);
    },

    _showCompletions: function(completions) {
        var editorView = this._editorView;
        var cursorPt = editorView.textView.getInsertionPointPosition();
        var pt = editorView.convertTextViewPoint(cursorPt);
        var lineHeight = editorView.layoutManager.fontDimension.lineHeight;
        this.ui.show(completions, pt, lineHeight);
    },

    _syntaxChanged: function(newSyntax) {
        var ext = catalog.getExtensionByKey('completion', newSyntax);
        if (ext == null) {
            this._completionEngine = null;
            return;
        }

        ext.load().then(function(engine) {
            this._completionEngine = new engine(this.tags);
        }.bind(this));
    },

    _willChangeBuffer: function(newBuffer) {
        var oldBuffer = this._buffer;
        if (oldBuffer != null) {
            var oldSyntaxManager = oldBuffer.layoutManager.syntaxManager;
            oldSyntaxManager.syntaxChanged.remove(this._syntaxChanged);
        }

        var newSyntaxManager = newBuffer.layoutManager.syntaxManager;
        newSyntaxManager.syntaxChanged.add(this._syntaxChanged);

        this._buffer = newBuffer;
    },

    cancel: function(env) {
        this.ui.hide();
    },

    complete: function(env) {
        var ui = this.ui;
        var tag = ui.getCompletion();
        var ident = tag.name;
        env.view.insertText(ident.substring(this._stem.length));
        ui.hide();
    },

    isCompleting: function() {
        return this.ui.visible;
    },

    moveDown: function(env) {
        this.ui.move('down');
    },

    moveUp: function(env) {
        this.ui.move('up');
    },

    /** The current store of tags. */
    tags: null
};

function makeCommand(name) {
    return function(args, req) {
        return env.editor.completionController[name](env);
    };
}

exports.CompletionController = CompletionController;
exports.completeCommand = makeCommand('complete');
exports.completeCancelCommand = makeCommand('cancel');
exports.completeDownCommand = makeCommand('moveDown');
exports.completeUpCommand = makeCommand('moveUp');

