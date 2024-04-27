const express = require('express');
const { generateSlug } = require('random-word-slugs');
const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs');
const { config } = require('dotenv');

config();

const app = express();
const PORT = 9000;

const ecsClient = new ECSClient({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const config = {
    CLUSTER: process.env.CLUSTER_ID,
    TASK: process.env.TASK_ID
}

app.use(express.json());

app.post('/project', async (req, res) => {
    const { gitUrl, slug } = req.body;
    const projectSlug = slug || generateSlug();

    const command = new RunTaskCommand({
        cluster: config.CLUSTER,
        taskDefinition: config.TASK,
        launchType: 'FARGATE',
        count: 1,
        networkConfiguration: {
            awsvpcConfiguration: {
                subnets: ['subnet-0439481ce6a39ada7', 'subnet-0502d238d8e4a4225', 'subnet-01d95ff95180bc9df'],
                securityGroups: ['sg-042cc02225d55dbc4'],
                assignPublicIp: 'ENABLED'
            }
        },
        overrides: {
            containerOverrides: [
                {
                    name: 'builder-image',
                    environment: [
                        { name: 'GIT_REPOSITORY__URL', value: gitUrl },
                        { name: 'PROJECT_ID', value: projectSlug }
                    ]
                }
            ]
        }
    });

    await ecsClient.send(command);

    return res.json({ status: 'queued', data: { url: `http://${projectSlug}.localhost:8000`, slug: projectSlug } });
})

app.listen(PORT, () => console.log('listening on port ' + PORT));