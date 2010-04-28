/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an 'AS IS' basis,
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

exports.whiteTheme = function() {

    return {
        text_editor: {
            // Theme of the gutter:
            gutter: {
                color: '#888888',
                backgroundColor: '#d2d2d2'
            },

            // Theme of the editor:
            editor: {
                color: '#3D3D3D',
                backgroundColor: '#FFFFFF',

                cursorColor: '#000000',
                selectedTextBackgroundColor: '#BDD9FC',

                unfocusedCursorColor: '#57A1FF',
                unfocusedCursorBackgroundColor: '#D9E9FC'
            },

            highlighter: {
                plain:     '#3D3D3D',
                comment:   '#A8A8A8',
                directive: '#999999',
                error:      '#ff0000',
                identifier: '#000000',
                keyword:    '#0000ff',
                operator:   '#88BBFF',
                string:     '#039A0A'
            }
        },

        command_line: {
            background: '#706F63 + #111'
        },

        screen_theme: {
            scollerButtonColor: 'rgb(100, 100, 100)',
            scrollerThumbColor: 'orange',
            scrollerButtonThumbOutline: 'rgb(150, 150, 150)',
            scrollerTrackBackgroundColor: '#DDD',
            scrollerTrackBorderColor: 'rgb(160, 160, 160)',
        }
    }
};
