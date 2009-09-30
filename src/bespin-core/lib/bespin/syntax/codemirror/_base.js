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
 * The Original Code is Bespin and CodeMirror.
 *
 * The Initial Developer of the Original Code is Marijn Haverbeke.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ORIGINAL CodeMirror BSD-style-licensed CODE LICENSE HEADER FOLLOWS:

// Copyright (c) 2007-2009 Marijn Haverbeke
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any
// damages arising from the use of this software.
//
// Permission is granted to anyone to use this software for any
// purpose, including commercial applications, and to alter it and
// redistribute it freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must
//    not claim that you wrote the original software. If you use this
//    software in a product, an acknowledgment in the product
//    documentation would be appreciated but is not required.
//
// 2. Altered source versions must be plainly marked as such, and must
//    not be misrepresented as being the original software.
//
// 3. This notice may not be removed or altered from any source
//    distribution.
//
// Marijn Haverbeke
// marijnh at gmail
 * ***** END LICENSE BLOCK ***** */

// = Tokenizer and parser utilities =

dojo.provide("bespin.syntax.codemirror._base");

// ** {{{ bespin.syntax.codemirror.Model }}} **
//
// Tracks syntax highlighting data on a per-visible-lines basis.
dojo.declare("bespin.syntax.codemirror.Model", bespin.syntax.Model, {
    worker: true,

    constructor: function() {
        // required for worker facade
        this.resolver = bespin.syntax.codemirror.Resolver;
    },

    // ** {{{ getSyntaxStyles }}} **
    //
    // Given rows, visible range and syntax type (e.g. css, js, html) hunt down the engine, ask it to syntax highlight, and return the regions
    getSyntaxStyles: function(rows, firstLineToRender, lastLineToRender, language) {
        var syntaxResults = {};

        if (this.language != language) {
            this.invalidateEntireCache();
            this.engine = this.resolver.resolve(language);
            this.language = language;
        } else {
            // try to get syntaxResults from cache
            var decr = lastLineToRender - firstLineToRender + 1;

            for (var currentLine = firstLineToRender; currentLine <= lastLineToRender; currentLine++) {
                var cached = this.getFromCache(currentLine);
                if (cached) {
                    syntaxResults[currentLine] = cached;
                    decr--;
                } else {
                    firstLineToRender = currentLine;
                    break;
                }
            }

            if (decr == 0) {
               return syntaxResults;
            }
        }

        var newResults = this.engine.highlight(rows, firstLineToRender, lastLineToRender, this.resolver.engines) ;

        for (var currentLine = firstLineToRender; currentLine <= lastLineToRender; currentLine++) {
            this.addToCache(currentLine, newResults[currentLine]);
            syntaxResults[currentLine] = newResults[currentLine];
        }

        return syntaxResults;
    }
});


// ** {{{ bespin.syntax.codemirror.Resolver }}} **
//
// The resolver holds the engines per language that are available to do the actual syntax highlighting
bespin.syntax.codemirror.Resolver = new function() {
  return {
      engines: {},

      // ** {{{ Noop }}} **
      //
      // Return plain regions / entire lines for all visible lines
      NoopSyntaxEngine: {
          highlight: function(rows, firstLineToRender, lastLineToRender) {
              var lineInfos = {};

              for (var lineNumber = firstLineToRender; lineNumber <= lastLineToRender; lineNumber++) {
                  lineInfos[lineNumber] = {};
                  lineInfos[lineNumber].text = rows[lineNumber];
                  lineInfos[lineNumber].regions = [];
                  lineInfos[lineNumber].regions.push({plain: [{
                      start: 0,
                      stop: rows[lineNumber].length
                  }]});
              }

              return lineInfos;
          }
      },

      // ** {{{ highlight }}} **
      //
      // A high level highlight function that uses the {{{language}}} to get the engine, and asks it to highlight
      highlight: function(language, rows, firstLineToRender, lastLineToRender) {
          this.resolve(language).highlight(rows, firstLineToRender, lastLineToRender);
      },

      // ** {{{ register }}} **
      //
      // Engines register themselves,
      // e.g. {{{bespin.syntax.codemirror.Resolver.register(new bespin.syntax.codemirror.CSSS(), ['css']);}}}
      register: function(languageEngine, languages) {
          for (var i = 0; i < languages.length; i++) {
              this.engines[languages[i]] = languageEngine;
          }
      },

      // ** {{{ resolve }}} **
      //
      // Hunt down the engine for the given {{{type}}} (e.g. css, js, html) or return the {{{NoopSyntaxEngine}}}
      resolve: function(language) {
          return this.engines[language] || this.NoopSyntaxEngine;
      }
  };
}();


// ** {{{ bespin.syntax.codemirror.Base }}} **
dojo.declare("bespin.syntax.codemirror.Base", null, {

    indentUnit: 4,

    // the parser and its frozen state on a per line basis
    parsers: [],

    // the textlines (minus "\n" at line-end)
    rows: [],

    // The value used to signal the end of a sequence in iterators.
    StopIteration: {
        toString: function() {
            return "StopIteration";
        }
    },

    // Helper function for for regular expression matches
    matcher: function(regexp){
        return function(value) {
            return regexp.test(value);
        };
    },

    // Checks whether the argument is an iterator or a regular sequence,
    // turns it into an iterator.
    iter: function(seq) {
        var self = this;
        var i = 0;

        if (seq.next) {
            return seq;
        } else {
            return {
                next: function() {
                    if (i >= seq.length) {
                        throw self.StopIteration;
                    } else {
                        return seq[i++];
                    }
                }
            };
        }
    },

    // Apply a function to each element in a sequence.
    forEach: function(iter, f) {
        var self = this;

        if (iter.next) {
            try {
                while (true) {
                    f(iter.next());
                }
            } catch (e) {
                if (e != self.StopIteration) throw e;
            }
        }
      else {
          for (var i = 0; i < iter.length; i++) {
              f(iter[i]);
          }
        }
    },

    // Provides a stream interface for a traverser-wrapped document
    stringStream: function(source) {
        var self = this;

        source = this.iter(source);

        // String that's currently being iterated over.
        var current = "";

        // Position in that string.
        var pos = 0;

        // for Bespin
        var start = 0;
        var lineNumber = 0;

        // Accumulator for strings that have been iterated over but not
        // get()-ed yet.
        var accum = "";

        var sourceNextObj;

        // Wrapper for source.next().
        function sourceNext() {
            sourceNextObj = source.next();
            current = sourceNextObj.text;
        }

        // Make sure there are more characters ready, or throw
        // StopIteration.
        function ensureChars() {
            while (pos == current.length) {
                accum += current;
                current = ""; // In case source.next() throws
                pos = 0;
                try {
                    sourceNext();
                } catch (e) {
                    if (e != self.StopIteration) {
                        throw e;
                    } else {
                        return false;
                    }
                }
            }
            return true;
        }

        return {
            // Return the next character in the stream.
            peek: function() {
                if (!ensureChars()) {
                    return null;
                }
                return current.charAt(pos);
            },

            // Get the next character, throw StopIteration if at end, check
            // for unused content.
            next: function() {
                if (!ensureChars()) {
                    if (accum.length > 0) {
                        throw "End of stringstream reached without emptying buffer ('" + accum + "').";
                    } else {
                        throw self.StopIteration;
                    }
                }

                var ch = current.charAt(pos++);
                if (ch == "\n"){
                    start = 0;
                } else {
                    start++;
                }
                return ch;


            },

            // Return the characters iterated over since the last call to
            // .get().
            get: function() {
                var temp = accum;
                accum = "";
                colBeforeGet = pos;
                lineNumber = sourceNextObj.lineNumber;
                if (pos > 0){
                    temp += current.slice(0, pos);
                    current = current.slice(pos);
                    pos = 0;
                }
                return temp;
            },

            // Push a string back into the stream.
            push: function(str) {
                current = current.slice(0, pos) + str + current.slice(pos);
            },

            lookAhead: function(str, consume, skipSpaces, caseInsensitive) {
                function cased(str) {
                    return caseInsensitive ? str.toLowerCase() : str;
                }
                str = cased(str);
                var found = false;

                var _accum = accum;
                var _pos = pos;
                if (skipSpaces) {
                    this.nextWhile(self.matcher(/[\s\u00a0]/));
                }

                while (true) {
                    var end = pos + str.length;
                    var left = current.length - pos;
                    if (end <= current.length) {
                        found = str == cased(current.slice(pos, end));
                        pos = end;
                        break;
                    } else if (str.slice(0, left) == cased(current.slice(pos))) {
                        accum += current; current = "";
                        try {
                            sourceNext();
                        } catch (e) {
                            break;
                        }
                        pos = 0;
                        str = str.slice(left);
                    } else {
                        break;
                    }
                }

                if (!(found && consume)) {
                    current = accum.slice(_accum.length) + current;
                    pos = _pos;
                    accum = _accum;
                }

                return found;
            },

            // Utils built on top of the above
            more: function() {
                return this.peek() !== null;
            },

            applies: function(test) {
                var next = this.peek();
                return (next !== null && test(next));
            },

            nextWhile: function(test) {
                while (this.applies(test)) {
                    this.next();
                }
            },

            equals: function(ch) {
                return ch === this.peek();
            },

            endOfLine: function() {
                var next = this.peek();
                return next == null || next == "\n";
            },

            start: function() {
                return start;
            },

            lineNumber: function() {
                return lineNumber;
            }
        };
    },

    // traverses the document, its output is the input for stringStream
    traverser: function(rows, start) {
        var self = this;
        var cc = push(handleLine, start, stop);

        function yield(value, c) {
            cc = c;
            return value;
        }

        function push(fun, arg, c) {
            return function() { return fun(arg, c);};
        }

        // Stops the iterator
        function stop() {
            cc = stop;
            throw self.StopIteration;
        };

        // Handle a line. Add its successor to the continuation if there
        // is one.
        // Yield content of the line
        function handleLine(lineNumber, c){
            c = push(handleLine, lineNumber + 1, c);

            return yield({
                text: rows[lineNumber] + "\n",
                lineNumber: lineNumber
            }, c);
        }

        // Iterator with a next function that returns the next value
        // or throws StopIteration when there are no more values.
        return {
            next: function() {
                return cc();
            }
        };
    },

    baseTokenizer: function(source, state) {
        var self = this;

        // Newlines are always a separate token.
        function isWhiteSpace(ch) {
            // The messy regexp is because IE's regexp matcher is of the
            // opinion that non-breaking spaces are no whitespace.
            return ch != "\n" && (/^[\s\u00a0]*$/.test(ch));
        }

        var tokenizer = {
            state: state,

            take: function(type) {
                if (typeof(type) == "string"){
                    type = {style: type, type: type};
                }
                type.content = (type.content || "") + source.get();
                if (!(/\n$/.test(type.content))){
                    source.nextWhile(isWhiteSpace);
                }
                type.value = type.content + source.get();
                type.lineNumber = source.lineNumber();
                if ((type.type != "whitespace") || (type.content != "\n")) {
                    type.start = source.start() - type.value.length;
                    type.stop = type.start + type.content.length;
                }
                return type;
            },

            next: function () {
                if (!source.more()){
                    throw self.StopIteration;
                }

                var type;
                if (source.equals("\n")) {
                    source.next();
                    return this.take("whitespace");
                }

                if (source.applies(isWhiteSpace)) {
                    type = "whitespace";
                } else {
                    while (!type) {
                        type = this.state(source, function(s) {
                            tokenizer.state = s;
                        });
                    }
                }
                return this.take(type);
            }
        };

        return tokenizer;
    },

    highlight: function(rows, firstLineToRender, lastLineToRender, engines) {
        this.rows = rows;
        this.engines = engines;

        var self = this;
        var lineInfos = {};
        var from = firstLineToRender;
        var parser;

        for (var currentLine = firstLineToRender; currentLine <= lastLineToRender; currentLine++) {
            lineInfos[currentLine] = {};
            lineInfos[currentLine].text = rows[currentLine];
            lineInfos[currentLine].regions = [];
        }

        while (from > 0){
            if (from < firstLineToRender && this.parsers[from]) {
               parser = this.parsers[from];
               from++;
               break;
            } else {
               from--;
            }
        }

        var stream = this.stringStream(this.traverser(rows, from));
        var parsed = (parser) ? parser(stream) : this.makeParser(stream);

        this.forEach.call(this, parsed, function(token){
            if (token.value == "\n") {
                self.parsers[token.lineNumber] = parsed.copy();
            }

            if (token.lineNumber > lastLineToRender) {
                throw self.StopIteration;
            } else if ((token.lineNumber >= firstLineToRender) && (token.value != "\n")) {
                self.updateLineInfos(lineInfos, token);
            }
        });

        return lineInfos;
    }
});

// -- Add core syntax files here, can load others later
dojo.require("bespin.syntax.codemirror.javascript");
dojo.require("bespin.syntax.codemirror.css");
dojo.require("bespin.syntax.codemirror.xml");
dojo.require("bespin.syntax.codemirror.html");
dojo.require("bespin.syntax.codemirror.php_base");
dojo.require("bespin.syntax.codemirror.php");
dojo.require("bespin.syntax.codemirror.python");