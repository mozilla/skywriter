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

var cliController = require("controller").cliController;
var rootCanon = require("Canon:directory").rootCanon;

/**
 * TODO: make this automatic
 */
exports.helpCommand = function(instruction, args) {
    var output = this.parent.getHelp(args.search, {
        prefix: "<h2>Welcome to Bespin - Code in the Cloud</h2><ul>" +
            "<li><a href='http://labs.mozilla.com/projects/bespin' target='_blank'>Home Page</a>" +
            "<li><a href='https://wiki.mozilla.org/Labs/Bespin' target='_blank'>Wiki</a>" +
            "<li><a href='https://wiki.mozilla.org/Labs/Bespin/UserGuide' target='_blank'>User Guide</a>" +
            "<li><a href='https://wiki.mozilla.org/Labs/Bespin/Tips' target='_blank'>Tips and Tricks</a>" +
            "<li><a href='https://wiki.mozilla.org/Labs/Bespin/FAQ' target='_blank'>FAQ</a>" +
            "<li><a href='https://wiki.mozilla.org/Labs/Bespin/DeveloperGuide' target='_blank'>Developers Guide</a>" +
            "</ul>",
        suffix: "For more information, see the <a href='https://wiki.mozilla.org/Labs/Bespin'>Bespin Wiki</a>."
    });
    instruction.addOutput(output);
};

/**
 * 'alias' command
 */
exports.aliasCommand = function(instruction, args) {
    var aliases = rootCanon.aliases;

    if (!args.alias) {
        // * show all
        var output = "<table>";
        for (var x in aliases) {
            if (aliases.hasOwnProperty(x)) {
                output += "<tr><td style='text-align:right;'>" + x + "</td>" +
                        "<td>&#x2192;</td><td>" + aliases[x] + "</td></tr>";
            }
        }
        output += "</table>";
        instruction.addOutput(output);
    } else {
        // * show just one
        if (args.command === undefined) {
          var alias = aliases[args.alias];
          if (alias) {
              instruction.addOutput(args.alias + " &#x2192; " + aliases[args.alias]);
          } else {
              instruction.addErrorOutput("No alias set for '" + args.alias + "'");
          }
        } else {
            // * save a new alias
            var key = args.alias;
            var value = args.command;
            var aliascmd = value.split(' ')[0];

            if (rootCanon.commands[key]) {
                instruction.addErrorOutput("Sorry, there is already a command with the name: " + key);
            } else if (rootCanon.commands[aliascmd]) {
                aliases[key] = value;
                instruction.addOutput("Saving alias: " + key + " &#x2192; " + value);
            } else if (aliases[aliascmd]) {
                // TODO: have the symlink to the alias not the end point
                aliases[key] = value;
                instruction.addOutput("Saving alias: " + key + " &#x2192; " + aliases[value] + " (" + value + " was an alias itself)");
            } else {
                instruction.addErrorOutput("Sorry, no command or alias with that name.");
            }
        }
    }
};

/**
 * 'history' command
 */
exports.historyCommand = function(instruction) {
    var instructions = cliController.history.getInstructions();
    var output = [];
    output.push("<table>");
    var count = 1;
    instructions.forEach(function(instruction) {
        output.push("<tr>");
        output.push('<th>' + count + '</th>');
        output.push('<td>' + instruction.typed + "</td>");
        output.push("</tr>");
        count++;
    });
    output.push("</table>");

    instruction.addOutput(output.join(''));
};

