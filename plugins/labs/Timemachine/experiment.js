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

var diff_match_patch = require("Diff");

// delta is something like: [[0,"readme.txt\nreadme.txt\n\n"],[-1,"\n411:39f6f1fe17bf"]]
// which means keep the first section, remove the latter
// we need to loop over this creating a list of start-change-offset
// and end-change-offset pairs, which we can turn into
// start/end-change-row/col using the utils in session.js
// we then tweak the editor paint to paint a background
// based on these offsets
// and then do this on a mouseover with hidden command

/**
 * 'timemachine' command
 */
canon.rootCanon.addCommand({
    execute: function(instruction, revision) {
        var self = this;
        if (!revision) {
            revision = "on";
        }

        var editor = bespin.get('editor');
        var session = bespin.get("editSession");

        var url;
        if (revision == "on") {
            url = path.combine('/history/at', session.project, session.path);
            bespin.get("server").request('GET', url, null, {
                evalJSON: true,
                onSuccess: instruction.link(function(history) {
                    instruction.setElement(self.historyToElement(history));
                    instruction.unlink();
                }),
                onFailure: instruction.link(function(xhr) {
                    instruction.addErrorOutput(xhr.responseText);
                    instruction.unlink();
                })
            });
        } else if (revision == "off") {
            editor.setReadOnly(self.prevROState);
            self.prevROState = undefined;

            editor.model.insertDocument(self.nowText);
            self.nowText = undefined;

            session.continueSession();
            self.inTimeMachine = false;
            instruction.unlink();
        } else {
            // This is where we need to do a diff and patch in to the editor
            // display
            url = path.combine('/file/at', session.project, session.path);
            url += "?revision=" + revision;
            bespin.get("server").request('GET', url, null, {
                onSuccess: instruction.link(function(older) {

                    if (!self.inTimeMachine) {
                        self.nowText = editor.model.getDocument();
                        session.pauseSession();

                        self.prevROState = editor.readonly;
                        editor.setReadOnly(true);
                    }
                    self.inTimeMachine = true;

                    editor.model.insertDocument(older);

                    var dmp = new diff_match_patch();

                    var delta = dmp.diff_main(self.nowText, older);

                    // dmp.diff_cleanupSemantic(delta);
                    var offset = 0;
                    var changes = [];
                    delta.forEach(function(region) {
                        switch (region[0]) {
                        case diff_match_patch.DIFF_EQUAL:
                            offset += region[1].length;
                            break;
                        case diff_match_patch.DIFF_INSERT:
                            var end = offset + region[1].length;
                            changes.push({
                                type: diff_match_patch.DIFF_INSERT,
                                start: session.convertOffsetToRowCol(offset),
                                end: session.convertOffsetToRowCol(end)
                            });
                            offset = end;
                            console.log("insert", region[1].length, " chars");
                            break;
                        case diff_match_patch.DIFF_DELETE:
                            changes.push({
                                type: diff_match_patch.DIFF_DELETE,
                                start: session.convertOffsetToRowCol(offset),
                                end: session.convertOffsetToRowCol(offset)
                            });
                            console.log("delete", region[1].length, " chars");
                            break;
                        default:
                            console.error("delta region with unknown type");
                        }
                    });

                    editor.ui.setChanges(changes);

                    bespin.publish("ui:escape", {});
                    instruction.unlink();
                }),
                onFailure: instruction.link(function(xhr) {
                    instruction.addErrorOutput(xhr.responseText);
                    instruction.unlink();
                })
            });
        }
    },
    historyToElement: function(history) {
        var table = dojo.create("table", { });
        history.forEach(function(entry) {
            var row = dojo.create("tr", { }, table);

            dojo.create("td", {
                innerHTML: util.formatDate(new Date(entry.date * 1000))
            }, row);
            var cell = dojo.create("td", { }, row);
            dojo.create("a", {
                innerHTML: "Overlay",
                onclick: function() {
                    cliController.executeCommand("timemachine " + entry.id);
                }
            }, cell);
            dojo.create("td", { innerHTML: entry.description }, row);
        });
        return table;
    }
});
