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

// Copyright (c) 2009, Timothy Farrell
// All rights reserved.
//
// This software is provided for use in connection with the
// CodeMirror suite of modules and utilities, hosted and maintained
// at http://marijn.haverbeke.nl/codemirror/.
//
// Redistribution and use of this software in source and binary forms,
// with or without modification, are permitted provided that the
// following conditions are met:
//
// * Redistributions of source code must retain the above
//   copyright notice, this list of conditions and the
//   following disclaimer.
//
// * Redistributions in binary form must reproduce the above
//   copyright notice, this list of conditions and the
//   following disclaimer in the documentation and/or other
//   materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.
// * ***** END LICENSE BLOCK ***** */

// = Python Syntax Engine =
//
// You can guess what this does. ;-)

dojo.provide("bespin.syntax.codemirror.python");

// ** {{{ bespin.syntax.codemirror.Python }}} **

dojo.declare("bespin.syntax.codemirror.Python", bespin.syntax.codemirror.Base, {

    singleOperators: "+-*/%&|^~<>",

    singleDelimiters: "()[]{}@,:.`=;",                                  

    doubleDelimiters: ["\\+=", "\\-=", "\\*=", "/=", "%=", "&=", "\\|=", "\\^="],
    
    doubleStarters: "=<>*/",
    
    identifierStarters: /[_A-Za-z]/,
    
    commonkeywords: [
        'as', 'assert', 'break', 'class', 'continue',
        'def', 'del', 'elif', 'else', 'except', 'finally',
        'for', 'from', 'global', 'if', 'import',
        'lambda', 'pass', 'raise', 'return',
        'try', 'while', 'with', 'yield'
    ],
    
    commontypes: [
        'bool', 'classmethod', 'complex', 'dict', 'enumerate',
        'float', 'frozenset', 'int', 'list', 'object',
        'property', 'reversed', 'set', 'slice', 'staticmethod',
        'str', 'super', 'tuple', 'type'
    ],
    
    py2: {
        'types': ['basestring', 'buffer', 'file', 'long', 'unicode','xrange'],
        'keywords': ['exec', 'print'],
        'version': 2
    },

    py3: {
        'types': ['bytearray', 'bytes', 'filter', 'map', 'memoryview', 'open', 'range', 'zip'],
        'keywords': ['nonlocal'],
        'version': 3
    },
                                                 
    constructor: function() {
        this.doubleOperators = this.wordRegexp(['==', '!=', '\\<=', '\\>=', '\\<\\>', '\\<\\<', '\\>\\>', '\\/\\/', '\\*\\*']);
        this.tripleDelimiters = this.wordRegexp(["//=","\\>\\>=","\\<\\<=","\\*\\*="]);
        this.singleStarters = this.singleOperators + this.singleDelimiters + "=!";
        this.wordOperators = this.wordRegexp(['and', 'or', 'not', 'is', 'in']);
    },

    wordRegexp: function(words) {
        return new RegExp("^(?:" + words.join("|") + ")$");
    },
    
    // properties to be coffigured py, keywords, types, stringStarters, stringTypes, config; 
                 
    configure: function(conf) {
        if (!conf.hasOwnProperty('pythonVersion')) {
            conf.pythonVersion = 2;
        }
        if (!conf.hasOwnProperty('strictErrors')) {
            conf.strictErrors = true;
        }
        if (conf.pythonVersion != 2 && conf.pythonVersion != 3) {
            alert('CodeMirror: Unknown Python Version "' +
                  conf.pythonVersion +
                  '", defaulting to Python 2.x.');
            conf.pythonVersion = 2;
        }
        if (conf.pythonVersion == 3) {
            this.py = this.py3;
            this.stringStarters = /['"rbRB]/;
            this.stringTypes = /[rb]/;
            this.doubleDelimiters.push("\\-\\>");
        } else {
            this.py = this.py2;
            this.stringStarters = /['"RUru]/;
            this.stringTypes = /[ru]/;
        }
        this.config = conf;
        this.keywords = this.wordRegexp(this.commonkeywords.concat(this.py.keywords));
        this.types = this.wordRegexp(this.commontypes.concat(this.py.types));
        this.doubleDelimiters = this.wordRegexp(this.doubleDelimiters);
    },

    // Returns a MochiKit-style iterator, with a state property that contains
    // a function encapsulating the current state
    tokenizer: function(source, startState){
        var self = this;

        function normal(source, setState) {
            var stringDelim, threeStr, temp, type, word, possible = {};
            var ch = source.next();

            function filterPossible(token, styleIfPossible) {
                if (!possible.style && !possible.content) {
                    return token;
                } else if (typeof(token) == 'string') {
                    token = { content: source.get(), style: token };
                }
                if (possible.style || styleIfPossible) {
                    token.style = styleIfPossible ? styleIfPossible : possible.style;
                }
                if (possible.content) {
                    token.content = possible.content + token.content;
                }
                possible = {};
                return token;
            }

            // Handle comments
            if (ch == "#") {
                while (!source.endOfLine()) {
                    source.next();
                }
                return "py-comment";
            }
            // Handle special chars
            if (ch == "\\") {
                if (source.peek() != '\n') {
                    var whitespace = true;
                    while (!source.endOfLine()) {
                        if(!(/\s/.test(source.next()))) {
                            whitespace = false;
                        }
                    }
                    if (!whitespace) {
                        return "py-error";
                    }
                }
                return "py-special";
            }
            // Handle operators and delimiters
            if (self.singleStarters.indexOf(ch) != -1) {
                if (self.doubleStarters.indexOf(source.peek()) != -1) {
                    temp = ch + source.peek();
                    // It must be a double delimiter or operator or triple delimiter
                    if (self.doubleOperators.test(temp)) {
                        source.next();
                        if (self.tripleDelimiters.test(temp + source.peek())) {
                            source.next();
                            return 'py-delimiter';
                        } else {
                            return 'py-operator';
                        }
                    } else if (self.doubleDelimiters.test(temp)) {
                        source.next();
                        return 'py-delimiter';
                    }
                }
                // It must be a single delimiter or operator
                if (self.singleOperators.indexOf(ch) != -1) {
                    return 'py-operator';
                } else if (self.singleDelimiters.indexOf(ch) != -1) {
                    if (ch == '@' && /\w/.test(source.peek())) {
                        possible = {
                            style:'py-decorator',
                            content: source.get()
                        };
                        ch = source.next();
                    } else if (ch == '.' && /\d/.test(source.peek())) {
                        possible = {
                            style:'py-literal',
                            content: source.get()
                        };
                        ch = source.next();
                    } else {
                        return 'py-delimiter';
                    }
                } else {
                    return 'py-error';
                }
            }
            // Handle number literals
            if (/\d/.test(ch)) {
                if (ch === '0' && !source.endOfLine()) {
                    switch (source.peek()) {
                        case 'o':
                        case 'O':
                            source.next();
                            source.nextWhile(self.matcher(/[0-7]/));
                            return filterPossible('py-literal', 'py-error');
                        case 'x':
                        case 'X':
                            source.next();
                            source.nextWhile(self.matcher(/[0-9A-Fa-f]/));
                            return filterPossible('py-literal', 'py-error');
                        case 'b':
                        case 'B':
                            source.next();
                            source.nextWhile(self.matcher(/[01]/));
                            return filterPossible('py-literal', 'py-error');
                    }
                }
                source.nextWhile(self.matcher(/\d/));
                if (source.peek() == '.') {
                    source.next();
                    source.nextWhile(self.matcher(/\d/));
                }
                // Grab an exponent
                if (source.peek().toLowerCase() == 'e') {
                    source.next();
                    if (source.peek() == '+' || source.peek() == '-') {
                        source.next();
                    }
                    if (/\d/.test(source.peek())) {
                        source.nextWhile(self.matcher(/\d/));
                    } else {
                        return filterPossible('py-error');
                    }
                }
                // Grab a complex number
                if (source.peek().toLowerCase() == 'j') {
                    source.next();
                }

                return filterPossible("py-literal");
            }
            // Handle strings
            if (self.stringStarters.test(ch)) {
                var peek = source.peek();
                var stringType = 'py-string';
                if ((self.stringTypes.test(ch)) && (peek == '"' || peek == "'")) {
                    switch (ch.toLowerCase()) {
                        case 'b':
                            stringType = 'py-bytes';
                            break;
                        case 'r':
                            stringType = 'py-raw';
                            break;
                        case 'u':
                            stringType = 'py-unicode';
                            break;
                    }
                    ch = source.next();
                    stringDelim = ch;
                    if (source.peek() != stringDelim) {
                        setState(inString(stringType, stringDelim));
                        return null;
                    } else {
                        source.next();
                        if (source.peek() == stringDelim) {
                            source.next();
                            threeStr = stringDelim + stringDelim + stringDelim;
                            setState(inString(stringType, threeStr));
                            return null;
                        } else {
                            return stringType;
                        }
                    }
                } else if (ch == "'" || ch == '"') {
                    stringDelim = ch;
                    if (source.peek() != stringDelim) {
                        setState(inString(stringType, stringDelim));
                        return null;
                    } else {
                        source.next();
                        if (source.peek() == stringDelim) {
                            source.next();
                            threeStr = stringDelim + stringDelim + stringDelim;
                            setState(inString(stringType, threeStr));
                            return null;
                        } else {
                            return stringType;
                        }
                    }
                }
            }
            // Handle Identifier
            if (self.identifierStarters.test(ch)) {
                source.nextWhile(self.matcher(/[\w\d]/));
                word = source.get();
                if (self.wordOperators.test(word)) {
                    type = "py-operator";
                } else if (self.keywords.test(word)) {
                    type = "py-keyword";
                } else if (self.types.test(word)) {
                    type = "py-type";
                } else {
                    type = "py-identifier";
                    while (source.peek() == '.') {
                        source.next();
                        if (self.identifierStarters.test(source.peek())) {
                            source.nextWhile(self.matcher(/[\w\d]/));
                        } else {
                            type = 'py-error';
                            break;
                        }
                    }
                    word = word + source.get();
                }
                return filterPossible({style: type, content: word});
            }

            // Register Dollar sign and Question mark as errors. Always!
            if (/\$\?/.test(ch)) {
                return filterPossible('py-error');
            }

            return filterPossible('py-error');
        }
        
        function inString(style, terminator) {
            return function(source, setState) {
                var matches = [];
                var found = false;
                while (!found && !source.endOfLine()) {
                    var ch = source.next(), newMatches = [];
                    // Skip escaped characters
                    if (ch == '\\') {
                        if (source.peek() == '\n') {
                            break;
                        }
                        ch = source.next();
                        ch = source.next();
                    }
                    if (ch == terminator.charAt(0)) {
                        matches.push(terminator);
                    }
                    for (var i = 0; i < matches.length; i++) {
                        var match = matches[i];
                        if (match.charAt(0) == ch) {
                            if (match.length == 1) {
                                setState(normal);
                                found = true;
                                break;
                            } else {
                                newMatches.push(match.slice(1));
                            }
                        }
                    }
                    matches = newMatches;
                }
                return style;
            };
        } 
        
        return this.baseTokenizer.call(this, source, startState || normal); 
    },

    // The parser-iterator-producing function.
    makeParser: function(input) {
        var self = this;
        var tokens = this.tokenizer.call(this, input);
        var lastToken = null;
        var column = 0;
        var context = {
            prev: null,
            endOfScope: false,
            startNewScope: false,
            level: 0,
            next: null,
            type: 'normal'
        };
        if (this.keywords === undefined) { 
            this.configure.call(this, {});
        }

        function pushContext(level, type) {
            type = type ? type : 'normal';
            context = {
                prev: context,
                endOfScope: false,
                startNewScope: false,
                level: level,
                next: null,
                type: type
            };
        }

        function popContext(remove) {
            remove = remove ? remove : false;
            if (context.prev) {
                if (remove) {
                    context = context.prev;
                    context.next = null;
                } else {
                    context.prev.next = context;
                    context = context.prev;
                }
            }
        }

        function indentPython(context) {
            return function(nextChars, currentLevel, direction) {
                if (direction === null || direction === undefined) {
                    if (nextChars) {
                        while (context.next) {
                            context = context.next;
                        }
                    }
                    return context.level;
                }
                else if (direction === true) {
                    if (currentLevel == context.level) {
                        if (context.next) {
                            return context.next.level;
                        } else {
                            return context.level + self.indentUnit;
                        }
                    } else {
                        var temp = context;
                        while (temp.prev && temp.prev.level > currentLevel) {
                            temp = temp.prev;
                        }
                        return temp.level;
                    }
                } else if (direction === false) {
                    if (currentLevel > context.level) {
                        return context.level;
                    } else if (context.prev) {
                        return context.prev.level;
                    }
                }
                return context.level;
            };
        }

        var iter = {
            next: function() {
                var token = tokens.next();
                var type = token.style;
                var content = token.content;

                if (lastToken) {
                    if (lastToken.content == 'def' && type == 'py-identifier') {
                        token.style = 'py-func';
                    }
                    if (lastToken.content == '\n') {
                        var tempCtx = context;
                        // Check for a different scope
                        if (type == 'whitespace' && context.type == 'normal') {
                            if (token.value.length < context.level) {
                                while (token.value.length < context.level) {
                                    popContext();
                                }

                                if (token.value.length != context.level) {
                                    context = tempCtx;
                                    if (self.config.strictErrors) {
                                        token.style = 'py-error';
                                    }
                                } else {
                                    context.next = null;
                                }
                            }
                        } else if (context.level !== 0 &&
                                   context.type == 'normal') {
                            while (0 !== context.level) {
                                popContext();
                            }

                            if (context.level !== 0) {
                                context = tempCtx;
                                if (self.config.strictErrors) {
                                    token.style = 'py-error';
                                }
                            }
                        }
                    }
                }

                // Handle Scope Changes
                switch(type) {
                    case 'py-string':
                    case 'py-bytes':
                    case 'py-raw':
                    case 'py-unicode':
                        if (context.type !== 'string') {
                            pushContext(context.level + 1, 'string');
                        }
                        break;
                    default:
                        if (context.type === 'string') {
                            popContext(true);
                        }
                        break;
                }
                switch(content) {
                    case '.':
                    case '@':
                        // These delimiters don't appear by themselves
                        if (content !== token.value) {
                            token.style = 'py-error';
                        }
                        break;
                    case ':':
                        // Colons only delimit scope inside a normal scope
                        if (context.type === 'normal') {
                            context.startNewScope = context.level + self.indentUnit;
                        }
                        break;
                    case '(':
                    case '[':
                    case '{':
                        // These start a sequence scope
                        pushContext(column + content.length, 'sequence');
                        break;
                    case ')':
                    case ']':
                    case '}':
                        // These end a sequence scope
                        popContext(true);
                        break;
                    case 'pass':
                    case 'return':
                        // These end a normal scope
                        if (context.type === 'normal') {
                            context.endOfScope = true;
                        }
                        break;
                    case '\n':
                        // Reset our column
                        column = 0;
                        // Make any scope changes
                        if (context.endOfScope) {
                            context.endOfScope = false;
                            popContext();
                        } else if (context.startNewScope !== false) {
                            var temp = context.startNewScope;
                            context.startNewScope = false;
                            pushContext(temp, 'normal');
                        }
                        // Newlines require an indentation function wrapped in a closure for proper context.
                        token.indentation = indentPython(context);
                        break;
                }

                // Keep track of current column for certain scopes.
                if (content != '\n') {
                    column += token.value.length;
                }

                lastToken = token;
                return token;
            },

            copy: function() {
                var _context = context, _tokenState = tokens.state;
                return function(source) {
                    tokens = self.tokenizer.call(self, source, _tokenState);
                    context = _context;
                    return iter;
                };
            }
        };

        return iter;
    },    

    // NOTE: this ugly copy-paste monster will be eliminted completely, when styling via thunderhead CSS
    updateLineInfos: function(lineInfos, token) {
        if (token.style == "py-comment") {
            if (lineInfos[token.lineNumber].regions["comment"]){
                lineInfos[token.lineNumber].regions["comment"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({comment: [{ start: token.start, stop: token.stop }]});
            }
        } else if ((token.style == "py-string") || (token.style == "py-bytes") || (token.style == "py-raw") || (token.style == "py-unicode")) {
            if (lineInfos[token.lineNumber].regions["string"]){
                lineInfos[token.lineNumber].regions["string"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({string: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "py-keyword") {
            if (lineInfos[token.lineNumber].regions["keyword"]){
                lineInfos[token.lineNumber].regions["keyword"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({keyword: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "py-literal") {
            if (lineInfos[token.lineNumber].regions["literal"]){
                lineInfos[token.lineNumber].regions["literal"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({literal: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "py-operator") {
            if (lineInfos[token.lineNumber].regions["operator"]){
                lineInfos[token.lineNumber].regions["operator"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({operator: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "py-identifier") {
            if (lineInfos[token.lineNumber].regions["identifier"]){
                lineInfos[token.lineNumber].regions["identifier"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({identifier: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "py-func") {
            if (lineInfos[token.lineNumber].regions["func"]){
                lineInfos[token.lineNumber].regions["func"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({func: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "py-type") {
            if (lineInfos[token.lineNumber].regions["type"]){
                lineInfos[token.lineNumber].regions["type"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({type: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "py-decorator") {
            if (lineInfos[token.lineNumber].regions["decorator"]){
                lineInfos[token.lineNumber].regions["decorator"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({decorator: [{ start: token.start, stop: token.stop }]});
            }
        } else if (token.style == "py-error") {
            if (lineInfos[token.lineNumber].regions["error"]){
                lineInfos[token.lineNumber].regions["error"].push({ start: token.start, stop: token.stop });
            } else {
                lineInfos[token.lineNumber].regions.push({error: [{ start: token.start, stop: token.stop }]});
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
bespin.syntax.codemirror.Resolver.register(new bespin.syntax.codemirror.Python(), ['py', 'python']);