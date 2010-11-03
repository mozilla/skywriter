require.def(['require', 'exports', 'module',
    'skywriter/plugins'
], function(require, exports, module,
    plugins
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

exports.startup = function(data, reason) {
    var catalog = plugins.catalog;
    catalog.connect("themestyles", module.id, { "url": [ "theme.less" ] });
    catalog.connect("themevariable", module.id, { "name": "container_font", "defaultValue": "@global_font" });
    catalog.connect("themevariable", module.id, { "name": "container_font_size", "defaultValue": "@global_font_size" });
    catalog.connect("themevariable", module.id, { "name": "container_bg", "defaultValue": "@global_container_background" });
    catalog.connect("themevariable", module.id, { "name": "container_color", "defaultValue": "@global_color" });
    catalog.connect("themevariable", module.id, { "name": "container_line_height", "defaultValue": "@global_line_height" });
    catalog.connect("themevariable", module.id, { "name": "pane_bg", "defaultValue": "@global_pane_background" });
    catalog.connect("themevariable", module.id, {
        "name": "pane_border_radius",
        "defaultValue": "@global_pane_border_radius"
    });
    catalog.connect("themevariable", module.id, { "name": "form_font", "defaultValue": "@global_form_font" });
    catalog.connect("themevariable", module.id, { "name": "form_font_size", "defaultValue": "@global_form_font_size" });
    catalog.connect("themevariable", module.id, { "name": "form_line_height", "defaultValue": "@global_form_line_height" });
    catalog.connect("themevariable", module.id, { "name": "form_color", "defaultValue": "@global_form_color" });
    catalog.connect("themevariable", module.id, { "name": "form_text_shadow", "defaultValue": "@global_form_text_shadow" });
    catalog.connect("themevariable", module.id, { "name": "pane_a_color", "defaultValue": "@global_pane_link_color" });
    catalog.connect("themevariable", module.id, { "name": "pane_font", "defaultValue": "@global_font" });
    catalog.connect("themevariable", module.id, { "name": "pane_font_size", "defaultValue": "@global_font_size" });
    catalog.connect("themevariable", module.id, { "name": "pane_text_shadow", "defaultValue": "@global_pane_text_shadow" });
    catalog.connect("themevariable", module.id, { "name": "pane_h1_font", "defaultValue": "@global_pane_h1_font" });
    catalog.connect("themevariable", module.id, { "name": "pane_h1_font_size", "defaultValue": "@global_pane_h1_font_size" });
    catalog.connect("themevariable", module.id, { "name": "pane_h1_color", "defaultValue": "@global_pane_h1_color" });
    catalog.connect("themevariable", module.id, { "name": "pane_line_height", "defaultValue": "@global_font_size * 1.8" });
    catalog.connect("themevariable", module.id, { "name": "pane_color", "defaultValue": "@global_pane_color" });
    catalog.connect("themevariable", module.id, { "name": "pane_text_shadow", "defaultValue": "@global_text_shadow" });
    catalog.connect("themevariable", module.id, { "name": "button_font", "defaultValue": "@global_font" });
    catalog.connect("themevariable", module.id, { "name": "button_font_size", "defaultValue": "@global_font_size" });
    catalog.connect("themevariable", module.id, { "name": "button_color", "defaultValue": "@global_button_color" });
    catalog.connect("themevariable", module.id, { "name": "button_bg", "defaultValue": "@global_button_background" });
    catalog.connect("themevariable", module.id, { "name": "button_bg2", "defaultValue": "@button_bg - #063A27" });
    catalog.connect("themevariable", module.id, { "name": "button_border", "defaultValue": "@button_bg - #194A5E" });
    catalog.connect("themevariable", module.id, { "name": "control_bg", "defaultValue": "@global_control_background" });
    catalog.connect("themevariable", module.id, { "name": "control_color", "defaultValue": "@global_control_color" });
    catalog.connect("themevariable", module.id, { "name": "control_border", "defaultValue": "@global_control_border" });
    catalog.connect("themevariable", module.id, {
        "name": "control_border_radius",
        "defaultValue": "@global_control_border_radius"
    });
    catalog.connect("themevariable", module.id, {
        "name": "control_active_bg",
        "defaultValue": "@global_control_active_background"
    });
    catalog.connect("themevariable", module.id, {
        "name": "control_active_border",
        "defaultValue": "@global_control_active_border"
    });
    catalog.connect("themevariable", module.id, {
        "name": "control_active_color",
        "defaultValue": "@global_control_active_color"
    });
    catalog.connect("themevariable", module.id, {
        "name": "control_active_inset_color",
        "defaultValue": "@global_control_active_inset_color"
    });
};

exports.shutdown = function(data, reason) {
    catalog.disconnectAll(module.id);
};

exports.startup = function(data, reason) {
    var catalog = plugins.catalog;
    catalog.connect("themestyles", module.id, { "url": [ "theme.less" ] });
    catalog.connect("themevariable", module.id, { "name": "container_font", "defaultValue": "@global_font" });
    catalog.connect("themevariable", module.id, { "name": "container_font_size", "defaultValue": "@global_font_size" });
    catalog.connect("themevariable", module.id, { "name": "container_bg", "defaultValue": "@global_container_background" });
    catalog.connect("themevariable", module.id, { "name": "container_color", "defaultValue": "@global_color" });
    catalog.connect("themevariable", module.id, { "name": "container_line_height", "defaultValue": "@global_line_height" });
    catalog.connect("themevariable", module.id, { "name": "pane_bg", "defaultValue": "@global_pane_background" });
    catalog.connect("themevariable", module.id, {
        "name": "pane_border_radius",
        "defaultValue": "@global_pane_border_radius"
    });
    catalog.connect("themevariable", module.id, { "name": "form_font", "defaultValue": "@global_form_font" });
    catalog.connect("themevariable", module.id, { "name": "form_font_size", "defaultValue": "@global_form_font_size" });
    catalog.connect("themevariable", module.id, { "name": "form_line_height", "defaultValue": "@global_form_line_height" });
    catalog.connect("themevariable", module.id, { "name": "form_color", "defaultValue": "@global_form_color" });
    catalog.connect("themevariable", module.id, { "name": "form_text_shadow", "defaultValue": "@global_form_text_shadow" });
    catalog.connect("themevariable", module.id, { "name": "pane_a_color", "defaultValue": "@global_pane_link_color" });
    catalog.connect("themevariable", module.id, { "name": "pane_font", "defaultValue": "@global_font" });
    catalog.connect("themevariable", module.id, { "name": "pane_font_size", "defaultValue": "@global_font_size" });
    catalog.connect("themevariable", module.id, { "name": "pane_text_shadow", "defaultValue": "@global_pane_text_shadow" });
    catalog.connect("themevariable", module.id, { "name": "pane_h1_font", "defaultValue": "@global_pane_h1_font" });
    catalog.connect("themevariable", module.id, { "name": "pane_h1_font_size", "defaultValue": "@global_pane_h1_font_size" });
    catalog.connect("themevariable", module.id, { "name": "pane_h1_color", "defaultValue": "@global_pane_h1_color" });
    catalog.connect("themevariable", module.id, { "name": "pane_line_height", "defaultValue": "@global_font_size * 1.8" });
    catalog.connect("themevariable", module.id, { "name": "pane_color", "defaultValue": "@global_pane_color" });
    catalog.connect("themevariable", module.id, { "name": "pane_text_shadow", "defaultValue": "@global_text_shadow" });
    catalog.connect("themevariable", module.id, { "name": "button_font", "defaultValue": "@global_font" });
    catalog.connect("themevariable", module.id, { "name": "button_font_size", "defaultValue": "@global_font_size" });
    catalog.connect("themevariable", module.id, { "name": "button_color", "defaultValue": "@global_button_color" });
    catalog.connect("themevariable", module.id, { "name": "button_bg", "defaultValue": "@global_button_background" });
    catalog.connect("themevariable", module.id, { "name": "button_bg2", "defaultValue": "@button_bg - #063A27" });
    catalog.connect("themevariable", module.id, { "name": "button_border", "defaultValue": "@button_bg - #194A5E" });
    catalog.connect("themevariable", module.id, { "name": "control_bg", "defaultValue": "@global_control_background" });
    catalog.connect("themevariable", module.id, { "name": "control_color", "defaultValue": "@global_control_color" });
    catalog.connect("themevariable", module.id, { "name": "control_border", "defaultValue": "@global_control_border" });
    catalog.connect("themevariable", module.id, {
        "name": "control_border_radius",
        "defaultValue": "@global_control_border_radius"
    });
    catalog.connect("themevariable", module.id, {
        "name": "control_active_bg",
        "defaultValue": "@global_control_active_background"
    });
    catalog.connect("themevariable", module.id, {
        "name": "control_active_border",
        "defaultValue": "@global_control_active_border"
    });
    catalog.connect("themevariable", module.id, {
        "name": "control_active_color",
        "defaultValue": "@global_control_active_color"
    });
    catalog.connect("themevariable", module.id, {
        "name": "control_active_inset_color",
        "defaultValue": "@global_control_active_inset_color"
    });
};

exports.shutdown = function(data, reason) {
    catalog.disconnectAll(module.id);
};

exports.startup = function(data, reason) {
    var catalog = plugins.catalog;
    catalog.connect("themestyles", module.id, { "url": [ "theme.less" ] });
    catalog.connect("themevariable", module.id, { "name": "container_font", "defaultValue": "@global_font" });
    catalog.connect("themevariable", module.id, { "name": "container_font_size", "defaultValue": "@global_font_size" });
    catalog.connect("themevariable", module.id, { "name": "container_bg", "defaultValue": "@global_container_background" });
    catalog.connect("themevariable", module.id, { "name": "container_color", "defaultValue": "@global_color" });
    catalog.connect("themevariable", module.id, { "name": "container_line_height", "defaultValue": "@global_line_height" });
    catalog.connect("themevariable", module.id, { "name": "pane_bg", "defaultValue": "@global_pane_background" });
    catalog.connect("themevariable", module.id, {
        "name": "pane_border_radius",
        "defaultValue": "@global_pane_border_radius"
    });
    catalog.connect("themevariable", module.id, { "name": "form_font", "defaultValue": "@global_form_font" });
    catalog.connect("themevariable", module.id, { "name": "form_font_size", "defaultValue": "@global_form_font_size" });
    catalog.connect("themevariable", module.id, { "name": "form_line_height", "defaultValue": "@global_form_line_height" });
    catalog.connect("themevariable", module.id, { "name": "form_color", "defaultValue": "@global_form_color" });
    catalog.connect("themevariable", module.id, { "name": "form_text_shadow", "defaultValue": "@global_form_text_shadow" });
    catalog.connect("themevariable", module.id, { "name": "pane_a_color", "defaultValue": "@global_pane_link_color" });
    catalog.connect("themevariable", module.id, { "name": "pane_font", "defaultValue": "@global_font" });
    catalog.connect("themevariable", module.id, { "name": "pane_font_size", "defaultValue": "@global_font_size" });
    catalog.connect("themevariable", module.id, { "name": "pane_text_shadow", "defaultValue": "@global_pane_text_shadow" });
    catalog.connect("themevariable", module.id, { "name": "pane_h1_font", "defaultValue": "@global_pane_h1_font" });
    catalog.connect("themevariable", module.id, { "name": "pane_h1_font_size", "defaultValue": "@global_pane_h1_font_size" });
    catalog.connect("themevariable", module.id, { "name": "pane_h1_color", "defaultValue": "@global_pane_h1_color" });
    catalog.connect("themevariable", module.id, { "name": "pane_line_height", "defaultValue": "@global_font_size * 1.8" });
    catalog.connect("themevariable", module.id, { "name": "pane_color", "defaultValue": "@global_pane_color" });
    catalog.connect("themevariable", module.id, { "name": "pane_text_shadow", "defaultValue": "@global_text_shadow" });
    catalog.connect("themevariable", module.id, { "name": "button_font", "defaultValue": "@global_font" });
    catalog.connect("themevariable", module.id, { "name": "button_font_size", "defaultValue": "@global_font_size" });
    catalog.connect("themevariable", module.id, { "name": "button_color", "defaultValue": "@global_button_color" });
    catalog.connect("themevariable", module.id, { "name": "button_bg", "defaultValue": "@global_button_background" });
    catalog.connect("themevariable", module.id, { "name": "button_bg2", "defaultValue": "@button_bg - #063A27" });
    catalog.connect("themevariable", module.id, { "name": "button_border", "defaultValue": "@button_bg - #194A5E" });
    catalog.connect("themevariable", module.id, { "name": "control_bg", "defaultValue": "@global_control_background" });
    catalog.connect("themevariable", module.id, { "name": "control_color", "defaultValue": "@global_control_color" });
    catalog.connect("themevariable", module.id, { "name": "control_border", "defaultValue": "@global_control_border" });
    catalog.connect("themevariable", module.id, {
        "name": "control_border_radius",
        "defaultValue": "@global_control_border_radius"
    });
    catalog.connect("themevariable", module.id, {
        "name": "control_active_bg",
        "defaultValue": "@global_control_active_background"
    });
    catalog.connect("themevariable", module.id, {
        "name": "control_active_border",
        "defaultValue": "@global_control_active_border"
    });
    catalog.connect("themevariable", module.id, {
        "name": "control_active_color",
        "defaultValue": "@global_control_active_color"
    });
    catalog.connect("themevariable", module.id, {
        "name": "control_active_inset_color",
        "defaultValue": "@global_control_active_inset_color"
    });
};

exports.shutdown = function(data, reason) {
    catalog.disconnectAll(module.id);
};
