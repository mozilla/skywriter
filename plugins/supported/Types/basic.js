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

/**
 * These are the basic types that we accept. They are vaguely based on the
 * Jetpack settings system (https://wiki.mozilla.org/Labs/Jetpack/JEP/24)
 * although clearly more restricted.
 * <p>In addition to these types, Jetpack also accepts range, member, password
 * that we are thinking of adding in the short term.
 */

/**
 * 'text' is the default if no type is given.
 */
exports.text = {
    isValid: function(value, typeExt) {
        return typeof value == "string";
    },

    toString: function(value, typeExt) {
        return value;
    },

    fromString: function(value, typeExt) {
        return value;
    }
};

/**
 * We don't currently plan to distinguish between integers and floats - this is
 * JavaScript damnit!
 */
exports.number = {
    isValid: function(value, typeExt) {
        return typeof value == "number";
    },

    toString: function(value, typeExt) {
        return "" + value;
    },

    fromString: function(value, typeExt) {
        return parseInt(value, 10);
    }
};

/**
 * true/false values
 */
exports.boolean = {
    isValid: function(value, typeExt) {
        return typeof value == "boolean";
    },

    toString: function(value, typeExt) {
        return "" + value;
    },

    fromString: function(value, typeExt) {
        return !!value;
    }
};

/**
 * TODO: Check to see how this works out.
 */
exports.object = {
    isValid: function(value, typeExt) {
        return typeof value == "object";
    },

    toString: function(value, typeExt) {
        return JSON.stringify(value);
    },

    fromString: function(value, typeExt) {
        return JSON.parse(value);
    }
};

/**
 * TODO: Check to see how this works out.
 */
exports.selection = {
    isValid: function(value, typeExt) {
        // TODO: optimistic sync/async validation??
        return typeof value == "string";
    },

    toString: function(value, typeExt) {
        return value;
    },

    fromString: function(value, typeExt) {
        // TODO: should we validate and return null if invalid?
        return value;
    }
};
