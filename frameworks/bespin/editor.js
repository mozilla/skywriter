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
var bespin = require("index");

var util = require("util/util");
var keys = require("util/keys");
var canvas = require("util/canvas");
var cookie = require("util/cookie");
var mousewheelevent = require("util/mousewheelevent");
var clipboard = require("util/clipboard");

var editorEvents = require("events");
var syntax = require("syntax");
var cursor = require("cursor");
var actions = require("actions");
var model = require("model");
var history = require("history");

// /**
//  * If the debugger is reloaded, we need to make sure the module is in memory
//  * if we're in debug mode.
//  */
// bespin.subscribe("extension:loaded:bespin.debugger", function(ext) {
//     var settings = bespin.get("settings");
//     if (settings && settings.get("debugmode")) {
//         ext.load();
//     }
// });

