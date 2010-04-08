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

var SC = require('sproutcore/runtime').SC;
var DOCK_RIGHT = require('dock_view').DOCK_RIGHT;

var ChatLineView = SC.View.extend(SC.StaticLayout, {
    content: null,
    useStaticLayout: true,

    render: function(ctx, firstTime) {
        if (!firstTime) {
            return;
        }

        ctx.begin('p').text(this.get('content')).end('p');
    }
});

exports.SocialView = SC.SplitView.design({
    dock: DOCK_RIGHT,
    layout: { width: 192, right: 0, top: 0, bottom: 0 },
    layoutDirection: SC.LAYOUT_VERTICAL,
    defaultThickness: 0.5,

    topLeftView: SC.ScrollView.design({
        layout: { top: 0, left: 0, right: 0, bottom: 0 },
        contentView: SC.ListView.design({
            layout: { top: 0, left: 0, right: 0, bottom: 0 },
            hasContentIcon: false,
            content: [ 'Spock', 'Picard', 'Kirk' ],
            canEditContent: false,
            canDeleteContent: false,
            canReorderContent: false
        })
    }),

    bottomRightView: SC.View.design({
        layout: { top: 0, left: 0, right: 0, bottom: 0 },
        childViews: 'chat input'.w(),

        chat: SC.ScrollView.design({
            layout: { top: 0, left: 0, right: 0, bottom: 24 },

            contentView: SC.StackedView.design({
                layout: { top: 0, left: 0, right: 0, bottom: 0 },
                exampleView: ChatLineView,
                content: []
            })
        }),

        input: SC.TextFieldView.design({
            layout: { bottom: 0, left: 0, right: 0, height: 22 },

            keyDown: function(evt) {
                if (evt.keyCode !== 13) {
                    return false;
                }

                window.setTimeout(function() {
                    SC.run(function() {
                        var chat = this.getPath('parentView.chat.contentView');

                        //
                        // Unless the reference identity of "content" changes,
                        // SproutCore mistakenly believes that the content
                        // didn't change. This means that we can't use the
                        // push() method: instead we need to clone the content
                        // and then append the element.
                        //
                        // Also, this.get('fieldValue') doesn't work: instead
                        // this.getFieldValue() must be used instead.
                        //

                        var content = chat.get('content');
                        content = content.concat(this.getFieldValue());
                        chat.set('content', content);

                        this.setFieldValue('');
                    }.bind(this));
                }.bind(this), 0);

                return true;
            }
        })
    })
});

exports.broadcastMsg = function (msg) {
    var social = require(editorapp).social;
    if (social) {
        var chat = social.getPath('bottomRightView.chat.contentView');
        
        // as Patrick explained above it is not easy to add changes
    
        var content = chat.get('content');
        content = content.concat(msg.from + ': ' + msg.text);
        chat.set('content', content);
    }
}
