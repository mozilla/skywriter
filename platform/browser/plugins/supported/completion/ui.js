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

var $ = require('jquery').$;
var _ = require('underscore')._;

var ANIMATION_SPEED = 100;  // in ms

var populate_container_template =
    _.template('<span class="bespin-completion-container"> &mdash; ' +
        '<%= container %></span>');
var populate_second_row_template =
    _.template('<div class="bespin-completion-second-row"><%= type %></div>');
var populate_item_template =
    _.template('<li><div class="bespin-completion-top-row">' +
        '<span class="bespin-completion-kind bespin-completion-kind-' +
            '<%= kind %>"><%= kind %></span>' +
        '<span class="bespin-completion-ident"><%= ident %></span>' +
            '<%= container %></div><%= second_row %></li>');

function CompletionUI(parent) {
    var id = _.uniqueId('bespin-completion-panel');

    var panel = document.createElement("div");
    panel.id = id;
    panel.className = "bespin-completion-panel";
    panel.style.display = 'none';
    panel.innerHTML =
        '<div class="bespin-completion-pointer"></div>' +
        '<div class="bespin-completion-bubble-outer">' +
            '<div class="bespin-completion-bubble-inner">' +
                '<div class="bespin-completion-highlight"></div>' +
                '<ul></ul>' +
            '</div>' +
        '</div>';

    $(parent).append(panel);

    this.panel = $(panel);
    this.parent = $(parent);
}

CompletionUI.prototype = {
    _fromBottom: false,
    _index: 0,
    _tags: null,

    _getHighlightDimensions: function(elem) {
        var pos = elem.position();
        var height = elem.outerHeight() - 2;
        var width = elem.outerWidth() - 2;
        return { left: pos.left, top: pos.top, height: height, width: width };
    },

    _listItemForIndex: function(idx) {
        return this.panel.find("li:eq(" + idx + ")");
    },

    _populate: function() {
        var html = _(this._tags).map(function(tag) {
            var klass = tag['class'], module = tag.module, ns = tag.namespace;

            var container;
            if (klass != null) {
                container = klass;
            } else if (ns != null) {
                container = ns;
            } else {
                container = "";
            }

            if (module != null) {
                container = module + (container != "" ? "#" + container : "");
            }

            var container_html = (container == "") ? "" :
                populate_container_template({ container: container });

            var type = tag.type;
            var second_row_html = (type == null) ? "" :
                populate_second_row_template({ type: type });

            return populate_item_template({
                kind:       tag.kind,
                ident:      tag.name,
                container:  container_html,
                second_row: second_row_html
            });
        });

        this.panel.find("ul").html(html.join("\n"));
    },

    panel: null,
    visible: false,

    getCompletion: function() {
        return this.visible ? this._tags[this._index] : null;
    },

    hide: function() {
        if (!this.visible) {
            return;
        }

        this.panel.fadeOut(ANIMATION_SPEED);
        this.visible = false;
    },

    move: function(dir) {
        var index = this._index;

        var sel = this._listItemForIndex(index);

        var unsel = (dir === 'up') ? sel.prev() : sel.next();
        if (unsel.length === 0) {
            return;
        }

        index = (dir === 'up') ? index - 1 : index + 1;
        this._index = index;

        var selFirstRow = $(sel).find('.bespin-completion-top-row');
        var selSecondRow = $(sel).find('.bespin-completion-second-row');
        var unselFirstRow = $(unsel).find('.bespin-completion-top-row');
        var unselSecondRow = $(unsel).find('.bespin-completion-second-row');

        selSecondRow.hide();
        unselSecondRow.show();

        var highlight = this.panel.find(".bespin-completion-highlight");
        highlight.stop(true, true);
        var highlightDimensions = this._getHighlightDimensions(unsel);
        highlight.animate(highlightDimensions, ANIMATION_SPEED);
        unselSecondRow.hide();

        if (dir === 'down') {
            var height = selSecondRow.height();
            unselFirstRow.css('top', height);
            unselFirstRow.animate({ top: 0 }, ANIMATION_SPEED);
        } else {
            var height = unselSecondRow.height();
            selFirstRow.css('top', -height);
            selFirstRow.animate({ top: 0 }, ANIMATION_SPEED);
        }

        unselSecondRow.fadeIn();
    },

    show: function(tags, point, lineHeight) {
        var tags = _(tags).clone();
        this._tags = tags;

        this._populate();

        var visible = this.visible;
        var panel = this.panel;
        panel.stop(true, true);
        if (!visible) {
            panel.show();
        }

        var parentOffset = this.parent.offset();
        var parentX = parentOffset.left, parentY = parentOffset.top;
        var absX = parentX + point.x, absY = parentY + point.y;

        var panelWidth = panel.outerWidth(), panelHeight = panel.outerHeight();
        var windowWidth = $(window).width(), windowHeight = $(window).height();

        var fromBottom = absY + panelHeight + lineHeight > windowHeight;
        this._fromBottom = fromBottom;

        if (this._index >= tags.length) {
            this._index = tags.length - 1;
        }

        var pointer;
        if (fromBottom) {
            pointer = panel.find('.bespin-completion-pointer');
            pointer.removeClass('bespin-completion-pointer-up');
            pointer.addClass('bespin-completion-pointer-down');
            panel.css({ bottom: -point.y, top: "" });

            // Reverse the list.
            this._tags.reverse();
            this._populate();

            if (!visible) {
                this._index = tags.length - 1;
            }
        } else {
            pointer = panel.find('.bespin-completion-pointer');
            pointer.removeClass('bespin-completion-pointer-down');
            pointer.addClass('bespin-completion-pointer-up');
            panel.css({ top: point.y + lineHeight, bottom: "" });

            if (!visible) {
                this._index = 0;
            }
        }

        if (!visible) {
            var fromRight = absX + point.x + panelWidth > windowWidth;
            if (fromRight) {
                pointer.css({ left: "", right: 32 });
                panel.css('left', Math.min(windowWidth - panelWidth - parentX,
                    point.x - panelWidth + 43));
            } else {
                pointer.css({ left: 32, right: "" });
                panel.css('left', Math.max(parentX, point.x - 43));
            }

            panel.hide().animate({ opacity: 'show' }, ANIMATION_SPEED);
        }

        var highlight = panel.find(".bespin-completion-highlight");
        highlight.stop(true, true);
        var sel = this._listItemForIndex(this._index);
        sel.find(".bespin-completion-second-row").show();

        var highlightDimensions = this._getHighlightDimensions(sel);
        var highlightWidth = highlightDimensions.width;
        var highlightHeight = highlightDimensions.height;
        highlight.css(highlightDimensions);

        this.visible = true;
    }
};

exports.CompletionUI = CompletionUI;

