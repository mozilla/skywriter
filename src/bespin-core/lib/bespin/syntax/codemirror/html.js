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

// = HTML Syntax Highlighting Implementation =
//
// You can guess what this does. ;-)

dojo.provide("bespin.syntax.codemirror.html");

// ** {{{ bespin.syntax.codemirror.HTML }}} **

dojo.declare("bespin.syntax.codemirror.HTML", bespin.syntax.codemirror.XMLBase, {

    constructor: function(){
        this.Kludges = this.HTMLKludges;
    },

    makeParser: function(stream) {
        var self = this;
        var htmlParser = this.makeXmlParser.call(this, stream);
        var localParser = null;
        var inTag = false;
        var iter = {next: top, copy: copy};

        function top() {
            var token = htmlParser.next();
            if (token.content == "<") {
                inTag = true;
            } else if (token.style == "xml-tagname" && inTag === true) {
                inTag = token.content.toLowerCase();
            } else if (token.content == ">") {
                if (inTag == "script") {
                    iter.next = local(self.engines.js, "</script");
                } else if (inTag == "style") {
                    iter.next = local(self.engines.css, "</style");
                }
                inTag = false;
            }
            return token;
        }

        function local(engine, tag) {
            var baseIndent = htmlParser.indentation();
            localParser = engine.makeParser(stream, baseIndent + self.indentUnit);
            return function() {
                if (stream.lookAhead(tag, false, false, true)) {
                    localParser = null;
                    iter.next = top;
                    return top();  // pass the ending tag to the enclosing parser
                }

                var token = localParser.next();
                var lt = token.value.lastIndexOf("<"), sz = Math.min(token.value.length - lt, tag.length);
                if (lt != -1 && token.value.slice(lt, lt + sz).toLowerCase() == tag.slice(0, sz) &&
                        stream.lookAhead(tag.slice(sz), false, false, true)) {
                    stream.push(token.value.slice(lt));
                    token.value = token.value.slice(0, lt);
                }

                if (token.indentation) {
                    var oldIndent = token.indentation;
                    token.indentation = function(chars) {
                        if (chars == "</") {
                            return baseIndent;
                        } else {
                            return oldIndent(chars);
                        }
                    };
                }

                return token;
            };
        }

        function copy() {
            var _html = htmlParser.copy();
            var _local = localParser && localParser.copy();
            var _next = iter.next;
            var _inTag = inTag;
            return function(_stream) {
                stream = _stream;
                htmlParser = _html(_stream);
                localParser = _local && _local(_stream);
                iter.next = _next;
                inTag = _inTag;
                return iter;
            };
        }

        return iter;
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
        } else if (token.style == "css-comment") {
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
        } else if (token.style == "js-comment") {
            if (lineInfos[token.lineNumber].regions["comment"]){
                lineInfos[token.lineNumber].regions["comment"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({comment: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "js-string") {
            if (lineInfos[token.lineNumber].regions["string"]){
                lineInfos[token.lineNumber].regions["string"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({string: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "js-keyword") {
            if (lineInfos[token.lineNumber].regions["keyword"]){
                lineInfos[token.lineNumber].regions["keyword"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({keyword: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "js-punctuation") {
            if (lineInfos[token.lineNumber].regions["punctuation"]){
                lineInfos[token.lineNumber].regions["punctuation"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({punctuation: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "js-operator") {
            if (lineInfos[token.lineNumber].regions["operator"]){
                lineInfos[token.lineNumber].regions["operator"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({operator: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "js-atom") {
            if (lineInfos[token.lineNumber].regions["atom"]){
                lineInfos[token.lineNumber].regions["atom"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({atom: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "js-variable") {
            if (lineInfos[token.lineNumber].regions["variable"]){
                lineInfos[token.lineNumber].regions["variable"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({variable: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "js-variabledef") {
            if (lineInfos[token.lineNumber].regions["variabledef"]){
                lineInfos[token.lineNumber].regions["variabledef"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({variabledef: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "js-localvariable") {
            if (lineInfos[token.lineNumber].regions["localvariable"]){
                lineInfos[token.lineNumber].regions["localvariable"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({localvariable: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "js-property") {
            if (lineInfos[token.lineNumber].regions["property"]){
                lineInfos[token.lineNumber].regions["property"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({property: [{ start: token.start, stop: token.stop }]});
            }
        } else {
            if (lineInfos[token.lineNumber].regions["plain"]){
                lineInfos[token.lineNumber].regions["plain"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({plain: [{ start: token.start, stop: token.stop }]});
            }
        }
    },

    electricChars: "{}/:"
});

// Register
bespin.syntax.codemirror.Resolver.register(new bespin.syntax.codemirror.HTML(), ['html', 'htm', 'shtml']);