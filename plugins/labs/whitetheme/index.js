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
        global: {
            // standard font.
            font:           'arial, lucida, helvetica, sans-serif',
            // standard font size.
            font_size:      '14px',
            // standard line_height.
            line_height:    '1.8em',
            // text color.
            color:          '#2E2E3D',

            text_shadow:    '1px 1px white',
            // text error color.
            error_color:    '#C03A38',
            // the color for headers (<h1> etc).
            header_color:   '#222222',
            // the color for links.
            link_color:     '#597BAC',

            pane: {
                h1: {
                   font:        "'MuseoSans', Helvetica",
                   font_size:   '2.8em',
                   color:       "#2C3480",
                },

                link_color:     '@global_link_color',

                background:     '#DFDFDF',
                border_radius:  '.5em',

                color:          '#2E2E3D',
                text_shadow:    '1px 1px #DDD'
            },

            form: {
                font: "@global_font",
                font_size: '@global_font_size',
                line_height: '@global_line_height',

                color: 'black',
                text_shadow: '0px 0px transparent'
            },

            // Basic colors for a controller: textInput, tree etc.
            control: {
                color:          '#222',
                border:         '1px solid rgba(0, 0, 0, 0.2)',
                border_radius:  '0.25em',
                background:     'rgba(0, 0, 0, 0.1)',

                active: {
                    color:          '#000',
                    border:         '1px solid #597BAC',
                    inset_color:    '#597BAC',
                    background:     'rgba(0, 0, 0, 0.1)'
                }
            },

            button: {
                color: 'white',
                background: '#3E6CB9'
            },

            // Every UI element lives inside of a container. The command line,
            // file tree etc.
            container: {
                background:     '#F8F8F8',
                border:         '1px solid black',
            },

            // The items in the cl menu or something else, that can get selected.
            selectable: {
                color:          'black',
                border:         '0px solid transparent',
                background:     'transparent',

                active: {
                    color:          'white',
                    border:         '0px solid transparent',
                    background:     '#6780E4'
                },

                hover: {
                    color:          'white',
                    border:         '0px solid transparent',
                    background:     '#6780E4'
                }
            },

            // A small hint text.
            hint: {
                color:          '#78788D',

                active: {
                    color:      'white',
                },

                hover: {
                    color:      'white',
                }
            },

            // E.g. the small 'ATL-2' for selecting an item from the
            // command line menu when you execute 'open '.
            accelerator: {
                color:          '#344DB1',

                active: {
                    color:      'white',
                },

                hover: {
                    color:      'white',
                }
            },

            menu: {
                border_color:   'black',
                inset_color:    '#999',
                background:     'transparent'
            }
        },

        text_editor: {
            // Theme of the gutter:
            gutter: {
                color: '#888888',
                backgroundColor: '#d2d2d2'
            },

            // Theme of the editor:
            editor: {
                color: '#3D3D3D',
                backgroundColor: '#ffffff',

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
            },

            scroller: {
                padding: 5,
                thickness: 17,

                backgroundStyle: "#2A211C",

                fullAlpha: 1.0,
                particalAlpha: 0.3,

                nibStyle: "rgb(150, 150, 150)",
                nibArrowStyle: "rgb(255, 255, 255)",
                nibStrokeStyle: "white",

                trackFillStyle: "rgba(50, 50, 50, 0.2)",
                trackStrokeStyle: "rgb(150, 150, 150)",

                barFillStyle: "rgb(60, 60, 60)",
                barFillGradientTopStart: "rgb(150, 150, 150)",
                barFillGradientTopStop: "rgb(100, 100, 100)",
                barFillGradientBottomStart: "rgb(82, 82, 82)",
                barFillGradientBottomStop: "rgb(104, 104, 104)"
            }
        }
    }
};
