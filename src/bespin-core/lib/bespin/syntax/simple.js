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
 * Simple Syntax Highlighting
 * Not prepared for running in a worker thread.
 * Woul be more overhead than benefit for auch a simple highlighter
 */
 
// module: bespin/syntax/simple/base

var bespin = require("bespin");
var util = require("bespin/util");
var syntax = require("bespin/syntax");

/**
 * Tracks syntax highlighting data on a per-line basis.
 */

exports.Model = syntax.Model.extend({
    lineMetaInfo: [],

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

    getSyntaxStylesPerLine: function(lineText, lineNumber, language) {
        if (!this.language || (this.language != language)) {
            var self = this;
            // engines are loaded asynchronously. until the real thing
            // is loaded, use the Noop engine.
            this.engine = exports.NoopSyntaxEngine;
            
            exports.Resolver.resolve(language, function(engine) {
                self.engine = engine;
            });
            this.language = language;
        }
        
        /**
         * Get the row contents as one string
         */
        var syntaxResult = {
            text: lineText,
            regions: []
        };

        var meta;

        /**
         * We have the ability to have subtypes within the main parser
         * E.g. HTML can have JavaScript or CSS within
         */
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
    highlight: function(line, meta)
    {
        return { regions: {
            plain: [{
                start: 0,
                stop: line.length
                }]
            }
        };
    }
};

/**
 * The resolver holds the engines per language that are available to do the
 * actual syntax highlighting
 */ 
exports.Resolver = new function() {
  var extension2type = {};

  return {
      /**
       * Hunt down the engine for the given {{{type}}} (e.g. css, js, html)
       * and callback when it's found. If it's not found, the callback is
       * never called (so the caller should use a sane default such as the
       * NoopSyntaxEngine).
       */
      resolve: function(extension, callback) {
          if (!extension) {
              return;
          }
          
          var candidate = extension2type[extension];
          
          if (candidate) {
              return candidate;
          }
          
          var pluginCatalog = bespin.get("plugins");
          var ep = pluginCatalog.getExtensionPoint("syntax.simple.highlighter");
          var ext = ep.extensions;
          for (var i = 0; i < ext.length; i++) {
              var engineMeta = ext[i];
              if (util.include(engineMeta.extensions, extension)) {
                  engineMeta.load(function(engine) {
                      engine = engine.create();
                      for (var j = 0; j < engineMeta.extensions; j++) {
                          extension2type[engineMeta.extensions[j]] = engine;
                      }
                      callback(engine);
                  });
                  return;
              }
          }
      }
  };
}();
