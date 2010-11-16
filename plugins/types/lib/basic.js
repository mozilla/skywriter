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
 * The Original Code is Mozilla Skywriter.
 *
 * The Initial Developer of the Original Code is
 * Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *      Joe Walker (jwalker@mozilla.com)
 *      Kevin Dangoor (kdangoor@mozilla.com)
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

define(function(require, exports, module) {

var console = require("util/console").console;
    
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
    isValid: function(value, typeOptions) {
        return typeof value == 'string';
    },

    toString: function(value, typeOptions) {
        return value;
    },

    fromString: function(value, typeOptions) {
        return value;
    }
};

/**
 * We don't currently plan to distinguish between integers and floats
 */
exports.number = {
    isValid: function(value, typeOptions) {
        if (isNaN(value)) {
            return false;
        }
        if (value === null) {
            return false;
        }
        if (value === undefined) {
            return false;
        }
        if (value === Infinity) {
            return false;
        }
        return typeof value == 'number';// && !isNaN(value);
    },

    toString: function(value, typeOptions) {
        if (!value) {
            return null;
        }
        return '' + value;
    },

    fromString: function(value, typeOptions) {
        if (!value) {
            return null;
        }
        var reply = parseInt(value, 10);
        if (isNaN(reply)) {
            throw new Error('Can\'t convert "' + value + '" to a number.');
        }
        return reply;
    }
};

/**
 * true/false values
 */
exports.bool = {
    isValid: function(value, typeOptions) {
        return typeof value == 'boolean';
    },

    toString: function(value, typeOptions) {
        return '' + value;
    },

    fromString: function(value, typeOptions) {
        if (value === null) {
            return null;
        }

        if (!value.toLowerCase) {
            return !!value;
        }

        var lower = value.toLowerCase();
        if (lower == 'true') {
            return true;
        } else if (lower == 'false') {
            return false;
        }

        return !!value;
    }
};

/**
 * A JSON object
 * TODO: Check to see how this works out.
 */
exports.object = {
    isValid: function(value, typeOptions) {
        return typeof value == 'object';
    },

    toString: function(value, typeOptions) {
        return JSON.stringify(value);
    },

    fromString: function(value, typeOptions) {
        return JSON.parse(value);
    }
};

/**
 * One of a known set of options
 */
exports.selection = {
    isValid: function(value, typeOptions) {
        if (typeof value != 'string') {
            return false;
        }

        if (!typeOptions.data) {
            console.error('Missing data on selection type extension. Skipping');
            return true;
        }
        
        var data = (typeof(typeOptions.data) === "function") ? 
            typeOptions.data() : typeOptions.data;

        var match = false;
        data.forEach(function(option) {
            if (value == option) {
                match = true;
            }
        });

        return match;
    },

    toString: function(value, typeOptions) {
        return value;
    },

    fromString: function(value, typeOptions) {
        // TODO: should we validate and return null if invalid?
        return value;
    }
};

});
