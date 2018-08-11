# A "Smart" Litterbox

My friend Frank gave me one of the [AWS IoT Buttons](https://www.amazon.com/AWS-IoT-Button-2nd-Generation/dp/B01KW6YCIM/) and I decided to use it to remind us to clean our cats' litterbox. (We have two litterboxes, but one is out-of-the-way so we rarely remember.)

## The basic idea
We click the button whenever we perform certain actions:

- Whenever we clean the litterbox, we "single-click" the IoT button.
- If we notice we need litter bags, we also "double-click" the IoT button.
- If we notice we need cat litter, we also "long press" the IoT button.

The button sends a message to [AWS's IoT service](https://aws.amazon.com/iot/), which in turn triggers a [Lambda function](https://aws.amazon.com/lambda/). That handles different behaviour depending on the click type.

- Single clicks update a [DynamoDB](https://aws.amazon.com/dynamodb/) table with the device ID and the current timestamp.
- Double clicks and long presses call [IFTTT webhooks](https://ifttt.com/maker_webhooks) that trigger tasks to be added to a [Todoist](https://en.todoist.com/) list

Every day, another Lambda function retrieves the timestamps from DynamoDB. If any of them are more than 2 days in the past, an email is sent notifying the recipient that the box needs to be cleaned.

## Set up

### The button logging part

1. Get yourself an [AWS IoT Button](https://www.amazon.com/AWS-IoT-Button-2nd-Generation/dp/B01KW6YCIM/) somehow. (No, they don't ship to Australia. I know it sucks.)

2. Register for an [Amazon Web Services](https://aws.amazon.com/) account if you don't already have one.

3. Install the mobile app for [iOS](https://itunes.apple.com/us/app/aws-iot-button/id1178216626?mt=8) or [Android](https://play.google.com/store/apps/details?id=com.amazonaws.iotbutton&hl=en).

4. Use the app to set up your IoT button. When it asks you to configure the button action, tick the option for **Trigger IFTTT Maker (nodejs)**. Then pause!

5. Hop over to [IFTTT](https://ifttt.com) and register if you don't already have an account. Then connect the [Webhooks](https://ifttt.com/maker_webhooks) service and take note of the API key it assigns you.

6. Go back to the mobile app and enter the API key you got from IFTTT. Be careful you don't have any typos!

7. Finish setting up your button, which will create a bunch of services in AWS.

8. Log into the [AWS Console](https://console.aws.amazon.com/lambda/) and view your Lambda functions. You should see that one has been created for your button. Click on it to view the configuration.

	The name of your function will be something like `iotbutton_{LONG ALPHANUMERIC STRING}_iot-button-ifttt-maker-nodejs`. That alphanumeric string is the serial number for your button. Copy it down because you'll need it to set up your webhooks.

9. Change the runtime for your Lambda function to **Node.js 8.10**. Replace the existing code with the code from `button.js`. You can change the AWS region if you need to. Find the bit that says `{YOUR KEY GOES HERE}` and replace it with your IFTTT API key from Step 4. Save the function.

10. Head to [DynamoDB](https://console.aws.amazon.com/dynamodb/) and create a new table called `litterboxStatus`. The partition key should be `litterbox` (type: String).

11. Go to [Identity and Access Management (IAM)](https://console.aws.amazon.com/iam/) and click on **Roles**. You should see a role that was created for your button Lambda. Click on it and edit the policy to allow access to the DynamoDB table you just created.

12. Go back to IFTTT and [create a new applet](https://ifttt.com/create). The trigger will be the **Webhooks** service. The event name will be `{YOUR SERIAL NUMBER}-DOUBLE`. Paste in your serial number from Step 7. The action can be whatever you like - I've used Todoist to add a task to a list.

13. Set up another IFTTT webhook where the trigger is `{YOUR SERIAL NUMBER}-LONG`. Again, you can have the action be whatever you like.

14. You're now ready to test! Try out the three types of button presses. Single-clicks should show up in your DynamoDB table. (Each click will update the timestamp of the current row). Double-clicks and long presses should trigger your IFTTT actions.

### The reminding part

1. Head back to the AWS Console and create a new Lambda function called `checkLitterboxStatus`. Use the **Author from scratch** option and select the **Node.js 8.10** runtime. For the role, select your existing button role.

2. Replace the existing Lambda code with the code from `checkLitterboxStatus.js`. You can change the AWS region if you need to. Scroll down and find the bits that say `{TO ADDRESS}` and `{FROM ADDRESS}`, and replace them with your email address. You can also adjust the number of days that triggers an email (I've got it set to **2**), and configure the subject line and message text if you like.

3. Go to [AWS Simple Email Service (SES)](https://console.aws.amazon.com/ses/) and click on **Email Addresses**. Click the button to **Verify a New Email Address**. Enter your email address and click the button to verify. You'll receive an email with a link you have to click to prove you own the address. (You can't send from an address you haven't verified.)

4. Go back to IAM and edit your role again. This time you'll need to add in access to SES so you can send emails. (You may also need to adjust your permissions for CloudWatch Logs. Your role needs to be able to **CreateLogGroup**, **CreateLogStream**, and **PutLogEvents** so your function can log events properly.)

5. Now you're ready to test! Go back to Lambda and click the button to **Configure test events**. Use the template for **Scheduled event**, call it **Test Event**, and save. If you now trigger your test event, you should see your Lambda run successfully. Remember: it won't send an email because your DynamoDB timestamp will be within the 2 day timeframe!

6. Go back to DynamoDB and click on your table, then the **Items** tab. You should see your single record in there. Click on the timestamp and modify that number. I suggest you subtract **172801000**, which is just slightly longer than 2 days.

7. Now when you test your Lambda function, it should recognise that it's been too long since you scooped the litterbox and send you an email reminder!

## Ideas and improvements

You can use SMS instead of email if you want. You don't get SMS on the AWS free tier in Australia (but you do in the US), and I'm a tightarse so I went with email.

I've deliberately set this up in such a way that I can have multiple buttons, one next to each litter box. If you do that, you'll want to edit your `checkLitterboxStatus` function and turn the `box.litterbox` identifier into something nicer. (I'm working on sourcing another button for our second box.)

This is only a reminder system. If you want full historical data so you can build some sort of litterbox scooping data visualisation, you'll have to change the way the DynamoDB part works so that rows are added rather than updated. The dashboard itself is left as an exercise to the reader.
