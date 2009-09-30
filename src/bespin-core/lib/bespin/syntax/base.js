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

/**
 * Syntax Highlighting
 * Module for dealing with the syntax highlighting.
 * The core model talks to specific engines to do the work and then packages it
 * up to send to the editor.
 */
dojo.provide("bespin.syntax.base");

/**
 * Base model for tracking syntax highlighting data.
 */
dojo.declare("bespin.syntax.Model", null, {
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
     * For example, imagine an HTML engine that sees <script>....</script>
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
        return { regions: {
            plain: [{
                start: 0,
                stop: lineText.length
            }]
        }};
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
 * The resolver hunts down the syntax engine
 */
bespin.syntax.Resolver = (function() {
    var current, model;

    return {
        setEngine: function(name) {
            var engine = bespin.syntax[name];
            if (name == current) {
                return this;
            }
            if (engine) {
                current = name;
                if (model) {
                    delete model;
                }
                if (engine.worker) {
                    model = new bespin.worker.WorkerFacade(bespin.syntax[name].Model());
                    model.workerEnabled = true;
                } else {
                    model = new bespin.syntax[name].Model();
                    model.workerEnabled = false;
                }
            } else {
                console.log("no such engine: ", name);
            }
            return this;
        },

        getModel: function() {
            return model;
        }
    };
})();
