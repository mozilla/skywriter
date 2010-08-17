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

"define metadata";
({
    "description": "Catalogs the available syntax engines",
    "dependencies": {},
    "environments": { "main": true, "worker": true },
    "provides": [
        {
            "ep": "extensionhandler",
            "name": "syntax",
            "register": "#discoveredNewSyntax"
        }
    ]
});
"end";

var plugins = require("bespin:plugins");

function SyntaxInfo(ext) {
    this.extension = ext;
    this.name = ext.name;
    this.fileExts = ext.hasOwnProperty('fileexts') ? ext.fileexts : [];
}

/**
 * Stores metadata for all of the syntax plugins.
 *
 * @exports syntaxDirectory as syntax_directory:syntaxDirectory
 */
var syntaxDirectory = {
    _fileExts: {},
    _syntaxInfo: {},

    get: function(syntaxName) {
        return this._syntaxInfo[syntaxName];
    },

    hasSyntax: function(syntax) {
        return this._syntaxInfo.hasOwnProperty(syntax);
    },

    register: function(extension) {
        var syntaxInfo = new SyntaxInfo(extension);
        this._syntaxInfo[syntaxInfo.name] = syntaxInfo;

        var fileExts = this._fileExts;
        syntaxInfo.fileExts.forEach(function(fileExt) {
            fileExts[fileExt] = syntaxInfo.name;
        });
    },

    syntaxForFileExt: function(fileExt) {
        fileExt = fileExt.toLowerCase();
        var fileExts = this._fileExts;
        return fileExts.hasOwnProperty(fileExt) ? fileExts[fileExt] : 'plain';
    }
};

function discoveredNewSyntax(syntaxExtension) {
    syntaxDirectory.register(syntaxExtension);
}

exports.syntaxDirectory = syntaxDirectory;
exports.discoveredNewSyntax = discoveredNewSyntax;

