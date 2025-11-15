const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eventia_db',
  user: 'postgres',
  password: 'admin123'
});

async function checkTables() {
  try {
    const result = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    console.log('Tablas encontradas en eventia_db:');
    result.rows.forEach(row => console.log(`  - ${row.tablename}`));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
