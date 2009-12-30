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

var SC = require('sproutcore/runtime').SC;

/**
 * @namespace
 *
 * This mixin delivers text input events similar to those defined in the DOM
 * Level 3 specification. It allows views to support internationalized text
 * input via non-US keyboards, dead keys, and/or IMEs. It also provides support
 * for copy and paste. Currently, an invisible contentEditable div is used, but
 * in the future this module should use DOM 3 TextInput events directly where
 * available.
 *
 * To use this mixin, derive from it and implement the functions (don't have to)
 *   - copy: function() { return "text for clipboard" }
 *   - cut: function() { "Cut some text"; return "text for clipboard"}
 *   - textInserted: function(newInsertedText) { "handle new inserted text"; }
 * Note: Pasted text is provied through the textInserted(pastedText) function.
 *
 * Make sure to call the superclass implementation if you override any of the
 * following functions:
 *   - render(context, firstTime)
 *   - didCreateLayer()
 *   - mouseDown(event)
 *   - willBecomeKeyResponderFrom(responder)
 *   - willLoseKeyResponderTo(responder)
 */
exports.TextInput = {
    _TextInput_composing: false,
    _TextInput_ignore: false,

    // Keyevents and copy/cut/paste are not the same on Safari and Chrome.
    _isChrome: !!parseFloat(navigator.userAgent.split("Chrome/")[1]),

    _TextInput_getTextField: function() {
        return this.$("textarea")[0];
    },

    // This function doesn't work on WebKit! The textContent comes out empty...
    _TextInput_textFieldChanged: function() {
        if (this._TextInput_composing || this._TextInput_ignore) {
            return;
        }

        var textField = this._TextInput_getTextField();
        var text = textField.value;
        // On FF textFieldChanged is called sometimes although nothing changed.
        // -> don't call textInserted() in such a case.
        if (text == '') {
            return;
        }
        textField.value = "";

        this._TextInput_textInserted(text);
    },

    _TextInput_copy: function() {
        var copyData = false;
        if (this.respondsTo('copy')) {
            SC.RunLoop.begin();
            copyData = this.copy();
            SC.RunLoop.end();
        }
        return copyData;
    },

    _TextInput_cut: function() {
        var cutData = false;
        if (this.respondsTo('cut')) {
            SC.RunLoop.begin();
            cutData = this.cut();
            SC.RunLoop.end();
        }
        return cutData;
    },

    _TextInput_textInserted: function(text) {
        if (this.respondsTo('textInserted')) {
            SC.RunLoop.begin();
            this.textInserted(text);
            SC.RunLoop.end();
        }
    },

    _TextInput_setValueAndSelect: function(text) {
        var textField = this._TextInput_getTextField();
        textField.value = text;
        textField.select();
    },

    /**
     * Gives focus to the field editor so that input events will be
     * delivered to the view. If you override willBecomeKeyResponderFrom(),
     * you should call this function in your implementation.
     */
    focusTextInput: function() {
        this._TextInput_getTextField().focus();
    },

    /**
     * Removes focus from the invisible text input so that input events are no
     * longer delivered to this view. If you override willLoseKeyResponderTo(),
     * you should call this function in your implementation.
     */
    unfocusTextInput: function() {
        this._TextInput_getTextField().blur();
    },

    /**
     * If you override this method, you should call that function as well.
     */
    render: function(context, firstTime) {
        arguments.callee.base.apply(this, arguments);

        if (firstTime) {
            // Add a textarea to handle focus, copy & paste and key input
            // within the current view and hide it under the view.
            var layerFrame = this.get('layerFrame');
            var textFieldContext = context.begin("textarea");
            textFieldContext.attr("style", ("position: absolute; " +
                "z-index: -99999; top: 0px; left: 0px; width: %@px; " +
                "height: %@px").fmt(layerFrame.width, layerFrame.height));
            textFieldContext.end();
        }
    },

    /**
     * Attaches notification listeners to the text field so that your view will
     * be notified of events. If you override this method, you should call
     * that function as well.
     */
    didCreateLayer: function() {
        arguments.callee.base.apply(this, arguments);

        var textField = this._TextInput_getTextField();
        var thisTextInput = this;

        // No way that I can see around this ugly browser sniffing, without
        // more complicated hacks. No browsers have a complete enough
        // implementation of DOM 3 events at the current time (12/2009). --pcw
        if (SC.browser.safari) {    // Chrome too
            // On Chrome the compositionend event is fired as well as the
            // textInput event, but only one of them has to be handled.
            if (!this._isChrome) {
                textField.addEventListener('compositionend', function(evt) {
                    thisTextInput._TextInput_textInserted(evt.data);
                }, false);
            }
            textField.addEventListener('textInput', function(evt) {
                thisTextInput._TextInput_textInserted(evt.data);
            }, false);
            textField.addEventListener('paste', function(evt) {
                thisTextInput._TextInput_textInserted(evt.clipboardData.
                    getData('text/plain'));
            }, false);
        } else {
            var textFieldChangedFn = function(evt) {
                thisTextInput._TextInput_textFieldChanged();
            };
            textField.addEventListener('keypress', textFieldChangedFn, false);
            textField.addEventListener('keyup', textFieldChangedFn, false);

            textField.addEventListener('compositionstart', function(evt) {
                thisTextInput._TextInput_composing = true;
            }, false);
            textField.addEventListener('compositionend', function(evt) {
                thisTextInput._TextInput_composing = false;
                thisTextInput._TextInput_textFieldChanged();
            }, false);

            textField.addEventListener('paste', function(evt) {
                // FIXME: This is ugly and could result in extraneous text
                // being included as part of the text if extra DOMNodeInserted
                // or DOMCharacterDataModified events happen to be in the queue
                // when this function runs. But until Fx supports TextInput
                // events, there's nothing better we can do.

                // Waits till the paste content is pasted to the textarea.
                // Sometimes a delay of 0 is too short for Fx. In such a case
                // the keyUp events occur a little bit later and the pasted
                // content is detected there.
                thisTextInput._TextInput_setValueAndSelect('');
                window.setTimeout(function() {
                    thisTextInput._TextInput_textFieldChanged();
                }, 0);
            }, false);
        }

        // Here comes the code for copy and cut...

        // This is the basic copy and cut function. Depending on the
        // OS and browser this function needs to be extended.
        var copyCutBaseFn = function(evt) {
            // Get the data that should be copied/cutted.
            var copyCutData = evt.type.indexOf('copy') != -1 ?
                            thisTextInput._TextInput_copy() :
                            thisTextInput._TextInput_cut();
            // Set the textField's value equal to the copyCutData.
            // After this function is called, the real copy or cut
            // event takes place and the selected text in the
            // textField is pushed to the OS's clipboard.
            thisTextInput._TextInput_setValueAndSelect('');
        };

        // For all browsers that are not Safari running on Mac.
        if (!(SC.browser.isSafari && !this._isChrome && SC.browser.isMac)) {
            var copyCutMozillaFn = false;
            if (SC.browser.isMozilla) {
                // If the browser is Mozilla like, the copyCut function has to
                // be extended.
                copyCutMozillaFn = function(evt) {
                    // Call the basic copyCut function.
                    copyCutBaseFn(evt);

                    // On Firefox you have to ignore the textarea's content
                    // until it's copied / cutted. Otherwise the value of the
                    // textarea is inserted again.
                    if (SC.browser.isMozilla) {
                        thisTextInput._TextInput_ignore = true;
                        window.setTimeout(function() {
                            thisTextInput._TextInput_setValueAndSelect('');
                            thisTextInput._TextInput_ignore = false;
                        }, 0);
                    }
                };
            }
            textField.addEventListener('copy', copyCutMozillaFn ||
                copyCutBaseFn, false);
            textField.addEventListener('cut',  copyCutMozillaFn ||
                copyCutBaseFn, false);
         } else {
            // For Safari on Mac (only!) the copy and cut event only occurs if
            // you have some text selected. Fortunately, the beforecopy and
            // beforecut event occurs before the copy or cut event does so we
            // can put the to be copied or cutted text in the textarea.

            // Also, the cut event is fired twice. If it's fired twice within a
            // certain time period, the second call will be skipped.
            var lastCutCall = new Date().getTime();
            var copyCutSafariMacFn = function(evt) {
                var doCut = evt.type.indexOf('cut') != -1;
                if (doCut && new Date().getTime() - lastCutCall < 10) {
                    return;
                }

                // Call the basic copyCut function.
                copyCutBaseFn(evt);

                if (doCut) {
                    lastCutCall = new Date().getTime();
                }
            };

            textField.addEventListener('beforecopy', copyCutSafariMacFn,
                false);
            textField.addEventListener('beforecut',  copyCutSafariMacFn,
                false);
        }

        // Clicking the address bar causes a blur, but SproutCore won't notice
        // unless we tell it explicitly.
        textField.addEventListener('blur', function(evt) {
            thisTextInput.resignFirstResponder();
        }, false);
    },

    /**
     * The default implementation of this event sets the focus. If you
     * override this method, you should call that function as well.
     */
    mouseDown: function(evt) {
        arguments.callee.base.apply(this, arguments);
        this.get('pane').makeFirstResponder(this);
    },

    /**
     * The default implementation of this event calls focusTextarea(). If you
     * override this method, you should call that function as well.
     */
    willBecomeKeyResponderFrom: function(responder) {
        arguments.callee.base.apply(this, arguments);
        this.focusTextInput();
    },

    /**
     * The default implementation of this event calls unfocusTextarea(). If you
     * override this method, you should call that function as well.
     */
    willLoseKeyResponderTo: function(responder) {
        arguments.callee.base.apply(this, arguments);
        this.unfocusTextInput();
    }
};

