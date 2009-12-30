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
var Canvas = require('bespin:editor/mixins/canvas').Canvas;
var TextInput = require('bespin:editor/mixins/textinput').TextInput;

main = function() {
    var app = SC.Application.create({ NAMESPACE: "bespin" });
    app.set('mainPage', SC.Page.create({
            mainPane: SC.MainPane.design({
                layout: { centerX: 0, centerY: 0, width: 640, height: 480 },
                childViews: 'sampleInputView'.w(),
                sampleInputView: SC.View.design(Canvas, TextInput, {
                    _actionText: "[Click the view to focus is.]",
                    _writtenText: "",

                    _write: function(action, insertText) {
                        this.set('_actionText', action);
                        this.set('_writtenText', this._writtenText + insertText);
                    },

                    _update: function() {
                        this.set('layerNeedsUpdate', true);
                    }.observes('_actionText', '_writtenText'),

                    copy: function() {
                        this._write("copy");
                    },

                    cut: function() {
                        this._write("cut");
                    },

                    didCreateLayer: function() {
                        this.attachTextInputEvents();
                    },

                    drawRect: function(context) {
                        context.fillStyle = "#0000ff";
                        context.fillRect(0, 0, 640, 480);

                        context.fillStyle = "#ffffff";
                        context.font = "20pt Helvetica, Arial, sans-serif";
                        context.fillText("Action: " + this._actionText, 16, 32);

                        context.fillStyle = "#ffffff";
                        context.font = "20pt Helvetica, Arial, sans-serif";
                        context.fillText("Written: " + this._writtenText, 16, 65);

                        // Cursor
                        var width = context.measureText("Written: " + this._writtenText).width;
                        context.fillStyle = this.get('isFirstResponder') ? "white" : "gray";
                        context.fillRect(width + 18, 44, 2, 25);
                    },

                    layout: { top: 0, left: 0, width: 640, height: 480 },

                    mouseDown: function(evt) {
                        // SproutCore won't focus a canvas automatically.
                        this.get('pane').makeFirstResponder(this);
                    },

                    textInserted: function(text) {
                        this._write("inserted '" + text + "'", text.replace('\n','\\n'));
                    },

                    keyDown: function(ev) {
                        if (ev.keyCode == 8) {
                            this.set('_writtenText', this._writtenText.substring(0, this._writtenText.length - 1));
                            this.set('_actionText', "backspace");
                            return YES;
                        }
                        return false;
                    }
                })
            })
        }));

    app.get('mainPage').get('mainPane').append();
};

