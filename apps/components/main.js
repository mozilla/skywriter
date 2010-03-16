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

"export package main";

var SC = require('sproutcore/runtime').SC;
var TextInput = require('bespin:editor/mixins/textinput').TextInput;
var catalog = require('bespin:plugins').catalog;

var run = function() {
    var CanvasView = require('Editor:views/canvas').CanvasView;

    var app = SC.Application.create({ NAMESPACE: "bespin" });
    app.set('mainPage', SC.Page.create({
            mainPane: SC.MainPane.design({
                layout: { centerX: 0, centerY: 0, width: 640, height: 480 },
                childViews: 'sampleInputView'.w(),
                sampleInputView: CanvasView.design(TextInput, {
                    _actionText: "[Click the view to focus is.]",
                    _writtenText: "",

                    _write: function(action, insertText) {
                        this.set('_actionText', action);
                        this.set('_writtenText', this._writtenText +
                            insertText);
                    },

                    _update: function() {
                        this.setNeedsDisplay();
                    }.observes('_actionText', '_writtenText'),

                    /*
                    TODO: These 2 functions duplicated the ones below. We should
                    make sure that these are the correct 2 to delete
                    copy: function() {
                        this._write("copy");
                    },

                    cut: function() {
                        this._write("cut");
                    },
                    */

                    drawRect: function(context) {
                        context.fillStyle = "#0000ff";
                        context.fillRect(0, 0, 640, 480);

                        context.fillStyle = "#ffffff";
                        context.font = "20pt Helvetica, Arial, sans-serif";
                        context.fillText("Action: " + this._actionText, 16,
                            32);

                        context.fillStyle = "#ffffff";
                        context.font = "20pt Helvetica, Arial, sans-serif";
                        context.fillText("Written: " + this._writtenText, 16,
                            65);

                        // Cursor
                        var width = context.measureText("Written: " +
                            this._writtenText).width;
                        context.fillStyle = this.get('isFirstResponder') ?
                            "white" : "gray";
                        context.fillRect(width + 18, 44, 2, 25);
                    },

                    layout: { top: 0, left: 0, width: 640, height: 480 },

                    keyDown: function(ev) {
                        if (ev.keyCode == 8) {
                            this.set('_writtenText',
                                this._writtenText.substring(0,
                                this._writtenText.length - 1));
                            this.set('_actionText', "backspace");
                            return YES;
                        }
                        return false;
                    },

                    // ---
                    // The following functions are called from the TextInput
                    // mixin.

                    copy: function() {
                        this.set('_actionText', "copy: '" +
                            this.get('_writtenText') + "'");
                        return this.get('_writtenText');
                    },

                    cut: function() {
                        var _writtenTextTemp = this.get('_writtenText');
                        this.set('_actionText', "cut: '" +
                            this.get('_writtenText') + "'");
                        this.set('_writtenText', '');
                        return _writtenTextTemp;
                    },

                    textInserted: function(text) {
                        this._write("inserted '" + text + "'",
                            text.replace('\n','\\n'));
                    }
                })
            })
        }));

    app.get('mainPage').get('mainPane').append();
};

main = function() {
    // TODO: var? should this be global?
    baseurl = window.SERVER_BASE_URL === undefined ? "/server" :
        SERVER_BASE_URL;

    // TODO: I can only assume that we should delete this (maybe the whole file
    // because loadMetadata uses a promise, not a callback now) ???
    var metadataUrl = baseurl + "/plugin/register/defaults";
    catalog.loadMetadata(metadataUrl).then(function(sender, response) {
        if (response.isError) {
            throw new Error("failed to load plugin metadata: " +
                response.errorObject);
        }

        tiki.async('Editor').then(run);
    });
};

