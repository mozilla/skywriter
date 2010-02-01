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
    "provides":
    [
        {
            "ep": "canon",
            "name": "jetpack",
            "description": "play with jetpack features"
        },
        {
            "ep": "command",
            "name": "jetpack create",
            "params":
            [
                {
                    "name": "feature",
                    "type": "text",
                    "description": "name of your feature"
                },
                {
                    "name": "type",
                    "type": "text",
                    "description": "type of JetPack template (sidebar, content, toolbar)"
                }
            ],
            "description": "Create a new jetpack feature that you can install into Firefox with the new Jetpack goodness.",
            "pointer": "#createCommand"
        },
        {
            "ep": "command",
            "name": "jetpack install",
            "params":
            [
                {
                    "name": "feature",
                    "type": "text",
                    "description": "optionally, the name of the feature to install"
                }
            ],
            "description": "Install a Jetpack feature, either the current file, or the named feature",
            "pointer": "#installCommand"
        },
        {
            "ep": "command",
            "name": "jetpack list",
            "description": "List the Jetpacks available in BespinSettings/jetpacks. NOTE: This is not the same as which Jetpacks you have installed in Firefox",
            "pointer": "#listCommand"
        },
        {
            "ep": "command",
            "name": "jetpack edit",
            "params":
            [
                {
                    "name": "feature",
                    "type": "text",
                    "description": "feature name to edit (required)"
                }
            ],
            "description": "edit the given Jetpack feature",
            "pointer": "#editCommand"
        },
    ]
});
"end";

/**
 * Jetpack Plugin
 * <p>The Jetpack plugin aims to make Bespin a good environment for creating and
 * hosting Jetpack extensions.
 * <p>Read more about Jetpack at: https://wiki.mozilla.org/Labs/Jetpack/API
 */

var bespin = require("bespin");
var util = require("bespin:util/util");
var path = require("bespin:util/path");

/**
 * 'jetpack create' command
 */
exports.createCommand = function(env, args, request) {
    var feature = args.feature || "newjetpack";
    var type = args.type || "sidebar";
    var project = exports.projectName;
    var filename = feature + ".js";

    var templateOptions = {
        stdtemplate: "jetpacks/" + type + ".js",
        values: {
            templateName: feature
        }
    };

    bespin.get("server").fileTemplate(project,
        filename,
        templateOptions,
        {
            onSuccess: function(xhr) {
                bespin.get("editor").openFile(project, filename);
            },
            onFailure: function(xhr) {
                request.doneWithError("Unable to create " + filename + ": " + xhr.responseText);
            }
        }
    );
};

/**
 * 'jetpack install' command
 */
exports.installCommand = function(env, args, request) {
    // For when Aza exposes the Jetpack object :)
    // if (!window["Jetpack"]) {
    //     request.doneWithError("To install a Jetpack, you need to have installed the extension.<br><br>For now this lives in Firefox only, and you can <a href='https://wiki.mozilla.org/Labs/Jetpack/API'>check it out, and download the add-on here</a>.");
    //     return;
    // }

    // Use the given name, or default to the current jetpack
    var feature = args.feature || (function() {
        var editSession = bespin.get("editSession");
        if (editSession.project != exports.projectName) {
            // jump out if not in the jetpack project
            return;
        }
        var bits = editSession.path.split(".");
        return bits[bits.length - 2];
    })();

    if (!feature) {
        request.doneWithError("Please pass in the name of the Jetpack feature you would like to install");
    } else {
        exports.install(feature);
    }
};

/**
 * 'jetpack list' command
 */
exports.listCommand = function(env, args, request) {
    bespin.get("server").list(exports.projectName, "", function(jetpacks) {
        var output;

        if (!jetpacks || jetpacks.length < 1) {
            output = "You haven't installed any Jetpacks. Run '> jetpack create' to get going.";
        } else {
            output = "<u>Your Jetpack Features</u><br/><br/>";
            output += jetpacks.filter(endsJs).map(function(c) {
                return "<a href=\"javascript:command" +
                    ".executeCommand('open /" + exports.projectName + "/" + c.name + "');\">" +
                    c.name.replace(/\.js$/, '') + "</a>";
            }).join("<br>");
        }

        request.done(output);
    });
};

/**
 * 'jetpack edit' command
 */
exports.editCommand = function(env, args, request) {
    var path = feature + ".js";

    bespin.get("files").whenFileExists(exports.projectName, path, {
        execute: function() {
            bespin.get("editor").openFile(exports.projectName, path);
            request.done();
        },
        elseFailed: function() {
            request.doneWithError("No feature called " + feature + ".<br><br><em>Run 'jetpack list' to see what is available.</em>");
        }
    });
};

/**
 * Install a jetpack
 */
exports.install = function(feature) {
    // add the link tag to the body
    // <link rel="jetpack" href="path/feature.js">
    var link = dojo.create("link", {
        rel: "jetpack",
        href: path.combine("preview/at", exports.projectName, feature + ".js"),
        name: feature
    }, dojo.body());

    // Use the custom event to install
    // var event = document.createEvent("Events");
    // var element = document.getElementById("jetpackInstallEvent");
    //
    // // create a jetpack event element if it doesn't exist.
    // if (!element) {
    //     element = dojo.create("div", {
    //        id: "jetpackEvent",
    //     }, dojo.body());
    //     element.setAttribute("hidden", true);
    // }
    //
    // // set the code string to the "mozjpcode" attribute.
    // element.setAttribute("mozjpcode", bespin.get("editor").model.getDocument());
    //
    // // init and dispatch the event.
    // event.initEvent("mozjpinstall", true, false);
    // element.dispatchEvent(event);
};

/**
 * Utility to get the size of the drop-down border
 */
exports.sizeDropDownBorder = function(dd) {
    var keephidden = false;
    if (dd) {
        keephidden = true;
    } else {
        dd = document.getElementById("jetpack_dropdown");
    }

    if (keephidden) {
        dd.style.right = "-50000px";
        dd.style.display = "block";
    }

    var content_coords = dojo.coords("jetpack_dropdown_content");

    if (keephidden) {
        dd.style.right = "";
        dd.style.display = "none";
    }

    var styler = document.getElementById("jetpack_dropdown_border").style;
    styler.width = content_coords.w + "px";
    styler.height = content_coords.h + "px";
};

/**
 * Utility to load the installation scripts
 */
exports.loadInstallScripts = function() {
    bespin.get("server").list(exports.projectName, "", function(jetpacks) {
        var output;

        if (jetpacks && jetpacks.length > 0) {
            output += jetpacks.filter(endsJs).map(function(c) {
                return "<option>" + c.name.replace(/\.js$/, "") + "</option>";
            }).join("");
        }

        document.getElementById("jetpack_dropdown_input_install").innerHTML = output;
        exports.sizeDropDownBorder();
    });
};

/**
 * Private utility to check if the file.name ends with ".js"
 */
var endsJs = function(file) {
    return util.endsWith(file.name, "\\.js");
};
