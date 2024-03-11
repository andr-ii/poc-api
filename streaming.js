// Streaming API example

const express = require("express");
const { EventEmitter } = require("events");
const { Readable } = require("stream");
const { setTimeout } = require("timers/promises");

const app = express();
const PORT = 5000;
const emitter = new EventEmitter();

// "db"
const data = {
  0: { name: "foo" },
  1: { name: "bar" },
  2: { name: "buz" },
};

app.use(express.json());

app.post("/publish", (req, res) => {
  const { name } = req.body;

  if (!name) {
    res.status(400).send();
    return;
  }

  // pretend adding data to "db"
  const id = Object.keys(data).length;
  data[id] = { name };
  emitter.emit("added", { id, ...data[id] });

  res.status(201).send();
});

// never calls res.end()
app.get("/subscribe", async (_, res) => {
  // pretend reading data from "db"
  const stream = Readable.from(Object.keys(data).map(Number), {
    objectMode: true,
  });

  res.writeHead(200, {
    connection: "keep-alive",
    "content-type": "application/json",
    "transfer-encoding": "chunked",
  });

  stream.on("data", async (id) => {
    res.write(JSON.stringify({ id, ...data[id] }) + "\n");
    stream.pause();
    await setTimeout(1000);
    stream.resume();
  });

  // send new items only when "db" data is processed
  const streamReadPromise = new Promise((res) => {
    stream.on("end", res);
  });

  emitter.on("added", async (data) => {
    await streamReadPromise;
    res.write(JSON.stringify(data) + "\n");
  });
});

app.listen(PORT, () => console.log(`http://127.0.0.1:${PORT}`));
