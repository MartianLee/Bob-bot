/* eslint-disable no-console */
/* eslint-disable import/no-internal-modules */
import "./utils/env";
import { App, LogLevel } from "@slack/bolt";
import { isGenericMessageEvent } from "./utils/helpers";
import { Restaurant } from "./type";
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./bob.db");

// const db: string[] = [];

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  logLevel: LogLevel.DEBUG,
  socketMode: true,
});

app.use(async ({ next }) => {
  // TODO: This can be improved in future versions
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  await next!();
});

// Listens to incoming messages that contain "hello"
app.message("hello", async ({ message, say }) => {
  // Filter out message events with subtypes (see https://api.slack.com/events/message)
  // Is there a way to do this in listener middleware with current type system?
  if (!isGenericMessageEvent(message)) return;

  // say() sends a message to the channel where the event was triggered
  await say({
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Hey there <@${message.user}>!`,
        },
        accessory: {
          type: "button",
          text: {
            type: "plain_text",
            text: "Click Me",
          },
          action_id: "button_click",
        },
      },
    ],
    text: `Hey there <@${message.user}>!`,
  });
});

app.action("button_click", async ({ body, ack, say }) => {
  // Acknowledge the action
  await ack();
  await say(`<@${body.user.id}> clicked the button`);
});

(async () => {
  // Start your app
  await app.start(Number(process.env.PORT) || 3000);

  console.log("⚡️ Bolt app is running!");
})();

// The echo command simply echoes on command
app.command("/bob", async ({ command, ack, respond }) => {
  // Acknowledge command request
  await ack();

  await respond(`${command.text}`);
});

type result = {
  err: any;
  row: { id: string; info: string };
};
app.command("/bob_add", async ({ command, ack, respond }) => {
  // Acknowledge command request
  await ack();
  let response = "Restaurants \n";
  try {
    db.serialize(() => {

      const stmt = db.prepare("INSERT INTO restaurants (name) VALUES (?)");
      stmt.run(command.text);
      stmt.finalize();

      db.each(
        "SELECT * FROM restaurants",
        (err: any, row: Restaurant) => {
          console.log(row.restaurant_id + ": " + row.name);
          response = response.concat(`${row.restaurant_id}: ${row.name}\n`);
        }
      );
    });

    db.close();
    await respond(`${response}`);
  } catch (e) {
    console.error(e);
  }
});
