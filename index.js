const Web3 = require('web3');
const web3 = new Web3('ws://127.0.0.1:7545'); // URL do seu nó Ethereum

const account = web3.eth.accounts.privateKeyToAccount('SUA_CHAVE_PRIVADA');
web3.eth.accounts.wallet.add(account);

const abi = require('./abi.json'); // ABI do contrato
const contractAddress = 'ENDERECO_DO_CONTRATO'; // Endereço do contrato

const contract = new web3.eth.Contract(abi, contractAddress);

let nonce = 0;
let nonceInitialized = false;

// Função para inicializar o nonce
async function initializeNonce() {
  if (!nonceInitialized) {
    nonce = await web3.eth.getTransactionCount(account.address, 'latest');
    nonceInitialized = true;
  }
}

// Função para enviar transações para o contrato
async function sendTransaction(method, params) {
  try {
    await initializeNonce();
    const tx = {
      from: account.address,
      to: contractAddress,
      data: contract.methods[method](...params).encodeABI(),
      gas: 3000000,
      nonce: nonce++
    };
    const signedTx = await web3.eth.accounts.signTransaction(tx, account.privateKey);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    console.log('Transaction receipt:', receipt);
  } catch (error) {
    console.error('Erro ao enviar transação:', error);
  }
}

// Função para registrar um dispositivo IoT
async function registerIoTDevice(deviceAddress) {
  await sendTransaction('registerIoTDevice', [deviceAddress]);
}

// Função para registrar um navio
async function registerShip(id, distancePerTon, name, shipType, year, flag, size, imoNumber, iotDevice, fuelTankCapacity) {
  await sendTransaction('registerShip', [id, distancePerTon, name, shipType, year, flag, size, imoNumber, iotDevice, fuelTankCapacity]);
}

// Função para enviar dados de IoT
async function sendIoTData(id) {
  try {
    const authorizedDevice = account.address;
    const authorized = await contract.methods.isDeviceAuthorized(authorizedDevice).call();
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

// Função para finalizar os dados diários
async function finalizeDailyData(id) {
  try {
    const authorizedDevice = account.address;
    const authorized = await contract.methods.isDeviceAuthorized(authorizedDevice).call();
    if (!authorized) {
      console.log(`Dispositivo IoT ${authorizedDevice} não está autorizado. Não será possível registrar dados.`);
      return;
    }

    await sendTransaction('finalizeDailyRecord', [id]);
    console.log(`Dados diários finalizados para o navio ${id}`);

    const emissions = await contract.methods.calculateEmissions(id).call();
    console.log(`Emissões de CO2 para ${id}: ${emissions} g`);

    const credits = await contract.methods.calculateCredits(id).call();
    console.log(`Créditos de carbono para ${id}: ${credits}`);

    const fuelConsumption = await contract.methods.calculateFuelConsumptionPerKilometer(id).call();
    console.log(`Consumo médio de combustível para ${id}: ${fuelConsumption} L/km`);

  } catch (error) {
    console.error(`Erro ao finalizar dados diários do navio ${id}:`, error);
  }
}

// Função para exibir o resumo das informações do navio
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

// Função principal para iniciar o processo
async function main() {
  const shipId = 'ship123';
  const authorizedDevice = account.address;

  // Registrar e autorizar o dispositivo IoT
  await registerIoTDevice(authorizedDevice);

  // Registrar o navio
  await registerShip(shipId, 100, 'Ever Given', 'cargo', 2018, 'Panama', 'large', 'IMO1234567', authorizedDevice, 100000);

  // Enviar dados a cada 10 segundos para navio
  setInterval(async () => {
    await sendIoTData(shipId);
  }, 10000); // 10 segundos

  // Finalizar dados diários ao final do dia (24 horas) para navio
  setInterval(async () => {
    await finalizeDailyData(shipId);
  }, 24 * 60 * 60 * 1000); // 24 horas
}

main();
