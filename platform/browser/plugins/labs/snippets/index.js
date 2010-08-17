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

var env = require('environment').env;
var keyboard = require('keyboard:keyboard');

/**
 * Find and configure a snippet object.
 * We think it likely that we'll need to register keyboard support one day???
 */
exports.addSnippet = function(snippetExt) {
    // console.log('addSnippet', snippetExt);
};

/**
 *
 */
exports.getSnippets = function() {
    var flags = keyboard.buildFlags({ });
    var snippetExts = catalog.getExtensions('snippet');
    var matches = [];
    snippetExts.forEach(function(snippetExt) {
        if (snippetExt.context === flags.context) {
            matches.push(snippetExt);
        }
    });
    return matches;
};

/**
 * The 'snippet' command
 */
exports.snippetCommand = function(args, request) {
    var snippetExt = catalog.getExtensionByKey('snippet', args.snippet);

    if (!snippetExt) {
        request.doneWithError('Can\'t find snippet "' + args.snippet + '"');
        return;
    }

    var range = env.view.getSelectedRange();
    env.model.replaceCharacters(range, snippetExt.contents);
};
