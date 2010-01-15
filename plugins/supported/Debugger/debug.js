/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is
 * Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var util = require("bespin:util/util");
var keys = require("bespin:util/keys");
var Instruction = require("CommandLine:instruction").Instruction;
var CliInputView = require("CommandLine:views/cli").CliInputView;
var plugins = require("bespin:plugins");

/*
    "debug": {
        "provides": [
            ["bespin.subscribe", {
                "topic": "debugger:running",
                "pointer": "bespin/debug:debuggerRunning"
            }],
            ["bespin.subscribe", {
                "topic": "debugger:stopped",
                "pointer": "bespin/debug:debuggerStopped"
            }],
            ["bespin.subscribe", {
                "topic": "debugger:halted",
                "pointer": "bespin/debug:debuggerHalted"
            }],
            ["debugbar", {
                "pointer": "bespin/debug"
            }],
            ["breakpoints", {
                "pointer": "bespin/debug:BreakpointManager"
            }]
        ],
        "location": "/getscript/js"
    }
*/

/**
 * A specialization of commandline.Interface for the Javascript based CLI
 */
exports.EvalCommandLineInterface = CliInputView.extend({

    requires: {
        hub: "hub",
        editor: "editor",
        editSession: "editSession"
    },

    history: InMemoryHistory({ maxEntries: 0 }),

    init: function() {
        this.buildUI();
        this.connectEvents();
    },

    buildUI: function() {
        // There was a ton of HTML included in editor.html that should be
        // moved into here in some way
        this.output = document.getElementById(idPrefix + "output");
    },

    destroy: function() {
        this.subscriptions.forEach(function(sub) {
            this.hub.unsubscribe(sub);
        });

        this.connections.forEach(function(conn) {
            dojo.disconnect(conn);
        });

        this.nodes.forEach(function(nodeId) {
            dojo.query("#" + nodeId).orphan();
        });
    },

    /**
     * Note that evalFunction should be an extension point
     * Also, this shouldn't be on the command line. There should
     * be a GUI component for the whole debugbar.
     */
    show: function(evalFunction) {
        this.evalFunction = evalFunction;
        document.getElementById("debugbar").style.display = "block";
        this.editor.recalcLayout();
        this.resize();

        if (!this.settings.values.debugmode) {
            this.settings.values.debugmode = true;
        }

        // TODO: Ug. Seriously?!
        exports.project = this.editSession.project;
    },

    hide: function() {
        document.getElementById("debugbar").style.display = "none";
        this.editor.recalcLayout();
        this.clearAll();
        exports.project = undefined;
    },

    /**
     *
     */
    connectEvents: function() {
        this.connections.push(dojo.connect(document.getElementById("debugbar_break"), "onclick", null, function() {
            this.hub.publish("debugger:break", {});
        }));

        this.connections.push(dojo.connect(document.getElementById("debugbar_continue"), "onclick", null, function() {
            this.hub.publish("debugger:continue", {});
        }));

        this.connections.push(dojo.connect(document.getElementById("debugbar_stepnext"), "onclick", null, function() {
            this.hub.publish("debugger:stepnext", {});
        }));

        this.connections.push(dojo.connect(document.getElementById("debugbar_stepout"), "onclick", null, function() {
            this.hub.publish("debugger:stepout", {});
        }));

        this.connections.push(dojo.connect(document.getElementById("debugbar_stepin"), "onclick", null, function() {
            this.hub.publish("debugger:stepin", {});
        }));

        this.connections.push(dojo.connect(this.commandLine, "onfocus", this, function() {
            this.hub.publish("cmdline:focus");
        }));

        this.connections.push(dojo.connect(this.commandLine, "onblur", this, function() {
            this.hub.publish("cmdline:blur");
        }));

        this.connections.push(dojo.connect(this.commandLine, "onkeypress", this, function(e) {
            if (e.keyCode == keys.Key.ENTER) {
                var typed = this.commandLine.value;
                this.commandLine.value = '';
                this.executeCommand(typed);

                return false;
            } else if ((e.keyChar == 'n' && e.ctrlKey) || e.keyCode == keys.Key.DOWN_ARROW) {
                var next = this.history.next();
                if (next) {
                    this.commandLine.value = next.typed;
                }

                util.stopEvent(e);
                return false;
            } else if ((e.keyChar == 'p' && e.ctrlKey) || e.keyCode == keys.Key.UP_ARROW) {
                var prev = this.history.previous();
                if (prev) {
                    this.commandLine.value = prev.typed;
                }

                util.stopEvent(e);
                return false;
            } else if (e.keyChar == 'u' && e.ctrlKey) {
                this.commandLine.value = '';

                util.stopEvent(e);
                return false;
            }
        }));

        // TODO: We probably need to add the debugmode setting somewhere
        this.hub.subscribe("settings:set:debugmode", function(event) {
            this.editor.debugMode = event.value;
            if (this.editor.debugMode) {
                plugins.loadOne("bespin.debugger", function(debug) {
                    debug.loadBreakpoints(function() {
                        this.editor.paint(true);
                    }.bind(this));
                }.bind(this));
            } else {
                this.editor.paint(true);
            }
        });
    },

    /**
     *
     */
    executeCommand: function(value) {
        console.log("Sending debug command");
        if (!this.evalFunction) {
            console.log("No evaluator");
            return;
        }

        this.commandLine.value = "";

        var instruction = Instruction.create({
            canon:null,
            typed:value
        });
        this.executing = instruction;

        var frame = null;
        if (document.getElementById("debugbar_position").innerHTML != "") {
            frame = 0;
        }
        this.evalFunction(value, frame, function(output) {
            console.log("EvalCL got output: " + output);
            instruction.addOutput(output);
            this.updateOutput();
        }.bind(this));
        this.history.add(instruction);
        this.updateOutput();
    },

    /**
     *
     */
    updateOutput: function() {
        console.dir(this.history);
        var outputNode = this.output;
        outputNode.innerHTML = "";
        this.history.instructions.forEach(function(instruction) {
            var rowin = dojo.create("div", {
                className: "command_rowin",
                onclick: function(ev) {
                    this.commandLine.value = instruction.typed;
                }.bind(this),
                ondblclick: function(ev) {
                    this.executeCommand(instruction.typed);
                }.bind(this)
            }, outputNode);
            rowin.innerHTML = "> " + instruction.typed || "";

            var rowout = dojo.create("div", {
                className: "command_rowout"
            }, outputNode);
            rowout.innerHTML = instruction.output || "";
        }.bind(this));
    },

    /**
     *
     */
    resize: function() {
        if (this._resizer == null) {
            this._resizer = dojo.connect(window, "resize", this, this.resize);
        }
        // The total size of the debugbar is 19+47+20+100+20+X+39+16
        // where X is the size of the output, adjusted so that
        // the total matches the height of the editor canvas.
        var canvas = this.editor.get("canvas");
        var totalHeight = canvas.offsetHeight;
        var outputHeight = totalHeight - 261;
        document.getElementById("debugbar_output").style.height = outputHeight + "px";
    },

    /**
     *
     */
    clearAll: function() {
        this.history.setInstructions();
        if (this._resizer != null) {
            dojo.disconnect(this._resizer);
        }
        this.updateOutput();
    }
});

/**
 *
 */
exports.BreakpointManager = SC.Object.extend({
    requires: {
        hub: "hub",
        files: "files"
    },

    init: function() {
        this.breakpoints = [];
        this._sequence = 1;
    },

    /**
     * Helper to check for duplicate breakpoints before adding this one
     */
    addBreakpoint: function(newBreakpoint) {
        for (var i = 0; i < this.breakpoints.length; i++) {
            var breakpoint = this.breakpoints[i];
            if (this.breakpointsEqual(breakpoint, newBreakpoint)) {
                return false;
            }
        }
        newBreakpoint.id = this.sequence++;
        this.breakpoints.push(newBreakpoint);
        this.saveBreakpoints();
        this.hub.publish("debugger:breakpoints:add", newBreakpoint);
        return true;
    },

    /**
     * Returns true if the two breakpoints represent the same line in the same
     * file in the same project
     */
    breakpointsEqual: function(b1, b2) {
        return (b1.project == b2.project && b1.path == b2.path && b1.lineNumber == b2.lineNumber);
    },

    /**
     * Helper to remove a breakpoint from the breakpoints array
     */
    removeBreakpoint: function(breakpointToRemove) {
        for (var i = 0; i < this.breakpoints.length; i++) {
            if (this.breakpointsEqual(this.breakpoints[i], breakpointToRemove)) {
                breakpointToRemove.id = this.breakpoints[i].id;
                this.breakpoints.splice(i, 1);
                this.saveBreakpoints();
                this.hub.publish("debugger:breakpoints:remove", breakpointToRemove);
                return;
            }
        }
    },

    /**
     *
     */
    toggleBreakpoint: function(breakpoint) {
        if (!this.addBreakpoint(breakpoint)) {
            this.removeBreakpoint(breakpoint);
        }
    },

    /**
     * Helper to return the breakpoints that apply to the current file
     */
    getBreakpoints: function(project, path) {
        var bps = [];   // breakpoints to return

        this.breakpoints.forEach(function(breakpoint) {
            if (breakpoint.project == project && breakpoint.path == path) {
                bps.push(breakpoint);
            }
        });

        return bps;
    },

    /**
     *
     */
    loadBreakpoints: function(callback) {
        var project = this.files.userSettingsProject;
        this.files.loadContents(project, "breakpoints", function(file) {
            this.breakpoints = JSON.parse(file.content);

            // reset IDs, because they are not consistent between
            // loads of Bespin.
            this.sequence = 1;
            for (var i = 0; i < this.breakpoints.length; i++) {
                this.breakpoints[i].id = this.sequence++;
            }

            if (util.isFunction(callback)) {
                callback();
            }
        }.bind(this));
    },

    /**
     *
     */
    saveBreakpoints: function() {
        var project = this.files.userSettingsProject;
        // save breakpoints back to server asynchronously
        this.files.saveFile(this.files.userSettingsProject, {
            name: "breakpoints",
            content: JSON.stringify(this.breakpoints),
            timestamp: new Date().getTime()
        }.bind(this));
    }
});

exports.debuggerRunning = function() {
    document.getElementById("debugbar_status_running").style.display = "inline";
    document.getElementById("debugbar_status_stopped").style.display = "none";
    document.getElementById("debugbar_position").innerHTML = "";
    document.getElementById("debugbar_break").style.display = "inline";
    document.getElementById("debugbar_continue").style.display = "none";
};

exports.debuggerStopped = function() {
    document.getElementById("debugbar_status_running").style.display = "none";
    document.getElementById("debugbar_status_stopped").style.display = "inline";
    document.getElementById("debugbar_break").style.display = "none";
    document.getElementById("debugbar_continue").style.display = "inline";
};

exports.debuggerHalted = function(location) {
    var el = document.getElementById("debugbar_position");
    var newtext = "";

    if (location.exception) {
        newtext = 'Exception <span class="error">' + location.exception + "</span> at<br>";
    }

    var linenum = location.sourceLine + 1;
    var scriptloc;
    if (exports.project) {
        scriptloc = '<a onclick="bespin.get(\'commandLine\').executeCommand(\'open  /' + exports.project + "/" + location.scriptName + ' ' + linenum + '\', true)">' + location.scriptName + ':' + linenum + '</a>';
    } else {
        scriptloc = location.scriptName + ':' + linenum;
    }
    newtext += '<span class="code">' + location.sourceLineText + '</span><br>' +
                scriptloc;
    if (location.invocationText) {
        newtext += '<br>invoked by <span class="code">' + location.invocationText + '</span>';
    }

    el.innerHTML = newtext;
};
