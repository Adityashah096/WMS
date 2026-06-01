import * as bcrypt from 'bcrypt';
import { Client } from 'pg';

async function seedEmployees() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'admin@123',
    database: 'robot_tracking',
  });

  await client.connect();
  console.log('Connected...');

  const password = await bcrypt.hash('Wms@1234', 10);

  await client.query(`UPDATE users SET password_hash = $1 WHERE email = 'palai@wms.com'`, [password]);
  await client.query(`UPDATE users SET password_hash = $1 WHERE email = 'takshashela@wms.com'`, [password]);
  await client.query(`UPDATE users SET password_hash = $1 WHERE email = 'aaj@wms.com'`, [password]);
  await client.query(`UPDATE users SET password_hash = $1 WHERE email = 'repair@wms.com'`, [password]);

  console.log('✅ All employee passwords set to: Wms@1234');
  await client.end();
}

seedEmployees().catch(console.error);