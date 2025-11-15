import pool, { testConnection } from './src/infrastructure/config/database';

async function testDatabase() {
  console.log('🔍 Probando conexión a PostgreSQL...\n');
  
  try {
    // Probar conexión
    const connected = await testConnection();
    
    if (!connected) {
      console.error('❌ No se pudo conectar a la base de datos');
      process.exit(1);
    }
    
    // Listar las tablas
    console.log('\n📋 Consultando tablas existentes...');
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('\n✅ Tablas encontradas:');
    result.rows.forEach((row) => {
      console.log(`   - ${row.table_name}`);
    });
    
    console.log('\n🎉 ¡Todo funciona correctamente!');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

testDatabase();