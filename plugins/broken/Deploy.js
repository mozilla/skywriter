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
 
"define metadata";
({});
"end";

var bespin = require("bespin");
var util = require("bespin/util/util");
var command = require("bespin/command");
var vcs = require("bespin/vcs");
var server = require("bespin/client/server");

exports._createOption = function(select, value, label, currentValue) {
    var opts = {
        value: value,
        innerHTML: label
    };
    if (currentValue == value) {
        opts.selected = true;
    }
    dojo.create("option", opts, select);
};

exports.commands.addCommand({
    "name": "setup",
    "description": "Set deployment options for the project",
    "params":
    [
        {
            "name": "project",
            "type": "text",
            "description": "The project to setup"
        }
    ],
    execute: function(request, args) {
        var project = args.project;
        if (!project) {
            request.doneWithError("You need to pass in a project");
            return;
        }

        vcs.getInfoFromUser(request, function(values) {
            var kcpass = values.kcpass;

            getDeploySetup(project, { kcpass:kcpass }, {
                onSuccess: function(currentSetup) {
                    console.log(currentSetup);

                    if (currentSetup == null) {
                        currentSetup = {};
                    }

                    var form = dojo.create("form", {
                        onsubmit: function(e) {
                            util.stopEvent(e);
                            request.add("");
                            var data = dojo.formToObject(form);
                            saveDeploySetup(project, data, {
                                onSuccess: function() {
                                    request.done("Deployment settings applied for " + project);
                                }
                            });
                        }
                    });
                    var table = dojo.create("table", {}, form);

                    // Connection type
                    var tr = dojo.create("tr", {}, table);
                    var td = dojo.create("td", { innerHTML: "Connection type:" }, tr);
                    td = dojo.create("td", {}, tr);
                    var connType = dojo.create("select", { name:"connType" }, td);
                    dojo.create("option", {value:"sftp", innerHTML: "SFTP" }, connType);

                    // Remote host
                    tr = dojo.create("tr", {}, table);
                    td = dojo.create("td", { innerHTML: "Remote host:" }, tr);
                    td = dojo.create("td", {}, tr);
                    dojo.create("input", {
                        name: "remoteHost",
                        value: currentSetup.remoteHost || ""
                    }, td);

                    // Remote directory
                    tr = dojo.create("tr", {}, table);
                    td = dojo.create("td", {
                        innerHTML: "Remote directory:"
                    }, tr);
                    td = dojo.create("td", {}, tr);
                    dojo.create("input", {
                        name: "remoteDirectory",
                        value: currentSetup.remoteDirectory || ""
                    }, td);

                    if (!vcs._keychainpw) {
                        // Keychain password
                        tr = dojo.create("tr", {}, table);
                        td = dojo.create("td", {innerHTML: "Keychain password"}, tr);
                        td = dojo.create("input", {type: "password", name: "kcpass"}, tr);
                    } else {
                        dojo.create("input", {
                            type: "hidden",
                            name: "kcpass",
                            value: vcs._keychainpw
                        }, td);
                    }

                    var pwrow;

                    // Auth type
                    tr = dojo.create("tr", {}, table);
                    td = dojo.create("td", {innerHTML: "Authentication type:"}, tr);
                    td = dojo.create("td", {}, tr);
                    var select = dojo.create("select", {name: "authType",
                        onchange: function(e) {
                            if (this.value == "ssh") {
                                pwrow.style.display = "none";
                            } else {
                                pwrow.style.display = "table-row";
                            }
                        }}, td);
                    exports._createOption(select, "ssh", "SSH Key", currentSetup.authType);
                    exports._createOption(select, "password", "Password", currentSetup.authType);

                    // Username
                    tr = dojo.create("tr", {}, table);
                    td = dojo.create("td", { innerHTML: "Username:" }, tr);
                    td = dojo.create("td", {}, tr);
                    dojo.create("input", {
                        type: "text",
                        name: "username",
                        value: currentSetup.username || ""
                    }, td);

                    // Password
                    pwrow = dojo.create("tr", {}, table);
                    td = dojo.create("td", { innerHTML: "Password:" }, pwrow);
                    td = dojo.create("td", {}, pwrow);
                    dojo.create("input", {
                        type: "password",
                        name: "password",
                        value: currentSetup.password || ""
                    }, td);

                    if (!currentSetup.authType || currentSetup.authType == "ssh") {
                        pwrow.style.display = "none";
                    }

                    // Buttons
                    tr = dojo.create("tr", {}, table);
                    td = dojo.create("td", {innerHTML: "&nbsp;"}, tr);
                    td = dojo.create("td", {}, tr);
                    dojo.create("input", {type: "submit", value: "Submit"}, td);
                    dojo.create("input", {type: "button", value: "Cancel",
                        onclick: function() {
                            request.doneWithError("Cancelled");
                        }}, td);

                    request.setElement(form);
                    connType.focus();
                }
            });
        }, {getKeychain: true});
    }
});

exports._deployCommand = function(request, project, opts) {
    if (!project) {
        var session = bespin.get("editSession");
        if (session) {
            project = session.project;
        }
    }

    if (!project) {
        request.doneWithError("You need to pass in a project");
        return;
    }

    var outer = dojo.create("div", {});
    var throbber = dojo.create("img", { src: "/images/throbber.gif" }, outer);
    var status = dojo.create("span", {innerHTML: "Working..."},
                outer);

    vcs.getInfoFromUser(request, function(values) {
        request.setElement(outer);

        var kcpass = values.kcpass;
        var data = {
            kcpass: kcpass,
            dryRun: opts.dryRun
        };
        runDeploy(request, project, data, {
            onSuccess: function(response) {
                if (response.error) {
                    request.doneWithError("<pre>" +
                        response.output + "</pre>");
                } else {
                    request.done("<pre>" + response.output + "</pre>");
                }
            },
            onFailure: function(xhr) {
                var contentType = xhr.getResponseHeader("Content-Type");
                var response = xhr.responseText;
                if (/^application\/json/.exec(contentType)) {
                    var data = JSON.parse(response);
                    if (data.notConfigured) {
                        request.doneWithError("<p>Deployment is not configured for this project. Please use the 'deploy setup' command to configure it.");
                        throw new Error("Should prepopulate CLI with 'deploy setup', however there is no way to do that right now");
                    } else {
                        request.doneWithError(xhr.responseText);
                    }
                } else {
                    request.doneWithError(xhr.responseText);
                }
            },
            onPartial: function(output) {
                status.innerHTML = output;
            }
        });
    }, { getKeychain: true });
};

exports.commands.addCommand({
    "name": "test",
    "description": "Do a 'dry run' to see what would happen in deployment",
    "params":
    [
        {
            "name": "project",
            "type": "text",
            "description": "The project to deploy"
        }
    ],
    execute: function(request, args) {
        exports._deployCommand(request, args.project, {
            dryRun: true
        });
    }
});

exports.commands.addCommand({
    "name": "now",
    "description": "Deploy project to the server now",
    "params":
    [
        {
            "name": "project",
            "type": "text",
            "description": "The project to deploy"
        }
    ],
    execute: function(request, args) {
        exports._deployCommand(request, args.project, {
            dryRun: false
        });
    }
});

var saveDeploySetup = function(project, data, opts) {
    opts = opts || {};
    opts.evalJSON = true;
    var url = "/project/deploy/" + encodeURI(project) + "/setup";
    data = JSON.stringify(data);
    bespin.get("server").request("PUT", url, data, opts);
};

var getDeploySetup = function(project, data, opts) {
    opts = opts || {};
    opts.evalJSON = true;
    var url = "/project/deploy/" + encodeURI(project) + "/setup";
    data = JSON.stringify(data);
    bespin.get("server").request("POST", url, data, opts);
};

var runDeploy = function(request, project, data, opts) {
    opts = opts || {};
    opts.evalJSON = true;
    var url = "/project/deploy/" + encodeURI(project) + "/";
    data = JSON.stringify(data);
    bespin.get("server").requestDisconnected("POST", url, data, request, opts);
};
