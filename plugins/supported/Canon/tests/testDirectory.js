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

var t = require("PluginDev");
var directory = require("directory");

var rootCanon = directory.rootCanon;

exports.testTakesNormalization = function() {
    var ext = {};
    
    var command = directory.Command.create(ext);
    t.equal(command._paramList, "", "expected empty paramList");
    t.equal(command.takes, undefined, "expected takes to be undefined");
    t.deepEqual(command._noInputList, [], "expected empty noInputList");
    
    ext = {
        takes: ["foo", "bar"]
    };
    
    command = directory.Command.create(ext);
    t.deepEqual(command._paramList, "foo bar");
    t.deepEqual(command._noInputList, []);
    
    ext = {
        takes: [{type: "model"}]
    };
    
    command = directory.Command.create(ext);
    t.equal(command._paramList, "");
    t.ok(command._noInputList[0] != undefined, 
        "the model is a noInput type of argument");
};

exports.testArgumentParsing = function() {
    var command = directory.Command.create({});
    
    command.getArgs([], function(args) {
        t.equal(args, undefined, 
            "If command.takes is not set, undefined is the result");
            var ext = {
                takes: ["foo"]
            };
            command = directory.Command.create(ext);

            command.getArgs([], function(args) {
                t.equal(args.foo, undefined);
                command.getArgs(["hello"], function(args) {
                    t.equal(args.foo, "hello");
                    t.start();
                });
            });
    });
    
    t.stop();
};

exports.testTypedArgumentParsing = function() {
    var ext = {
        takes: [{name: "anum", type: "int"}, {name: "astring", 
            "default": "SomeString"}]
    };
    var command = directory.Command.create(ext);
    
    command.getArgs(["10"], function(args) {
        t.equal(args.anum, 10);
        t.equal(args.astring, "SomeString");
        t.start();
    });
    t.stop();
};
