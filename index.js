const Telegraf = require("telegraf");
require("dotenv").config();
const bot = new Telegraf(process.env.BOT_TOKEN);
const express = require("express");
const axios = require("axios");
const port = process.env.PORT || 3000;

const app = express();
var alertBuffer = [];

async function fetchPrice(id) {
  var price;
  try {
    const response = await axios({
      method: "get",
      url: `https://coingecko.p.rapidapi.com/coins/${id}`,
      headers: {
        "x-rapidapi-key": process.env.API_KEY,
        "x-rapidapi-host": "coingecko.p.rapidapi.com",
      },
    });
    price = response.data.market_data.current_price.usd;
  } catch (error) {
    console.error(error);
  }
  return price;
}

async function getPriceMsg(id) {
  let name,
    price,
    high_24h,
    low_24h,
    price_change_24h,
    price_change_percentage_24h,
    last_updated,
    msg;
  try {
    const response = await axios({
      method: "get",
      url: `https://coingecko.p.rapidapi.com/coins/${id}`,
      headers: {
        "x-rapidapi-key": process.env.API_KEY,
        "x-rapidapi-host": "coingecko.p.rapidapi.com",
      },
    });
    name = response.data.name;
    price = response.data.market_data.current_price.usd;
    high_24h = response.data.market_data.high_24h.usd;
    low_24h = response.data.market_data.low_24h.usd;
    price_change_24h = response.data.market_data.price_change_24h;
    price_change_percentage_24h =
      response.data.market_data.price_change_percentage_24h;
    last_updated = response.data.market_data.last_updated;
    last_updated = new Date(last_updated).toLocaleString("en-US", {
      timeZone: "Asia/Bangkok",
    });
    msg = `Name:   ${name}
    \nCurrent Price:   ${price} USD
    \nHigh 24h:   ${high_24h} USD
    \nLow 24h:   ${low_24h} USD
    \nPrice Change 24h:   ${price_change_24h} USD
    \nPrice Change Percentage 24h:   ${price_change_percentage_24h} %
    \nLast Updated:   ${last_updated}
    `;
  } catch (error) {
    console.error(error);
    msg = "Invalid Request";
  }
  return msg;
}

function alertConditionCheck(
  id,
  operator,
  targetValue,
  chatId,
  isSent,
  currentPrice
) {
  let msg = `Alert! \n${id} ${operator} ${targetValue}`;

  if (isSent == false) {
    if (operator == ">=") {
      if (currentPrice >= targetValue) {
        bot.telegram.sendMessage(chatId, msg);
        isSent = true;
        //console.log("alert");
      }
    }
    if (operator == "<=") {
      if (currentPrice <= targetValue) {
        bot.telegram.sendMessage(chatId, msg);
        isSent = true;
        //console.log("alert");
      }
    }
    if (operator == "==") {
      if (currentPrice == targetValue) {
        bot.telegram.sendMessage(chatId, msg);
        isSent = true;
        //console.log("alert");
      }
    }
  }
  return isSent;
}
function getAllAlertsMsg() {
  let msg = "";
  if (alertBuffer.length > 0) {
    for ({ id, operator, targetValue, chatId, isSent } of alertBuffer) {
      msg += `${id} ${operator} ${targetValue} \n`;
    }
  } else {
    msg = "0 Alerts";
  }
  return msg;
}
function intervalCheck() {
  if (alertBuffer.length > 0) {
    for (let alert in alertBuffer) {
      async function callBackAlertConditionCheck() {
        let currentPrice = await fetchPrice(alertBuffer[alert].id);
        alertBuffer[alert].isSent = alertConditionCheck(
          alertBuffer[alert].id,
          alertBuffer[alert].operator,
          alertBuffer[alert].targetValue,
          alertBuffer[alert].chatId,
          alertBuffer[alert].isSent,
          currentPrice
        );
      }
      callBackAlertConditionCheck();
    }
  }
}
setInterval(intervalCheck, 10000);
app.get("/", function (req, res) {
  res.send("Stock & Crypto Alert Bot V1 by Pisoth Yi");
});

bot.start((ctx) => {
  ctx.reply("Stock & Crypto Alert Bot Has Started!");
});

bot.command("getId", (ctx) => {
  ctx.reply(ctx.message.chat.id);
});

bot.command("getPrice", (ctx) => {
  let msg = ctx.message.text;
  msgArray = msg.split(" ");
  msgArray.shift();
  let itemId = msgArray.join(" ");
  let new_msg = "";
  async function callbackPrice() {
    new_msg = await getPriceMsg(itemId);
    ctx.reply(new_msg);
  }
  callbackPrice();
});

bot.command("setAlert", (ctx) => {
  let msg = ctx.message.text;
  msgArray = msg.split(" ");
  alertBuffer.push({
    id: msgArray[1],
    operator: msgArray[2],
    targetValue: msgArray[3],
    chatId: ctx.message.chat.id,
    isSent: false,
  });
  console.log("New Alert!");
  ctx.reply("Alert Set!");
});

bot.command("clearAlert", (ctx) => {
  alertBuffer = [];
  ctx.reply("Cleared All Alerts!");
});

bot.command("allAlert", (ctx) => {
  let msg = getAllAlertsMsg();
  ctx.reply(msg);
});

bot.launch();

app.listen(port);
