const Web3 = require('web3');
require('dotenv').config();

if (!process.env.WEBSOCKET_URL) {
  throw new Error('A URL do WebSocket não está definida no arquivo .env');
}

console.log('URL do WebSocket:', process.env.WEBSOCKET_URL);

const web3 = new Web3(new Web3.providers.WebsocketProvider(process.env.WEBSOCKET_URL));
const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;

module.exports = { web3, account };
