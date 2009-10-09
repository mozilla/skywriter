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

// module: bespin/util/keys
var bespin = require("bespin");

/**
 * Helpful code to deal with key handling and processing.
 * Consists of two core pieces:
 * <ul>
 * <li>bespin.util.keys.Key: is a map of keys to key codes
 * <li>bespin.util.keys.fillArguments: convert string, e.g. "CTRL A" to key and
 * modifier
 * </ul>
 * <p>TODO: Having the keys in the same scope as the method is really bad :)
 */

/**
 * Alpha keys, and special keys (ENTER, BACKSPACE) have key codes that our code
 * needs to check. This gives you a way to say Key.ENTER when matching a key
 * code instead of "13"
 */
exports.Key = {
    // -- Numbers
    ZERO: 48,
    ONE: 49,
    TWO: 50,
    THREE: 51,
    FOUR: 52,
    FIVE: 53,
    SIX: 54,
    SEVEN: 55,
    EIGHT: 56,
    NINE: 57,

    // -- Alphabet
    A: 65,
    B: 66,
    C: 67,
    D: 68,
    E: 69,
    F: 70,
    G: 71,
    H: 72,
    I: 73,
    J: 74,
    K: 75,
    L: 76,
    M: 77,
    N: 78,
    O: 79,
    P: 80,
    Q: 81,
    R: 82,
    S: 83,
    T: 84,
    U: 85,
    V: 86,
    W: 87,
    X: 88,
    Y: 89,
    Z: 90,

    // Special keys that dojo.keys doesn't have
    FORWARD_SLASH: 191,
    TILDE: 192,
    SQUARE_BRACKET_OPEN: 219,
    BACK_SLASH: 220,
    SQUARE_BRACKET_CLOSE: 221
};

(function() {
    SC.mixin(exports.Key, dojo.keys);

    // -- Reverse the map for lookups
    var keys = exports.Key;
    exports.KeyCodeToName = {};

    for (var key in keys) {
        var keyCode = keys[key];

        if (typeof keyCode == "number") {
            exports.KeyCodeToName[keyCode] = key;
        }
    }
})();

/**
 * Given a key as a string, return the key code representation.
 * E.g. toKeyCode("k") -&gt; 75
 */
exports.toKeyCode = function(keyAsString) {
    return exports.Key[keyAsString.toUpperCase()];
};

/**
 * Fill out the arguments for action, key, modifiers
 * @param string Can be something like "CTRL S"
 * @param args Is the args that you want to modify. This is common as you may
 * already have args.action.
 */
exports.fillArguments = function(string, args) {
    var keys = string.split(' ');
    args = args || {};

    args.key = keys.pop(); // the last item is the key

    if (keys.length == 0) { // none if that is true
        args.modifiers = "none";
    } else {
        args.modifiers = keys.join(',');
    }

    return args;
};


/**
 * Cache the character codes that we want to pass through to the browser
 * Should map to list below
 */
var codes = [
    "k", "l", "n", "o", "t", "w", "+", "-", "~", "0", "1", "2", "3", "4", "5",
    "6", "7", "8", "9"
];
exports.PassThroughCharCodes = codes.map(function(item) {
    return item.charCodeAt(0);
});

/**
 * Cache the key codes that we want to pass through to the browser
 * Should map to list above
 */
exports.PassThroughKeyCodes = (function() {
    var Key = exports.Key;
    return [
        Key.C, Key.X, Key.V, Key.K, Key.L, Key.N, Key.O, Key.T, Key.W,
        Key.NUMPAD_PLUS, Key.NUMPAD_MINUS, Key.TILDE, Key.ZERO, Key.ONE,
        Key.TWO, Key.THREE, Key.FOUR, Key.FIVE, Key.SIX, Key.SEVEN, Key.EIGHT,
        Key.NINE
    ];
})();

/**
 * Given the event, return true if you want to allow the event to pass through
 * to the browser.
 * For example, allow Apple-L to go to location, Apple-K for search. Apple-# for
 * a tab.
 * @param e Event that came into an <code>onkeydown</code> handler
 */
exports.passThroughToBrowser = function(e) {
    var Key = exports.Key;

    if (!e.ctrlKey) {
        // let normal characters through
        return true;
    } else if (e.metaKey || e.altKey || e.ctrlKey) {
        // Apple or Alt key
        if (e.type == "keypress") {
            var match = exports.PassThroughCharCodes.some(function(item) {
                return (item == e.charCode);
            });
            if (match) {
                return true;
            }
        } else {
            var match = exports.PassThroughKeyCodes.some(function(item) {
                return (item == e.keyCode);
            });
            if (match) {
                return true;
            }
        }
    }

    return false;
};
