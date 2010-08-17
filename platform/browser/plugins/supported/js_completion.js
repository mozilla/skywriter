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
    "description": "JavaScript code completion",
    "dependencies": { "completion": "0.0.0", "underscore": "0.0.0" },
    "provides": [
        {
            "ep": "completion",
            "name": "js",
            "pointer": "#JSCompletion"
        }
    ]
});
"end";

var _ = require('underscore')._;

function JSCompletion(tags) {
    this.tags = tags;
}

JSCompletion.prototype = {
    tags: null,

    getCompletions: function(prefix, suffix, syntaxManager) {
        if (/^[A-Za-z0-9_\$]/.test(suffix)) {
            return null;
        }

        var m = /[A-Za-z0-9_.\$]+$/.exec(prefix);
        if (m == null) {
            return null;
        }

        var chain = m[0].split(".");
        if (chain.length < 2) {
            return null;
        }

        var ident = chain.pop();
        if (_(chain).any(function(s) { return s === ""; })) {
            return null;
        }

        var module = null;
        var sym = syntaxManager.getSymbol(chain[0]);
        if (sym != null) {
            chain.shift();
            module = sym;
        }

        var namespace = chain.join(".");

        var tags = [];
        _(this.tags.stem(ident)).each(function(tag) {
            if ((module != null && module !== tag.module) ||
                    (namespace === "" && tag.namespace != null) ||
                    (namespace !== "" && namespace !== tag.namespace)) {
                return;
            }

            tags.push(tag);

            if (tags.length >= 10) {
                _.breakLoop();
            }
        });

        return (tags.length > 0) ? { tags: tags, stem: ident } : null;
    }
};

exports.JSCompletion = JSCompletion;

