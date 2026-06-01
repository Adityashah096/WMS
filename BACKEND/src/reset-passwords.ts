import * as bcrypt from 'bcrypt';
import { Client } from 'pg';

async function resetPasswords() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'admin@123',
    database: 'robot_tracking',
  });

  await client.connect();
  console.log('Connected...');

  // Reset admin password
  const adminHash = await bcrypt.hash('admin@123', 10);
  await client.query(
    `UPDATE users SET password_hash = $1 WHERE email = 'admin@robottracking.com'`,
    [adminHash]
  );

  // Reset all employee passwords
  const empHash = await bcrypt.hash('Wms@1234', 10);
  await client.query(
    `UPDATE users SET password_hash = $1 
     WHERE email IN ('palai@wms.com', 'takshashela@wms.com', 'aaj@wms.com', 'repair@wms.com')`,
    [empHash]
  );

  console.log('✅ Passwords reset successfully');
  console.log('   Admin:     admin@robottracking.com / admin@123');
  console.log('   Employees: Wms@1234');

  await client.end();
}

resetPasswords().catch(console.error);