/**
 * This is a sample that connects Lambda with IFTTT Maker channel. The event is
 * sent in this format: <serialNumber>-<clickType>.
 *
 * The following JSON template shows what is sent as the payload:
{
    "serialNumber": "GXXXXXXXXXXXXXXXXX",
    "batteryVoltage": "xxmV",
    "clickType": "SINGLE" | "DOUBLE" | "LONG"
}
 *
 * A "LONG" clickType is sent if the first press lasts longer than 1.5 seconds.
 * "SINGLE" and "DOUBLE" clickType payloads are sent for short clicks.
 *
 * For more documentation, follow the link below.
 * http://docs.aws.amazon.com/iot/latest/developerguide/iot-lambda-rule.html
 */

'use strict';

const https = require('https');

const makerKey = '{YOUR KEY GOES HERE}'; // change it to your Maker key

var AWS = require("aws-sdk");
var dynamodb = new AWS.DynamoDB.DocumentClient({region: 'us-east-1'});

exports.handler = (event, context, callback) => {
    console.log('Received event:', event);

    if (event.clickType != "SINGLE") {
        // make sure you created a receipe for event <serialNumber>-<clickType>
        const makerEvent = `${event.serialNumber}-${event.clickType}`;
        const url = `https://maker.ifttt.com/trigger/${makerEvent}/with/key/${makerKey}`;
        https.get(url, (res) => {
            let body = '';
            console.log(`STATUS: ${res.statusCode}`);
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                console.log('Event has been sent to IFTTT Maker channel');
                callback(null, body);
            });
        }).on('error', (e) => {
            console.log('Failed to trigger Maker channel', e);
            callback(`Failed to trigger Maker channel: ${e.message}`);
        });
    } else {
        var date = Date.now();
        var params = {
          TableName: 'litterboxStatus',
          Item: {
            'litterbox' : event.serialNumber,
            'date' : date,
          }
        };

        // Call DynamoDB to add the item to the table
        dynamodb.put(params, function(err, data) {
          if (err) {
            console.log("Error", err);
          } else {
            console.log("Success", data);
          }
        });
    }
};
