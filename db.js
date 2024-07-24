const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

client.connect();

async function saveShipToDB(ship) {
  const query = `
    INSERT INTO ships(id, name, ship_type, year, flag, size, imo_number, iot_device, fuel_tank_capacity, fuel_remaining)
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (id) DO NOTHING;
  `;
  const values = [ship.id, ship.name, ship.shipType, ship.year, ship.flag, ship.size, ship.imoNumber, ship.iotDevice, ship.fuelTankCapacity, ship.fuelRemaining];
  await client.query(query, values);
}

async function saveDeviceToDB(deviceAddress, authorized) {
  const query = `
    INSERT INTO iot_devices(device_address, authorized)
    VALUES($1, $2)
    ON CONFLICT (device_address) DO UPDATE SET authorized = $2;
  `;
  const values = [deviceAddress, authorized];
  await client.query(query, values);
}

async function isDeviceAuthorized(deviceAddress) {
  const query = 'SELECT authorized FROM iot_devices WHERE device_address = $1';
  const values = [deviceAddress];
  const res = await client.query(query, values);
  return res.rows.length > 0 && res.rows[0].authorized;
}

module.exports = {
  saveShipToDB,
  saveDeviceToDB,
  isDeviceAuthorized,
};
