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

var server = require('bespin_server').server;
var catalog = require('bespin:plugins').catalog;
var env = require('environment').env;
var project_m = require('project');

var social_user = require('collab:user');
var util = require('collab:util');

/*
var ChatLineView = SC.View.extend(SC.StaticLayout, {
    content: null,
    useStaticLayout: true,

    render: function(ctx, firstTime) {
        if (!firstTime) {
            return;
        }
        
        var msg = this.get('content'), from = msg.from, text;

        switch (msg.msgtargetid) {
            case 'file_event':
                text = msg.event + ' /' + msg.owner + '+' + msg.project + '/' + msg.path;
                break;
            default:
                text = msg.text;
                break;
        }

        ctx.begin().
            addClass('social_msg').
            addClass('social_msg_type_' + msg.msgtargetid).
            begin('span').
                addClass('social_msg_from').
                text(from).
                push(':&nbsp;').
            end().
            begin('span').
                addClass('social_msg_text').
                text(text).
            end().
        end();
    }
});

var AvatarLineView = SC.View.extend(SC.StaticLayout, {
    content: null,
    useStaticLayout: false,
    classNames: ['social_user'],

    render: function(ctx, firstTime) {
        if (!firstTime) {
            return;
        }
        
        var username = this.get('content');
        var userdata = social_user.getUserDataIfAvailable(username);

        ctx.begin().
            addClass('social_user_name_' + username).
            begin().
                begin('img').
                    addClass('social_user_avatar').
                    attr({
                        width:  32,
                        height: 32,
                        src:    social_user.getAvatarImageUrl(username, 64)
                    }).
                end().
                begin('span').
                    addClass('social_user_name').
                    text(username).
                end().
            end().
            begin().
                begin('a').
                    addStyle({
                        display: userdata ? 'inline' : 'none'
                    }).
                    attr({
                        href:   social_user.getOhlohLink(username),
                        target: '_blank'
                    }).
                    begin('img').
                        addClass('social_user_ohloh_badge').
                        attr({
                            src: social_user.getOhlohBadgeUrl(username, 64)
                        }).
                    end().
                end().
            end().
            begin('hr').end().
        end();
    }
});
*/

/**
 * The singleton instance of the social pane.
 */
exports.social = null;

/**
 * The social pane class.
 */
/*
exports.SocialView = SC.SplitView.design({
    layout: { width: 192, right: 0, top: 0, bottom: 0 },
    layoutDirection: SC.LAYOUT_VERTICAL,
    defaultThickness: 0.5,

    init: function() {
        arguments.callee.base.apply(this, arguments);

        // Bit of an unfortunate hack here...
        exports.social = this;
    },

    topLeftView: SC.ScrollView.design({
        layout: { top: 0, left: 0, right: 0, bottom: 0 },
        contentView: SC.ListView.design({
            layout: { top: 0, left: 0, right: 0, bottom: 0 },
            hasContentIcon: false,
            exampleView: AvatarLineView,
            content: [],
            canEditContent: false,
            canDeleteContent: false,
            canReorderContent: false,
            rowHeight:  80,
            rowSpacing: 5
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

                        var text = this.getFieldValue();
                        this.setFieldValue('');

                        if (/^\s*$/.test(text)) {
                            return;
                        }

                        var content = chat.get('content');
                        var username = env.session.currentUser;
                        content = content.concat({
                            msgtargetid: 'myself',
                            from: username,
                            text: text
                        });
                        chat.set('content', content);

                        // get the list of users
                        var list = this.getPath('parentView.parentView.' +
                            'topLeftView.contentView');

                        // remove ourselves
                        var recipients = list.get('content').filter(function (recipient) {
                            return recipient != username;
                        });
                        // send the message
                        share_tell(recipients, text);
                    }.bind(this));
                }.bind(this), 0);

                return true;
            }
        })
    })
});
*/

function formatUser(msg){
    return util.replace(
        '<img width="16" height="16" class="social_user_name_{name}" src="{url}">&nbsp;<strong>{name}</strong>',
        {
            name: msg.from,
            url: social_user.getAvatarImageUrl(msg.from, 16)
        }
    );
}

exports.broadcastMsg = function (msg) {
    var notifier = catalog.getObject('notifier');
    notifier.notify({
        plugin: 'collab',
        notification: 'broadcast',
        body: formatUser(msg) + ' broadcasts:<br>' + msg.text
    });
}


exports.tellMsg = function (msg) {
    var notifier = catalog.getObject('notifier');
    notifier.notify({
        plugin: 'collab',
        notification: 'tell',
        body: formatUser(msg) + ' tells to you:<br>' + msg.text
    });
}

/* temporarily */
exports.shareTellMsg = function (msg) {
    var notifier = catalog.getObject('notifier');
    notifier.notify({
        plugin: 'collab',
        notification: 'shareTell',
        body: formatUser(msg) + ' tells to you:<br>' + msg.text
    });
}


exports.fileEventMsg = function (msg) {
    var notifier = catalog.getObject('notifier');
    notifier.notify({
        plugin: 'collab',
        notification: 'fileEvent',
        body: formatUser(msg) + util.replace(' works with files:<br>{event} /{owner}+{project}/{path}', msg)
    });
}


/**
 * share-tell method
 */
function share_tell (recipients, text, opts) {
    if (recipients.length && text) {
        var file = env.file;
        if (file) {
            var project = project_m.getProjectAndPath(file.path);
            if (project[0]) {
                server.request('POST', '/share/tell/' + project[0].name + '/',
                    JSON.stringify({text: text, recipients: recipients}), opts || {});
            }
        }
    }
};
