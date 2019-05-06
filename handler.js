'use strict';

const AWS = require('aws-sdk');

const s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    region: process.env.AWSREGION,
});

const simpleParser = require('mailparser').simpleParser;

const notifier = require('./lib/slack-notify-message.js');

const options = {
    channel: '#mailbox',
};

module.exports.postprocess = async(event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    const record = event.Records[0];
    // Retrieve the email from your bucket
    const request = {
        Bucket: record.s3.bucket.name,
        Key: record.s3.object.key,
    };

    try {
        const data = await s3.getObject(request).promise();
        console.log('Raw email:' + data.Body);
        const email = await simpleParser(data.Body);
        console.log('date:', email.date);
        console.log('subject:', email.subject);
        console.log('body:', email.text);
        console.log('from:', email.from.text);
        console.log('attachments:', email.attachments);

        const message = {
            author_name: email.from.text,
            title: email.subject,
            body: email.text,
            footer: 'amazon-ses-slack-notifier',
            date: email.date
        };

        console.log(JSON.stringify(message))

        const attachments = [];
        for (let i = 0; i < email.attachments.length; i++) {
            const attachment = email.attachments[i];
            const upload_request = {
                Bucket: process.env.ATTACHMENT_STORAGE_BUCKET,
                Key: [email.messageId, attachment.filename].join('/'),
                Body: attachment.content,
                ContentType: attachment.contentType,
                ACL: 'public-read'
            };
            const upload_result = await s3.upload(upload_request).promise();
            console.log('uploaded result on S3: ');
            console.log(upload_result);
            attachments.push({
                name: attachment.filename,
                link: upload_result.Location
            });
        }

        console.log(JSON.stringify(attachments))

        await notifier(message, attachments, options);

        return {
            status: 'success'
        };
    } catch (Error) {
        console.log(Error, Error.stack);
        return Error;
    }
};
