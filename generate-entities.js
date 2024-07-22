// generate-entities.js
import analyzeSchema from './db-analyze.js';
import mustache from 'mustache';
import fs from 'fs-extra';
import path from 'path';
import pluralize from 'pluralize';
import ora from 'ora';
import Table from 'cli-table3';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';



// Map SQL data types to TypeScript types
const typeMap = {
  int: 'number',
  varchar: 'string',
  text: 'string',
  timestamp: 'Date',
  // Add more type mappings as needed
};

// Load environment variables
dotenv.config();

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get the output directory from .env, with a fallback
const outputDir = process.env.BACKEND_DIR || path.join(__dirname, '..', 'output');



function generateEntityName(tableName) {
  return pluralize.singular(tableName).charAt(0).toUpperCase() + pluralize.singular(tableName).slice(1);
}

function generatePropertyName(columnName) {
  return columnName.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

function generateRelationPropertyName(columnName) {
  return columnName.endsWith('_id') ? columnName.slice(0, -3) : columnName;
}

async function generateEntities() {


  const spinner = ora('Starting entity generation...').start();
  
  const schema = await analyzeSchema();

  spinner.succeed('Schema analysis complete');

  const schemaTable = new Table({
    head: ['Table Name', 'Columns', 'Foreign Keys', 'Inferred Relationships'],
    style: {
      head: ['cyan'],
      border: ['grey']
    }
  });

  for (const tableName in schema) {
    if (!schema.hasOwnProperty(tableName)) continue;
    const tableData = schema[tableName];
    schemaTable.push([
      tableName,
      tableData.columns.length,
      tableData.foreignKeys.length,
      tableData.inferredRelationships.length
    ]);
  }

  // Print the table
  console.log('\n=== Schema Summary ===');
  console.log(schemaTable.toString());
  console.log('=======================\n');


  spinner.start('Loading entity template...');
  const template = await fs.readFile('templates/entity.mustache', 'utf-8');
  spinner.succeed('Entity template loaded');

  for (const tableName in schema) {
    if (!schema.hasOwnProperty(tableName)) continue;

    const table = schema[tableName];

    const oneToManyRelationships = Object.entries(schema)
    .filter(([otherTableName, otherTable]) => 
      otherTable.inferredRelationships.some(rel => rel.foreign_table_name === tableName)
    )
    .map(([otherTableName]) => {
      const foreignEntityName = generateEntityName(otherTableName);
      return {
        foreign_table_name: otherTableName,
        foreignTableNameSingular: otherTableName.toLowerCase(),
        foreignEntityName: foreignEntityName,
        foreignEntityFileName: foreignEntityName.toLowerCase()
      };
    });

    const inferredRelationships = table.inferredRelationships.map(rel => ({
      ...rel,
      columnPropertyName: generatePropertyName(rel.column_name),
      relationPropertyName: generateRelationPropertyName(rel.column_name),
      foreignEntityName: generateEntityName(rel.foreign_table_name),
      foreignEntityFileName: generateEntityName(rel.foreign_table_name).toLowerCase(),
      foreignTableNameSingular: rel.foreign_table_name.toLowerCase()
    }));

    const rendered = mustache.render(template, {
      tableName,
      entityName: generateEntityName(tableName),
      columns: table.columns.map(col => ({
        column_name: col.COLUMN_NAME,
        propertyName: generatePropertyName(col.COLUMN_NAME),
        ts_type: typeMap[col.DATA_TYPE] || 'string',
        isPrimary: col.COLUMN_NAME === 'id',
        isForeignKey: table.inferredRelationships.some(rel => rel.column_name === col.COLUMN_NAME),
        columnOptions: col.COLUMN_NAME !== generatePropertyName(col.COLUMN_NAME) ? 
          [{ name: 'name', value: `'${col.COLUMN_NAME}'` }] : []
      })),
      inferredRelationships,
      oneToManyRelationships: oneToManyRelationships.map(rel => ({
        ...rel,
        relationPropertyName: pluralize.singular(tableName),
        foreignEntityName: generateEntityName(rel.foreign_table_name)
      }))
    });

    spinner.succeed(`Foreign keys for ${tableName}:`, table.foreignKeys);
    spinner.succeed(`One-to-many relationships for ${tableName}:`, oneToManyRelationships);

    const outputPath = path.join(outputDir, `${tableName.toLowerCase()}/${pluralize.singular(generateEntityName(tableName).toLowerCase())}.entity.ts`);
    await fs.outputFile(outputPath, rendered);
    spinner.succeed(`Generated entity for table ${tableName}`);
  }

  spinner.succeed("Entity generation complete.");
}


export { generateEntities };
