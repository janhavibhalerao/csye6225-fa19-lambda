const AWS = require('aws-sdk');
const ses = new AWS.SES();
const dynamoDB = new AWS.DynamoDB();
const route53 = new AWS.Route53();
AWS.config.update({ region: 'us-east-1' });

exports.handler = (event, context) => {
    const email = event.Records[0].Sns.Message.email;
    const recipeID = event.Records[0].Sns.Message.recipeIds;

    const getItemObject = {
        TableName: 'csye6225',
        Key: {
            'id': { S: email }
        }
    };
    
    dynamoDB.getItem(getItemObject, (err, data) => {
        if (data.Item === undefined || data.Item.ttl.N < Math.floor(Date.now() / 1000)) {
            const putItemObject = {
                TableName: 'csye6225',
                Item: {
                    id: { S: email },
                    token: { S: context.awsRequestId },
                    ttl: { N: (Math.floor(Date.now() / 1000) + 900).toString() }
                }
            };

            dynamoDB.putItem(putItemObject, () => {});

            route53.listHostedZones({}, (err, data) => {

                let domainName = data.HostedZones[0].Name;
                domainName = domainName.substring(0, domainName.length - 1);
                
                const emailObject = {
                    Destination: {
                        ToAddresses: [email]
                    },
                    Message: {
                        Body: {
                            Text: {
                                Data: "http://" + domainName + "/v1/recipe/" + recipeID
                            }
                        },
                        Subject: {
                            Data: "Get your recipes!"
                        }
                    },
                    Source: "noreply@" + domainName
                };
                ses.sendEmail(emailObject, () => {})
            });
        }
    })
};