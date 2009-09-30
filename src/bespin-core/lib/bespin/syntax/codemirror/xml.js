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

// = XML Syntax Engine =
//
// You can guess what this does. ;-)

dojo.provide("bespin.syntax.codemirror.xml");

// ** {{{ bespin.syntax.codemirror.XMLBase }}} **

dojo.declare("bespin.syntax.codemirror.XMLBase", bespin.syntax.codemirror.Base, {

    XMLKludges: {
        autoSelfClosers: {},
        doNotIndent: {"!cdata": true}
    },

    HTMLKludges: {
        autoSelfClosers: {
            "br": true,
            "img": true,
            "hr": true,
            "link": true,
            "input": true,
            "meta": true,
            "col": true,
            "frame": true,
            "base": true,
            "area": true
        },
        doNotIndent: {
            "pre": true,
            "!cdata": true
        }
    },

    alignCDATA: false,

    constructor: function(){
        this.Kludges = this.XMLKludges;
    },

    // = Tokenizer for XML / HTML documents =

    // Returns a MochiKit-style iterator, with a state property that contains
    // a function encapsulating the current state.
    tokenizer: function(source, startState){
        var self = this;

        function inText(source, setState) {
            var ch = source.next();
            if (ch == "<") {
                if (source.equals("!")) {
                    source.next();
                    if (source.equals("[")) {
                        if (source.lookAhead("[CDATA[", true)) {
                            setState(inBlock("xml-cdata", "]]>"));
                            return null;
                        } else {
                            return "xml-text";
                        }
                    } else if (source.lookAhead("--", true)) {
                        setState(inBlock("xml-comment", "-->"));
                        return null;
                    } else {
                        return "xml-text";
                    }
                } else if (source.equals("?")) {
                    source.next();
                    source.nextWhile(self.matcher(/[\w\._\-]/));
                    setState(inBlock("xml-processing", "?>"));
                    return "xml-processing";
                } else {
                    if (source.equals("/")) {
                        source.next();
                    }
                    setState(inTag);
                    return "xml-punctuation";
                }
            } else if (ch == "&") {
                while (!source.endOfLine()) {
                    if (source.next() == ";") {
                        break;
                    }
                }
                return "xml-entity";
            } else {
                source.nextWhile(self.matcher(/[^&<\n]/));
                return "xml-text";
            }
        }

        function inTag(source, setState) {
            var ch = source.next();
            if (ch == ">") {
                setState(inText);
                return "xml-punctuation";
            } else if (/[?\/]/.test(ch) && source.equals(">")) {
                source.next();
                setState(inText);
                return "xml-punctuation";
            } else if (ch == "=") {
                return "xml-punctuation";
            } else if (/[\'\"]/.test(ch)) {
                setState(inAttribute(ch));
                return null;
            } else {
                source.nextWhile(self.matcher(/[^\s\u00a0=<>\"\'\/?]/));
                return "xml-name";
            }
        }

        function inAttribute(quote) {
            return function(source, setState) {
                while (!source.endOfLine()) {
                    if (source.next() == quote) {
                        setState(inTag);
                        break;
                    }
                }
                return "xml-attribute";
            };
        }

        function inBlock(style, terminator) {
            return function(source, setState) {
                while (!source.endOfLine()) {
                    if (source.lookAhead(terminator, true)) {
                        setState(inText);
                        break;
                    }
                    source.next();
                }
                return style;
            };
        }

        return this.baseTokenizer.call(this, source, startState || inText);
    },

    // The parser-iterator-producing function.
    makeXmlParser: function(input, basecolumn) {
        var self = this;
        var tokens = this.tokenizer.call(this, input);
        var cc = [base];
        var tokenNr = 0, indented = 0;
        var currentTag = null, context = null;
        var consume, marked;

        function push(fs) {
            for (var i = fs.length - 1; i >= 0; i--) {
                cc.push(fs[i]);
            }
        }

        function cont() {
            push(arguments);
            consume = true;
        }

        function pass() {
            push(arguments);
            consume = false;
        }

        function mark(style) {
            marked = style;
        }

        function expect(text) {
            return function(style, content) {
                if (content == text) {
                    cont();
                } else {
                    mark("xml-error") || cont(arguments.callee);
                }
            };
        }

        function pushContext(tagname, startOfLine) {
            var noIndent = self.Kludges.doNotIndent.hasOwnProperty(tagname) || (context && context.noIndent);
            context = {prev: context, name: tagname, indent: indented, startOfLine: startOfLine, noIndent: noIndent};
        }

        function popContext() {
            context = context.prev;
        }

        function computeIndentation(baseContext) {
            return function(nextChars, current) {
                var context = baseContext;
                if (context && context.noIndent) {
                    return current;
                }
                if (alignCDATA && /<!\[CDATA\[/.test(nextChars)) {
                    return 0;
                }
                if (context && /^<\//.test(nextChars)){
                    context = context.prev;
                }
                while (context && !context.startOfLine) {
                    context = context.prev;
                }
                if (context)
                    return context.indent + self.indentUnit;
                else
                    return 0;
            };
        }

        function base() {
            return pass(element, base);
        }

        var harmlessTokens = {"xml-text": true, "xml-entity": true, "xml-comment": true, "xml-processing": true};

        function element(style, content) {
            if (content == "<") {
                cont(tagname, attributes, endtag(tokenNr == 1));
            } else if (content == "</") {
                cont(closetagname, expect(">"));
            } else if (style == "xml-cdata") {
                if (!context || context.name != "!cdata") {
                    pushContext("!cdata");
                }
                if (/\]\]>$/.test(content)) popContext(); {
                    cont();
                }
            } else if (harmlessTokens.hasOwnProperty(style)) {
                cont();
            } else {
                mark("xml-error") || cont();
            }
        }

        function tagname(style, content) {
            if (style == "xml-name") {
                currentTag = content.toLowerCase();
                mark("xml-tagname");
                cont();
            } else {
                currentTag = null;
                pass();
            }
        }

        function closetagname(style, content) {
            if (style == "xml-name" && context && content.toLowerCase() == context.name) {
                popContext();
                mark("xml-tagname");
            } else {
                mark("xml-error");
            }
            cont();
        }

        function endtag(startOfLine) {
            return function(style, content) {
                if (content == "/>" || (content == ">" && self.Kludges.autoSelfClosers.hasOwnProperty(currentTag))) {
                    cont();
                } else if (content == ">") {
                    pushContext(currentTag, startOfLine) || cont();
                } else {
                    mark("xml-error") || cont(arguments.callee);
                }
            };
        }

        function attributes(style) {
            if (style == "xml-name") {
                mark("xml-attname") || cont(attribute, attributes);
            } else {
                pass();
            }
        }

        function attribute(style, content) {
            if (content == "=") {
                cont(value);
            } else if (content == ">" || content == "/>") {
                pass(endtag);
            } else {
                pass();
            }
        }

        function value(style) {
            if (style == "xml-attribute") {
                cont(value);
            } else {
                pass();
            }
        }

        return {
            indentation: function() {
                return indented;
            },

            next: function(){
                var token = tokens.next();
                if (token.style == "whitespace" && tokenNr == 0) {
                    indented = token.value.length;
                } else {
                    tokenNr++;
                }
                if (token.content == "\n") {
                    indented = tokenNr = 0;
                    token.indentation = computeIndentation(context);
                }
                if (token.style == "whitespace" || token.type == "xml-comment") {
                    return token;
                }

                while(true) {
                    consume = marked = false;
                    cc.pop()(token.style, token.content);
                    if (consume){
                        if (marked) {
                            token.style = marked;
                        }
                        return token;
                    }
                }
            },

            copy: function() {
                var _cc = cc.concat([]), _tokenState = tokens.state, _context = context;
                var parser = this;

                return function(input) {
                    cc = _cc.concat([]);
                    tokenNr = indented = 0;
                    context = _context;
                    tokens = self.tokenizer.call(self, input, _tokenState);
                    return parser;
                };
            }
        };
    }
});


dojo.declare("bespin.syntax.codemirror.XML", bespin.syntax.codemirror.XMLBase, {

    // The parser-iterator-producing function.
    makeParser: function(input, basecolumn) {
        return this.makeXmlParser.call(this, input, basecolumn);
    },

    // NOTE: this ugly copy-paste monster will be eliminted completely, when styling via thunderhead CSS
    updateLineInfos: function(lineInfos, token) {
        if (token.style == "xml-comment") {
            if (lineInfos[token.lineNumber].regions["comment"]){
                lineInfos[token.lineNumber].regions["comment"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({comment: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "xml-punctuation") {
            if (lineInfos[token.lineNumber].regions["punctuation"]){
                lineInfos[token.lineNumber].regions["punctuation"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({punctuation: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "xml-attribute") {
            if (lineInfos[token.lineNumber].regions["attribute"]){
                lineInfos[token.lineNumber].regions["attribute"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({attribute: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "xml-cdata") {
            if (lineInfos[token.lineNumber].regions["cdata"]){
                lineInfos[token.lineNumber].regions["cdata"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({cdata: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "xml-tagname") {
            if (lineInfos[token.lineNumber].regions["tagname"]){
                lineInfos[token.lineNumber].regions["tagname"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({'tagname': [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "xml-attname") {
            if (lineInfos[token.lineNumber].regions["attname"]){
                lineInfos[token.lineNumber].regions["attname"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({attname: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "xml-processing") {
            if (lineInfos[token.lineNumber].regions["processing"]){
                lineInfos[token.lineNumber].regions["processing"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({processing: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "xml-entity") {
            if (lineInfos[token.lineNumber].regions["entity"]){
                lineInfos[token.lineNumber].regions["entity"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({entity: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "xml-error") {
            if (lineInfos[token.lineNumber].regions["error"]){
                lineInfos[token.lineNumber].regions["error"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({error: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "xml-text") {
            if (lineInfos[token.lineNumber].regions["text"]){
                lineInfos[token.lineNumber].regions["text"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({text: [{ start: token.start, stop: token.stop }]});
            }
        } else {
            if (lineInfos[token.lineNumber].regions["plain"]){
                lineInfos[token.lineNumber].regions["plain"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({plain: [{ start: token.start, stop: token.stop }]});
            }
        }
    },

    electricChars: "/"
});

// Register
bespin.syntax.codemirror.Resolver.register(new bespin.syntax.codemirror.XML(), ['xml', 'xhtml']);