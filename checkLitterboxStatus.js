var AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB.DocumentClient({region: 'us-east-1'});
var ses = new AWS.SES({region: 'us-east-1'});

exports.handler = async function(event, context, callback) {
  try {
    let updates = await statuscheck();
    let email = await sendemail(updates);
      return context.succeed('Success!');
  } catch (err) {
      return context.fail(err);
  }
};

async function statuscheck() {
  var date = Date.now();
  var params = {
    TableName : 'litterboxStatus'
  };
  var news = "";
  var boxdeets = "";
  var data = await dynamodb.scan(params).promise();
  while (data.Items) {
    data.Items.forEach(box => {
      var elapseddays = Math.floor((date - box.date) / 86400000);
      // greater than 2 days
      if (elapseddays >= 2) {
        news += box.litterbox + " needs cleaning! It's been more than " + elapseddays + " days!\n\n";
      } else {
        console.log("All good. Within stink tolerance.");
      }
    });
    break;
  }
  return news;
}

async function sendemail(news) {
  if (news) {
    var eParams1 = {
      Destination: {
        ToAddresses: ["{TO ADDRESS}"]
      },
      Message: {
        Body: {
          Text: {
            Data: `${news}`
          }
        },
        Subject: {
          Data: "🙀 Litterbox Status Update! 💩"
        }
      },
      Source: "{FROM ADDRESS}"
    };
    console.log('===SENDING EMAIL===');
    let email = await ses.sendEmail(eParams).promise();
    if (email) {
      console.log("===EMAIL SENT===");
    } else {
      throw new Error('Email failed to send!');
    }
  }
  return;
}
