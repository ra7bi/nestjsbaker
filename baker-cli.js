#!/usr/bin/env node

import inquirer from 'inquirer';
import ora from 'ora';
import { generateEntities } from './generate-entities.js';
import { generateNestComponents } from './generate-nest-components.js';

async function main() {
  const spinner = ora('Initializing Baker CLI...').start();

  try {
    spinner.succeed('Baker CLI initialized');

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Generate Entities', value: 'entities' },
          { name: 'Generate NestJS Components', value: 'components' },
          { name: 'Generate Both', value: 'both' },
        ],
      },
    ]);

    if (action === 'entities' || action === 'both') {
      console.log('\nGenerating entities...');
      await generateEntities();
      console.log('Entities generated successfully.\n');
    }

    if (action === 'components' || action === 'both') {
      console.log('\nGenerating NestJS components...');
      await generateNestComponents();
      console.log('NestJS components generated successfully.\n');
    }

    console.log('All tasks completed successfully!');
  } catch (error) {
    spinner.fail('An error occurred');
    console.error(error);
  }
}

main();