/*! @license
==========================================================================
SproutCore -- JavaScript Application Framework
copyright 2006-2009, Sprout Systems Inc., Apple Inc. and contributors.

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.

SproutCore and the SproutCore logo are trademarks of Sprout Systems, Inc.

For more information about SproutCore, visit http://www.sproutcore.com


==========================================================================
@license */

var Trait = require('traits').Trait;

// Note: Most of the following code is taken from SproutCore with a few changes.
//       Julian Viereck, 04-23-2010

var userAgent = navigator.userAgent.toLowerCase();
var isMozilla = /mozilla/.test(userAgent) &&
    !/(compatible|webkit)/.test(userAgent);

// Helper functions and hashs for key handling.
exports.KeyHelper = function() {
    ret = {
        MODIFIER_KEYS: {
          16: 'shift', 17: 'ctrl', 18: 'alt', 224: 'meta'
        },

        FUNCTION_KEYS : {
            8: 'backspace', 9: 'tab',         13: 'return',   19: 'pause',
           27: 'escape',   33: 'pageup',      34: 'pagedown', 35: 'end',
           36: 'home',     37: 'left',        38: 'up',       39: 'right',
           40: 'down',     44: 'printscreen', 45: 'insert',   46: 'delete',
          112: 'f1',      113: 'f2',         114: 'f3',      115: 'f4',
          116: 'f5',      117: 'f7',         119: 'f8',      120: 'f9',
          121: 'f10',     122: 'f11',        123: 'f12',     144: 'numlock',
          145: 'scrolllock'
        },

        PRINTABLE_KEYS: {
           32: ' ',  48: '0',  49: '1',  50: '2',  51: '3',  52: '4', 53:  '5',
           54: '6',  55: '7',  56: '8',  57: '9',  59: ';',  61: '=', 65:  'a',
           66: 'b',  67: 'c',  68: 'd',  69: 'e',  70: 'f',  71: 'g', 72:  'h',
           73: 'i',  74: 'j',  75: 'k',  76: 'l',  77: 'm',  78: 'n', 79:  'o',
           80: 'p',  81: 'q',  82: 'r',  83: 's',  84: 't',  85: 'u', 86:  'v',
           87: 'w',  88: 'x',  89: 'y',  90: 'z', 107: '+', 109: '-', 110: '.',
          188: ',', 190: '.', 191: '/', 192: '`', 219: '[', 220: '\\',
          221: ']', 222: '\"'
        },

        // Create the lookup table for Firefox to convert charCodes to keyCodes
        // in the keyPress event.
        PRINTABLE_KEYS_CHARCODE: {},

        /**
         * @private
         * Determines if the keyDown event is a non-printable or function key.
         * These kinds of events are processed as keyboard shortcuts.
         * If no shortcut handles the event, then it will be sent as a regular
         * keyDown event.
         */
        isFunctionOrNonPrintableKey: function(evt) {
            return !!(evt.altKey || evt.ctrlKey || evt.metaKey ||
                    ((evt.charCode !== evt.which) && this.FUNCTION_KEYS[evt.which]));
        }
    };

    // Create the PRINTABLE_KEYS_CHARCODE hash.
    var k;
    for (i in ret.PRINTABLE_KEYS) {
        k = ret.PRINTABLE_KEYS[i];
        ret.PRINTABLE_KEYS_CHARCODE[k.charCodeAt(0)] = i;
        if (k.toUpperCase() != k) {
            ret.PRINTABLE_KEYS_CHARCODE[k.toUpperCase().charCodeAt(0)] = i;
        }
    }

    return ret;
}();

/**
 * Returns character codes for the event.
 * The first value is the normalized code string, with any Shift or Ctrl
 * characters added to the beginning.
 * The second value is the char string by itself.
 * @return {Array}
 */
exports.commandCodes = function(evt, dontIgnoreMeta) {
    if (evt.originalEvent) {
        return exports.commandCodesSC(evt);
    }

    var code = evt._keyCode || evt.keyCode;
    var charCode = (evt._charCode === undefined ? evt.charCode : evt._charCode);
    var ret = null;
    var key = null;
    var modifiers = '';
    var lowercase;
    var allowShift = true;

    // Absent a value for 'keyCode' or 'which', we can't compute the
    // command codes. Bail out.
    if (code === 0 && evt.which === 0) {
        return false;
    }

    // If the charCode is not zero, then we do not handle a command key
    // here. Bail out.
    if (charCode !== 0) {
        return false;
    }

    // Check for modifier keys.
    if (exports.KeyHelper.MODIFIER_KEYS[charCode]) {
        return [exports.KeyHelper.MODIFIER_KEYS[charCode], null];
    }

    // handle function keys.
    if (code) {
        ret = exports.KeyHelper.FUNCTION_KEYS[code] ;
        if (!ret && (evt.altKey || evt.ctrlKey || evt.metaKey)) {
            ret = exports.KeyHelper.PRINTABLE_KEYS[code];
            // Don't handle the shift key if the combo is
            //    (meta_|ctrl_)<number>
            // This is necessary for the French keyboard. On that keyboard,
            // you have to hold down the shift key to access the number
            // characters.
            if (code > 47 && code < 58) allowShift = evt.altKey;
        }

        if (ret) {
           if (evt.altKey) modifiers += 'alt_' ;
           if (evt.ctrlKey) modifiers += 'ctrl_' ;
           if (evt.metaKey) modifiers += 'meta_';
        } else if (evt.ctrlKey || evt.metaKey) {
            return false;
        }
    }

    // otherwise just go get the right key.
    if (!ret) {
        code = evt.which ;
        key = ret = String.fromCharCode(code) ;
        lowercase = ret.toLowerCase() ;
        if (evt.metaKey) {
           modifiers = 'meta_' ;
           ret = lowercase;

        } else ret = null ;
    }

    if (evt.shiftKey && ret && allowShift) modifiers += 'shift_' ;

    if (ret) ret = modifiers + ret ;

    if (!dontIgnoreMeta && ret) {
        ret = ret.replace(/ctrl_meta|meta/,'ctrl');
    }

    return [ret, key];
};

/**
 * Returns character codes for the event.
 * The first value is the normalized code string, with any Shift or Ctrl
 * characters added to the beginning.
 * The second value is the char string by itself.
 * @return {Array}
 */
exports.commandCodesSC = function(ev) {
    var orgEvt = ev.originalEvent;
    var allowShift = true;

    var code = ev.keyCode;
    var ret = null;
    var key = null;
    var modifiers = '';
    var lowercase;

    // Absent a value for 'keyCode' or 'which', we can't compute the
    // command codes. Bail out.
    if (ev.keyCode === 0 && ev.which === 0) {
        return false;
    }

    // handle function keys.
    if (code) {
        ret = SC.FUNCTION_KEYS[code] ;
        if (!ret && (orgEvt.altKey || orgEvt.ctrlKey || orgEvt.metaKey)) {
            ret = SC.PRINTABLE_KEYS[code];
            // Don't handle the shift key if the combo is
            //    (meta_|ctrl_)<number>
            // This is necessary for the French keyboard. On that keyboard,
            // you have to hold down the shift key to access the number
            // characters.
            if (code > 47 && code < 58) {
                allowShift = orgEvt.altKey;
            }
        }

        if (ret) {
           if (orgEvt.altKey) {
               modifiers += 'alt_';
           }
           if (orgEvt.ctrlKey) {
               modifiers += 'ctrl_';
           }
           if (orgEvt.metaKey) {
               modifiers += 'meta_';
           }
        } else if (orgEvt.ctrlKey || orgEvt.metaKey) {
            return false;
        }
    }

    // otherwise just go get the right key.
    if (!ret) {
        code = ev.which;
        key = ret = String.fromCharCode(code);
        lowercase = ret.toLowerCase();
        if (orgEvt.metaKey) {
           modifiers = 'meta_';
           ret = lowercase;
        } else {
            ret = null;
        }
    }

    if (ev.shiftKey && ret && allowShift) {
        modifiers += 'shift_';
    }

    if (ret) {
        ret = modifiers + ret;
    }

    return [ret, key];
};

// Note: Most of the following code is taken from SproutCore with a few changes.

/**
 * Firefox sends a few key events twice: the first time to the keydown event
 * and then later again to the keypress event. To handle them correct, they
 * should be processed only once. Due to this, we will skip these events
 * in keydown and handle them then in keypress.
 */
exports.addKeyDownListener = function(element, boundFunction) {

    var handleBoundFunc = function(evt) {
        var handled = boundFunction(evt);
        // If the boundFunction returned true, then stop the event.
        if (handled) {
            evt.preventDefault();
            evt.stopPropagation();
        }
        return handled;
    };

    element.addEventListener('keydown', function(evt) {
        if (isMozilla) {
            // Check for function keys (like DELETE, TAB, LEFT, RIGHT...)
            if (exports.KeyHelper.FUNCTION_KEYS[evt.keyCode]) {
                return true;
                // Check for command keys (like ctrl_c, ctrl_z...)
            } else if ((evt.ctrlKey || evt.metaKey) &&
                    exports.KeyHelper.PRINTABLE_KEYS[evt.keyCode]) {
                return true;
            }
        }

        if (exports.KeyHelper.isFunctionOrNonPrintableKey(evt)) {
            return handleBoundFunc(evt);
        }

        return true;
    }, false);

    element.addEventListener('keypress', function(evt) {
        if (isMozilla) {
            // If this is a function key, we have to use the keyCode.
            if (exports.KeyHelper.FUNCTION_KEYS[evt.keyCode]) {
                return boundFunction(evt);
            } else if ((evt.ctrlKey || evt.metaKey) &&
                    exports.KeyHelper.PRINTABLE_KEYS_CHARCODE[evt.charCode]){
                // Check for command keys (like ctrl_c, ctrl_z...).
                // For command keys have to convert the charCode to a keyCode
                // as it has been sent from the keydown event to be in line
                // with the other browsers implementations.

                // FF does not allow let you change the keyCode or charCode
                // property. Store to a custom keyCode/charCode variable.
                // The getCommandCodes() function takes care of these
                // special variables.
                evt._keyCode = exports.KeyHelper.PRINTABLE_KEYS_CHARCODE[evt.charCode];
                evt._charCode = 0;
                return handleBoundFunc(evt);
            }
        }

        // normal processing: send keyDown for printable keys.
        if (evt.charCode !== undefined && evt.charCode === 0) {
            return true;
        }

        return handleBoundFunc(evt);
    }, false);
};
