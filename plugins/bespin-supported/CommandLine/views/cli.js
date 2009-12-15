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

var SC = require("sproutcore/runtime").SC;
var dock = require("bespin:views/dock");
var commandMod = require("command");
var image = require("views/image_button");
var pin = require("views/pin");
var plugins = require("bespin:plugins");

var settings = plugins.catalog.getObject("settings");

/**
 * Not currently used. Previously there was an option to number or date each
 * historical instruction. The options were time|history|none. The code in
 * #exports.outputInstruction() follows the none path at the moment.
 */
settings.addSetting({
    name: "historytimemode",
    type: "text",
    defaultValue: "time"
});

/**
 * TODO: move this into server meta-data
 */
var baseUrl = "/server/plugin/file/supported/CommandLine/views/images/";

/**
 * The height of the CLI input without and output display. Sort of like the
 * normal vi/emacs default size
 */
var compactHeight = 30;

/**
 * The maximum size the CLI can grow to
 */
var maxHeight = 300;

/**
 * A view designed to dock in the bottom of the editor, holding the command
 * line input.
 * <p>
 * TODO: We need to generalize the way views attach to the editor, but now isn't
 * the right time to work on this. We're locked to the bottom.
 */
exports.CliInputView = SC.View.design({
    dock: dock.DOCK_BOTTOM,
    classNames: [ "command_line" ],
    layout: { height: compactHeight, bottom: 0, left: 0, right: 0 },
    childViews: [ "contentView" ],
    contentHeight: 0,
    hasFocus: false,

    /**
     * We need to know if blur events from the input really matter (i.e. are
     * they going to the editor or another view, or just to another part of this
     * view) so we listen for clicks in this view.
     * This allows us to cancel the effects of a blur
     */
    didCreateLayer: function() {
        this._boundCancelBlur = this._cancelBlur.bind(this);
        var layer = this.get("layer");
        layer.addEventListener("click", this._boundCancelBlur, true);
    },

    /**
     * Undo event registration from #didCreateLayer()
     */
    willDestroyLayer: function() {
        var layer = this.get("layer");
        layer.removeEventListener("click", this._boundCancelBlur, true);
    },

    /**
     * command.js/cliController.history has changed, so we need to pop-up the
     * display view
     */
    historyUpdated: function(cliController) {
        var table = exports.outputHistory();

        // Update the output layer just by hacking the DOM
        var ele = this.getPath("contentView.display.output.layer");
        ele.innerHTML = "";
        ele.appendChild(table);
        this.set("contentHeight", table.clientHeight);
    }.observes("CommandLine:command#cliController.history.version"),

    /**
     * Called whenever anything happens that could affect the output display
     */
    checkHeight: function(source, event) {
        var pinned = this.getPath("contentView.display.toolbar.pin.isSelected");

        var height = compactHeight;
        if (pinned || this.get("hasFocus")) {
            var contentHeight = Math.min(maxHeight, this.get("contentHeight"));
            if (contentHeight > 0) {
                // TODO: Why 10?
                height = compactHeight + 10 + contentHeight;
            }
        }

        // TODO: We shouldn't be using input.isKeyResponder, but instead
        // checking that the KeyResponser is a child of CliInputView. This
        // delay fudges around the issue by allowing the pin to work before
        // taking it off the screen.
        if (this.get("layout").height != height) {
            this.adjust("height", height).updateLayout();
        }

        /*
        // If we need to scroll to the bottom, this code should do the trick
        // and it was tricky to get right IIRC. It's been lightly hacked to
        // keep up with the sproutcore refactoring
        if (scroll) {
            // certain browsers have a bug such that scrollHeight is too small
            // when content does not fill the client area of the element
            var scrollHeight = Math.max(contentView.display.output.layer.scrollHeight, contentView.display.output.layer.clientHeight);
            contentView.display.output.layer.scrollTop = scrollHeight - contentView.display.output.layer.clientHeight;
        }
        */
    }.observes(
        ".hasFocus", // Open whenever we have the focus
        ".contentHeight", // Resize if visible and content changes height
        ".contentView.display.toolbar.pin.isSelected" // Open/close on pin
    ),

    /**
     * We can't know where the focus is going to (willLoseKeyResponderTo only
     * reports when the destination focus is a sproutcore component that will
     * accept keyboard input - we sometimes lose focus to elements that do not
     * take input)
     */
    checkfocus: function(source, event) {
        var focus = source[event];
        if (focus) {
            // Make sure that something isn't going to undo the hasFocus=true
            this._cancelBlur();
            this.set("hasFocus", true);
        } else {
            // The current element has lost focus, but does that mean that the
            // whole CliInputView has lost focus? We delay setting hasFocus to
            // false to see if anything grabs the focus

            // It would be bizarre to lose focus twice in 200ms, but not
            // impossible. Cancel the first if it does.
            this._cancelBlur();

            // We rely on something canceling this if we're not to lose focus
            this._blurTimeout = window.setTimeout(function() {
                this.set("hasFocus", false);
            }.bind(this), 200);
        }

        // This list of things to observe should include all the views that can
        // be KeyResponders. hmmm
    }.observes(".contentView.input.isKeyResponder"),

    /**
     * We have reason to believe that a blur event shouldn't happen
     */
    _cancelBlur: function() {
        if (this._blurTimeout) {
            window.clearTimeout(this._blurTimeout);
            this._blurTimeout = null;
        }
    },

    /**
     * There's no good reason for having this contentView - the childViews could
     * be directly on CliInputView, except that the observes() on focusChanged
     * is borked without it.
     * TODO: Work out what the borkage is about and fix
     */
    contentView: SC.View.design({
        childViews: [ "display", "prompt", "input", "submit" ],

        display: SC.View.design({
            layout: { top: 0, bottom: 25, left: 0, right: 0 },
            childViews: [ "output", "toolbar" ],

            output: SC.View.design({
                classNames: [ "command_view" ],
                layout: { top: 0, bottom: 0, left: 30, right: 0 }
            }),

            toolbar: SC.View.design({
                layout: { top: 0, bottom: 0, left: 0, width: 30 },
                childViews: [ "pin" ],

                pin: pin.PinView.design({
                    alt: "Pin/Unpin the console output",
                    layout: { top: 8, height: 16, left: 8, width: 16 }
                })
            })
        }),

        prompt: image.BespinButtonView.design({
            classNames: [ "command_prompt" ],
            titleMinWidth: 0,
            title: "<span class='command_brackets'>{ }</span> &gt;",
            layout: { height: 25, bottom: 0, left: 5, width: 40 }
        }),

        input: SC.TextFieldView.design({
            valueBinding: "CommandLine:command#cliController.input",
            layout: { height: 25, bottom: 3, left: 40, right: 0 }
        }),

        submit: image.BespinButtonView.design({
            isDefault: true,
            title: "Exec",
            target: "CommandLine:command#cliController",
            action: "exec",
            layout: { height: 25, bottom: 0, width: 80, right: 0 }
        })
    })
});

/**
 * Convert the history of instructions stored in commandMod.history into a DOM
 * node that can be appended to the document somewhere.
 */
exports.outputHistory = function() {
    var table = document.createElement("table");
    table.className = 'command_table';

    var count = 1;
    commandMod.cliController.history.instructions.forEach(function(instruction) {
        if (!instruction.historical) {
            exports.outputInstruction(table, instruction, count);
        }
        count ++;
    });

    return table;
};

/**
 * Convert a single Instruction into DOM nodes that can be appended to a table
 * in which other instructions are stored.
 */
exports.outputInstruction = function(table, instruction, count) {
    var mode = settings.values.historytimemode;

    // The row for the input (i.e. what was typed)
    var rowin = document.createElement("tr");
    rowin.className = 'command_rowin';
    rowin.onclick = function() {
        // A single click on an instruction line in the console
        // copies the command to the command line
        commandMod.cliController.input = instruction.typed;
    };
    rowin.ondblclick = function() {
        // A double click on an instruction line in the console
        // executes the command
        commandMod.executeCommand(instruction.typed);
    };
    table.appendChild(rowin);

    // The opening column with time or history number or nothing
    var rowid = document.createElement("td");
    rowid.className = "command_open";
    rowin.appendChild(rowid);

    if (mode == "history") {
        rowid.innerHTML = count;
        rowid.className = "command_open_history";
    }
    else if (mode == "time" && instruction.start) {
        rowid.innerHTML = formatTime(instruction.start);
        rowid.className = "command_open_time";
    }
    else {
        rowid.className = "command_open_blank";
    }

    // Cell for the typed command and the hover
    var typed = document.createElement("td");
    typed.className = "command_main";
    rowin.appendChild(typed);

    // The execution time
    var hover = document.createElement("div");
    hover.className = "command_hover";
    typed.appendChild(hover);

    // The execution time
    if (instruction.start && instruction.end) {
        var div = document.createElement("div");
        div.className = "command_duration";
        div.innerHTML = "completed in " + ((instruction.end.getTime() - instruction.start.getTime()) / 1000) + " sec ";
        hover.appendChild(div);
    }

    // Toggle output display
    var img = document.createElement("img");
    img.src = baseUrl + (instruction.hideOutput ? "plus.png" : "minus.png");
    img.style.verticalAlign = "middle";
    img.style.padding = "2px;";
    img.alt = instruction.hideOutput ? "Show command output" : "Hide command output";
    img.title = img.alt;
    img.onclick = function(ev) {
        instruction.hideOutput = !instruction.hideOutput;
        commandMod.cliController.history.update();
        util.stopEvent(ev);
    };
    hover.appendChild(img);

    // Open/close output
    img = document.createElement("img");
    img.src = baseUrl + "closer.png";
    img.style.verticalAlign = "middle";
    img.style.padding = "2px";
    img.alt = "Remove this command from the history";
    img.title = img.alt;
    img.onclick = function(ev) {
        commandMod.cliController.history.remove(instruction);
        commandMod.cliController.history.update();
        util.stopEvent(ev);
    };
    hover.appendChild(img);

    // What the user actually typed
    var prompt = document.createElement("span");
    prompt.className = "command_prompt";
    prompt.innerHTML = ">";
    typed.appendChild(prompt);

    var span = document.createElement("span");
    span.innerHTML = instruction.typed;
    span.className = "command_typed";
    typed.appendChild(span);

    // The row for the output (if required)
    if (!instruction.hideOutput) {

        var rowout = document.createElement("tr");
        rowout.className = "command_rowout";
        table.appendChild(rowout);

        rowout.appendChild(document.createElement("td"));

        var td = document.createElement("td");
        td.colSpan = 2;
        td.className = "command_output" + (instruction.error ? " command_error" : "");
        rowout.appendChild(td);

        if (instruction.element) {
            td.appendChild(instruction.element);
        } else {
            var contents = instruction.output || "";
            if (!instruction.completed) {
                contents += "<img src='" + baseUrl + "throbber.gif'/> Working ...";
            }
            td.innerHTML = contents;
        }
    }
};
