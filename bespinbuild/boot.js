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

// This module is set up to be dependency-less so that Narwhal
// will be able to run it right away.


SC.ready(function() {
    var embed = tiki.require("BespinEmbedded");
    var nodes = document.querySelectorAll(".bespin");
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var options = node.getAttribute('data-bespinoptions');
        embed.useBespin(node, JSON.parse(options));
    }

    // If users want a custom startup
    if (window.onBespinLoad) {
        window.onBespinLoad();
    }
}
);

window.onload=SC.didLoad;
