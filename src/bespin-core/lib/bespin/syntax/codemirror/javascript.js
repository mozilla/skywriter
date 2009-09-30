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

dojo.provide("bespin.syntax.codemirror.javascript");

// ** {{{ bespin.syntax.codemirror.JavaScript }}} **

dojo.declare("bespin.syntax.codemirror.JavaScript", bespin.syntax.codemirror.Base, {

    // = Tokenizer for JavaScript code =

    // Returns a MochiKit-style iterator, with a state property that contains
    // a function encapsulating the current state.
    tokenizer: function(source, startState) {
        var self = this;

        // Advance the stream until the given character (not preceded by a
        // backslash) is encountered, or the end of the line is reached.
        function nextUntilUnescaped(source, end) {
            var escaped = false;
            var next;
            while (!source.endOfLine()) {
                var next = source.next();
                if (next == end && !escaped) {
                    return false;
                }
                escaped = !escaped && next == "\\";
            }
            return escaped;
        }

        // A map of JavaScript's keywords. The a/b/c keyword distinction is
        // very rough, but it gives the parser enough information to parse
        // correct code correctly (we don't care that much how we parse
        // incorrect code). The style information included in these objects
        // is used by the highlighter to pick the correct CSS style for a
        // token.
        var keywords = function() {
            function result(type, style){
                return {type: type, style: "js-" + style};
            }

            // keywords that take a parenthised expression, and then a
            // statement (if)
            var keywordA = result("keyword a", "keyword");

            // keywords that take just a statement (else)
            var keywordB = result("keyword b", "keyword");

            // keywords that optionally take an expression, and form a
            // statement (return)
            var keywordC = result("keyword c", "keyword");
            var operator = result("operator", "keyword");
            var atom = result("atom", "atom");

            return {
                "if": keywordA, "while": keywordA, "with": keywordA,
                "else": keywordB, "do": keywordB, "try": keywordB, "finally": keywordB,
                "return": keywordC, "break": keywordC, "continue": keywordC, "new": keywordC, "delete": keywordC, "throw": keywordC,
                "in": operator, "typeof": operator, "instanceof": operator,
                "var": result("var", "keyword"), "function": result("function", "keyword"), "catch": result("catch", "keyword"),
                "for": result("for", "keyword"), "switch": result("switch", "keyword"),
                "case": result("case", "keyword"), "default": result("default", "keyword"),
                "true": atom, "false": atom, "null": atom, "undefined": atom, "NaN": atom, "Infinity": atom
            };
        }();

        // Some helper regexp matchers.
        var isOperatorChar = self.matcher(/[+\-*&%\/=<>!?|]/);
        var isDigit = self.matcher(/[0-9]/);
        var isHexDigit = self.matcher(/[0-9A-Fa-f]/);
        var isWordChar = self.matcher(/[\w\$_]/);

        // Wrapper around jsToken that helps maintain parser state (whether
        // we are inside of a multi-line comment and whether the next token
        // could be a regular expression).
        function jsTokenState(inside, regexp) {
            return function(source, setState) {
                var newInside = inside;
                var type = jsToken(inside, regexp, source, function(c) {newInside = c;});
                var newRegexp = type.type == "operator" || type.type == "keyword c" || type.type.match(/^[\[{}\(,;:]$/);
                if (newRegexp != regexp || newInside != inside) {
                    setState(jsTokenState(newInside, newRegexp));
                }
                return type;
            };
        }


        // The token reader, inteded to be used by the tokenizer from
        // tokenize.js (through jsTokenState). Advances the source stream
        // over a token, and returns an object containing the type and style
        // of that token.
        function jsToken(inside, regexp, source, setInside) {
            function readHexNumber() {
                source.next(); // skip the 'x'
                source.nextWhile(isHexDigit);
                return {type: "number", style: "js-atom"};
            }

            function readNumber() {
                source.nextWhile(isDigit);
                if (source.equals(".")){
                    source.next();
                    source.nextWhile(isDigit);
                }
                if (source.equals("e") || source.equals("E")){
                    source.next();
                    if (source.equals("-")){
                        source.next();
                    }
                    source.nextWhile(isDigit);
                }
                return {type: "number", style: "js-atom"};
            }

            // Read a word, look it up in keywords. If not found, it is a
            // variable, otherwise it is a keyword of the type found.
            function readWord() {
                source.nextWhile(isWordChar);
                var word = source.get();
                var known = keywords.hasOwnProperty(word) && keywords.propertyIsEnumerable(word) && keywords[word];
                return known ? {type: known.type, style: known.style, content: word} :
                    {type: "variable", style: "js-variable", content: word};
            }

            function readRegexp() {
                nextUntilUnescaped(source, "/");
                source.nextWhile(self.matcher(/[gi]/));
                return {type: "regexp", style: "js-string"};
            }

            // Mutli-line comments are tricky. We want to return the newlines
            // embedded in them as regular newline tokens, and then continue
            // returning a comment token for every line of the comment. So
            // some state has to be saved (inside) to indicate whether we are
            // inside a /* */ sequence.
            function readMultilineComment(start) {
                var newInside = "/*";
                var maybeEnd = (start == "*");
                while (true) {
                    if (source.endOfLine()){
                        break;
                    }
                    var next = source.next();
                    if (next == "/" && maybeEnd) {
                        newInside = null;
                        break;
                    }
                    maybeEnd = (next == "*");
                }
                setInside(newInside);
                return {type: "comment", style: "js-comment"};
            }

            function readOperator() {
                source.nextWhile(isOperatorChar);
                return {type: "operator", style: "js-operator"};
            }

            function readString(quote) {
                var endBackSlash = nextUntilUnescaped(source, quote);
                setInside(endBackSlash ? quote : null);
                return {type: "string", style: "js-string"};
            }

            // Fetch the next token. Dispatches on first character in the
            // stream, or first two characters when the first is a slash.
            if (inside == "\"" || inside == "'"){
                return readString(inside);
            }
            var ch = source.next();
            if (inside == "/*"){
                return readMultilineComment(ch);
            } else if (ch == "\"" || ch == "'") {
                return readString(ch);
            } else if (/[\[\]{}\(\),;\:\.]/.test(ch)) {  // with punctuation, the type of the token is the symbol itself
                return {type: ch, style: "js-punctuation"};
            } else if (ch == "0" && (source.equals("x") || source.equals("X"))) {
                return readHexNumber();
            } else if (isDigit(ch)) {
                return readNumber();
            } else if (ch == "/") {
                if (source.equals("*")){
                    source.next();
                    return readMultilineComment(ch);
                } else if (source.equals("/")) {
                    nextUntilUnescaped(source, null);
                    return {type: "comment", style: "js-comment"};
                } else if (regexp) {
                    return readRegexp();
                } else {
                    return readOperator();
                }
            } else if (isOperatorChar(ch)) {
                return readOperator();
            } else {
                return readWord();
            }
        }

        return this.baseTokenizer.call(this, source, startState || jsTokenState(false, true));
    },


    // = Parser for JavaScript code =

    /* Parse function for JavaScript. Note that your parsers do not have to be
     * this complicated -- if you don't want to recognize local variables,
     * in many languages it is enough to just look for braces, semicolons,
     * parentheses, etc, and know when you are inside a string or comment.
     */

    // Token types that can be considered to be atoms.
    AtomicTypes: {"atom": true, "number": true, "variable": true, "string": true, "regexp": true},

    // Constructor for the lexical context objects.
    JSLexical: function(indented, column, type, align, prev, info) {
        // indentation at start of this line
        this.indented = indented;

        // column at which this scope was opened
        this.column = column;

        // type of scope ('vardef', 'stat' (statement), 'form' (special form), '[', '{', or '(')
        this.type = type;

        // '[', '{', or '(' blocks that have any text after their opening
        // character are said to be 'aligned' -- any lines below are
        // indented all the way to the opening character.
        if (align != null) {
            this.align = align;
        }

        // Parent scope, if any.
        this.prev = prev;
        this.info = info;
    },

    // My favourite JavaScript indentation rules.
    indentJS: function(lexical) {
        var self = this;

        return function(firstChars) {
            var firstChar = firstChars && firstChars.charAt(0), type = lexical.type;
            var closing = firstChar == type;
            if (type == "vardef") {
                return lexical.indented + 4;
            } else if (type == "form" && firstChar == "{") {
                return lexical.indented;
            } else if (type == "stat" || type == "form") {
                return lexical.indented + self.indentUnit;
            } else if (lexical.info == "switch" && !closing) {
                return lexical.indented + (/^(?:case|default)\b/.test(firstChars) ? self.indentUnit : 2 * self.indentUnit);
            } else if (lexical.align) {
                return lexical.column - (closing ? 1 : 0);
            } else {
                return lexical.indented + (closing ? 0 : self.indentUnit);
            }
        };
    },

    // The parser-iterator-producing function.
    makeParser: function(input, basecolumn) {
        var self = this;

        // Wrap the input in a token stream
        var tokens = this.tokenizer.call(this, input);

        // The parser state. cc is a stack of actions that have to be
        // performed to finish the current statement. For example we might
        // know that we still need to find a closing parenthesis and a
        // semicolon. Actions at the end of the stack go first. It is
        // initialized with an infinitely looping action that consumes
        // whole statements.
        var cc = [statements];

        // Context contains information about the current local scope, the
        // variables defined in that, and the scopes above it.
        var context = null;

        // The lexical scope, used mostly for indentation.
        var lexical = new this.JSLexical((basecolumn || 0) - this.indentUnit, 0, "block", false);

        // Current column, and the indentation at the start of the current
        // line. Used to create lexical scope objects.
        var column = 0;
        var indented = 0;

        // Variables which are used by the mark, cont, and pass functions
        // below to communicate with the driver loop in the 'next'
        // function.
        var consume, marked;

        // The iterator object.
        var parser = {next: next, copy: copy};

        function next() {
            // Start by performing any 'lexical' actions (adjusting the
            // lexical variable), or the operations below will be working
            // with the wrong lexical state.
            while(cc[cc.length - 1].lex) {
                cc.pop()();
            }

            // Fetch a token.
            var token = tokens.next();

            // Adjust column and indented.
            if (token.type == "whitespace" && column == 0) {
                indented = token.value.length;
            }
            column += token.value.length;
            if (token.content == "\n"){
                indented = column = 0;

                // If the lexical scope's align property is still undefined at
                // the end of the line, it is an un-aligned scope.
                if (!("align" in lexical)) {
                    lexical.align = false;
                }

                // Newline tokens get an indentation function associated with
                // them.
                token.indentation = self.indentJS.call(self, lexical);
            }

            // No more processing for meaningless tokens.
            if (token.type == "whitespace" || token.type == "comment") {
                return token;
            }

            // When a meaningful token is found and the lexical scope's
            // align is undefined, it is an aligned scope.
            if (!("align" in lexical)) {
                lexical.align = true;
            }

            // Execute actions until one 'consumes' the token and we can
            // return it.
            while(true) {
                consume = marked = false;

                // Take and execute the topmost action.
                cc.pop()(token.type, token.content);
                if (consume) {
                    // Marked is used to change the style of the current token.
                    if (marked) {
                        token.style = marked;
                    }
                    // Here we differentiate between local and global variables.
                    else if (token.type == "variable" && inScope(token.content)) {
                        token.style = "js-localvariable";
                    }
                    return token;
                }
            }
        }

        // This makes a copy of the parser state. It stores all the
        // stateful variables in a closure, and returns a function that
        // will restore them when called with a new input stream. Note
        // that the cc array has to be copied, because it is contantly
        // being modified. Lexical objects are not mutated, and context
        // objects are not mutated in a harmful way, so they can be shared
        // between runs of the parser.
        function copy(){
            var _context = context, _lexical = lexical, _cc = cc.concat([]), _tokenState = tokens.state;

            return function copyParser(input) {
                context = _context;
                lexical = _lexical;
                cc = _cc.concat([]); // copies the array
                column = indented = 0;
                tokens = self.tokenizer.call(self, input, _tokenState);
                return parser;
            };
        }

        // Helper function for pushing a number of actions onto the cc
        // stack in reverse order.
        function push(fs) {
            for (var i = fs.length - 1; i >= 0; i--) {
                cc.push(fs[i]);
            }
        }

        // cont and pass are used by the action functions to add other
        // actions to the stack. cont will cause the current token to be
        // consumed, pass will leave it for the next action.
        function cont() {
            push(arguments);
            consume = true;
        }

        function pass() {
            push(arguments);
            consume = false;
        }

        // Used to change the style of the current token.
        function mark(style) {
            marked = style;
        }

        // Push a new scope. Will automatically link the current scope.
        function pushcontext(){
            context = {prev: context, vars: {"this": true, "arguments": true}};
        }

        // Pop off the current scope.
        function popcontext() {
            context = context.prev;
        }

        // Register a variable in the current scope.
        function register(varname) {
            if (context){
                mark("js-variabledef");
                context.vars[varname] = true;
            }
        }

        // Check whether a variable is defined in the current scope.
        function inScope(varname) {
            var cursor = context;
            while (cursor) {
                if (cursor.vars[varname]) {
                    return true;
                }
                cursor = cursor.prev;
            }
            return false;
        }

        // Push a new lexical context of the given type.
        function pushlex(type, info) {
            var result = function(){
                lexical = new self.JSLexical(indented, column, type, null, lexical, info);
            };
            result.lex = true;
            return result;
        }

        // Pop off the current lexical context.
        function poplex() {
            lexical = lexical.prev;
        }
        poplex.lex = true;
        // The 'lex' flag on these actions is used by the 'next' function
        // to know they can (and have to) be ran before moving on to the
        // next token.

        // Creates an action that discards tokens until it finds one of
        // the given type.
        function expect(wanted){
            return function expecting(type){
                if (type == wanted) {
                    cont();
                } else {
                    cont(arguments.callee);
                }
            };
        }

        // Looks for a statement, and then calls itself.
        function statements(type) {
            return pass(statement, statements);
        }

        // Dispatches various types of statements based on the type of the
        // current token.
        function statement(type) {
            if (type == "var") {
                cont(pushlex("vardef"), vardef1, expect(";"), poplex);
            } else if (type == "keyword a") {
                cont(pushlex("form"), expression, statement, poplex);
            } else if (type == "keyword b") {
                cont(pushlex("form"), statement, poplex);
            } else if (type == "{") {
                cont(pushlex("}"), block, poplex);
            } else if (type == "function") {
                cont(functiondef);
            } else if (type == "for") {
                cont(pushlex("form"), expect("("), pushlex(")"), forspec1, expect(")"), poplex, statement, poplex);
            } else if (type == "variable") {
                cont(pushlex("stat"), maybelabel);
            } else if (type == "switch") {
                cont(pushlex("form"), expression, pushlex("}", "switch"), expect("{"), block, poplex, poplex);
            } else if (type == "case") {
                cont(expression, expect(":"));
            } else if (type == "default") {
                cont(expect(":"));
            } else if (type == "catch") {
                cont(pushlex("form"), pushcontext, expect("("), funarg, expect(")"), statement, poplex, popcontext);
            } else {
                pass(pushlex("stat"), expression, expect(";"), poplex);
            }
        }

        // Dispatch expression types.
        function expression(type) {
            if (self.AtomicTypes.hasOwnProperty(type)) {
                cont(maybeoperator);
            } else if (type == "function") {
                cont(functiondef);
            } else if (type == "keyword c") {
                cont(expression);
            } else if (type == "(") {
                cont(pushlex(")"), expression, expect(")"), poplex, maybeoperator);
            } else if (type == "operator") {
                cont(expression);
            } else if (type == "[") {
                cont(pushlex("]"), commasep(expression, "]"), poplex, maybeoperator);
            } else if (type == "{") {
                cont(pushlex("}"), commasep(objprop, "}"), poplex, maybeoperator);
            }
        }

        // Called for places where operators, function calls, or
        // subscripts are valid. Will skip on to the next action if none
        // is found.
        function maybeoperator(type) {
            if (type == "operator") {
                cont(expression);
            } else if (type == "(") {
                cont(pushlex(")"), expression, commasep(expression, ")"), poplex, maybeoperator);
            } else if (type == ".") {
                cont(property, maybeoperator);
            } else if (type == "[") {
                cont(pushlex("]"), expression, expect("]"), poplex, maybeoperator);
            }
        }

        // When a statement starts with a variable name, it might be a
        // label. If no colon follows, it's a regular statement.
        function maybelabel(type) {
            if (type == ":") {
                cont(poplex, statement);
            } else {
                pass(maybeoperator, expect(";"), poplex);
            }
        }

        // Property names need to have their style adjusted -- the
        // tokenizer thinks they are variables.
        function property(type) {
            if (type == "variable") {
                mark("js-property");
                cont();
            }
        }

        // This parses a property and its value in an object literal.
        function objprop(type) {
            if (type == "variable") {
                mark("js-property");
            }
            if (self.AtomicTypes.hasOwnProperty(type)) {
                cont(expect(":"), expression);
            }
        }

        // Parses a comma-separated list of the things that are recognized
        // by the 'what' argument.
        function commasep(what, end) {
            function proceed(type) {
                if (type == ",") {
                    cont(what, proceed);
                } else if (type == end) {
                    cont();
                } else {
                    cont(expect(end));
                }
            };
            return function commaSeparated(type) {
                if (type == end) {
                    cont();
                } else {
                    pass(what, proceed);
                }
            };
        }

        // Look for statements until a closing brace is found.
        function block(type) {
            if (type == "}") {
                cont();
            } else {
                pass(statement, block);
            }
        }

        // Variable definitions are split into two actions -- 1 looks for
        // a name or the end of the definition, 2 looks for an '=' sign or
        // a comma.
        function vardef1(type, value) {
            if (type == "variable") {
                register(value);
                cont(vardef2);
            } else {
                cont();
            }
        }

        function vardef2(type, value) {
            if (value == "=") {
                cont(expression, vardef2);
            } else if (type == ",") {
                cont(vardef1);
            }
        }

        // For loops.
        function forspec1(type) {
            if (type == "var") {
                cont(vardef1, forspec2);
            } else if (type == ";") {
                pass(forspec2);
            } else if (type == "variable") {
                cont(formaybein);
            } else {
                pass(forspec2);
            }
        }

        function formaybein(type, value) {
            if (value == "in") {
                cont(expression);
            } else {
                cont(maybeoperator, forspec2);
            }
        }

        function forspec2(type, value) {
            if (type == ";") {
                cont(forspec3);
            }else if (value == "in") {
                cont(expression);
            } else {
                cont(expression, expect(";"), forspec3);
            }
        }

        function forspec3(type) {
            if (type == ")") {
                pass();
            } else {
                cont(expression);
            }
        }

        // A function definition creates a new context, and the variables
        // in its argument list have to be added to this context.
        function functiondef(type, value) {
            if (type == "variable") {
                register(value);
                cont(functiondef);
            } else if (type == "(") {
                cont(pushcontext, commasep(funarg, ")"), statement, popcontext);
            }
        }

        function funarg(type, value) {
            if (type == "variable"){register(value); cont();}
        }

        return parser;
    },

    // NOTE: this ugly copy-paste monster will be eliminted completely, when styling via thunderhead CSS
    updateLineInfos: function(lineInfos, token) {
        if (token.style == "js-comment") {
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

    electricChars: "{}:"
});

// Register this puppy
bespin.syntax.codemirror.Resolver.register(new bespin.syntax.codemirror.JavaScript(), ['js', 'javascript', 'ecmascript', 'jsm']);