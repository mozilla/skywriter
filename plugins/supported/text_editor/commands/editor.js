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

var settings = require('settings').settings;

/**
 * 'goto' command
 */
exports.gotoCommand = function(env, args, request) {
    var view = env.get('view');
    view.moveCursorTo({ row: args.line - 1, column: 0 });
    view.focus();
};

/**
 * Utility to allow us to alter the current selection
 * TODO: If the selection is empty, broaden the scope to the whole file?
 */
var withSelection = function(env, action) {
    var view = env.get('view');
    var selection = view.getSelectedCharacters();

    var replacement = action(selection);

    var range = view.getSelectedRange();
    var model = env.get('model');
    model.replaceCharacters(range, replacement);
};

/**
 * 'replace' command
 */
exports.replaceCommand = function(env, args, request) {
    withSelection(env, function(selected) {
        return selected.replace(args.search + "/g", args.replace);
    });
};

/**
 * 'entab' command
 */
exports.entabCommand = function(env, args, request) {
    tabstop = settings.get('tabstop');
    withSelection(env, function(selected) {
        return selected.replace(' {' + tabstop + '}', '\t');
    });
};

/**
 * 'detab' command
 */
exports.detabCommand = function(env, args, request) {
    tabstop = settings.get('tabstop');
    withSelection(env, function(selected) {
        return selected.replace('\t', new Array(tabstop + 1).join(' '));
    });
};

/**
 * 'trim' command
 */
exports.trimCommand = function(env, args, request) {
    withSelection(env, function(selected) {
        var lines = selected.split('\n');
        lines = lines.map(function(line) {
            if (args.side === 'left' || args.side === 'both') {
                line = line.replace(/^\s+/, '');
            }
            if (args.side === 'right' || args.side === 'both') {
                line = line.replace(/\s+$/, '');
            }
            return line;
        });
        return lines.join('\n');
    });
};

/**
 * 'uc' command
 */
exports.ucCommand = function(env, args, request) {
    withSelection(env, function(selected) {
        return selected.toUpperCase();
    });
};

/**
 * 'lc' command
 */
exports.lcCommand = function(env, args, request) {
    withSelection(env, function(selected) {
        return selected.toLowerCase();
    });
};
