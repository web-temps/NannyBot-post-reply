const dotenv = require('dotenv').config({
    path: "pw.env"
});
const colors = require('colors');
const Snoolicious = require('./lib/Snoolicious');
const snoolicious = new Snoolicious();

/* 
    [Handle Command]
        - This function must be passed in as the first argument to snoolicious.queryTasks()
        - handleCommand be awaited by Snoolicious for each command dequeued from the task queue
        - This will be true when calling either the getCommands or getMentions functions, as they both return built commands
        - Reddit Submission objects do not contain a body key, rather they will be sent to the handleSubmissions function instead

        [Command Task Object]
            - The Command Task object will be passed to this function with these key/value pairs:
                task: {
                    command: { 
                        directive,
                        [arg1, arg2, arg3, ...]
                    },
                    item: {
                        <Reddit Comment Object>
                    },
                    priority: <Number you set when calling getCommands or getMentions>,
                    time: <new Date().getTime()>
                }
*/
async function handleCommand(task) {
    const id = `${task.item.parent_id}${task.item.id}${task.item.created_utc}`;
    const isSaved = await snoolicious.requester.getComment(task.item).saved;
    // Check if the item was saved first.
    if (!isSaved) {
        console.log("New Command recieved: ".yellow);
        switch (task.command.directive) {
            case 'help':
                console.log("Command was help!".green, task.command);
                await snoolicious.getRequester().getComment(task.item.id).reply("sending help!");
                break;
            default:
                console.log("Command was not understood! the command: ".red, task.command);
        }
        // Save the item so snoolicious won't process it again.
        console.log("saving");
        await snoolicious.requester.getComment(task.item.id).save();
    } else {
        console.log("Item was already saved!".red);
    }
    console.log("Size of the queue: ", snoolicious.tasks.size());

}
/*
    [Handle Submission]
        - Passed in as the second argument to queryTasks()
        - Awaited by Snoolicious for each submission dequeued from the task queue

        [Submission Task Object]
            - The Submission Task object will be passed with these key/value pairs:
                task: {
                    item: {
                        <Reddit Submission Object>
                    },
                    priority: <Number you set when calling getCommands or getMentions>,
                    time: <new Date().getTime()>
                }
*/
let count = 0;
async function handleSubmission(task) {
    console.log("RECEIVED TASK!".magenta, task.time);
    console.log(`from: r/${task.item.subreddit.display_name}, title: ${task.item.title}`.green);
    const saved = await snoolicious.requester.getSubmission(task.item.id).saved;
    if (!saved) {
        console.log("replying with message!".grey);
        await snoolicious.requester.getSubmission(task.item.id).reply(process.env.MESSAGE);
     
        
        console.log("saving item...".grey);
        await snoolicious.requester.getSubmission(task.item.id).save();
        console.log("item saved.".grey);
    } else {
        console.log("Item was already saved!".red);
    }
    console.log("Size of the queue: ".grey, snoolicious.tasks.size());
    console.log("TOTAL TASKS COMPLETED: ".grey, ++count);

}

/* [Snoolicious Run Cycle] */
const INTERVAL = (process.env.INTERVAL * 1000 * 60);
async function run() {
        await snoolicious.nannyUser(process.env.NANNY_USER, 1);
        console.log("APP CHECKING SIZE OF TASKS QUEUE: ".gray, snoolicious.tasks.size());
        await snoolicious.queryTasks(handleCommand, handleSubmission);
        console.log(`Finished Quereying Tasks! Sleeping for ${INTERVAL/1000/60} minutes...`.grey);
        setTimeout(async () => {
            await run()
        }, (INTERVAL));
    }
    (async () => {
        await run();
    })();