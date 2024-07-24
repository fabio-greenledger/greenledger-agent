const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

async function saveIoTDevice(deviceAddress, authorized) {
  const query = `
    INSERT INTO iot_devices (device_address, authorized)
    VALUES ($1, $2)
    ON CONFLICT (device_address) DO UPDATE
    SET authorized = EXCLUDED.authorized
  `;
  const values = [deviceAddress, authorized];
  try {
    await pool.query(query, values);
    console.log(`Dispositivo IoT ${deviceAddress} salvo no banco de dados`);
  } catch (err) {
    console.error('Erro ao salvar dispositivo IoT no banco de dados:', err);
  }
}

async function saveVehicle(vin, kmPerLiter, plate, model, brand, year, color, size, fuelType, iotDevice) {
  const query = `
    INSERT INTO vehicles (vin, km_per_liter, plate, model, brand, year, color, size, fuel_type, iot_device)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (vin) DO UPDATE
    SET km_per_liter = EXCLUDED.km_per_liter,
        plate = EXCLUDED.plate,
        model = EXCLUDED.model,
        brand = EXCLUDED.brand,
        year = EXCLUDED.year,
        color = EXCLUDED.color,
        size = EXCLUDED.size,
        fuel_type = EXCLUDED.fuel_type,
        iot_device = EXCLUDED.iot_device
  `;
  const values = [vin, kmPerLiter, plate, model, brand, year, color, size, fuelType, iotDevice];
  try {
    await pool.query(query, values);
    console.log(`Veículo ${vin} salvo no banco de dados`);
  } catch (err) {
    console.error('Erro ao salvar veículo no banco de dados:', err);
  }
}

async function saveShip(id, distancePerTon, name, shipType, year, flag, size, imoNumber, iotDevice) {
  const query = `
    INSERT INTO ships (id, distance_per_ton, name, ship_type, year, flag, size, imo_number, iot_device)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (id) DO UPDATE
    SET distance_per_ton = EXCLUDED.distance_per_ton,
        name = EXCLUDED.name,
        ship_type = EXCLUDED.ship_type,
        year = EXCLUDED.year,
        flag = EXCLUDED.flag,
        size = EXCLUDED.size,
        imo_number = EXCLUDED.imo_number,
        iot_device = EXCLUDED.iot_device
  `;
  const values = [id, distancePerTon, name, shipType, year, flag, size, imoNumber, iotDevice];
  try {
    await pool.query(query, values);
    console.log(`Navio ${id} salvo no banco de dados`);
  } catch (err) {
    console.error('Erro ao salvar navio no banco de dados:', err);
  }
}

async function isVehicleRegistered(vin) {
  const query = 'SELECT COUNT(*) FROM vehicles WHERE vin = $1';
  const values = [vin];
  try {
    const res = await pool.query(query, values);
    return res.rows[0].count > 0;
  } catch (err) {
    console.error('Erro ao verificar se o veículo está registrado:', err);
    throw err;
  }
}

async function isShipRegistered(id) {
  const query = 'SELECT COUNT(*) FROM ships WHERE id = $1';
  const values = [id];
  try {
    const res = await pool.query(query, values);
    return res.rows[0].count > 0;
  } catch (err) {
    console.error('Erro ao verificar se o navio está registrado:', err);
    throw err;
  }
}

module.exports = { pool, saveIoTDevice, saveVehicle, saveShip, isVehicleRegistered, isShipRegistered };
