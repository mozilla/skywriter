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

var SC = require("sproutcore/runtime").SC;
var catalog = require("bespin:plugins").catalog;

/**
 * An object to wrap stuff added to the Canon
 */
exports.Command = SC.Object.extend({
    extension: null,

    init: function() {
        this.set("takesArgs", this.get("takes") != undefined);
        this._normalizeTakes();
    },

    load: function(callback) {
        this.get("extension").load(callback);
    },

    execute: function() {
        var args = arguments;
        var self = this;
        this.load(function(execute) {
            execute.apply(self, args);
        });
    },

    _normalizeTakes: function() {
        var paramList = [];
        var self = this;

        var takes = this.get("takes");

        if (takes) {
            takes.forEach(function(item) {
                if (typeof(item) == "string") {
                    paramList.push(item);
                } else {
                    var itemType = item.type || "text";
                    var argType = catalog.getExtensionByKey("type", itemType);
                    if (!argType) {
                        console.error("Command ", item.name,
                            " requires an argument of type ", itemType,
                            " which is undefined");
                        return;
                    }

                    if (item.name) {
                        paramList.push(item.name);
                    } else {
                        paramList.push(itemType);
                    }
                }
            });
        }

        this._paramList = paramList.join(" ");
    },

    /**
     * Calculate the args object to be passed into the command.
     * Split the arguments up for the command and send in an object.
     */
    getArgs: function(fromUser, callback) {
        var takes = this.get("takes");
        if (!takes) {
            callback(undefined);
            return;
        }

        var args;
        var userString = fromUser.join(' ');

        // Commenting out the old-style varargs for now.
        // Likely want to do something different with the new
        // 'takes' options.
        // if (command.takes['*']) {
        //     args = TokenObject.create({ input:userString });
        //     args.rawinput = userString;
        //
        //     args.varargs = args.pieces; // directly grab the token pieces as an array
        // } else {
        args = TokenObject.create({
            input: userString,
            options: { params: this._paramList }
        });
        args.rawinput = userString;

        this.convertArguments(args, callback);
        // }
    },

    convertArguments: function(args, callback) {
        // counter to keep track of how many conversions
        // are done, since they're done asynchronously.
        // should probably be using promises here
        var accounted = 0;
        var fired = false;

        var total = this.get("takes").length;

        this.get("takes").forEach(function(item) {
            if (typeof(item) == "string") {
                accounted++;
                return;
            }
            var itemType = item.type || "text";
            var itemName = item.name || item.type;
            var argTypeExt = catalog.getExtensionByKey("type", itemType);
            if (!argTypeExt) {
                accounted++;
                return;
            }

            argTypeExt.load(function(argType) {
                accounted++;
                if (args[itemName] != undefined) {
                    if (argType.fromString) {
                        args[itemName] = argType.fromString(args[itemName]);
                    }
                } else {
                    if (item["default"]) {
                        args[itemName] = item["default"];
                    } else if (argType.getDefault) {
                        args[itemName] = argType.getDefault();
                    }
                }
                if (accounted == total) {
                    callback(args);
                    fired = true;
                }
            });
        });

        if (accounted == total && !fired) {
            callback(args);
        }
    },

    /**
     * This is like store.getFullCommandName() but for commands
     */
    getFullCommandName: function() {
        var name = this.get("name");
        if (this.get("parent")) {
            name = this.parent.getFullCommandName() + " " + name;
        }
        return name.trim();
    },

    /**
     * Like canon.findCompletions() but a default that just uses
     * command.completeText to provide a hint
     */
    findCompletions: function(query, callback) {
        query.hint = this.completeText;
        callback(query);
    }
});

/**
 * Given a string, make a token object that holds positions and has name access.
 * <p>Examples:
 * <pre>
 * var args = TokenObject.create({ input:userString, options: {
 *     params: command.takes.order.join(' ')
 * }});
 *
 * var test = TokenObject.create({
 *     input: document.getElementById("input").value,
 *     options: {
 *         splitBy: document.getElementById("regex").value,
 *         params: document.getElementById("params").value
 *     }
 * });
 *
 * var test = TokenObject.create({ input:"male 'Dion Almaer'", options: {
 *     params: 'gender name'
 * }});
 * </pre>
 */
var TokenObject = SC.Object.extend({
    input: null,
    options: { },

    init: function() {
        this._splitterRegex = new RegExp(this.options.splitBy || '\\s+');
        this.pieces = this.tokenize(this.input.split(this._splitterRegex));

        if (this.options.params) {
            this._nametoindex = {};
            var namedparams = this.options.params.split(' ');
            for (var x = 0; x < namedparams.length; x++) {
                this._nametoindex[namedparams[x]] = x;

                // side step if you really don't want this
                if (!this.options.noshortcutvalues) {
                    this[namedparams[x]] = this.pieces[x];
                }
            }
        }
        this.sc_super();
    },

    /**
     * Split up the input taking into account ' and "
     */
    tokenize: function(incoming) {
        var tokens = [];

        var nextToken;
        while (nextToken = incoming.shift()) {
            if (nextToken[0] == '"' || nextToken[0] == "'") { // it's quoting time
                var eaten = [ nextToken.substring(1, nextToken.length) ];
                var eataway;
                while (eataway = incoming.shift()) {
                    if (eataway[eataway.length - 1] == '"' || eataway[eataway.length - 1] == "'") { // end quoting time
                        eaten.push(eataway.substring(0, eataway.length - 1));
                        break;
                    } else {
                        eaten.push(eataway);
                    }
                }
                tokens.push(eaten.join(' '));
            } else {
                tokens.push(nextToken);
            }
        }

        return tokens;
    },

    param: function(index) {
        return (typeof index == "number")
                ? this.pieces[index]
                : this.pieces[this._nametoindex[index]];
    },

    length: function() {
        return this.pieces.length;
    }
});
