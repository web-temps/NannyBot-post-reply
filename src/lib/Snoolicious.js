const Snoowrap = require('../config/snoo.config');
const NannyBot = require('../service/NannyBot');
const PriorityQueue = require('../util/PriorityQueue');
const Command = require('../util/Command');
/*
    [Snoolicious RTS] - Snoolicious Reddit Tool Suite
    
    Instantiates a Snoowrap requester, then genrates helper classes to manage commands.

        - Class contains functions to interact with these services:
            a. MentionBot
                - Listens for username mentions in the inbox
            b. SubMonitorBot
                - Watches a subreddits *new* section for new submissions
            c. CommandBot
                - Follows a single thread to listen for commands
            d. WikiEditor
                - Edits Wiki Pages
                - Has access to SnooMD

        The tasks list is a PriorityQueue that will get the queued messages from the mentions, submissions, and commands queues,
        and dequeue them from their original queue, then re-enqueue them into itself. The priority level is to be defined when
        calling the get* functions. With 0 being highest priority, all tasks will be called first in first out from the tasks queue.
            
*/
module.exports = class Reddit {
    constructor() {
        /* [Snoowrap API] */
        this.requester = new Snoowrap().requester;

        /* [Services] */
        /* [UserFollower Service] */
        this.nannybot = new NannyBot(this.requester);
        /* 
            [Tasks]
                - Tasks = All tasks to be fulfilled by the bot
                - All items are dequeued from their original bot service queues and into this priority queue
         */
        this.tasks = new PriorityQueue();
    }
    /*
        [Nanny User]
            - Asks NannyUser Service to get a users latest posts
            - Dequeues the command queue into tasks queue
            - Returns the tasks queue
    */
    async nannyUser(user,priority) {
        const posts = await this.nannybot.getUserPosts(user);
        // Dequeue all the commands into the priority queue
        while (posts && !posts.isEmpty()) {
            this.tasks.enqueue([posts.dequeue(), priority]);
        }
        return this.tasks;
    }
    /* 
        [Query Tasks]
            - Dequeus all the tasks and handles commands based on your callback function
            - Checks if item.body exists before handling command
            - If item.body exists, runs handleSubmission instead.
     */
    async queryTasks(handleCommand, handleSubmission) {
        console.log("Querying new tasks!".green);
        const D = new Date().getTime();
        while (!this.tasks.isEmpty()) {
            const task = this.tasks.dequeue();
            // If not a submission
            if (task.item.body) {
                const command = new Command().test(task.item.body);
                console.log("Testing command: ", command);
                if (command) { // If the item received was a command, return the command, the item, and priority
                    const T = {
                        command: command,
                        item: task.item,
                        priority: task.priority,
                        time: D
                    }
                    await handleCommand(T);
                }
            } else if (task.item.title) { // Task was a submission
                const T = {
                    item: task.item,
                    priority: task.priority,
                    time: D
                }
                await handleSubmission(T);
            }
        }
    }
    /* [Snoowrap Requester] */
    getRequester() {
        return this.requester;
    }
}