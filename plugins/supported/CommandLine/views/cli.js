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

var SC = require("sproutcore/runtime").SC;
var util = require("bespin:util/util");
var BespinButtonView = require("views/image_button").BespinButtonView;
var PinView = require("views/pin").PinView;

var catalog = require("bespin:plugins").catalog;
var dock = require("bespin:views/dock");
var cliController = require("controller").cliController;

var settings = catalog.getObject("settings");
var imagePath = catalog.getResourceURL("CommandLine") + "images/";

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
    table: null,

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
        this.set("table", table);

        // Update the output layer just by hacking the DOM
        var ele = this.getPath("contentView.display.output.layer");
        ele.innerHTML = "";
        ele.appendChild(table);
        this.set("contentHeight", table.clientHeight);
    }.observes("CommandLine:controller#cliController.history.version"),

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

        if (this.get("layout").height != height) {
            this.adjust("height", height).updateLayout();
        }

        // Scroll to bottom
        // TODO: Work out a way to skip this in a variety of cases like:
        // - the updated instruction is not the last one
        // - the user has asked for no scroll on update (would they do this?
        //   it's not like we've got the same input at end of output
        //   constraints)
        // - The update comes from an instruction minimize/remove
        var ele = this.getPath("contentView.display.output.layer");
        var scrollHeight = Math.max(ele.scrollHeight, ele.clientHeight);
        ele.scrollTop = scrollHeight - ele.clientHeight;
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
        // We don't want old blurs to happen whatever
        this._cancelBlur("focus event");

        var focus = source[event];
        if (focus) {
            // Make sure that something isn't going to undo the hasFocus=true
            this.set("hasFocus", true);
        } else {
            // The current element has lost focus, but does that mean that the
            // whole CliInputView has lost focus? We delay setting hasFocus to
            // false to see if anything grabs the focus

            // We rely on something canceling this if we're not to lose focus
            this._blurTimeout = window.setTimeout(function() {
                //console.log("_blurTimeout", arguments);
                this.set("hasFocus", false);
            }.bind(this), 200);
        }

        // This list of things to observe should include all the views that can
        // be KeyResponders. hmmm
    }.observes(".contentView.input.isKeyResponder"),

    /**
     * We have reason to believe that a blur event shouldn't happen
     * @param {String} reason For debugging we (where we can) declare why we
     * are cancelling the blur action
     */
    _cancelBlur: function(reason) {
        // console.log("_cancelBlur", arguments);
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

                pin: PinView.design({
                    alt: "Pin/Unpin the console output",
                    layout: { top: 8, height: 16, left: 8, width: 16 }
                })
            })
        }),

        prompt: BespinButtonView.design({
            classNames: [ "command_prompt" ],
            titleMinWidth: 0,
            title: "<span class='command_brackets'>{ }</span> &gt;",
            layout: { height: 25, bottom: 0, left: 5, width: 40 }
        }),

        input: SC.TextFieldView.design({
            valueBinding: "CommandLine:controller#cliController.input",
            layout: { height: 25, bottom: 3, left: 40, right: 0 }
        }),

        submit: BespinButtonView.design({
            isDefault: true,
            title: "Exec",
            target: "CommandLine:controller#cliController",
            action: "exec",
            layout: { height: 25, bottom: 0, width: 80, right: 0 }
        })
    })
});

/**
 * Convert the history of instructions stored in command.history into a DOM
 * node that can be appended to the document somewhere.
 */
exports.outputHistory = function() {
    var table = document.createElement("table");
    table.className = 'command_table';

    var count = 1;
    cliController.history.instructions.forEach(function(instruction) {
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
        cliController.input = instruction.typed;
    };
    rowin.ondblclick = function() {
        // A double click on an instruction line in the console
        // executes the command
        cliController.executeCommand(instruction.typed);
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
        var time = instruction.end.getTime() - instruction.start.getTime();
        div.innerHTML = "completed in " + (time / 1000) + " sec ";
        hover.appendChild(div);
    }

    // Toggle output display
    var img = document.createElement("img");
    img.src = imagePath + (instruction.hideOutput ? "plus.png" : "minus.png");
    img.style.verticalAlign = "middle";
    img.style.padding = "2px;";
    img.alt = (instruction.hideOutput ? "Show" : "Hide") + " command output";
    img.title = img.alt;
    img.onclick = function(ev) {
        instruction.hideOutput = !instruction.hideOutput;
        cliController.history.update();
        util.stopEvent(ev);
    };
    hover.appendChild(img);

    // Open/close output
    img = document.createElement("img");
    img.src = imagePath + "closer.png";
    img.style.verticalAlign = "middle";
    img.style.padding = "2px";
    img.alt = "Remove this command from the history";
    img.title = img.alt;
    img.onclick = function(ev) {
        cliController.history.remove(instruction);
        cliController.history.update();
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
        td.className = "command_output";
        td.className += instruction.error ? " command_error" : "";
        rowout.appendChild(td);

        if (instruction.element) {
            td.appendChild(instruction.element);
        } else {
            var contents = instruction.output || "";
            if (!instruction.completed) {
                contents += "<img src='" + imagePath + "throbber.gif'/>";
                contents += " Working ...";
            }
            td.innerHTML = contents;
        }
    }
};

/**
 * Quick utility to format the elapsed time for display as hh:mm:ss
 */
var formatTime = function(date) {
    var mins = "0" + date.getMinutes();
    if (mins.length > 2) {
        mins = mins.slice(mins.length - 2);
    }
    var secs = "0" + date.getSeconds();
    if (secs.length > 2) {
        secs = secs.slice(secs.length - 2);
    }
    return date.getHours() + ":" + mins + ":" + secs;
};
