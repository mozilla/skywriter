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
var catalog = require("bespin:plugins").catalog;
var console = require('bespin:console').console;
var dock = require("bespin:views/dock");

var request = require("Canon:request");
var keyboardManager = require('Canon:keyboard').keyboardManager;
var environment = require('Canon:environment').global;
var settings = require("Settings").settings;

var cliController = require("CommandLine:controller").cliController;
var Level = require("CommandLine:hint").Level;
var BespinButtonView = require("CommandLine:views/image_button").BespinButtonView;
var PinView = require("CommandLine:views/pin").PinView;

var imagePath = catalog.getResourceURL("CommandLine") + "images/";

/**
 * The height of the input area that is always visible.
 */
var inputHeight = 27;

/**
 * Utility to create an ID while end()ing RenderContext
 */
var endWithId = function(ele) {
    var id = SC.guidFor(ele);
    ele.id(id).end();
    return id;
};

/**
 * Display the results of a command invocation
 */
var InstructionView = SC.View.extend(SC.StaticLayout, {
    classNames: [ "instruction_view" ],
    useStaticLayout: true,

    link: function(root, path, updater) {
        (function() {
            var doUpdate = function() {
                // console.log("updating", path, "to", root.getPath(path));
                updater(root.getPath(path));
                // The stacked view gets confused about how tall it should be...
                var stack = this.getPath("parentView");
                stack.updateHeight();
            }.bind(this);

            root.addObserver(path, this, function() {
                doUpdate();
            });
            doUpdate();
        }).invokeLater(this);
    },

    render: function(context, firstTime) {
        if (firstTime) {
            var content = this.get("content");
            content.set("hideOutput", false);

            // The div for the input (i.e. what was typed)
            var rowin = context.begin("div").addClass("cmd_rowin").attr({
                onclick: function() {
                    // A single click on an invocation line in the console
                    // copies the command to the command line
                    cliController.input = content.get("typed");
                },
                ondblclick: function() {
                    // A double click on an invocation line in the console
                    // executes the command
                    cliController.executeCommand(content.get("typed"));
                }
            });

            // The execution time
            var hover = rowin.begin("div").addClass("cmd_hover");
            var durationEle = hover.begin("span").addClass("cmd_duration");
            var durationId = endWithId(durationEle);

            // Toggle output display
            var hideOutputEle = hover.begin("img").attr({
                onclick: function() {
                    content.set("hideOutput", !content.get("hideOutput"));
                }
            }).css({
                verticalAlign: "middle",
                padding: "2px;"
            });
            var hideOutputId = endWithId(hideOutputEle);

            // Open/close output
            var closeEle = hover.begin("img");
            closeEle.attr({
                src: imagePath + "closer.png",
                alt: "Remove this command from the history",
                title: "Remove this command from the history",
                onclick: function() {
                    request.history.remove(content);
                }
            });
            closeEle.css({
                verticalAlign: "middle",
                padding: "2px"
            });
            closeEle.end();

            hover.end();

            // Place to put a history marker
            var openEle = rowin.begin("span").addClass("cmd_open");
            var openId = endWithId(openEle);

            // What the user actually typed
            var prompt = rowin.begin("span")
                    .addClass("cmd_prompt")
                    .html("> ");
            prompt.end();

            var typedEle = rowin.begin("span").addClass("cmd_typed");
            var typedId = endWithId(typedEle);

            rowin.end();

            var rowout = context.begin("div").addClass("cmd_rowout");

            var outputEle = rowout.begin("div").addClass("cmd_output");
            var outputId = endWithId(outputEle);

            var throbEle = rowout.begin("img").attr({
                src: imagePath + "throbber.gif"
            });
            var throbId = endWithId(throbEle);

            rowout.end();

            this.link(settings, "historytimemode", function(mode) {
                if (mode == "history") {
                    // TODO: replace # with invocation id
                    SC.$("#" + openId).html("#").addClass("cmd_open_history");
                }
                // else if (mode == "time" && start) {
                //     SC.$("#" + openId).html(formatTime(start)).addClass("cmd_open_time");
                // }
                else {
                    SC.$("#" + openId).addClass("cmd_open_blank");
                }
            });

            this.link(content, "duration", function(duration) {
                if (duration) {
                    SC.$("#" + durationId).html("completed in " + (duration / 1000) + " sec ");
                } else {
                    SC.$("#" + durationId).html("");
                }
            });

            this.link(content, "hideOutput", function(hideOutput) {
                if (hideOutput) {
                    SC.$("#" + hideOutputId).attr({
                        src: imagePath + "plus.png",
                        alt: "Show command output",
                        title: "Show command output"
                    });
                    SC.$("#" + hideOutputId).attr("display", "none");
                } else {
                    SC.$("#" + hideOutputId).attr({
                        src: imagePath + "minus.png",
                        alt: "Hide command output",
                        title: "Hide command output"
                    });
                    SC.$("#" + outputId).attr("display", "block");
                }
            });

            this.link(content, "typed", function(typed) {
                SC.$("#" + typedId).html(typed);
            });

            this.link(content, "outputs.[]", function(outputs) {
                SC.$("#" + outputId).get(0).innerHTML = "";
                outputs.forEach(function(output) {
                    var node;
                    if (typeof output == "string") {
                        node = document.createElement("p");
                        node.innerHTML = output;
                    } else {
                        node = output;
                    }
                    SC.$("#" + outputId).append(node);
                });
            });

            this.link(content, "error", function(error) {
                if (error) {
                    SC.$("#" + outputId).addClass("cmd_error");
                } else {
                    SC.$("#" + outputId).removeClass("cmd_error");
                }
            });

            this.link(content, "completed", function(completed) {
                SC.$("#" + throbId).css({
                    "display": completed ? "none" : "block"
                });
            });
        }
    }
});

var hintClass = {};
hintClass[Level.Error] = "cmd_error";
hintClass[Level.Incomplete] = "cmd_incom";
hintClass[Level.Warning] = "cmd_warn";
hintClass[Level.Info] = "cmd_info";

/**
 * A view designed to dock in the bottom of the editor, holding the command
 * line input.
 * <p>
 * TODO: We need to generalize the way views attach to the editor, but now isn't
 * the right time to work on this. We're locked to the bottom.
 */
exports.CliInputView = SC.View.design({
    dock: dock.DOCK_BOTTOM,
    classNames: [ "cmd_line" ],
    layout: { height: 300, bottom: 0, left: 0, right: 0 },
    childViews: [ "contentView" ],
    hasFocus: false,
    table: null,
    _contentHeight: -1,
    _completion: null,

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

        var hint = this.getPath("contentView.display.output.layer");
        this._ex = document.createElement("div");
        this._ex.className = 'cmd_ex';
        hint.appendChild(this._ex);

        this.checkHeight();
    },

    /**
     * Undo event registration from #didCreateLayer()
     */
    willDestroyLayer: function() {
        var layer = this.get("layer");
        layer.removeEventListener("click", this._boundCancelBlur, true);
    },

    /**
     * Called whenever anything happens that could affect the output display
     */
    checkHeight: function(source, event) {
        var pinned = this.getPath("contentView.display.toolbar.pin.isSelected");

        var height = settings.get("minConsoleHeight");
        if (pinned || this.get("hasFocus")) {
            height = settings.get("maxConsoleHeight");
        }
        height += inputHeight;

        if (this.get("layout").height != height) {
            this.adjust("height", height).updateLayout();
            //this.getPath("contentView.display.hint").updateLayout();
        }
    }.observes(
        ".hasFocus", // Open whenever we have the focus
        ".contentView.display.toolbar.pin.isSelected", // Open/close on pin
        "Settings:index#settings.maxConsoleHeight",
        "Settings:index#settings.minConsoleHeight"
    ),

    /**
     * Apply the proposed completion
     */
    complete: function() {
        var completion = this.get("_completion");
        if (completion === undefined || completion === null) {
            return;
        }

        var current = cliController.get("input");
        cliController.set("input", current + completion);
    },

    /**
     * Adjust the displayed input (but don't execute it)
     */
    setInput: function(command) {
        command = command || "";
        cliController.set("input", command);
    },

    /**
     * Sync the hint manually so we can also alter the sizes of the hint and
     * output components to make it fit properly.
     */
    hintUpdated: function() {
        var hints = cliController.get("hints");
        var hintEle = this.getPath("contentView.display.hint.layer");
        while (this._ex.firstChild) {
            this._ex.removeChild(this._ex.firstChild);
        }

        var level = Level.Info;
        this.set("_completion", "");

        /**
         * Find a way to populate a DOM node with this hint
         */
        var addHint = function(hintNode, hint) {
            if (!hint) {
                return;
            }

            // Defer promises
            if (typeof hint.then == "function") {
                hint.then(function(hint) {
                    addHint(hintNode, hint);
                }.bind(this));
                return;
            }

            if (typeof hint.element === "string") {
                var parent = document.createElement("article");
                parent.appendChild(document.createTextNode(hint.element));
                hintNode.appendChild(parent);
            } else {
                hintNode.appendChild(hint.element);
            }

            // hintNode.setAttribute("class", "cmd_hint " + hintClass[hint.level]);

            if (hint.completion) {
                this.set("_completion", hint.completion);
            }

            if (hint.level > level) {
                level = hint.level;
            }

            this.$().setClass("error", level == Level.Error);
        }.bind(this);

        hints.forEach(function(hint) {
            /*
            var hintNode = document.createElement("span");
            this._ex.appendChild(hintNode);
            this._ex.appendChild(document.createTextNode(" \u00a0 "));
            addHint(hintNode, hint);
            */
            addHint(this._ex, hint);
        }.bind(this));

        this.$().setClass("error", level == Level.Error);
    }.observes("CommandLine:controller#cliController.hints.[]"),

    /**
     * Scrolls the command line output area to the bottom of the output.
     */
    scrollOutputToBottom: function() {
        var height = this.getPath("contentView.display.output.contentView.layout").height;
        if (height == this._contentHeight) {
            return;
        }

        this._contentHeight = height;
        var scrollview = this.getPath("contentView.display.output");
        scrollview.scrollBy({ x: 0, y: 1000000 });
    }.observes(".contentView.display.output.contentView.layout"),

    /**
     * We can't know where the focus is going to (willLoseKeyResponderTo only
     * reports when the destination focus is a sproutcore component that will
     * accept keyboard input - we sometimes lose focus to elements that do not
     * take input)
     */
    checkfocus: function(source, event) {
        // We don't want old blurs to happen whatever
        this._cancelBlur("focus event");
        var self = this;

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
                SC.run(function() {
                    self.set("hasFocus", false);
                });
            }, 1);
        }

        // This list of things to observe should include all the views that can
        // be KeyResponders. hmmm
    }.observes(".contentView.input.isKeyResponder"),

    /**
     * We have reason to believe that a blur event shouldn't happen
     * @param {String} reason For debugging we (where we can) declare why we
     * are canceling the blur action
     */
    _cancelBlur: function(reason) {
        // console.log("_cancelBlur", arguments);
        if (this._blurTimeout) {
            window.clearTimeout(this._blurTimeout);
            this._blurTimeout = null;
        }
    },

    /**
     * Push the focus into the input element
     */
    focus: function() {
        this.getPath("contentView.input").becomeFirstResponder();
    },

    /**
     * There's no good reason for having this contentView - the childViews could
     * be directly on CliInputView, except that the observes() on focusChanged
     * is borked without it.
     * TODO: Work out what the borkage is about and fix
     */
    contentView: SC.View.design({
        childViews: [ "kbd", "display", "prompt", "completion", "input" ],

        display: SC.View.design({
            layout: { top: 0, bottom: 25, left: 0, right: 0 },
            childViews: [ "output", "toolbar" ],

            output: SC.ScrollView.design({
                classNames: [ "cmd_view" ],
                layout: { top: 0, bottom: 0, left: 30, right: 0 },
                hasHorizontalScroller: NO,
                contentView: SC.StackedView.design({
                    contentBinding: "Canon:request#history.requests.[]",
                    exampleView: InstructionView
                })
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
            classNames: [ "cmd_prompt" ],
            titleMinWidth: 0,
            title: "<span class='cmd_brackets'>{ }</span> &gt;",
            layout: { height: 25, bottom: 0, left: 5, width: 40 }
        }),

        completion: SC.LabelView.design({
            classNames: [ "cmd_completion" ],
            escapeHTML: false,
            fontWeight: "bold",
            completionChanged: function() {
                var current = this.getPath("parentView.input.value");
                var extra = this.getPath("parentView.parentView._completion");
                this.set("value", "<span class='cmd_existing'>" + current +
                    "</span>" + extra);
            }.observes(".parentView.parentView._completion"),
            layout: { height: 25, bottom: 0, left: 45, right: 0 }
        }),

        kbd: SC.View.design({
            layout: { height: 25, bottom: 0, left: 0, right: 0 },
            tagName: "kbd"
        }),

        input: SC.TextFieldView.design({
            classNames: [ "cmd_input" ],
            valueBinding: "CommandLine:controller#cliController.input",
            layout: { height: 25, bottom: 3, left: 40, right: 0 },
            keyDown: function(ev) {
                // SC puts keyDown and keyPress event together. Here we only
                // want to handle the real/browser's keydown event. To do so,
                // we have to check if the evt.charCode value is set.
                // If this isn't set, we have been called after a keypress
                // event took place.
                if (ev.charCode === 0) {
                    var opt = { isCommandLine: true };
                    var cliInputView = this.getPath("parentView.parentView");
                    environment.set("commandLine", cliInputView);
                    var done = keyboardManager.processKeyEvent(ev, this, opt);
                    if (!done) {
                        return this.superclass(ev);
                    }
                } else {
                    // This is a real keyPress event. This should not be
                    // handled, otherwise the textInput mixin can't detect
                    // the key events.
                    return this.superclass(ev);
                }
            },
            keyUp: function(ev) {
                var opt = { isCommandLine: true, isKeyUp: true };
                var cliInputView = this.getPath("parentView.parentView");
                environment.set("commandLine", cliInputView);
                var done = keyboardManager.processKeyEvent(ev, this, opt);
                if (!done) {
                    return this.superclass(ev);
                }
            }
        })
    })
});

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
