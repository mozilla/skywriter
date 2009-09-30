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

dojo.provide("bespin.themes.pastels");

/**
 * Pastels Theme by Irakli Gozalishvili
 */
exports.pastels = {
    backgroundStyle: "#221e1e",
    gutterStyle: "#4c4a41",
    lineNumberColor: "#e5c138",
    lineNumberFont: "10pt Monaco, Lucida Console, monospace",
    lineMarkerErrorColor: "#CC4444",
    lineMarkerWarningColor: "#B8860B",
    lineMarkerMessageColor: "green",
    zebraStripeColor: "#221e1e",
    highlightCurrentLineColor: "#342e2e",
    editorTextColor: "rgb(230, 230, 230)",
    editorTextFont: "10pt Monaco, Lucida Console, monospace",
    editorSelectedTextColor: "rgb(240, 240, 240)",
    editorSelectedTextBackground: "#473649",
    cursorStyle: "#6868f9",
    cursorType: "ibeam",      // one of "underline" or "ibeam"
    unfocusedCursorStrokeStyle: "#FF0033",
    unfocusedCursorFillStyle: "#73171E",
    partialNibStyle: "rgba(100, 100, 100, 0.3)",
    partialNibArrowStyle: "rgba(255, 255, 255, 0.3)",
    partialNibStrokeStyle: "rgba(150, 150, 150, 0.3)",
    fullNibStyle: "rgb(100, 100, 100, 0.5)",
    fullNibArrowStyle: "rgba(255, 255, 255, 0.5)",
    fullNibStrokeStyle: "rgba(150, 150, 150, 0.5)",
    scrollTrackFillStyle: "rgba(50, 50, 50, 0.2)",
    scrollTrackStrokeStyle: "rgba(150, 150, 150, 0.2)",
    scrollBarFillStyle: "rgba(0, 0, 0, 0.5)",
    scrollBarFillGradientTopStart: "rgba(90, 90, 90, 0.5)",
    scrollBarFillGradientTopStop: "rgba(40, 40, 40, 0.5)",
    scrollBarFillGradientBottomStart: "rgba(22, 22, 22, 0.3)",
    scrollBarFillGradientBottomStop: "rgba(44, 44, 44, 0.3)",
    tabSpace: "#252121",

    // syntax definitions
    plain: "#bdae9d",
    keyword: "#999efd",
    string: "#aa9361",
    comment: "#555555",
    'c-comment': "#666666",
    punctuation: "#47b8bd",
    attribute: "#a83e71",
    test: "rgb(255,0,0)",
    cdata: "#bdae9d",
    "attribute-value": "#bfc330",
    tag: "#ea8b1a",
    color: "#c4646b",
    "tag-name": "#1abbda",
    value: "#6ad964",
    important: "#dc0055",
    sizes: "#d98ccb",
    cssclass: "#ea8b1a",
    cssid: "#46a8ed",

    atom: "#ea8b1a",
    variable: "#72D5A2",
    variabledef: "#bfc330",
    localvariable: "#c4646b",
    property: "#93E1E3",
    operator: "#1abbda",
    error: "#dc0055",

    // XML and HTML
    processing: "#999999",
    entity: "#AA2222",
    text: "#b0a46d",

    // PHP
    "compile-time-constant": "#776088",
    "predefined-class": "#22FF22",
    "reserved-language-construct": "#00FF00",
    "predefined-function": "#22FF22",
    "predefined-class": "#22FF22",

    literal: "#dd6138",
    identifier: "#63d763",
    func: "#bc5d8b",
    type: "#6481d9",
    decorator: "#a83e71"
};

/**
 * Pastels Zebra Theme
 */
exports.pastelszebra = {};
dojo.mixin(exports.pastelszebra, exports.pastels);
exports.pastelszebra.zebraStripeColor = '#242020';
