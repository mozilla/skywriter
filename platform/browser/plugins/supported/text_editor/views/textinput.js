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
var Event = require('events').Event;

var KeyUtil = require('keyboard:keyutil');

/**
 * @namespace
 *
 * This class provides a hidden text input to provide events similar to those
 * defined in the DOM Level 3 specification. It allows views to support
 * internationalized text input via non-US keyboards, dead keys, and/or IMEs.
 * It also provides support for copy and paste. Currently, an invisible
 * textarea is used, but in the future this module should use
 * DOM 3 TextInput events directly where available.
 *
 * To use this class, instantiate it and provide the optional functions
 *   - copy: function() { return 'text for clipboard' }
 *   - cut: function() { 'Cut some text'; return 'text for clipboard'}
 *   - textInserted: function(newInsertedText) { 'handle new inserted text'; }
 * Note: Pasted text is provided through the textInserted(pastedText) function.
 *
 * You can also provide an DOM node to take focus from by providing the optional
 * "takeFocusFrom" parameter.
 *
 * The DOM node created for text input is in the "domNode" attribute
 * and that caller should add the DOM node to the document in the appropriate
 * place.
 */
exports.TextInput = function(container, delegate) {
    var domNode = this.domNode = document.createElement('textarea');
    domNode.setAttribute('style', 'position: absolute; z-index: -99999; ' +
          'width: 0px; height: 0px; margin: 0px; outline: none; border: 0;');
         // 'z-index: 100; top: 20px; left: 20px; width: 50px; ' +
         // 'height: 50px');

    container.appendChild(domNode);

    this.delegate = delegate;

    this._attachEvents();
};

exports.TextInput.prototype = {
    _composing: false,

    domNode: null,

    delegate: null,

    // This function doesn't work on WebKit! The textContent comes out empty...
    _textFieldChanged: function() {
        if (this._composing || this._ignore) {
            return;
        }

        var textField = this.domNode;
        var text = textField.value;
        // On FF textFieldChanged is called sometimes although nothing changed.
        // -> don't call textInserted() in such a case.
        if (text == '') {
            return;
        }
        textField.value = '';

        this._textInserted(text);
    },

    _copy: function() {
        var copyData = false;
        var delegate = this.delegate;
        if (delegate && delegate.copy) {
            copyData = delegate.copy();
        }
        return copyData;
    },

    _cut: function() {
        var cutData = false;
        var delegate = this.delegate;
        if (delegate && delegate.cut) {
            cutData = delegate.cut();
        }
        return cutData;
    },

    _textInserted: function(text) {
        var delegate = this.delegate;
        if (delegate && delegate.textInserted) {
            delegate.textInserted(text);
        }
    },

    _setValueAndSelect: function(text) {
        var textField = this.domNode;
        textField.value = text;
        textField.select();
    },

    /**
     * Gives focus to the field editor so that input events will be
     * delivered to the view. If you override willBecomeKeyResponderFrom(),
     * you should call this function in your implementation.
     */
    focus: function() {
        this.domNode.focus();
    },

    /**
     * Removes focus from the invisible text input so that input events are no
     * longer delivered to this view. If you override willLoseKeyResponderTo(),
     * you should call this function in your implementation.
     */
     blur: function() {
        this.domNode.blur();
    },

    /**
     * Attaches notification listeners to the text field so that your view will
     * be notified of events. If you override this method, you should call
     * that function as well.
     */
    _attachEvents: function() {
        var textField = this.domNode, self = this;

        // Listen focus/blur event.
        textField.addEventListener('focus', function(evt) {
            if (self.delegate && self.delegate.didFocus) {
                self.delegate.didFocus();
            }
        }, false);
        textField.addEventListener('blur', function(evt) {
            if (self.delegate && self.delegate.didBlur) {
                self.delegate.didBlur();
            }
        }, false);

        KeyUtil.addKeyDownListener(textField, function(evt) {
            if (self.delegate && self.delegate.keyDown) {
                return self.delegate.keyDown(evt);
            } else {
                return false;
            }
        });

        // No way that I can see around this ugly browser sniffing, without
        // more complicated hacks. No browsers have a complete enough
        // implementation of DOM 3 events at the current time (12/2009). --pcw
        if (util.isWebKit) {    // Chrome too
            // On Chrome the compositionend event is fired as well as the
            // textInput event, but only one of them has to be handled.
            if (!util.isChrome) {
                textField.addEventListener('compositionend', function(evt) {
                    self._textInserted(evt.data);
                }, false);
            }
            textField.addEventListener('textInput', function(evt) {
                self._textInserted(evt.data);
            }, false);
            textField.addEventListener('paste', function(evt) {
                self._textInserted(evt.clipboardData.
                    getData('text/plain'));
                evt.preventDefault();
            }, false);
        } else {
            var textFieldChangedFn = self._textFieldChanged.bind(self);

            // Same as above, but executes after all pending events. This
            // ensures that content gets added to the text field before the
            // value field is read.
            var textFieldChangedLater = function() {
                window.setTimeout(textFieldChangedFn, 0);
            };

            textField.addEventListener('keydown', textFieldChangedLater,
                false);
            textField.addEventListener('keypress', textFieldChangedFn, false);
            textField.addEventListener('keyup', textFieldChangedFn, false);

            textField.addEventListener('compositionstart', function(evt) {
                self._composing = true;
            }, false);
            textField.addEventListener('compositionend', function(evt) {
                self._composing = false;
                self._textFieldChanged();
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
                self._setValueAndSelect('');
                window.setTimeout(function() {
                    self._textFieldChanged();
                }, 0);
            }, false);
        }

        // Here comes the code for copy and cut...

        // This is the basic copy and cut function. Depending on the
        // OS and browser this function needs to be extended.
        var copyCutBaseFn = function(evt) {
            // Get the data that should be copied/cutted.
            var copyCutData = evt.type.indexOf('copy') != -1 ?
                            self._copy() :
                            self._cut();
            // Set the textField's value equal to the copyCutData.
            // After this function is called, the real copy or cut
            // event takes place and the selected text in the
            // textField is pushed to the OS's clipboard.
            self._setValueAndSelect(copyCutData);
        };

        // For all browsers that are not Safari running on Mac.
        if (!(util.isWebKit && !util.isChrome && util.isMac)) {
            var copyCutMozillaFn = false;
            if (util.isMozilla) {
                // If the browser is Mozilla like, the copyCut function has to
                // be extended.
                copyCutMozillaFn = function(evt) {
                    // Call the basic copyCut function.
                    copyCutBaseFn(evt);

                    self._ignore = true;
                    window.setTimeout(function() {
                        self._setValueAndSelect('');
                        self._ignore = false;
                    }, 0);
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
    }
};

