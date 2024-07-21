// generate-nest-components.js
import dotenv from 'dotenv';
import analyzeSchema from './db-analyze.js';
import mustache from 'mustache';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import pluralize from 'pluralize';
import ora from 'ora';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration for component locations
const componentConfig = {
  module: '',
  controller: '',
  dto: 'dto',
  service: ''
};

function generateClassName(tableName, suffix) {
  return pluralize.singular(tableName).charAt(0).toUpperCase() 
    + pluralize.singular(tableName).slice(1) 
    + suffix;
}

async function generateNestComponents() {


  const spinner = ora('Starting NestJS component generation...').start();


  const schema = await analyzeSchema();

  const moduleTemplate = await fs.readFile('templates/module.mustache', 'utf-8');
  const controllerTemplate = await fs.readFile('templates/controller.mustache', 'utf-8');
  const dtoTemplate = await fs.readFile('templates/dto.mustache', 'utf-8');
  const serviceTemplate = await fs.readFile('templates/service.mustache', 'utf-8');

  // Get the base output directory from .env
  const baseOutputDir = process.env.OUTPUT_DIR || 'output';

  for (const tableName in schema) {
    if (!schema.hasOwnProperty(tableName)) continue;


    const table = schema[tableName];
    if (!table || typeof table !== 'object') {
      spinner.error(`Invalid table data for table "${tableName}":`, table);
      continue;  // Skip this table and move to the next one
    }
  
    if (!Array.isArray(table.columns)) {
      spinner.error(`No columns found for table "${tableName}":`, table);
      continue;  // Skip this table and move to the next one
    }


    const entityName = generateClassName(tableName, '');
    const moduleName = generateClassName(tableName, 'Module');  // Add this line
    const controllerName = generateClassName(tableName, 'Controller');
    const serviceName = generateClassName(tableName, 'Service');
    const serviceInstanceName = serviceName.charAt(0).toLowerCase() + serviceName.slice(1);
    const createDtoName = `Create${entityName}Dto`;
    const createDtoInstanceName = createDtoName.charAt(0).toLowerCase() + createDtoName.slice(1);
    const updateDtoName = `Update${entityName}Dto`;
    const updateDtoInstanceName = updateDtoName.charAt(0).toLowerCase() + updateDtoName.slice(1);
    const entityNameLowercase = entityName.charAt(0).toLowerCase() + entityName.slice(1);


  
    // Create the table-specific output directory
    const tableOutputDir = path.join(baseOutputDir, tableName);
    await fs.ensureDir(tableOutputDir);

    // Generate Module
    const moduleRendered = mustache.render(moduleTemplate, {
      tableName,
      entityName,
      entityNameLowercase,
      controllerName,
      serviceName,
      moduleName,
      controllerName,
      serviceName,
      entityName
    });
    await fs.outputFile(path.join(tableOutputDir, componentConfig.module, `${tableName}.module.ts`), moduleRendered);

// Generate Controller


  // Generate Controller
  const controllerRendered = mustache.render(controllerTemplate, {
    tableName,
    entityName,
    entityNameLowercase,
    controllerName,
    serviceName,
    serviceInstanceName,
    createDtoName,
    createDtoInstanceName,
    updateDtoName,
    updateDtoInstanceName
  });


  await fs.outputFile(path.join(tableOutputDir, componentConfig.controller, `${tableName}.controller.ts`), controllerRendered);
  // Generate DTOs
    const dtoDir = path.join(tableOutputDir, componentConfig.dto);
    await fs.ensureDir(dtoDir);

    const createDtoRendered = mustache.render(dtoTemplate, {
      dtoName: createDtoName,
      properties: table.columns.map(col => ({
        name: col.COLUMN_NAME,
        type: getTypeScriptType(col.DATA_TYPE)
      }))
    });



    await fs.outputFile(path.join(dtoDir, `create-${tableName}.dto.ts`), createDtoRendered);

    const updateDtoRendered = mustache.render(dtoTemplate, {
      dtoName: updateDtoName,
      properties: table.columns.map(col => ({
        name: col.COLUMN_NAME,
        type: getTypeScriptType(col.DATA_TYPE),
        optional: true
      }))
    });


    await fs.outputFile(path.join(dtoDir, `update-${tableName}.dto.ts`), updateDtoRendered);

    // Generate Service
    const serviceRendered = mustache.render(serviceTemplate, {
      tableName,
      entityName,
      entityNameLowercase,
      serviceName,
      createDtoName,
      createDtoInstanceName,
      updateDtoName,
      updateDtoInstanceName
    });

  
    await fs.outputFile(path.join(tableOutputDir, componentConfig.service, `${tableName}.service.ts`), serviceRendered);
    
    spinner.succeed(`NestJS components for ${tableName} generated in ${tableOutputDir}`);
  }

  spinner.succeed("NestJS component generation complete.");
}

function getTypeScriptType(sqlType) {
  const typeMap = {
    int: 'number',
    varchar: 'string',
    text: 'string',
    timestamp: 'Date',
    // Add more mappings as needed
  };
  return typeMap[sqlType] || 'any';
}


export { generateNestComponents };

