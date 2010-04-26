/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an 'AS IS' basis,
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

var SC = require('sproutcore/runtime').SC;
var Trait = require('traits').Trait;
var diff_match_patch = require('diff').diff_match_patch;

var util = require('bespin:util/util');
var catalog = require('bespin:plugins').catalog;
var console = require('bespin:console').console;

var request = require('canon:request');
var keyboardManager = require('canon:keyboard').keyboardManager;
var environment = require('canon:environment').global;
var settings = require('settings').settings;

var cliController = require('command_line:controller').cliController;
var Level = require('command_line:hint').Level;
var Input = require('command_line:input').Input;

var imagePath = catalog.getResourceURL('command_line') + 'images/';
var diff = new diff_match_patch();

/**
 * The height of the input area that is always visible.
 */
var inputHeight = 25;

/**
 * A view designed to dock in the bottom of the editor, holding the command
 * line input.
 */
exports.CliInputView = SC.View.design({
    classNames: [ 'cmd_line' ],
    layout: { height: 300, bottom: 0, left: 0, right: 0 },
    hasFocus: false,

    /**
     * Are we currently pinned?
     */
    _pinned: undefined,

    /**
     * The DOM table of output elements
     */
    _table: undefined,

    /**
     * The DOM element that displays the current completion
     */
    _completer: undefined,

    /**
     * The input field
     */
    _inputer: undefined,

    /**
     * The parsed version of the input. A command_line:input.
     */
    _input: undefined,

    /**
     * Setup the UI
     */
    didCreateLayer: function() {
        this._pinned = false;

        var layer = this.get('layer');

        // We need to know if blur events from the input really matter (i.e. are
        // they going to the editor or another view, or just to another part of
        // this view) so we listen for clicks in this view.
        // This allows us to cancel the effects of a blur
        this._boundCancelBlur = this._cancelBlur.bind(this);
        layer.addEventListener('click', this._boundCancelBlur, true);

        // A div to hang hints on
        this._ex = document.createElement('div');
        this._ex.className = 'cmd_ex';
        layer.appendChild(this._ex);

        // Used as something to hang styles off for input area
        var kbd = document.createElement('kbd');
        layer.appendChild(kbd);

        // CLI output table
        this._table = document.createElement('div');
        this._table.className = 'cmd_view';
        layer.appendChild(this._table);

        // Toolbar
        var toolbar = document.createElement('div');
        toolbar.className = 'cmd_toolbar';
        layer.appendChild(toolbar);

        // The pin/unpin button
        var pin = document.createElement('img');
        pin.src = 'images/pins.png';
        pin.alt = 'Pin/Unpin the console output';
        pin.onclick = function(ev) {
            this._pinned = !this._pinned;
            this.checkHeight();
        }.bind(this);
        toolbar.appendChild(pin);

        // The prompt
        var prompt = document.createElement('div');
        prompt.className = 'cmd_prompt';
        prompt.innerHTML = '<span class="cmd_brackets">{ }</span> &gt;';
        layer.appendChild(prompt);

        // Completion
        this._completer = document.createElement('div');
        this._completer.className = 'cmd_completion';
        layer.appendChild(this._completer);

        // The input field
        this._inputer = document.createElement('input');
        this._inputer.className = 'cmd_input';
        this._input = Input.create({ typed: '' });

        this._inputer.onkeydown = function(ev) {
            environment.set('commandLine', this);
            var handled = keyboardManager.processKeyEvent(ev, this, {
                isCommandLine: true, isKeyUp: false
            });

            if (ev.keyCode === 13) {
                cliController.executeCommand(this._input);
                this.setInput('');
            } else {
                var typed = this._inputer.value;
                if (this._input.typed !== typed) {
                    this._input = Input.create({ typed: typed });
                    this._input.argsPromise.then(hintUpdated.bind(this));
                }
            }
            return handled;
        }.bind(this);
        this._inputer.onkeyup = function(ev) {
            environment.set('commandLine', this);
            return keyboardManager.processKeyEvent(ev, this, {
                isCommandLine: true, isKeyUp: true
            });
        }.bind(this);
        // valueBinding: 'command_line:controller#cliController.input',
        layer.appendChild(this._inputer);

        this.checkHeight();
    },

    /**
     * Undo event registration from #didCreateLayer()
     */
    willDestroyLayer: function() {
        var layer = this.get('layer');
        layer.removeEventListener('click', this._boundCancelBlur, true);
    },

    /**
     * Called whenever anything happens that could affect the output display
     */
    checkHeight: function(source, event) {
        var height = settings.get('minConsoleHeight');
        if (this._pinned || this.get('hasFocus')) {
            height = settings.get('maxConsoleHeight');
        }
        height += inputHeight;

        if (this.get('layout').height != height) {
            this.adjust('height', height).updateLayout();
            //this.getPath('contentView.display.hint').updateLayout();
        }
    }.observes(
        '.hasFocus', // Open whenever we have the focus
        'settings:index#settings.maxConsoleHeight',
        'settings:index#settings.minConsoleHeight'
    ),

    /**
     * Apply the proposed completion
     */
    complete: function() {
        this._inputer.value = this._completer.value;
    },

    /**
     * Adjust the displayed input (but don't execute it)
     */
    setInput: function(command) {
        command = command || '';
        this._inputer.value = command;
        this._input = Input.create({ typed: command });
    },

    /**
     * Place a given value on the command line.
     * TODO: Perhaps we should store existing values that are on the command
     * line so that we can put them back when return is pressed?
     */
    prompt: function(command) {
        this._inputer.value = command;
    },

    /**
     * Sync the hint manually so we can also alter the sizes of the hint and
     * output components to make it fit properly.
     */
    hintUpdated: function() {
        var hints = cliController.get('hints');
        while (this._ex.firstChild) {
            this._ex.removeChild(this._ex.firstChild);
        }

        var level = Level.Info;
        this.setCompletion('');

        /**
         * Find a way to populate a DOM node with this hint
         */
        var addHint = function(hintNode, hint) {
            if (!hint) {
                return;
            }

            // Defer promises
            if (typeof hint.then == 'function') {
                hint.then(function(hint) {
                    addHint(hintNode, hint);
                }.bind(this));
                return;
            }

            if (hint.element && hint.element.addEventListener) {
                hintNode.appendChild(hint.element);
            } else {
                // Maybe we should do something clever with exceptions?
                // For now we just toString and call it done.
                var parent = document.createElement('article');
                var text = hint.element.toString();
                parent.appendChild(document.createTextNode(text));
                hintNode.appendChild(parent);
            }

            this.setCompletion(hint.completion);

            if (hint.level > level) {
                level = hint.level;
            }

            this.$().setClass('cmd_error', level == Level.Error);
        }.bind(this);

        hints.forEach(function(hint) {
            addHint(this._ex, hint);
        }.bind(this));

        this.$().setClass('cmd_error', level == Level.Error);
    },

    /**
     * Utility to update the CLI output table whenever some value changes
     */
    link: function(root, path, updater) {
        var doUpdate = function() {
            // console.log('updating', path, 'to', root.getPath(path));
            updater(root.getPath(path));
        };

        root.addObserver(path, this, doUpdate);
        doUpdate();
    },

    /**
     * Adds a row to the CLI output display
     */
    addRequest: function(requests) {
        // TODO: We should really replace the observation with some catalog
        // thing, so until we do that we have a huge hack where we assume that
        // we only add things to the command line, and we just add in the last
        var request = requests[requests.length - 1];

        request.set('hideOutput', false);

        // The div for the input (i.e. what was typed)
        var rowin = document.createElement('div');
        rowin.className = 'cmd_rowin';
        // A single click on an invocation line in the console
        // copies the command to the command line
        rowin.onclick = function() {
            cliController.input = request.get('typed');
        };
        // A double click on an invocation line in the console
        // executes the command
        rowin.ondblclick = function() {
            cliController.executeCommand(request.get('typed'));
        };
        this._table.appendChild(rowin);

        // The execution time
        var hover = document.createElement('div');
        hover.className = 'cmd_hover';
        rowin.appendChild(hover);

        var durationEle = document.createElement('span');
        durationEle.className = 'cmd_duration';
        hover.appendChild(durationEle);

        // Toggle output display
        var hideOutputEle = document.createElement('img');
        hideOutputEle.onclick = function() {
            request.set('hideOutput', !request.get('hideOutput'));
        };
        hideOutputEle.style.verticalAlign = 'middle';
        hideOutputEle.style.padding = '2px';
        hover.appendChild(hideOutputEle);

        // Open/close output
        var closeEle = document.createElement('img');
        closeEle.src = imagePath + 'closer.png';
        closeEle.alt = 'Remove this command from the history';
        closeEle.title = closeEle.alt;
        closeEle.onclick = function() {
            request.history.remove(request);
        };
        closeEle.style.verticalAlign = 'middle';
        closeEle.style.padding = '2px';
        hover.appendChild(closeEle);

        // Place to put a history marker
        var openEle = document.createElement('span');
        openEle.className = 'cmd_open';
        rowin.appendChild(openEle);

        // What the user actually typed
        var prompt = document.createElement('span');
        prompt.className = 'cmd_prompt';
        prompt.innerHTML = '&gt; ';
        rowin.appendChild(prompt);

        var typedEle = document.createElement('span');
        typedEle.className = 'cmd_typed';
        rowin.appendChild(typedEle);

        var rowout = document.createElement('div');
        rowout.className = 'cmd_rowout';
        this._table.appendChild(rowout);

        var outputEle = document.createElement('div');
        outputEle.className = 'cmd_output';
        rowout.appendChild(outputEle);

        var throbEle = document.createElement('img');
        throbEle.src = imagePath + 'throbber.gif';
        rowout.appendChild(throbEle);

        this.link(settings, 'historytimemode', function(mode) {
            if (mode == 'history') {
                // TODO: replace # with invocation id
                openEle.innerHTML = '#';
                openEle.className = 'cmd_open cmd_open_history';
            }
            else if (mode == 'time' && request.get('start')) {
                openEle.innerHTML = formatTime(request.get('start'));
                openEle.className = 'cmd_open cmd_open_time';
            }
            else {
                openEle.innerHTML = '';
                openEle.className = 'cmd_open cmd_open_blank';
            }
        });

        this.link(request, 'duration', function(duration) {
            durationEle.innerHTML = duration ?
                'completed in ' + (duration / 1000) + ' sec ' :
                '';
        });

        this.link(request, 'hideOutput', function(hideOutput) {
            if (hideOutput) {
                hideOutputEle.src = imagePath + 'plus.png';
                hideOutputEle.alt = 'Show command output';
                hideOutputEle.title = 'Show command output';
                outputEle.style.display = 'none';
            } else {
                hideOutputEle.src = imagePath + 'minus.png';
                hideOutputEle.alt = 'Hide command output';
                hideOutputEle.title = 'Hide command output';
                outputEle.style.display = 'block';
            }
        });

        this.link(request, 'typed', function(typed) {
            typedEle.innerHTML = typed;
        });

        this.link(request, 'outputs.[]', function(outputs) {
            outputEle.innerHTML = '';
            outputs.forEach(function(output) {
                var node;
                if (typeof output == 'string') {
                    node = document.createElement('p');
                    node.innerHTML = output;
                } else {
                    node = output;
                }
                outputEle.appendChild(node);
            });
        });

        this.link(request, 'error', function(error) {
            outputEle.className = 'cmd_output' + (error ? ' cmd_error' : '');
        });

        this.link(request, 'completed', function(completed) {
            throbEle.style.display = completed ? 'none' : 'block';
        });

        // TODO: Add scroll to bottom code back in here
    }.observes('canon:request#history.requests.[]'),

    /**
     * We can't know where the focus is going to (willLoseKeyResponderTo only
     * reports when the destination focus is a sproutcore component that will
     * accept keyboard input - we sometimes lose focus to elements that do not
     * take input)
     */
    checkfocus: function(source, event) {
        // We don't want old blurs to happen whatever
        this._cancelBlur('focus event');
        var self = this;

        var focus = source[event];
        if (focus) {
            // Make sure that something isn't going to undo the hasFocus=true
            this.set('hasFocus', true);
        } else {
            // The current element has lost focus, but does that mean that the
            // whole CliInputView has lost focus? We delay setting hasFocus to
            // false to see if anything grabs the focus

            // We rely on something canceling this if we're not to lose focus
            this._blurTimeout = window.setTimeout(function() {
                //console.log('_blurTimeout', arguments);
                SC.run(function() {
                    self.set('hasFocus', false);
                });
            }, 1);
        }

        // TODO: This list of things to observe should include all the views
        // that can be KeyResponders. hmmm
    }.observes('.isKeyResponder'),

    /**
     * We have reason to believe that a blur event shouldn't happen
     * @param {String} reason For debugging we (where we can) declare why we
     * are canceling the blur action
     */
    _cancelBlur: function(reason) {
        // console.log('_cancelBlur', arguments);
        if (this._blurTimeout) {
            window.clearTimeout(this._blurTimeout);
            this._blurTimeout = null;
        }
    },

    /**
     * Push the focus into the input element
     */
    focus: function() {
        this._inputer.focus();
    },

    /**
     * Positions the insertion point at the end of the input element.
     */
    replaceSelection: function(text) {
        var length = text.length;
        cliController.set('input', text);
        window.setTimeout(function() {
            this._inputer.setSelectionRange(length, length);
        }.bind(this), 0);
    },

    /**
     * Set the completion field including setting some styling to ensure that
     * everything displays properly.
     * @param completion {string} The full completion value
     */
    setCompletion: function(completion) {
        var current = this._inputer.value;
        var val;
        if (!completion) {
            val = '';
        } else if (completion.indexOf(current) === 0) {
            val = '<span class="cmd_existing">' + current +
                '</span>' + completion.substring(current.length);
        } else {
            var len = diff.diff_commonPrefix(current, completion);
            var extension = completion.substring(len);
            val = '<span class="cmd_existing">' + current + '</span>' +
                '<span class="cmd_extension">' + extension + '</span>';
        }
        this.set('value', val);
    }
});

/**
 * Quick utility to format the elapsed time for display as hh:mm:ss
 */
var formatTime = function(date) {
    var mins = '0' + date.getMinutes();
    if (mins.length > 2) {
        mins = mins.slice(mins.length - 2);
    }
    var secs = '0' + date.getSeconds();
    if (secs.length > 2) {
        secs = secs.slice(secs.length - 2);
    }
    return date.getHours() + ':' + mins + ':' + secs;
};
