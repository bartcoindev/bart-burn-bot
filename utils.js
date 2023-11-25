require("dotenv").config();
const { ethers } = require("ethers");
const { CONTRACT_ABI } = require("./constants");

function sliceAddress(address, visibleChars = 6) {
  return (
    address.slice(0, visibleChars) +
    "..." +
    address.slice(address.length - visibleChars, address.length)
  );
}

function formatAmount(value) {
  return ethers.utils.formatUnits(value, Number(process.env.COIN_DECIMALS));
}

const provider = new ethers.providers.JsonRpcProvider(
  process.env.JSON_RPC_PROVIDER
);
const contractAddress = process.env.BART_TOKEN_ADDRESS;
const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);

async function getPastEvents() {
  const toWalletAddress = process.env.DEAD_WALLET_ADDRESS;
  const filter = {
    address: contractAddress,
    fromBlock: 18650287,
    toBlock: "latest",
    topics: [
      ethers.utils.id("Transfer(address,address,uint256)"),
      null,
      ethers.utils.hexZeroPad(toWalletAddress, 32),
    ],
  };

  const logs = await provider.getLogs(filter);
  const walletBalances = {};

  // Sort logs by block number in inceased order
  logs.sort((a, b) => a.blockNumber - b.blockNumber);
  let count = 0;

  for (let index = 0; index < logs.length; index++) {
    const txHash = logs[index].transactionHash;
    const parsedLog = contract.interface.parseLog(logs[index]);

    const userAddress = parsedLog.args[0];
    const amount = Number(formatAmount(parsedLog.args[2]));

    if (
      userAddress &&
      amount &&
      amount >= Number(process.env.MINIMUM_BURN_AMOUNT)
    ) {
      if (count >= Number(process.env.TOTAL_SPOTS)) {
        break;
      } else {
        count += 1;
        walletBalances[txHash] = [userAddress, amount];
      }
    }
  }

  return walletBalances;
}

module.exports = {
  getPastEvents,
  contract,
  sliceAddress,
  formatAmount,
};
