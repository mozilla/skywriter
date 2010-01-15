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

"define metadata";
({
    "provides":[
        {
            "ep": "syntax.engine",
            "name": "simple",
            "pointer": "#Model"
        },
        {
            "ep": "extensionpoint",
            "name": "syntax.simple.highlighter",
            "description": "Highlighter code for the simple syntax highlighter."
        }    
    ]
});
"end";

/**
 * Simple Syntax Highlighting
 * Not prepared for running in a worker thread.
 * Would be more overhead than benefit for such a simple highlighter
 */

var pluginCatalog = require("bespin:plugins").catalog;
var util = require("bespin:util/util");

/**
 * Base model for tracking syntax highlighting data.
 */
exports.BaseModel = SC.Object.extend({
    language: "",

    lineCache: [],

    /**
     * Optionally, keep a cache of the highlighted model
     */
    invalidateCache: function(lineNumber) {
        delete this.lineCache[lineNumber];
    },

    invalidateEntireCache: function() {
        this.lineCache = [];
    },

    addToCache: function(lineNumber, line) {
        this.lineCache[lineNumber] = line;
    },

    getFromCache: function(lineNumber) {
        return this.lineCache[lineNumber];
    },

    /**
     * Helpers. TO BE COMPLETED
     * This function has to take the regions and take sub pieces and tie them
     * into the full line.
     * For example, imagine an HTML engine that sees script tags
     * It will pass .... into the JavaScript engine and take those results with
     * a base of 0 and return the real location.
     */
    mergeSyntaxResults: function(regions) {
        var base = 0;
        for (var i = 0; i < regions.length; i++) {
            var region = region[i];
            //base += region.
        }
    },

    getSyntaxStylesPerLine: function(lineText, lineNumber, language) {
        return {
            text: lineText,
            regions: [{
                plain: [{
                    start: 0,
                    stop: lineText.length
                }]
            }]
        };
    },

    /**
     * Main API
     */
    getSyntaxStyles: function(rows, firstLineToRender, lastLineToRender, language) {
        var syntaxResults = {};
        for (var i = firstLineToRender; i <= lastLineToRender; i++) {
            syntaxResults[i] = this.getSyntaxStylesPerLine(rows[i], i, language);
        }
        return syntaxResults;
    }
});


/**
 * Tracks syntax highlighting data on a per-line basis.
 */
exports.Model = exports.BaseModel.extend({
    lineMetaInfo: [],
    
    init: function() {
        this.engine = exports.NoopSyntaxEngine;
    },

    /**
     * We store meta info on the lines, such as the fact that it is in a
     * multiline comment
     */
    setLineMetaInfo: function(lineNumber, meta) {
        this.lineMetaInfo[lineNumber] = meta;
    },

    getLineMetaInfo: function(lineNumber) {
        return this.lineMetaInfo[lineNumber];
    },
    
    _changeLanguage: function(language) {
        var self = this;
        // engines are loaded asynchronously. until the real thing
        // is loaded, use the Noop engine.
        this.engine = exports.NoopSyntaxEngine;
        
        var ext = pluginCatalog.getExtensions("syntax.simple.highlighter");
        for (var i = 0; i < ext.length; i++) {
            var engineMeta = ext[i];
            if (util.include(engineMeta.extensions, language)) {
                engineMeta.observe("SimpleSyntax", function(engine){
                    if (engine) {
                        self.engine = engine.create();
                    } else {
                        self.engine = exports.NoopSyntaxEngine;
                    }
                });
                break;
            }
        }
        
        this.language = language;
    },

    getSyntaxStylesPerLine: function(lineText, lineNumber, language) {
        if (this.language != language) {
            this._changeLanguage(language);
        }

        // Get the row contents as one string
        var syntaxResult = {
            text: lineText,
            regions: []
        };

        var meta;

        // We have the ability to have subtypes within the main parser
        // E.g. HTML can have JavaScript or CSS within
        if (typeof this.engine['innertypes'] == "function") {
            var languages = this.engine.innertypes(lineText);

            for (var i = 0; i < languages.length; i++) {
                var type = languages[i];
                meta = {
                    inMultiLineComment: this.inMultiLineComment(),
                    offset: type.start
                };

                var pieceRegions = [];
                var fromResolver = bespin.syntax.simple.Resolver.highlight(type.type, lineText.substring(type.start, type.stop), meta);
                if (fromResolver.meta && (i == languages.length - 1) ) {
                    this.setLineMetaInfo(lineNumber, fromResolver.meta);
                }
                pieceRegions.push(fromResolver);
            }
            syntaxResult.regions.push(this.mergeSyntaxResults(pieceRegions));
        } else {
            meta = (lineNumber > 0) ? this.getLineMetaInfo(lineNumber - 1) : {};
            var result = this.engine.highlight(lineText, meta);
            this.setLineMetaInfo(lineNumber, result.meta);
            syntaxResult.regions.push(result.regions);
        }

        return syntaxResult;
    }
});

/**
 * Return a plain region that is the entire line
 */
exports.NoopSyntaxEngine = {
    highlight: function(line, meta) {
        return {
            regions: {
                plain: [{
                    start: 0,
                    stop: line.length
                }]
            }
        };
    }
};
