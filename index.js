require("dotenv").config();
const { Telegraf } = require("telegraf");
const express = require("express");
const {
  getPastEvents,
  contract,
  sliceAddress,
  formatAmount,
} = require("./utils");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const bot = new Telegraf(process.env.COINFLIP_TELEGRAM_BOT_TOKEN);
const chatId = { value: "-1001575305476" };

app.use(bot.webhookCallback("/secret-path"));
bot.telegram.setWebhook(`${process.env.DEPLOYED_URL}/secret-path`);

bot.command("start", async (ctx) => {
  ctx.chat.id && (chatId.value = ctx.chat.id);

  await ctx.reply(
    `🔥 Welcome to the ${process.env.BOT_NAME} 🔥\nThis bot tracks and ranks all qualifying wallets and their associated burn transactions for [$${process.env.COIN_DENOM}](${process.env.BART_TOKEN_ETHERSCAN}) burn competitions. Type /help to see all available commands.`,
    { parse_mode: "markdown", disable_web_page_preview: true }
  );
});

bot.command("help", async (ctx) => {
  ctx.chat.id && (chatId.value = ctx.chat.id);

  await ctx.reply(
    `Welcome to the BurnBot Help Center\n\nReady to torch some <a href="${process.env.BART_TOKEN_ETHERSCAN}">$${process.env.COIN_DENOM}</a>? Here's a quick guide to get you started:\n\n1. /competition\n  • This provides details of the current burn competition including rules, prizes and entry instruction\n\n2. /topten\n  • This provides a ranking of the top 10 biggest burns in the competition and the associated wallets\n\n3. /all_entries\n  • This provides a list of all qualifying wallets that have secured a spot in the competition by burning the minimum required amount of <a href="${process.env.BART_TOKEN_ETHERSCAN}">$${process.env.COIN_DENOM}</a> (${process.env.MINIMUM_BURN_AMOUNT} Tokens)`,
    { parse_mode: "html", disable_web_page_preview: true }
  );
});

bot.command("competition", async (ctx) => {
  ctx.chat.id && (chatId.value = ctx.chat.id);

  await ctx.reply(
    `OMNI-PASS NFT BURN COMPETITION\n🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥\nBurn ${process.env.MINIMUM_BURN_AMOUNT} or more [$${process.env.COIN_DENOM}](${process.env.BART_TOKEN_ETHERSCAN}) tokens before all entry slots are filled to qualify among the top ${process.env.TOTAL_SPOTS} burners for a FREE NFT WHITELIST SPOT. When we mint the collection whitelist spots will only pay the gas to mint. Each separate burn over ${process.env.MINIMUM_BURN_AMOUNT} tokens qualifies for a separate whitelist spot, think of it as if you are trading those tokens for an NFT with each qualifying burn transaction.\n\nTo burn your [$${process.env.COIN_DENOM}](${process.env.BART_TOKEN_ETHERSCAN}) tokens you must send them to THIS SPECIFIC Ethereum dead wallet address:\n\n${process.env.DEAD_WALLET_ADDRESS}\n\nThe biggest burn at the end of the competition will secure one of our ULTRA-RARE 1 of 1 OMNI-PASSES which provide their holders with Reptilian Elite privileges in the [$${process.env.COIN_DENOM}](${process.env.BART_TOKEN_ETHERSCAN}) universe as well as a SIGNED COPY of David Icke’s new book The Trap.\n\nN.B. ANY BURNS AFTER ALL ENTRIES ARE FILLED WILL NOT BE COUNTED AND WILL NOT GET WHITELISTED SO MOVE FAST.`,
    { parse_mode: "markdown", disable_web_page_preview: true }
  );
});

bot.command("topten", async (ctx) => {
  ctx.chat.id && (chatId.value = ctx.chat.id);
  await ctx.reply(`🔥 Top 10 Burns 🔥`);

  const eligibleBurntAddresses = await getPastEvents();
  const topBurners = Object.values(eligibleBurntAddresses)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  let addressesMessage = "";

  for (let index = 0; index < topBurners.length; index++) {
    const walletAddress = topBurners[index][0];

    addressesMessage += `${index + 1}. <a href="${
      process.env.ACCOUNT_EXPLORER
    }/${walletAddress}">${sliceAddress(walletAddress)}</a> burnt ${
      topBurners[index][1]
    } ${process.env.COIN_DENOM}${index + 1 === topBurners.length ? "" : "\n"}`;
  }

  if (addressesMessage) {
    await ctx.replyWithHTML(addressesMessage, {
      disable_web_page_preview: true,
    });
  } else {
    await ctx.reply("Nothing to show at the moment");
  }
});

bot.command("all_entries", async (ctx) => {
  ctx.chat.id && (chatId.value = ctx.chat.id);
  await ctx.reply(`🔥 Qualifying Burners 🔥`);

  const eligibleBurntAddresses = await getPastEvents();
  const keys = Object.keys(eligibleBurntAddresses);

  if (keys.length === 0) {
    await ctx.reply("Nothing to show at the moment");
  } else {
    if (keys.length <= 50) {
      let addressesMessage = "";

      for (let index = 0; index < keys.length; index++) {
        const [address, amount] = eligibleBurntAddresses[keys[index]];
        addressesMessage += `${
          index + 1
        }. <code>${address}</code> : ${amount} ${process.env.COIN_DENOM}\n`;
      }

      await ctx.replyWithHTML(addressesMessage);
    } else {
      let quotient = Math.floor(keys.length / 50);
      let remainder = keys.length % 50;

      let index = 0;

      while (quotient > 0) {
        let addressesMessage = "";

        for (let i = index; i < index + 50; i++) {
          const [address, amount] = eligibleBurntAddresses[keys[i]];
          addressesMessage += `${i + 1}. <code>${address}</code> : ${amount} ${
            process.env.COIN_DENOM
          }\n`;
        }

        await ctx.replyWithHTML(addressesMessage);
        index += 50;
        quotient--;
      }

      let addressesMessage = "";
      while (remainder > 0) {
        const [address, amount] = eligibleBurntAddresses[keys[index]];
        addressesMessage += `${
          index + 1
        }. <code>${address}</code> : ${amount} ${process.env.COIN_DENOM}\n`;
        index++;
        remainder--;
      }
      await ctx.replyWithHTML(addressesMessage);
    }
  }
});

async function handleBurnEvent(from, to, value, ...event) {
  if (
    to === process.env.DEAD_WALLET_ADDRESS &&
    chatId.value &&
    Number(formatAmount(value)) >= Number(process.env.MINIMUM_BURN_AMOUNT)
  ) {
    console.log("Burn Event Captured for chatId - ", chatId.value);

    const newBurnDetectedMessage = `🔥 NEW BURN DETECTED 🔥\nWallet: <a href="${
      process.env.ACCOUNT_EXPLORER
    }/${from}">${sliceAddress(from)}</a> burnt ${formatAmount(
      value
    )} <a href="${process.env.BART_TOKEN_ETHERSCAN}">$${
      process.env.COIN_DENOM
    }</a> tokens`;

    const eligibleBurntAddresses = await getPastEvents();
    let burningCountMessage = "";
    const txHash = event[0].transactionHash;
    let count = Object.keys(eligibleBurntAddresses).length;

    if (!eligibleBurntAddresses[txHash]) {
      count += 1;
    }

    if (count > Number(process.env.TOTAL_SPOTS)) {
      burningCountMessage = `ALL SPOTS ARE FILLED: THIS BURN DID NOT QUALIFY.`;
    } else {
      const isBiggestBurn = Object.values(eligibleBurntAddresses).every(
        ([, amount]) => Number(formatAmount(value)) >= amount
      );

      burningCountMessage = `Burn number ${count} of ${
        process.env.TOTAL_SPOTS
      }. ${Number(process.env.TOTAL_SPOTS) - count} Spots remaining.`;

      if (isBiggestBurn) {
        burningCountMessage += `\n\n<b>🐋 NEW BIGGEST BURN 🐋</b>`;
      }

      if (count === Number(process.env.TOTAL_SPOTS)) {
        burningCountMessage += `\n\n🚨STOP BURNING🚨\nALL SLOTS HAVE NOW BEEN FILLED, ANY FURTHER BURNS WILL NOT BE COUNTED`;
      }
    }

    await bot.telegram.sendAnimation(chatId.value, process.env.BURN_EVENT_GIF, {
      caption: `🪙 ${formatAmount(value)} BART\n🔍 <a href="${
        process.env.ACCOUNT_EXPLORER
      }/${from}">${sliceAddress(from)}</a> | <a href="${
        process.env.TX_EXPLORER
      }/${txHash}">Txn</a>\n\n${newBurnDetectedMessage}\n\n${burningCountMessage}`,
      parse_mode: "html",
      disable_web_page_preview: true,
    });
  }
}

contract.on("Transfer", handleBurnEvent);
// bot.launch();

app.get("/", (_, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
