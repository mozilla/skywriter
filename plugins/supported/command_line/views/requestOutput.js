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

var util = require('bespin:util/util');
var catalog = require('bespin:plugins').catalog;
var console = require('bespin:console').console;

var env = require('environment').env;

var templates = require('command_line:templates');

var imagePath = catalog.getResourceURL('command_line') + 'images';

/**
 * Adds a row to the CLI output display
 */
exports.RequestOutput = function(request, cliInputView) {
    this.request = request;
    this.cliInputView = cliInputView;

    // Elements attached to this by the templater. For info only
    this.rowin = null;
    this.rowout = null;
    this.output = null;
    this.hide = null;
    this.show = null;
    this.duration = null;
    this.typed = null;
    this.throb = null;

    templates.requestOutput({
        actions: this,
        imagePath: imagePath
    });

    this.cliInputView._table.appendChild(this.rowin);
    this.cliInputView._table.appendChild(this.rowout);

    this.request.changed.add(this.onRequestChange.bind(this));
};

exports.RequestOutput.prototype = {
    /**
     * A single click on an invocation line in the console copies the command to
     * the command line
     */
    copyToInput: function() {
        this.cliInputView.setInput(this.request.typed);
    },

    /**
     * A double click on an invocation line in the console executes the command
     */
    executeRequest: function(ev) {
        // TODO: This is a hack... how to do it right?
        env.commandLine = this.cliInputView;
        this.cliInputView._input = new Input(this.request.typed);
        this.cliInputView._input.execute();
    },

    hideOutput: function(ev) {
        this.output.style.display = 'none';
        util.addClass(this.hide, 'cmd_hidden');
        util.removeClass(this.show, 'cmd_hidden');

        ev.stopPropagation();
    },

    showOutput: function(ev) {
        this.output.style.display = 'block';
        util.removeClass(this.hide, 'cmd_hidden');
        util.addClass(this.show, 'cmd_hidden');

        ev.stopPropagation();
    },

    remove: function(ev) {
        this.cliInputView._table.removeChild(this.rowin);
        this.cliInputView._table.removeChild(this.rowout);
        ev.stopPropagation();
    },

    onRequestChange: function(ev) {
        this.duration.innerHTML = this.request.duration ?
            'completed in ' + (this.request.duration / 1000) + ' sec ' :
            '';

        this.typed.innerHTML = this.request.typed;

        this.output.innerHTML = '';
        this.request.outputs.forEach(function(output) {
            var node;
            if (typeof output == 'string') {
                node = document.createElement('p');
                node.innerHTML = output;
            } else {
                node = output;
            }
            this.output.appendChild(node);
        }, this);
        this.cliInputView.scrollToBottom();

        util.setClass(this.output, 'cmd_error', this.request.error);

        this.throb.style.display = this.request.completed ? 'none' : 'block';
    }
};

/**
 * Return an object which you can call (via a pointer member) to create a
 * RequestOutput.
 * This is designed for use with catalog.registerExtension as follows:
 * <pre>
 * var requestOutputHandler = requestOutput.createHandler(this);
 * catalog.registerExtension('addedRequestOutput', requestOutputHandler);
 * </pre>
 */
exports.createHandler = function(cliInputView) {
    return {
        pointer: function(source, key, request) {
            new exports.RequestOutput(request, cliInputView);
        }
    };
};
