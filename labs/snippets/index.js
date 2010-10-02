require.def(['require', 'exports', 'module',
    'skywriter/plugins',
    'skywriter/console',
    'skywriter/promise',
    'environment',
    'keyboard/keyboard'
], function(require, exports, module,
    plugins,
    consoleMod,
    promise,
    environment,
    keyboard
) {

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
 * The Original Code is Skywriter.
 *
 * The Initial Developer of the Original Code is
 * Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Skywriter Team (skywriter@mozilla.com)
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

exports.init = function() {
    var catalog = plugins.catalog;
    catalog.addExtensionPoint("snippet", {
        "description": "Some boiler plate text for insertion into an file",
        "register": "#addSnippet",
        "indexOn": "name"
    });
    catalog.connect("snippet", module.id, {
        "name": "lipsum",
        "context": "text",
        "contents":
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam nec adipiscing nibh. Quisque non dictum nunc. Nunc sollicitudin ornare dui, semper vehicula sapien venenatis id. Sed nec tincidunt mauris. Nunc risus est, commodo ut tempus ac, pulvinar et leo. Mauris massa risus, vestibulum sit amet viverra id, tristique sed quam. Donec sit amet lorem lacus. Aliquam eleifend odio sed enim consectetur consequat. Nullam rutrum porttitor feugiat. Nunc ultrices sapien eget velit fermentum blandit. Etiam suscipit risus vel purus tristique nec porttitor felis sollicitudin. In enim nibh, cursus ac interdum nec, adipiscing ac lorem. Vivamus sodales nunc lorem, a bibendum enim. Nullam ac erat vitae augue consectetur tincidunt. Nullam lobortis nisl nec lectus pharetra laoreet. Ut ultricies bibendum consectetur. Cras vulputate ultricies tincidunt. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Donec lectus magna, feugiat quis pretium sed, commodo ac enim. Nullam lobortis, ipsum porta dapibus rutrum, arcu purus semper dui, non suscipit nunc nulla non sapien"
    });
    catalog.connect("snippet", module.id, {
        "name": "html5",
        "context": "html",
        "contents":
            "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\" />\n  <link rel=\"stylesheet\" href=\"styles.css\" />\n</head>\n\n<body>\n</body>\n</html>\n"
    });
    catalog.connect("command", module.id, {
        "name": "snippet",
        "predicates": { "context": "html" },
        "params": [
            {
                "name": "snippet",
                "type": {
                    "name": "selection",
                    "pointer": "Snippets:index#getSnippets"
                },
                "description": "The name of the snippet to insert"
            }
        ],
        "description": "Insert a custom snippet",
        "pointer": "#snippetCommand"
    });
};

exports.deinit = function() {
    catalog.disconnectAll(module.id);
    catalog.removeExtensionPoint("snippet");
};

var catalog = plugins.catalog;
var console = consoleMod.console;
var Promise = promise.Promise;

var env = environment.env;


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

});
