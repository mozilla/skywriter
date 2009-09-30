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
 * The Original Code is CodeMirror.
 *
 * The Initial Developer of the Original Code is Marijn Haverbeke.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ORIGINAL BSD-style-licensed CODE LICENSE HEADER FOLLOWS:

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

// = CSS Syntax Highlighting Implementation =
//
// You can guess what this does. ;-)

dojo.provide("bespin.syntax.codemirror.css");

// ** {{{ bespin.syntax.codemirror.CSSS }}} **

dojo.declare("bespin.syntax.codemirror.CSS", bespin.syntax.codemirror.Base, {

    /// = Tokenizer for CSS documents =

    // Returns a MochiKit-style iterator, with a state property that contains
    // a function encapsulating the current state
    tokenizer: function(source, startState){
        var self = this;

        function normal(source, setState) {
            var ch = source.next();
            if (ch == "@") {
                source.nextWhile(self.matcher(/\w/));
                return "css-at";
            } else if (ch == "/" && source.equals("*")) {
                setState(inCComment);
                return null;
            } else if (ch == "<" && source.equals("!")) {
                setState(inSGMLComment);
                return null;
            } else if (ch == "=") {
                return "css-compare";
            } else if (source.equals("=") && (ch == "~" || ch == "|")) {
                source.next();
                return "css-compare";
            } else if (ch == "\"" || ch == "'") {
                setState(inString(ch));
                return null;
            } else if (ch == "#") {
                source.nextWhile(self.matcher(/\w/));
                return "css-hash";
            } else if (ch == "!") {
                source.nextWhile(self.matcher(/[ \t]/));
                source.nextWhile(self.matcher(/\w/));
                return "css-important";
            } else if (/\d/.test(ch)) {
                source.nextWhile(self.matcher(/[\w.%]/));
                return "css-unit";
            } else if (/[,.+>*\/]/.test(ch)) {
                return "css-select-op";
            } else if (/[;{}:\[\]]/.test(ch)) {
                return "css-punctuation";
            } else {
                source.nextWhile(self.matcher(/[\w\\\-_]/));
                return "css-identifier";
            }
        }

        function inCComment(source, setState) {
            var maybeEnd = false;
            while (!source.endOfLine()) {
                var ch = source.next();
                if (maybeEnd && ch == "/") {
                    setState(normal);
                    break;
                }
                maybeEnd = (ch == "*");
            }
            return "css-comment";
        }

        function inSGMLComment(source, setState) {
            var dashes = 0;
            while (!source.endOfLine()) {
                var ch = source.next();
                if (dashes >= 2 && ch == ">") {
                    setState(normal);
                    break;
                }
                dashes = (ch == "-") ? dashes + 1 : 0;
            }
            return "css-comment";
        }

        function inString(quote) {
            return function(source, setState) {
                var escaped = false;
                while (!source.endOfLine()) {
                    var ch = source.next();
                    if (ch == quote && !escaped) {
                        break;
                    }
                    escaped = !escaped && ch == "\\";
                }
                if (!escaped) {
                    setState(normal);
                }
                return "css-string";
            };
        }

        return this.baseTokenizer.call(this, source, startState || normal);
    },

    // The parser-iterator-producing function.
    // This is a very simplistic parser -- since CSS does not really
    // nest, it works acceptably well, but some nicer colouroing could
    // be provided with a more complicated parser.
    makeParser: function(input, basecolumn) {
        basecolumn = basecolumn || 0;
        var self = this;
        var tokens = this.tokenizer.call(this, input);
        var inBraces = false, inRule = false;

        var indent = function(inBraces, inRule, base){
            return function(nextChars) {
                if (!inBraces || /^\}/.test(nextChars)) {
                    return base;
                } else if (inRule) {
                    return base + self.indentUnit * 2;
                } else {
                    return base + self.indentUnit;
                }
            };
        };

        var iter = {
            next: function() {
                var token = tokens.next(), style = token.style, content = token.content;

                if (style == "css-identifier" && inRule) {
                    token.style = "css-value";
                }
                if (style == "css-hash") {
                    token.style =  inRule ? "css-colorcode" : "css-identifier";
                }

                if (content == "\n") {
                    token.indentation = indent(inBraces, inRule, basecolumn);
                }

                if (content == "{") {
                    inBraces = true;
                } else if (content == "}") {
                    inBraces = inRule = false;
                } else if (inBraces && content == ";") {
                    inRule = false;
                } else if (inBraces && style != "css-comment" && style != "whitespace") {
                    inRule = true;
                }
                return token;
            },

            copy: function() {
                var _inBraces = inBraces, _inRule = inRule, _tokenState = tokens.state;
                return function(source) {
                    tokens = self.tokenizer.call(self, source, _tokenState);
                    inBraces = _inBraces;
                    inRule = _inRule;
                    return iter;
                };
            }
        };

        return iter;
    },

    /*
    addRegion: function(regions, style, token) {
        if (regions[style]){
            regions[style].push({ start: token.start, stop: token.stop });
        } else {
            regions[style] = [];  // ??
            regions[style].push({ start: token.start, stop: token.stop });  // ??
        }
    },
    */

    // NOTE: this ugly copy-paste monster will be eliminted completely, when styling via thunderhead CSS
    updateLineInfos: function(lineInfos, token) {
        if (token.style == "css-comment") {
            //this.addRegion(lineInfos[token.lineNumber].regions, "comment", token);
            if (lineInfos[token.lineNumber].regions["comment"]){
                lineInfos[token.lineNumber].regions["comment"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({comment: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "css-string") {
            if (lineInfos[token.lineNumber].regions["string"]){
                lineInfos[token.lineNumber].regions["string"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({string: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "css-important") {
            if (lineInfos[token.lineNumber].regions["important"]){
                lineInfos[token.lineNumber].regions["important"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({important: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "css-identifier") {
            if (lineInfos[token.lineNumber].regions["cssid"]){
                lineInfos[token.lineNumber].regions["cssid"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({cssid: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "css-value") {
            if (lineInfos[token.lineNumber].regions["attribute-value"]){
                lineInfos[token.lineNumber].regions["attribute-value"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({'attribute-value': [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "css-colorcode") {
            if (lineInfos[token.lineNumber].regions["color"]){
                lineInfos[token.lineNumber].regions["color"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({color: [{ start: token.start, stop: token.stop }]});
            }
        } else {
            if (lineInfos[token.lineNumber].regions["plain"]){
                lineInfos[token.lineNumber].regions["plain"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({plain: [{ start: token.start, stop: token.stop }]});
            }
        }
    },

    electricChars: "}"
});

// Register this puppy
bespin.syntax.codemirror.Resolver.register(new bespin.syntax.codemirror.CSS(), ['css']);