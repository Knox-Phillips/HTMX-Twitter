const express = require("express");
const bodyParser = require("body-parser");
const Chance = require("chance");
const path = require("path");
const { v4 } = require("uuid");
const dayjs = require("dayjs");
const relativeTime = require("dayjs/plugin/relativeTime");

const app = express();
const expressWs = require("express-ws")(app);
const PORT = 8080;
const tweetChannel = expressWs.getWss("/tweet");
const tweets = [];

app.use(express.static(path.join(__dirname, "public")));

dayjs.extend(relativeTime);

const chance = new Chance();
const connectedUsers = {};

let username = "";

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.ws("/tweet", function (ws, req) {
  const userId = v4(); // Generate a unique ID for the user

  // Generate a unique name for the user
  const name = connectedUsers[userId] ? connectedUsers[userId] : chance.name();
  connectedUsers[userId] = name;
    ws.send(`<h5 style="margin-bottom:5px;" hx-swap-oob="innerHTML:#username">Username: ${connectedUsers[userId]}</h5>`)
  ws.on("message", function (msg) {
    const { message, name } = JSON.parse(msg);
    let id = v4();
    let retweets = 0;
    let likes = 0;
    let avatar =
      "https://ui-avatars.com/api/?background=random&rounded=true&name=" +
      connectedUsers[userId];

    const _tweet = {
      id: id,
      message,
      retweets: retweets,
      likes: likes,
      time: new Date().toString(),
      avatar: avatar,
      html: `
        <div hx-swap-oob="afterbegin:#Chilling">
            <div id="post">
                <div style="display:flex;">
                    <div>
                        <img src=${avatar} />
                    </div>
                    <div style="line-height:1.5; margin-left:1em">
                        <div style="display:flex">
                            <p>${connectedUsers[userId]}</p>
                            <p style="padding-left:5px"><small> @${
                              connectedUsers[userId]
                            }</small></p>
                        </div>
                        <p>${message}</p>
                        <div id="CommentsLikes"> 
                            <div id="comments"> <i class="fa-regular fa-comment"></i> 0</div>
        
                            <div id="retweet"><i class="fa-solid fa-retweet"></i> ${retweets}</div>
        
                            <div id="like" hx-post=${
                              "/like/" + id
                            }> <i class="fa-regular fa-heart"></i>  ${likes}</div> 
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `,
    };

    console.log(connectedUsers);

    _tweet.time = dayjs().to(dayjs(_tweet.time));

    // const tweet = `
    // <div hx-swap-oob="afterbegin:#Chilling">
    //     <div id="post">
    //         <div style="display:flex;">
    //             <div>
    //                 <img src=${_tweet.avatar} />
    //             </div>
    //             <div style="line-height:1.5; margin-left:1em">
    //                 <div style="display:flex">
    //                     <p>${connectedUsers[userId]}</p>
    //                     <p style="padding-left:5px"><small> @${connectedUsers[userId]}</small></p>
    //                 </div>
    //                 <p>${message}</p>
    //                 <div id="CommentsLikes">
    //                     <div id="comments"> <i class="fa-regular fa-comment"></i> 0</div>

    //                     <div id="retweet"><i class="fa-solid fa-retweet"></i> ${_tweet.retweets}</div>

    //                     <div id="like" hx-post=${"/like/" + t.id}> <i class="fa-regular fa-heart"></i>  ${_tweet.likes}</div>
    //                 </div>
    //             </div>
    //         </div>
    //     </div>
    // </div>
    // `;

    tweets.push(_tweet);
    tweetChannel.clients.forEach((client) => {
      client.send(_tweet.html);
    });
  });

  ws.on("close", function () {
    // Clean up when the user disconnects
    delete connectedUsers[userId];
  });
});

app.get("/test", (req, res) => {
  console.log("sup");
  username = chance.name();
  const htmlElement = `<div><h2>${username}</h2><p>This is the new element content.</p></div>`;
  res.send(htmlElement);
});

app.post("/like/:id", (req, res) => {
  const { id } = req.params;
  const tweet = tweets.find((t) => t.id === id);
  tweet.likes += 1;

  tweetChannel.clients.forEach(function (client) {
    client.send(markup);
  });

  res.send(markup);
});

app.post("/retweet/:id", (req, res) => {
  const { id } = req.params;
  const tweet = tweets.find((t) => t.id === id);
  tweet.retweets += 1;

  const retweets = pug.compileFile("views/components/retweets.pug");
  const markup = retweets({ t: tweet });
  tweetChannel.clients.forEach(function (client) {
    client.send(markup);
  });
  res.send(markup);
});

app.listen(PORT);
console.log("App listening on port " + PORT, "http://localhost:" + PORT);
