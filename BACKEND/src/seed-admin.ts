import * as bcrypt from 'bcrypt';
import { Client } from 'pg';

async function seedAdmin() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'admin@123',
    database: 'robot_tracking',
  });

  await client.connect();
  console.log('Connected to database...');

  const passwordHash = await bcrypt.hash('admin@123', 10);

  await client.query(`
    INSERT INTO users (name, email, password_hash, role)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (email) DO NOTHING
  `, ['System Admin', 'admin@robottracking.com', passwordHash, 'ADMIN']);

  console.log('✅ Admin user created successfully');
  console.log('   Email: admin@robottracking.com');
  console.log('   Password: admin@123');

  await client.end();
}

seedAdmin().catch(console.error);