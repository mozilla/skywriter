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

var getCompletePath = require('index').getCompletePath;
var QuickMatcher = require('matcher:quick').QuickMatcher;
var MatcherMenu = require('command_line:views/menu').MatcherMenu;
var env = require('environment').env;

/**
 * @see typehint#getHint()
 */
exports.existingFileHint = {
    getHint: function(input, assignment, typeExt) {
        var matcher = new QuickMatcher(assignment.value || '');
        var menu = new MatcherMenu(input, assignment, matcher);

        var typed = assignment.value;
        typed = typed.substring(0, typed.lastIndexOf('/') + 1);

        var currentDir = getCompletePath(typed);
        currentDir = currentDir.substring(0, currentDir.lastIndexOf('/') + 1);

        var files = env.files;
        files.listAll().then(function(fileList) {
            var matchRegExp = new RegExp('^' + currentDir);

            matcher.addItems(fileList.filter(function(item){
                return matchRegExp.test(item);
            }).map(function(item) {
                item = item.substring(currentDir.length);
                var lastSep = item.lastIndexOf('/');
                if (lastSep === -1) {
                    return {
                        name: item,
                        path: typed
                    };
                }
                return {
                    name: item.substring(lastSep + 1),
                    path: typed + item.substring(0, lastSep + 1)
                };
            }));
        });

        return menu.hint;
    }
};
