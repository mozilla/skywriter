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

var _ = require('underscore')._;
var Event = require('events').Event;
var WorkerSupervisor = require('worker_manager').WorkerSupervisor;
var console = require('bespin:console').console;
var rangeutils = require('rangeutils:utils/range');
var syntaxDirectory = require('syntax_directory').syntaxDirectory;

// The number of lines to highlight at once.
var GRANULARITY = 100;

// Replaces elements at position i in dest with the elements of src. If i is
// beyond the end of dest, expands dest with copies of fill.
function replace(dest, i, src, fill) {
    while (dest.length < i) {
        dest.push(_(fill).clone());
    }

    var args = [ i, src.length ].concat(src);
    Array.prototype.splice.apply(dest, args);
    return dest;
}

// A simple key-value store in which each key is paired with a corresponding
// line. When the syntax information is updated for a line, the symbols from
// those lines are wiped out and replaced with the new symbols.
function Symbols() {
    this._lines = [];
    this._syms = {};
}

Symbols.prototype = {
    get: function(sym) {
        return this._syms["-" + sym];
    },

    replaceLine: function(row, newSymbols) {
        var lines = this._lines, syms = this._syms;
        if (row < lines.length && _(lines[row]).isArray()) {
            _(lines[row]).each(function(ident) { delete syms["-" + ident]; });
        }

        function stripLeadingDash(s) { return s.substring(1); }
        lines[row] = _(newSymbols).keys().map(stripLeadingDash);

        _(syms).extend(newSymbols);
    }
};

function Context(syntaxInfo, syntaxManager) {
    this._syntaxInfo = syntaxInfo;
    this._syntaxManager = syntaxManager;

    this._invalidRow = 0;
    this._states = [];
    this._active = false;

    this.symbols = new Symbols;
}

Context.prototype = {
    _annotate: function() {
        if (this._invalidRow == null) {
            throw new Error("syntax_manager.Context: attempt to annotate " +
                "without any invalid row");
        }
        if (!this._active) {
            throw new Error("syntax_manager.Context: attempt to annotate " +
                "while inactive");
        }

        if (this._worker == null) {
            this._createWorker();
            return;
        }

        var lines = this._syntaxManager.getTextLines();
        var row = this._invalidRow;
        var state = row === 0 ? this.getName() + ':start' : this._states[row];
        var lastRow = Math.min(lines.length, row + GRANULARITY);
        lines = lines.slice(row, lastRow);

        var runRange = {
            start: { row: row, col: 0 },
            end: { row: lastRow - 1, col: _(lines).last().length }
        };

        var pr = this._worker.send('annotate', [ state, lines, runRange ]);
        pr.then(_(this._annotationFinished).bind(this, row, lastRow));
    },

    _annotationFinished: function(row, lastRow, result) {
        if (!this._active) {
            return;
        }

        var syntaxManager = this._syntaxManager;
        syntaxManager.mergeAttrs(row, result.attrs);
        syntaxManager.mergeSymbols(row, result.symbols);

        replace(this._states, row, result.states);

        if (lastRow >= this._getRowCount()) {
            this._invalidRow = null;    // We're done!
            this._active = false;
            return;
        }

        this._invalidRow = lastRow;
        this._annotate();
    },

    _createWorker: function() {
        var syntaxInfo = this._syntaxInfo;
        if (syntaxInfo == null) {
            return false;
        }

        var worker = new WorkerSupervisor("syntax_worker#syntaxWorker");
        this._worker = worker;

        worker.started.add(this._workerStarted.bind(this));
        worker.start();

        return true;
    },

    _getRowCount: function() {
        return this._syntaxManager.getTextLines().length;
    },

    _workerStarted: function() {
        this._worker.send('loadSyntax', [ this._syntaxInfo.name ]);
        if (this._active) {
            this._annotate();
        }
    },

    // Switches on this syntax context and begins annotation. It is the
    // caller's responsibility to ensure that there exists an invalid row
    // before calling this. (Typically the caller ensures this by calling cut()
    // first.)
    activateAndAnnotate: function() {
        this._active = true;
        this._annotate();
    },

    contextsAtPosition: function(pos) {
        var syntaxInfo = this._syntaxInfo;
        if (syntaxInfo == null) {
            return [ 'plain' ];
        }

        return [ syntaxInfo.name ];             // FIXME
    },

    // Invalidates the syntax context at a row.
    cut: function(row) {
        var endRow = this._getRowCount();
        if (row < 0 || row >= endRow) {
            throw new Error("Attempt to cut the context at an invalid row");
        }

        if (this._invalidRow != null && this._invalidRow < row) {
            return;
        }
        this._invalidRow = row;

        // Mark ourselves as inactive, so that if the web worker was working on
        // a series of rows we know to discard its results.
        this._active = false;
    },

    getName: function() {
        return this._syntaxInfo.name;
    },

    kill: function() {
        var worker = this._worker;
        if (worker == null) {
            return;
        }

        worker.kill();
        this._worker = null;
    }
};

/**
 * The syntax manager coordinates a series of syntax contexts, each run in a
 * separate web worker. It receives text editing notifications, updates and
 * stores the relevant syntax attributes, and provides marked-up text as the
 * layout manager requests it.
 *
 * @constructor
 * @exports SyntaxManager as syntax_manager:SyntaxManager
 */
function SyntaxManager(layoutManager) {
    this.layoutManager = layoutManager;

    /** Called whenever the attributes have been updated. */
    this.attrsChanged = new Event;

    /** Called whenever the syntax (file type) has been changed. */
    this.syntaxChanged = new Event;

    this._context = null;
    this._invalidRows = null;
    this._contextRanges = null;
    this._attrs = [];
    this._symbols = new Symbols;
    this._syntax = 'plain';

    this._reset();
}

SyntaxManager.prototype = {
    /** @lends SyntaxManager */

    _getTextStorage: function() {
        return this.layoutManager.textStorage;
    },

    // Invalidates all the highlighting and recreates the workers.
    _reset: function() {
        var ctx = this._context;
        if (ctx != null) {
            ctx.kill();
            this._context = null;
        }

        var syn = this._syntax;
        var syntaxInfo = syn === 'plain' ? null : syntaxDirectory.get(syn);

        ctx = new Context(syntaxInfo, this);
        this._context = ctx;
        ctx.activateAndAnnotate();
    },

    attrsChanged: null,
    syntaxChanged: null,

    /** Returns the contexts that are active at the position pos. */
    contextsAtPosition: function(pos) {
        return this._context.contextsAtPosition(pos);
    },

    /**
     * Returns the attributes most recently delivered from the syntax engine.
     * Does not instruct the engine to perform any work; use invalidateRow()
     * for that.
     */
    getAttrsForRows: function(startRow, endRow) {
        return this._attrs.slice(startRow, endRow);
    },

    /**
     * Returns the metadata currently associated with the given symbol, or null
     * if the symbol is unknown.
     */
    getSymbol: function(ident) {
        return this._symbols.get(ident);
    },

    /** Returns the current syntax. */
    getSyntax: function() {
        return this._syntax;
    },

    /** A convenience function to return the lines from the text storage. */
    getTextLines: function() {
        return this._getTextStorage().lines;
    },

    /** Marks the text as needing an update starting at the given row. */
    invalidateRow: function(row) {
        var ctx = this._context;
        ctx.cut(row);
        ctx.activateAndAnnotate();
    },

    /**
     * Merges the supplied attributes into the text, overwriting the attributes
     * that were there previously.
     */
    mergeAttrs: function(startRow, newAttrs) {
        replace(this._attrs, startRow, newAttrs, []);
        this.attrsChanged(startRow, startRow + newAttrs.length);
    },

    /**
     * Merges the supplied symbols into the symbol store, overwriting any
     * symbols previously defined on those lines.
     */
    mergeSymbols: function(startRow, newSymbols) {
        var symbols = this._symbols;
        _(newSymbols).each(function(lineSyms, i) {
            symbols.replaceLine(startRow + i, lineSyms);
        });
    },

    /**
     * Sets the syntax and invalidates all the highlighting. If no syntax
     * plugin is available, sets the syntax to "plain".
     */
    setSyntax: function(syntax) {
        this._syntax = syntaxDirectory.hasSyntax(syntax) ? syntax : 'plain';
        this.syntaxChanged(syntax);
        this._reset();
    },

    /** Sets the syntax appropriately for a file extension. */
    setSyntaxFromFileExt: function(fileExt) {
        return this.setSyntax(syntaxDirectory.syntaxForFileExt(fileExt));
    }
};

exports.SyntaxManager = SyntaxManager;

