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
 * To use this mixin, derive from it and call renderTextInput() in your
 * render() implementation and attachTextInputEvents() in your didCreateLayer()
 * implementation.
 *
 * TODO: Enable Cut and Copy menu items in Firefox and Safari. In Safari this
 * is especially important, since the browser's Cut and Copy won't work at all
 * otherwise.
 */
exports.TextInput = {
    _TextInput_composing: false,
    _TextInput_pasting: false,

    // Keyevents and copy/cut/paste are not the same on Safari and Chrome.
    _isChrome: !!parseFloat(navigator.userAgent.split("Chrome/")[1]),

    _TextInput_getTextField: function() {
        return this.$("textarea")[0];
    },

    _TextInput_refocusTextField: function() {
        if (this.get('isFirstResponder')) {
            this.resignFirstResponder();
        }
    },

    // This function doesn't work on WebKit! The textContent comes out empty...
    _TextInput_textFieldChanged: function() {
        if (this._TextInput_composing || this._TextInput_pasting) {
            return;
        }

        var textField = this._TextInput_getTextField();
        var text = textField.value;
        if (text == '') {
            return;
        }
        textField.value = "";

        this._TextInput_textInserted(text);
    },

    _TextInput_copy: function() {
        if (this.respondsTo('copy')) {
            SC.RunLoop.begin();
            this.copy();
            SC.RunLoop.end();
        }
    },

    _TextInput_cut: function() {
        if (this.respondsTo('cut')) {
            SC.RunLoop.begin();
            this.cut();
            SC.RunLoop.end();
        }
    },

    _TextInput_textInserted: function(text) {
        if (this.respondsTo('textInserted')) {
            SC.RunLoop.begin();
            this.textInserted(text);
            SC.RunLoop.end();
        }
    },

    _TextInput_textPasted: function(text) {
        if (this.respondsTo('pasteData')) {
            SC.RunLoop.begin();
            this.pasteData(text);
            SC.RunLoop.end();
        }
    },

    // Firefox specific. Converts the content of a contenteditable div into
    // plain text.
    _TextInput_userPastedIntoTextField: function() {
        this._TextInput_pasting = false;

        var textField = this._TextInput_getTextField();

        // Fx converts newlines in plaintext to <br>, so reverse that
        // transformation.
        var buffer = [];
        while (textField.firstChild !== null) {
            var node = textField.firstChild;
            if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "BR") {
                buffer.push("\n");
            } else {
                buffer.push(node.textContent);
            }
            textField.removeChild(node);
        }

        this._TextInput_textPasted(buffer.join(""));
    },

    /**
     * Attaches notification listeners to the text field so that your view will
     * be notified of events. Typically you will call this function in your
     * didCreateLayer() implementation.
     */
    attachTextInputEvents: function() {
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
                thisTextInput._TextInput_textPasted(evt.clipboardData.getData(
                    'text/plain'));
            }, false);
        } else {
            // The events DOMNodeInserted and DOMCharacterDataModified are not
            // fired on FF if the textField is not directly added to the body.
            // Detection is done using the keypress/keyup event instead.
            // jviereck 09/12/30

            var textFieldChangedFn = function(evt) {
                thisTextInput._TextInput_textFieldChanged()
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
                // Set a flag to ignore all the intervening DOMNodeInserted
                // events, then deliver all the pasted text to the view.
                //
                // FIXME: This is ugly and could result in extraneous text
                // being included as part of the text if extra DOMNodeInserted
                // or DOMCharacterDataModified events happen to be in the queue
                // when this function runs. But until Fx supports TextInput
                // events, there's nothing better we can do.
                thisTextInput._TextInput_pasting = true;
                window.setTimeout(function() {
                    thisTextInput._TextInput_userPastedIntoTextField();
                }, 0);
            }, false);
        }

        textField.addEventListener('copy', function(evt) {
            var copyData = thisTextInput._TextInput_copyData();

        }, false);
        textField.addEventListener('cut', function(evt) {
            thisTextInput._TextInput_cut();
        }, false);

        // Clicking the address bar in Fx (at least) causes a blur, but
        // SproutCore won't notice unless we tell it explicitly.
        textField.addEventListener('blur', function(evt) {
            thisTextInput.resignFirstResponder();
        }, false);
    },

    /**
     * Gives focus to the field editor so that input events will be
     * delivered to the view. If you override willBecomeKeyResponderFrom(),
     * you should call this function in your implementation.
     */
    focusTextInput: function() {
        this._TextInput_getTextField().focus();
    },

    render: function(context, firstTime) {
        sc_super();

        if (firstTime) {
            var layerFrame = this.get('layerFrame');
            var textFieldContext = context.begin("textarea");
            textFieldContext.attr("style", ("position: absolute; " +
                "z-index: -99999; top: 0px; left: 0px; width: %@px; " +
                "height: %@px").fmt(layerFrame.width, layerFrame.height));
            textFieldContext.end();
        }
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
     * The default implementation of this event calls focusTextarea(). If you
     * override this method, you should call that function as well.
     */
    willBecomeKeyResponderFrom: function(responder) {
        this.focusTextInput();
    },

    /**
     * The default implementation of this event calls unfocusTextarea(). If you
     * override this method, you should call that function as well.
     */
    willLoseKeyResponderTo: function(responder) {
        this.unfocusTextInput();
    }
};

