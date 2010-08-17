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

var catalog = require('bespin:plugins').catalog;
var console = require('bespin:console').console;
var Promise = require('bespin:promise').Promise;

var r = require;

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
        return typeof value == 'string';
    },

    toString: function(value, typeExt) {
        return value;
    },

    fromString: function(value, typeExt) {
        return value;
    }
};

/**
 * We don't currently plan to distinguish between integers and floats
 */
exports.number = {
    isValid: function(value, typeExt) {
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

    toString: function(value, typeExt) {
        if (!value) {
            return null;
        }
        return '' + value;
    },

    fromString: function(value, typeExt) {
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
    isValid: function(value, typeExt) {
        return typeof value == 'boolean';
    },

    toString: function(value, typeExt) {
        return '' + value;
    },

    fromString: function(value, typeExt) {
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
    isValid: function(value, typeExt) {
        return typeof value == 'object';
    },

    toString: function(value, typeExt) {
        return JSON.stringify(value);
    },

    fromString: function(value, typeExt) {
        return JSON.parse(value);
    }
};

/**
 * One of a known set of options
 */
exports.selection = {
    isValid: function(value, typeExt) {
        if (typeof value != 'string') {
            return false;
        }

        if (!typeExt.data) {
            console.error('Missing data on selection type extension. Skipping');
            return true;
        }

        var match = false;
        typeExt.data.forEach(function(option) {
            if (value == option) {
                match = true;
            }
        });

        return match;
    },

    toString: function(value, typeExt) {
        return value;
    },

    fromString: function(value, typeExt) {
        // TODO: should we validate and return null if invalid?
        return value;
    },

    resolveTypeSpec: function(extension, typeSpec) {
        var promise = new Promise();

        if (typeSpec.data) {
            // If we've got the data already - just use it
            extension.data = typeSpec.data;
            promise.resolve();
        } else if (typeSpec.pointer) {
            catalog.loadObjectForPropertyPath(typeSpec.pointer).then(function(obj) {
                var reply = obj(typeSpec);
                if (typeof reply.then === 'function') {
                    reply.then(function(data) {
                        extension.data = data;
                        promise.resolve();
                    });
                } else {
                    extension.data = reply;
                    promise.resolve();
                }
            }, function(ex) {
                promise.reject(ex);
            });
        } else {
            // No extra data available
            console.warn('Missing data/pointer for selection', typeSpec);
            promise.resolve();
        }

        return promise;
    }
};
