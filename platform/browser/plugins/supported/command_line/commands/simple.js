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
var env = require('environment').env;

/**
 * Action to allow the command line to do completion
 */
exports.completeCommand = function(args, request) {
    var commandLine = env.commandLine;
    commandLine.complete();
};

/**
 * Generate some help text for all commands in this canon, optionally
 * filtered by a <code>prefix</code>, and with <code>options</code> which can
 * specify a prefix and suffix for the generated HTML.
 */
var _getHelp = function(prefix, options) {
    var output = [];

    var command = catalog.getExtensionByKey('command', prefix);
    if (command && command.pointer) {
        // caught a real command
        output.push(command.description);
    } else {
        var showHidden = false;

        if (!prefix && options && options.prefix) {
            output.push(options.prefix);
        }

        if (command) {
            // We must be looking at sub-commands
            output.push('<h2>Sub-Commands of ' + command.name + '</h2>');
            output.push('<p>' + command.description + '</p>');
        } else if (prefix) {
            if (prefix == 'hidden') { // sneaky, sneaky.
                prefix = '';
                showHidden = true;
            }
            output.push('<h2>Commands starting with \'' + prefix + '\':</h2>');
        } else {
            output.push('<h2>Available Commands:</h2>');
        }

        var toBeSorted = [];
        catalog.getExtensions('command').forEach(function(command) {
            toBeSorted.push(command.name);
        });

        var sorted = toBeSorted.sort();

        output.push('<table>');
        for (var i = 0; i < sorted.length; i++) {
            command = catalog.getExtensionByKey('command', sorted[i]);
            if (!command) {
                console.error('Huh? command ', command.name, ' cannot be looked up by name');
                continue;
            }

            if (!showHidden && command.hidden) {
                continue;
            }
            if (command.description === undefined) {
                // Ignore editor actions
                continue;
            }
            if (prefix && command.name.indexOf(prefix) !== 0) {
                // Filtered out by the user
                continue;
            }
            if (!prefix && command.name.indexOf(' ') != -1) {
                // sub command
                continue;
            }
            if (command && command.name == prefix) {
                // sub command, and we've already given that help
                continue;
            }

            // todo add back a column with parameter information, perhaps?

            output.push('<tr>');
            output.push('<th class="right">' + command.name + '</th>');
            output.push('<td>' + command.description + '</td>');
            output.push('</tr>');
        }
        output.push('</table>');

        if (!prefix && options && options.suffix) {
            output.push(options.suffix);
        }
    }

    return output.join('');
};

/**
 *
 */
exports.helpCommand = function(args, request) {
    var output = _getHelp(args.search, {
        prefix: '<h2>Welcome to Bespin - Code in the Cloud</h2><ul>' +
            "<li><a href='http://labs.mozilla.com/projects/bespin' target='_blank'>Home Page</a></li>" +
            "<li><a href='https://wiki.mozilla.org/Labs/Bespin' target='_blank'>Wiki</a></li>" +
            "<li><a href='https://wiki.mozilla.org/Labs/Bespin/UserGuide' target='_blank'>User Guide</a></li>" +
            "<li><a href='https://wiki.mozilla.org/Labs/Bespin/Tips' target='_blank'>Tips and Tricks</a></li>" +
            "<li><a href='https://wiki.mozilla.org/Labs/Bespin/FAQ' target='_blank'>FAQ</a></li>" +
            "<li><a href='https://wiki.mozilla.org/Labs/Bespin/DeveloperGuide' target='_blank'>Developers Guide</a></li>" +
            "</ul>",
         suffix: "For more information, see the <a href='https://wiki.mozilla.org/Labs/Bespin'>Bespin Wiki</a>."
    });
    request.done(output);
};

// TODO: fix
var rootCanon = { aliases:[], commands:[] };

/**
 * 'alias' command
 */
exports.aliasCommand = function(args, request) {
    var aliases = rootCanon.aliases;

    if (!args.alias) {
        // * show all
        var output = '<table>';
        for (var x in aliases) {
            if (aliases.hasOwnProperty(x)) {
                output += '<tr><td style="text-align:right;">' + x + '</td>' +
                        '<td>&#x2192;</td><td>' + aliases[x] + '</td></tr>';
            }
        }
        output += '</table>';
        request.done(output);
    } else {
        // * show just one
        if (args.command === undefined) {
          var alias = aliases[args.alias];
          if (alias) {
              request.done(args.alias + ' &#x2192; ' + aliases[args.alias]);
          } else {
              request.done('No alias set for \'' + args.alias + '\'');
          }
        } else {
            // * save a new alias
            var key = args.alias;
            var value = args.command;
            var aliascmd = value.split(' ')[0];

            if (rootCanon.commands[key]) {
                request.done('There is already a command with the name: ' + key);
            } else if (rootCanon.commands[aliascmd]) {
                aliases[key] = value;
                request.done('Saving alias: ' + key + ' &#x2192; ' + value);
            } else if (aliases[aliascmd]) {
                // TODO: have the symlink to the alias not the end point
                aliases[key] = value;
                request.done('Saving alias: ' + key + ' &#x2192; ' + aliases[value] + ' (' + value + ' was an alias itself)');
            } else {
                request.done('No command or alias with that name.');
            }
        }
    }
};

