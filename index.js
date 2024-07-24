require('dotenv').config();
const Web3 = require('web3');
const { saveShipToDB, saveDeviceToDB, isDeviceAuthorized } = require('./db');

const web3 = new Web3(process.env.WEB3_PROVIDER);

const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
web3.eth.accounts.wallet.add(account);

const abi = require('./abi.json');
const contractAddress = process.env.CONTRACT_ADDRESS;

const contract = new web3.eth.Contract(abi, contractAddress);

let nonce = 0;
let nonceInitialized = false;

async function initializeNonce() {
  if (!nonceInitialized) {
    nonce = await web3.eth.getTransactionCount(account.address, 'latest');
    nonceInitialized = true;
  }
}

async function sendTransaction(method, params) {
  try {
    await initializeNonce();
    const txData = contract.methods[method](...params).encodeABI();
    const tx = {
      from: account.address,
      to: contractAddress,
      data: txData,
      gas: 3000000,
      nonce: nonce++,
    };
    
    console.log(`Enviando transação - Método: ${method}, Parâmetros: ${JSON.stringify(params)}`);
    console.log(`Detalhes da transação: ${JSON.stringify(tx)}`);

    const signedTx = await web3.eth.accounts.signTransaction(tx, account.privateKey);
    console.log(`Transação assinada: ${JSON.stringify(signedTx)}`);

    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    console.log(`Receipt da transação para ${method}: ${JSON.stringify(receipt)}`);
  } catch (error) {
    console.error(`Erro ao enviar transação (${method}):`, error);
  }
}

async function registerIoTDevice(deviceAddress) {
  await saveDeviceToDB(deviceAddress, true);
  console.log(`Dispositivo IoT ${deviceAddress} registrado e autorizado.`);
}

async function registerShip(id, distancePerTon, name, shipType, year, flag, size, imoNumber, iotDevice, fuelTankCapacity) {
  const ship = {
    id,
    distancePerTon,
    name,
    shipType,
    year,
    flag,
    size,
    imoNumber,
    iotDevice,
    fuelTankCapacity,
    fuelRemaining: fuelTankCapacity,
  };

  await saveShipToDB(ship);
  console.log(`Navio ${id} registrado com sucesso.`);
}

async function sendIoTData(id) {
  try {
    const authorizedDevice = account.address;
    const authorized = await isDeviceAuthorized(authorizedDevice);
    if (!authorized) {
      console.log(`Dispositivo IoT ${authorizedDevice} não está autorizado. Não será possível enviar dados.`);
      return;
    }

    const distance = Math.floor(Math.random() * 10); // Simular distância percorrida em 10 segundos
    await sendTransaction('recordKilometers', [id, distance]);
    console.log(`Enviado dados de ${distance} km para o navio ${id}.`);

    // Exibir resumo
    await displaySummary(id);

  } catch (error) {
    console.error('Erro ao enviar dados do dispositivo IoT:', error);
  }
}

async function finalizeDailyData(id) {
  try {
    const authorizedDevice = account.address;
    const authorized = await isDeviceAuthorized(authorizedDevice);
    if (!authorized) {
      console.log(`Dispositivo IoT ${authorizedDevice} não está autorizado. Não será possível registrar dados.`);
      return;
    }

    await sendTransaction('finalizeDailyRecord', [id]);
    console.log(`Dados diários finalizados para o navio ${id}`);

    await displaySummary(id);

  } catch (error) {
    console.error(`Erro ao finalizar dados diários do navio ${id}:`, error);
  }
}

async function displaySummary(id) {
  try {
    const totalKilometers = await contract.methods.getTotalKilometers(id).call();
    const emissions = await contract.methods.calculateEmissions(id).call();
    const fuelConsumption = await contract.methods.calculateFuelConsumptionPerKilometer(id).call();
    const credits = await contract.methods.calculateCredits(id).call();
    const ship = await contract.methods.ships(id).call();

    const emissionFactor = ship.details.size === 'small'
      ? 16000
      : (ship.details.size === 'medium' ? 20000 : 30000);

    console.log(`
    ================================
    Resumo para navio ${id}:
    ================================
    Total de km do dia até o momento: ${totalKilometers}
    Quantidade de CO2 produzido: ${emissions} g
    Consumo de combustível (km por litro): ${fuelConsumption} L/km
    Fator de emissão: ${emissionFactor} g/nm
    Total de créditos de carbono calculados: ${credits}
    Capacidade total do tanque: ${ship.fuelTankCapacity} L
    Combustível restante no tanque: ${ship.fuelRemaining} L
    ================================
    `);

  } catch (error) {
    console.error('Erro ao exibir resumo:', error);
  }
}

async function main() {
  const shipId = 'ship123';
  const authorizedDevice = account.address;

  // Registrar e autorizar o dispositivo IoT
  await registerIoTDevice(authorizedDevice);

  // Registrar o navio no contrato inteligente
  await sendTransaction('registerShip', [shipId, 100, 'Ever Given', 'cargo', 2018, 'Panama', 'large', 'IMO1234567', authorizedDevice, 100000]);

  // Registrar o navio no banco de dados
  await registerShip(shipId, 100, 'Ever Given', 'cargo', 2018, 'Panama', 'large', 'IMO1234567', authorizedDevice, 100000);

  // Enviar dados a cada 10 segundos para navio
  setInterval(async () => {
    await sendIoTData(shipId);
  }, 10000); // 10 segundos

  // Finalizar dados diários ao final do dia (24 horas) para navio
  setInterval(async () => {
    await finalizeDailyData(shipId);
  }, 24 * 60 * 60 * 1000); // 24 horas

  // Monitorar eventos de reabastecimento
  contract.events.ShipRefueled({}).on('data', async (event) => {
    const { id, fuelAmount } = event.returnValues;
    console.log(`Navio ${id} reabastecido com ${fuelAmount} litros.`);
  });
}

main();
