#!/usr/bin/env node

import inquirer from 'inquirer';
import ora from 'ora';
import { generateEntities } from './generate-entities.js';
import { generateNestComponents } from './generate-nest-components.js';
import { generateVueFrontend } from './generate-vue-frontend.js'; // New import

async function main() {
  const spinner = ora('Initializing Baker CLI...').start();

  try {
    spinner.succeed('NestJS Baker , From DB -> Nestjs server & Vue.js UI  ');

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Generate Entities', value: 'entities' },
          { name: 'Generate NestJS Components', value: 'components' },
          { name: 'Generate Vue.js dashboard from an existing Nestjs project or ORM DB ', value: 'vue' }, // New option
          { name: 'Generate Both Backend Components', value: 'both' },
          { name: 'Generate Full Stack (Backend + Frontend)', value: 'fullstack' }, // New option
        ],
      },
    ]);

    if (action === 'entities' || action === 'both' || action === 'fullstack') {
      console.log('\nGenerating entities...');
      await generateEntities();
      console.log('Entities generated successfully.\n');
    }

    if (action === 'components' || action === 'both' || action === 'fullstack') {
      console.log('\nGenerating NestJS components...');
      await generateNestComponents();
      console.log('NestJS components generated successfully.\n');
    }

    if (action === 'vue' || action === 'fullstack') {
      console.log('\nGenerating Vue.js frontend...');
      await generateVueFrontend();
      console.log('Vue.js frontend generated successfully.\n');
    }

    console.log('All tasks completed successfully!');
  } catch (error) {
    spinner.fail('An error occurred'); 
    console.error(error);
  }
}

main();