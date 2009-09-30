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
dojo.provide("bespin.syntax.simple._base");

/**
 * Tracks syntax highlighting data on a per-line basis.
 */
dojo.declare("bespin.syntax.simple.Model", bespin.syntax.Model, {
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
            this.engine = bespin.syntax.simple.Resolver.resolve(language);
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
 * The resolver holds the engines per language that are available to do the
 * actual syntax highlighting
 */
bespin.syntax.simple.Resolver = new function() {
  var engines = {};
  var extension2type = {};

  /**
   * Return a plain region that is the entire line
   */
  var NoopSyntaxEngine = {
      highlight: function(line, meta) {
          return { regions: {
              plain: [{
                  start: 0,
                  stop: line.length
              }]
          } };
      }
  };

  return {
      /**
       * A high level highlight function that uses the {{{type}}} to get the
       * engine, and asks it to highlight
       */
      highlight: function(type, line, meta, lineNumber) {
          this.resolve(type).highlight(line, meta, lineNumber);
      },

      /**
       * Engines register themselves,
       * e.g. {{{bespin.syntax.EngineResolver.register("CSS", ['css'], new bespin.syntax.simple.CSS());}}}
       */
      register: function(type, extensions, syntaxEngine) {
          if (syntaxEngine) {
              // map the type (e.g. CSS to the syntax engine object if one is passed)
              engines[type] = syntaxEngine;
          }

          for (var i = 0; i < extensions.length; i++) {
              // link the extension to the type (js -> JavaScript)
              extension2type[extensions[i]] = type;
          }
      },

      /**
       * Hunt down the engine for the given {{{type}}} (e.g. css, js, html) or
       * return the {{{NoopSyntaxEngine}}}
       */
      resolve: function(extension) {
          /**
           * make sure there is a valid extension that actually has a
           * high-lighter
           */
          if (!extension || extension == "off" || !extension2type[extension]) {
              return NoopSyntaxEngine;
          }

          // convert the extension (e.g. js) to a type (JavaScript)
          var type = extension2type[extension];

          // does an object already exist?
          if (!engines[type] || (typeof engines[type] === "string" && engines[type] != "LOADING")) {
              // cheat and have this show that the engine is loading so don't do it twice
              engines[type] = "LOADING";

              var dr = dojo.require;
              dr.call(dojo, "bespin.syntax.simple." + type.toLowerCase());

              if (bespin.syntax.simple[type]) {
                  engines[type] = new bespin.syntax.simple[type]();
                  /**
                   * This is an ugly work around for a weirdness in Firefox 3.5b99
                   * For some reason the lines aren't painted correctly, but if we force a reset of the canvas all repaints well
                   * Seems to be fixed in Firefox 3.5RC2
                   *setTimeout(function() { bespin.get('editor').ui.resetCanvas(); }, 0);
                   */
              }
          }
          return engines[type] || NoopSyntaxEngine;
      }
  };
}();

/**
 * Register
 */
bespin.syntax.simple.Resolver.register("JavaScript", ['js', 'javascript', 'ecmascript', 'jsm', 'java']);
bespin.syntax.simple.Resolver.register("Arduino",    ['pde']);
bespin.syntax.simple.Resolver.register("C",          ['c', 'h']);
bespin.syntax.simple.Resolver.register("CSharp",     ['cs']);
bespin.syntax.simple.Resolver.register("CSS",        ['css']);
bespin.syntax.simple.Resolver.register("HTML",       ['html', 'htm', 'xml', 'xhtml', 'shtml']);
bespin.syntax.simple.Resolver.register("PHP",        ['php', 'php3', 'php4', 'php5']);
bespin.syntax.simple.Resolver.register("Python",     ['py', 'python']);
bespin.syntax.simple.Resolver.register("Ruby",       ['rb', 'ruby']);
