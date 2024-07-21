import mysql from 'mysql2/promise';
import pluralize from 'pluralize';

async function analyzeSchema() {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'notes'
    });
    try {
        console.log("Analyzing database schema...");
    
        const [tables] = await connection.query(`
          SELECT TABLE_NAME
          FROM information_schema.tables
          WHERE table_schema = DATABASE()
        `);
    
        const schema = {};
        for (const table of tables) {
          const tableName = table.TABLE_NAME;
          const [columns] = await connection.query(`
            SELECT COLUMN_NAME, DATA_TYPE
            FROM information_schema.columns
            WHERE table_name = '${tableName}' AND table_schema = DATABASE()
          `);
    
          const [foreignKeys] = await connection.query(`
            SELECT
              kcu.TABLE_NAME AS table_name,
              kcu.COLUMN_NAME AS column_name,
              kcu.REFERENCED_TABLE_NAME AS foreign_table_name,
              kcu.REFERENCED_COLUMN_NAME AS foreign_column_name
            FROM
              information_schema.KEY_COLUMN_USAGE AS kcu
            WHERE
              kcu.TABLE_SCHEMA = DATABASE() AND
              kcu.REFERENCED_TABLE_NAME IS NOT NULL AND
              kcu.TABLE_NAME = '${tableName}'
          `);
    
          const inferredRelationships = columns
          .filter(col => col.COLUMN_NAME.endsWith('_id'))
          .map(col => {
            const foreignTable = pluralize.plural(col.COLUMN_NAME.replace('_id', ''));
            return {
              column_name: col.COLUMN_NAME,
              foreign_table_name: foreignTable
            };
          });
          
          schema[tableName] = { columns, foreignKeys, inferredRelationships };
        }
    
        console.log(`Schema analysis complete. Analyzed ${Object.keys(schema).length} tables.`);
        return schema;
      } catch (error) {
        console.error("Error during schema analysis:", error);
      } finally {
        await connection.end();
      }
}

export default analyzeSchema;