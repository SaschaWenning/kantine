import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataDir = '/data';
const backupFile = join(dataDir, 'kantine-data-backup.json');

if (!existsSync(backupFile)) {
  console.error('Backup file not found:', backupFile);
  process.exit(1);
}

const data = JSON.parse(readFileSync(backupFile, 'utf-8'));

console.log('Splitting data for', data.users?.length || 0, 'kantines...');

// Extract users
const users = data.users || [];
writeFileSync(join(dataDir, 'users.json'), JSON.stringify(users, null, 2));
console.log('Created users.json with', users.length, 'users');

// Group data by userId
const kantineIds = [
  '17657062681610.04116636029909582', // Kantine 4 Tour
  '17657945223510.668209242825248'    // Kantine 2 Tour
];

for (const userId of kantineIds) {
  const user = users.find(u => u.id === userId);
  const kantineName = user?.username || userId;
  
  const employees = (data.employees || []).filter(e => e.userId === userId);
  const products = (data.products || []).filter(p => p.userId === userId);
  const transactions = (data.transactions || []).filter(t => t.userId === userId);
  const manualTransactions = (data.manualTransactions || []).filter(t => t.userId === userId);
  const dailyStats = data.dailyStats?.[userId] || { mittagessen: 0, broetchen: 0, eier: 0, kaffee: 0, gesamtbetrag: 0, date: '' };
  const employeesWithLunch = data.employeesWithLunch?.[userId] || [];
  
  const kantineData = {
    employees,
    products,
    transactions,
    manualTransactions,
    dailyStats,
    employeesWithLunch
  };
  
  const filename = `kantine-${userId}.json`;
  writeFileSync(join(dataDir, filename), JSON.stringify(kantineData, null, 2));
  
  console.log(`Created ${filename} for "${kantineName}":`);
  console.log(`  - ${employees.length} employees`);
  console.log(`  - ${products.length} products`);
  console.log(`  - ${transactions.length} transactions`);
  console.log(`  - ${manualTransactions.length} manual transactions`);
}

console.log('\nMigration complete!');
