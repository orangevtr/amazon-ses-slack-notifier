'use strict';

const slack_webhook_url = process.env.SLACK_WEBHOOK_URL;
const slack = require('slack-notify')(slack_webhook_url);

const WEBHOOK_OPTION_FIELDS = [
    'channel',
    'icon_emoji',
    'username'
];

const notifier = (message, attachments, options) => {
    const params = {};
    if (options) {
        WEBHOOK_OPTION_FIELDS.forEach((element) => {
            if (options[element]) {
                params[element] = options[element];
            }
        });
    }

    params.attachments = [
        {
            author_name: message.author_name,
            title: message.title,
            text: message.body,
            footer: message.footer,
            ts: Math.floor(message.date / 1000)
        }
    ];

    if (attachments) {
        attachments.forEach((attachment) => {
            params.attachments.push({
                title: attachment.name,
                title_link: attachment.link
            });
        });
    }

    return new Promise((resolve, reject) => {
        slack.send(params, (error) => {
            if (!error) {
                resolve();
            } else {
                reject(error);
            }
        });
    });
}

module.exports = notifier;
