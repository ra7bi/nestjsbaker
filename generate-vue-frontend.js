// generate-vue-frontend.js
import analyzeSchema from './db-analyze.js';
import mustache from 'mustache';
import fs from 'fs-extra';
import path from 'path';
import pluralize from 'pluralize';
import ora from 'ora';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get the output directory from .env, with a fallback
const outputDir = process.env.FRONTEND_DIR || path.join(__dirname, '..', 'vue-frontend');

// Map SQL data types to JavaScript types
const typeMap = {
  int: 'number',
  varchar: 'string',
  text: 'string',
  timestamp: 'Date',
  // Add more type mappings as needed
};

function generateComponentName(tableName) {
  return pluralize.singular(tableName).charAt(0).toUpperCase() + pluralize.singular(tableName).slice(1);
}

async function generateVueFrontend() {
  const spinner = ora('Starting Vue.js frontend generation...').start();
  
  const schema = await analyzeSchema();

  spinner.succeed('Schema analysis complete');

  // Load Vue component templates
  const listTemplate = await fs.readFile('templates/vue/List.vue.mustache', 'utf-8');
  const formTemplate = await fs.readFile('templates/vue/Form.vue.mustache', 'utf-8');
  const detailTemplate = await fs.readFile('templates/vue/Detail.vue.mustache', 'utf-8');
  const apiTemplate = await fs.readFile('templates/vue/api.js.mustache', 'utf-8');
  const layoutTemplate = await fs.readFile('templates/vue/Layout.vue.mustache', 'utf-8');
  const routerTemplate = await fs.readFile('templates/vue/router.js.mustache', 'utf-8');

  const components = [];

  for (const tableName in schema) {
    if (!schema.hasOwnProperty(tableName)) continue;

    const table = schema[tableName];
    const componentName = generateComponentName(tableName);

    components.push({
      name: componentName,
      route: tableName.toLowerCase()
    });

    // Generate List component
    const listRendered = mustache.render(listTemplate, {
      componentName,
      tableName,
      columns: table.columns.map(col => ({
        name: col.COLUMN_NAME,
        label: col.COLUMN_NAME.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        vueBinding: `{{ item.${col.COLUMN_NAME} }}`
      }))
    });

    // Generate Form component
    const formRendered = mustache.render(formTemplate, {
      componentName,
      tableName,
      fields: table.columns.map(col => ({
        name: col.COLUMN_NAME,
        label: col.COLUMN_NAME.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: typeMap[col.DATA_TYPE] || 'string'
      }))
    });

    // Generate Detail component
    const detailRendered = mustache.render(detailTemplate, {
      componentName,
      tableName,
      fields: table.columns.map(col => ({
        name: col.COLUMN_NAME,
        label: col.COLUMN_NAME.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        vueBinding: `{{ item.${col.COLUMN_NAME} }}`
      }))
    });

    // Generate API file
    const apiRendered = mustache.render(apiTemplate, {
      componentName,
      tableName
    });

    // Write files
    await fs.outputFile(path.join(outputDir, 'components', `${componentName}List.vue`), listRendered);
    await fs.outputFile(path.join(outputDir, 'components', `${componentName}Form.vue`), formRendered);
    await fs.outputFile(path.join(outputDir, 'components', `${componentName}Detail.vue`), detailRendered);
    await fs.outputFile(path.join(outputDir, 'api', `${componentName.toLowerCase()}Api.js`), apiRendered);

    spinner.succeed(`Generated Vue.js components and API for ${tableName}`);
  }

  // Generate AppLayout component
  const layoutRendered = mustache.render(layoutTemplate, {
    appName: 'MyApp Demo',
    components: components
  });
  await fs.outputFile(path.join(outputDir, 'components', 'AppLayout.vue'), layoutRendered);
  spinner.succeed('Generated AppLayout component');

  // Generate main App.vue and router.js
  const appTemplate = await fs.readFile('templates/vue/App.vue.mustache', 'utf-8');
  const appRendered = mustache.render(appTemplate, {
    components: components
  });
  await fs.outputFile(path.join(outputDir, 'App.vue'), appRendered);

  const routerRendered = mustache.render(routerTemplate, {
    routes: components
  });
  await fs.outputFile(path.join(outputDir, 'router.js'), routerRendered);

  spinner.succeed("Vue.js frontend generation complete.");
}


export { generateVueFrontend };
