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

var bespin = require("bespin");
var worker = require("bespin/worker");

/**
 * Module for dealing parsing and getting meta info about source.
 * The core model talks to specific engines to do the work and then packages it
 * up to send to the editor.
 * Works similar to syntax highlighting engine
 */

/**
 * Saves Info about current source code
 * To get meta data about code subscribe to parser:metainfo and parser:error
 */
exports.CodeInfo = SC.Object.define({
    _started: false,
    _running: false,

    currentMetaInfo: null,
    messages: [],
    foldPoints: [],

    init: function() {
        var self = this;

        // Show a window with a code structure outline of the current document
        bespin.subscribe("parser:showoutline", function() {
            var html = self.currentMetaInfo ? self.currentMetaInfo.html : "Outline not yet available";
            bespin.get("commandLine").addOutput(html);
        });

        // Show a window with a code structure outline of the current document
        bespin.subscribe("parser:gotofunction", function(event) {
            var functionName = event.functionName;

            if (!functionName) {
                bespin.get("commandLine").addErrorOutput("Please pass me a valid function name.");
                return;
            }
            var matches = dojo.filter(self.foldPoints, function(func) {
                return func['(name)'] == functionName;
            });
            if (matches.length === 0) {
               bespin.get("commandLine").addErrorOutput("Unable to find the function " + functionName + " in this file.");
            } else {
               bespin.get("editor").moveAndCenter(matches[0].row);
            }
        });

        // Fires when the parser engine finished a parsing run
        bespin.subscribe("parser:engine:parseDone", function(event) {
            var data = event.info;
            self.foldPoints = data.foldPoints;
            var syntaxmarkers = bespin.get("settings") && bespin.get("settings").get("syntaxmarkers");
            self.messages = dojo.filter(data.messages, function(message) {
                if (syntaxmarkers === "all") {
                    return true;
                }
                return ((message.type + "s").toLowerCase() === syntaxmarkers);
            });
            if (data.metaInfo) {
                self.currentMetaInfo = data.metaInfo;
                bespin.publish("parser:metainfo", {
                    info: data.metaInfo
                });
            }
            self._running = false;
            //console.log("parser:engine:parseDone %o", self.messages);
        });

        bespin.subscribe("parser:stop", function () {
            self.messages = [];
            self.foldPoints = [];
        });
    },

    /**
     * Start collecting meta info
     * will start listening for doc change events and run the parser every time
     */
    start: function() {
        var self = this;
        var editor = bespin.get("editor");

        if (!self._started) {
            self._started = true;

            var delay = 400;

            // rerun parser every time the doc changes
            var rerun = function() {
                // only to a fetch at max every N millis
                // so we dont run during active typing

                if (self.run_timeout) {
                    clearTimeout(self.run_timeout);
                }
                self.run_timeout = setTimeout(function() {
                    self.fetch();
                }, delay);
            };
            var onChange = bespin.subscribe("editor:document:changed", rerun);
            bespin.subscribe("settings:set:syntaxmarkers", rerun);
            bespin.subscribe("settings:set:jslint", rerun);

            // Stop parsing the document
            bespin.subscribe("parser:stop", function () {
                bespin.unsubscribe(onChange);
                self._started = false;
            });

            // initial fetch
            rerun();
        }
    },

    // Ask the parser for meta info (once)
    fetch: function() {
        var self = this;

        // parsing is too slow to run in the UI thread
        if (exports.AsyncEngineResolver.__hasWorkers__) {
            var editor = bespin.get("editor");
            var type = editor.language;
            var parseOptions = bespin.get("settings") && bespin.get("settings").getObject("jslint");

            if (type) {
                var source = editor.model.getDocument();
                self._running = true;
                bespin.publish("parser:engine:parse", {
                    type: type,
                    source: source,
                    parseOptions: parseOptions
                });
            }
        }
    },

    getLineMarkers: function() {
        var lineMarkers = {};
        this.messages.forEach(function(message) {
            if (!lineMarkers[message.line]) {
                lineMarkers[message.line] = {type: message.type, msg: ""};
            }
            lineMarkers[message.line].msg += '<p>Syntax ' + message.type +
                (isFinite(message.line) ? ' at line ' + message.line + ' character ' + (message.character + 1) : ' ') +
                ': ' + message.reason + '<p>' +
                (message.evidence && (message.evidence.length > 80 ? message.evidence.slice(0, 77) + '...' : message.evidence).
                    replace(/&/g, '&amp;').
                    replace(/</g, '&lt;').
                    replace(/>/g, '&gt;'));
            if (message.type === "Error" || (message.type === "Warning" && lineMarkers[message.line].type === "Message")) {
                lineMarkers[message.line].type = message.type;
            }
        });
        return lineMarkers;
    },

    getFunctions: function () {
        return this.foldPoints || [];
    }
});

/**
 * Parses JavaScript
 * This implementation uses narcissus by Brandan Eich in the background
 * To be executed inside a web worker.
 */
exports.JavaScript = SC.Object.extend({
    name: "Narcissus",

    // walk the AST generated by narcissus
    walk: function(tree, callback) {
        var parentStack = [];
        var indexStack  = [];
        var top = function () {
            if (this.length == 0) {
                return null;
            }
            return this[this.length-1];
        };
        parentStack.top = top;
        indexStack.top  = top;
        this._walk(callback, tree, parentStack, indexStack);
    },

    _visitNode: function(callback, node, parentStack, indexStack) {
        callback.call(this, node, parentStack, indexStack);

        // we are actually an array of nodes
        if (node.length) {
            this._walk(callback, node, parentStack, indexStack);
        }

        // all these properties can be sub trees
        if (node.expression) {
            this._walk(callback, node.expression, parentStack, indexStack);
        }
        if (node.body) {
            this._walk(callback, node.body, parentStack, indexStack);
        }
        if (node.value) {
            this._walk(callback, node.value, parentStack, indexStack);
        }
    },

    _walk: function(callback, tree, parentStack, indexStack) {
        if (typeof tree == "string") {
            return;
        }
        if (tree.length) {
            parentStack.push(tree);
            for(var i = 0; i < tree.length; ++i) {
                var node = tree[i];
                indexStack.push(i);
                this._visitNode(callback, node, parentStack, indexStack);
                indexStack.pop();
            }
            parentStack.pop();
        } else {
            // we are not an array of nodes, so we are a node
            this._visitNode(callback, tree, parentStack, indexStack);
        }
    },

    getMetaInfo: function(tree) {
        var funcs  = [];
        var idents = {};
        var info   = [];
        var codePatterns = this.getCodePatterns();
        // preprocess for speed
        for(var type in codePatterns) {
            if (codePatterns.hasOwnProperty(type)) {
                //console.log(JSON.stringify(codePatterns[type]))
                try {
                    var ns = codePatterns[type].declaration.split(".");
                    var indicator = ns.pop();
                    codePatterns[type]._indicator = indicator;
                    codePatterns[type]._ns        = ns;
                } catch(e) {
                    console.log("Weird FF3b3 error "+e);
                }
            }
        }

        var FUNCTION = 74; // from narcissus
        var OBJECT_LITERAL_KEY = 56;
        var IDENTIFIER = 56;

        this.walk(tree, function(node, parentStack, indexStack) {
            var depth = parentStack.length;
            var tree  = parentStack.top();
            var index = indexStack.top();
            var row   = node.lineno - 1;

            var identifiers = [];
            if(node.type == IDENTIFIER && index > 0) {
                identifiers.push(node.value);

                for(var i = index-1; i >= 0; --i) {
                    var n = tree[i];
                    if(n && n.type == IDENTIFIER) {
                        identifiers.unshift(n.value);
                    }
                }
            }
            idents[identifiers.join(".")] = true;

            // find function
            if (node.type == FUNCTION) {
                var name = node.name;
                if (name == null && tree && index > 0) {
                    // if we have no name. Look up the tree and check for the value
                    // this catches this case: { name: function() {} }
                    var pred = tree[index-1];
                    if (pred.type == OBJECT_LITERAL_KEY) {
                        name = pred.value;
                    }
                }
                var fn = {
                    type:  "function",
                    name:  name,
                    row:   row,
                    depth: depth
                };
                funcs.push(fn);
                info.push(fn);
            } else {

                // now it gets complicated
                // we look up the stack to see whether this is a declaration of the form
                // thing.declare("NAME", ...)

                var parent = parentStack[parentStack.length-1];
                var parentIndex = indexStack[indexStack.length-1];

                var analyze = function(type, ns, indicator) {
                    if (parentIndex >= 0) {
                        if (node.value == indicator) { // identifiy a candidate (aka, we found "declare")
                            // console.log("Found "+indicator)

                            // if the indicator is namespaced, check the ancestors
                            for (var i = 0; i < ns.length; ++i) {
                                var ele = ns[i];
                                // up one level
                                if (parent[parentIndex-1] && parent[parentIndex-1].value == ns) {
                                    parent = parentStack[parentStack.length-(1 + i + 1)];
                                    parentIndex = indexStack[indexStack.length-(1 + i + 1) ];
                                    // console.log("NS "+ns)
                                } else {
                                    return; // FAIL
                                }
                            }

                            // candidate is valid
                            if (parent[parentIndex+1] && parent[parentIndex+1][0]) {
                                var name = parent[parentIndex+1][0].value;
                                // console.log(type+": "+name + " - "+depth);

                                info.push({
                                    type:  type,
                                    name:  name,
                                    row:   row,
                                    depth: depth
                                });
                                return true;
                            }
                        }
                    }
                };

                // walk through code patterns and check them against the current tree
                for (var type in codePatterns) {
                    var pattern = codePatterns[type];
                    if (analyze(type, pattern._ns, pattern._indicator)) {
                        break; // if we find something, it cannot be anything else
                    }
                }
            }
        });

        var html = '<u>Outline</u><br/><br/>';
        html +='<div id="outlineInfo">';
        for (var i = 0; i < info.length; i++) {
            type = info[i].type;
            var kind = type;
            var name = info[i].name;
            var pattern = codePatterns[type];
            if (pattern) {
                if ("declaration" in pattern) {
                    kind = pattern.declaration;
                }
                if ("description" in pattern) {
                    kind = pattern.description;
                }
            }
            if (typeof name == "undefined") {
                continue;
            }
            var indent = "";
            for(var j = 0; j < info[i].depth; j++) {indent += "&nbsp;";}
            html += indent+kind+': <a href="javascript:bespin.get(\'editor\').cursorManager.moveCursor({ row: '+info[i].row+', col: 0 });bespin.get(\'editor\').ui.actions.moveCursorRowToCenter();">'+name+'</a><br/>';
        }
        html += '</div>';

        //console.log(tree)

        return {
            functions: funcs,
            idents: idents,
            outline:   info,
            html: html
        };
    },

    codePatterns: {
        dojoClass: {
            declaration: "dojo.declare",
            description: "Class"
        },
        bespinEventPublish: {
            declaration: "bespin.publish",
            description: "Publish"
        },
        bespinEventSubscription: {
            declaration: "bespin.subscribe",
            description: "Subscribe to"
        },
        jooseClass: {
            declaration: "Class"
        },
        jooseModule: {
            declaration: "Module"
        },
        jooseType: {
            declaration: "Type"
        },
        jooseRole: {
            declaration: "Role"
        }
    },

    getCodePatterns: function () {
        return this.codePatterns;
    },

    initialize: function () {
        var self = this;
        //console.log("SubInit");
        bespin.subscribe("parser:js:codePatterns", function (patterns) {
            for (var pattern in patterns) {
                self.codePatterns[pattern] = patterns[pattern];
            }
            bespin.publish("parser:engine:updatedCodePatterns");
        });
    },

    parse: function(source) {
        var tree;
        var messages = [];
        try {
            // parse is global function from narcissus
            tree = parse(source);
        } catch (e) {
            ;// error handling is now done by JSLint
        };

        return {
            messages: messages,
            metaInfo: tree ? this.getMetaInfo(tree) : undefined
        };
    }
});

/**
 * Parses JavaScript
 * This implementation uses JSLint by Douglas Crockford in the background
 * To be executed inside a web worker.
 */
exports.JSLint = SC.Object.extend({
    name: "JSLint",

    parse: function(source, type, parseOptions) {
        if (type === "css") {
            // JSLint spots css files using this prefix
            source = '@charset "UTF-8";\n' + source;
        }
        var result = JSLINT(source, parseOptions);
        var messages = [];
        var funcs = JSLINT.getFunctions();
        var fatal = JSLINT.errors.length > 0 && JSLINT.errors[JSLINT.errors.length - 1] === null;
        for (var i = 0; i < JSLINT.errors.length; i++) {
            if (JSLINT.errors[i]) {
                messages.push({
                    reason: JSLINT.errors[i].reason,
                    line: JSLINT.errors[i].line + (type === "css" ? 0 : 1),
                    type: (i === JSLINT.errors.length - 2 && fatal) ? "Error" : "Warning",
                    character: JSLINT.errors[i].character,
                    evidence: JSLINT.errors[i].evidence
                });
            }
        }

        for (var i = 0; i < funcs.length; i++) {
            messages.push({
                line: funcs[i].line,
                type: "Message",
                character: 0,
                reason: "<br>Function name: " + funcs[i].name +
                        "<br>Unused: " + funcs[i].unused.join(", ") +
                        "<br>Closure: " + funcs[i].closure.join(", ") +
                        "<br>Exception: " + funcs[i].exception.join(", ") +
                        "<br>Vars: " + funcs[i].vars.join(", ") +
                        "<br>Label: " + funcs[i].label.join(", ") +
                        "<br>Outer: " + funcs[i].outer.join(", ") +
                        "<br>Global: " + funcs[i].global.join(", "),
                evidence: ""
            });
        }

        return {
            result: result,
            messages: messages,
            foldPoints: (type === 'css' ? [] : funcs)
        };
    }
});

/**
 * The resolver holds the engines that are available to do the actual parsing
 */
exports.EngineResolver = function() {
  return {
      engines: {},

      /**
       * A high level parse function that uses the type to get the engines it
       * returns the combined results of parsing each one parsers overwrite each
       * other if they pass members with the same name, except for messages
       * which are concatenated.
       */
      parse: function(source, type, parseOptions) {
          var result = {};
          var engineResult;
          var selectedEngines = this.resolve(type);
          for (var i = 0; i < selectedEngines.length; i++) {
              engineResult = selectedEngines[i].parse(source, type, parseOptions);
              engineResult.messages = engineResult.messages.concat(result.messages || []);
              for (var member in engineResult) {
                  if (engineResult.hasOwnProperty(member)) {
                      if (engineResult[member]) {
                          result[member] = engineResult[member];
                          result.isSet = true;
                      }
                  }
              }
          }
          return result.isSet ? result : {noEngine: true};
      },

      /**
       * Engines register themselves. E.g.
       * <code>parser.EngineResolver.register(new parser.CSSParserEngine(), ['css']);</code>
       */
      register: function(parserEngine, types) {
          for (var i = 0; i < types.length; i++) {
              if (this.engines[types[i]] == null) {
                  this.engines[types[i]] = [];
              }
              this.engines[types[i]].push(parserEngine);
          }
      },

      /**
       * Hunt down the engines for the given type (e.g. css, js, html)
       */
      resolve: function(type) {
          return this.engines[type] || [];
      },

      initialize: function () {
          var engine = this;
          bespin.subscribe("parser:engine:parse", function(event) {
              var ret = engine.parse(event.source, event.type, event.parseOptions);
              bespin.publish("parser:engine:parseDone", {
                  type: event.type,
                  info: ret
              });
          });

          // forward initialize to engines
          for (var type in this.engines) {
              var list = this.engines[type];
              for (var i = 0; i < list.length; i++) {
                  var eng = list[i];
                  // make sure we only init once (engine can occur multiple times)
                  if (!eng._init) {
                      if (eng.initialize) {
                          eng.initialize();
                      }
                      eng._init = true;
                  }
              }
          }

          bespin.publish("parser:engine:initialized", {});
      }
  };
}();

exports.EngineResolver.register(new exports.JSLint(), ['js', 'css']);
exports.EngineResolver.register(new exports.JavaScript(), ['js']);

/**
 * Turn us into a worker-thread
 */
exports.AsyncEngineResolver = new worker.WorkerFacade(
    exports.EngineResolver,
    1, // just one worker please
    // we need these libs. Should probably move to a property of the JS engine
    ["/js/jsparse/jsdefs.js", "/js/jsparse/jsparse.js", "/js/jsparse/fulljslint.js"]);

/**
 * Start parsing the document
 */
bespin.subscribe("parser:start", function () {
    bespin.get("parser").start();
});

bespin.register("parser", new exports.CodeInfo());

bespin.fireAfter(["settings:language", "settings:set:syntaxcheck", "parser:engine:initialized"], function () {
    var settings = bespin.get("settings");
    if (settings && settings.isOn(settings.get("syntaxcheck"))) {
        var editor = bespin.get("editor");
        if (editor.language) {
            bespin.publish("parser:start");
        } else { // wait some more, editor needs to catch this first
            bespin.subscribe("settings:language", function () {
                bespin.publish("parser:start");
            });
        }
    }
});

/**
 * This really shouldn't be necessary (see above function) but it is.
 * Parser doesn't automatically start without it
 */
bespin.subscribe("settings:language", function () {
    var settings = bespin.get("settings");
    if (settings && settings.isOn(settings.get("syntaxcheck"))) {
        bespin.publish("parser:start");
    }
});
