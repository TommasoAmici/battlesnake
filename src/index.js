import express from "express";
import { end, info, moveResponse, start } from "./logic.js";

const app = express();
app.use(express.json());
app.use(function (req, res, next) {
  res.set("Server", "BattlesnakeOfficial/starter-snake-javascript");
  next();
});

const port = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send(info());
});

app.post("/start", (req, res) => {
  res.send(start(req.body));
});

app.post("/move", (req, res) => {
  res.send(moveResponse(req.body));
});

app.post("/end", (req, res) => {
  res.send(end(req.body));
});

// Start the Express server
app.listen(port, () => {
  console.log(`Starting Battlesnake Server at http://0.0.0.0:${port}...`);
});
