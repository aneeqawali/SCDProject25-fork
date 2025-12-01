require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('./events/logger'); 

const client = new MongoClient(process.env.MONGO_URI);
let recordsCollection;

async function connectDB() {
  await client.connect();
  const db = client.db(); 
  recordsCollection = db.collection('records');
  console.log('Connected to MongoDB');
}

function createBackup(records) {
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
  const timestamp = new Date().toISOString().replace(/[:]/g, '-');
  const backupFile = path.join(backupDir, `backup_${timestamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(records, null, 2));
  console.log(`🗄️ Backup created: ${backupFile}`);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
async function menu() {
  console.log(`
===== NodeVault =====
1. Add Record
2. List Records
3. Update Record
4. Delete Record
5. Exit
6. Search Records
7. Sort Records
8. Export Data
9. View Vault Statistics
=====================
  `);

  rl.question('Choose option: ', async ans => {
    switch (ans.trim()) {
      case '1': 
        rl.question('Enter name: ', async name => {
          rl.question('Enter value: ', async value => {
            const newRecord = {
              name,
              value,
              created: new Date(),
              updated: new Date()
            };
            await recordsCollection.insertOne(newRecord);
            console.log('Record added successfully!');
            const records = await recordsCollection.find().toArray();
            createBackup(records);
            menu();
          });
        });
        break;

      case '2': 
        const records = await recordsCollection.find().toArray();
        if (records.length === 0) console.log('No records found.');
        else records.forEach(r => console.log(`ID: ${r._id} | Name: ${r.name} | Value: ${r.value}`));
        menu();
        break;

      case '3': 
        rl.question('Enter record ID to update: ', async id => {
          rl.question('New name: ', async name => {
            rl.question('New value: ', async value => {
              const { matchedCount } = await recordsCollection.updateOne(
                { _id: new require('mongodb').ObjectId(id) },
                { $set: { name, value, updated: new Date() } }
              );
              console.log(matchedCount ? 'Record updated!' : 'Record not found.');
              const records = await recordsCollection.find().toArray();
              createBackup(records);
              menu();
            });
          });
        });
        break;

      case '4': 
        rl.question('Enter record ID to delete: ', async id => {
          const { deletedCount } = await recordsCollection.deleteOne({ _id: new require('mongodb').ObjectId(id) });
          console.log(deletedCount ? 'Record deleted!' : 'Record not found.');
          if (deletedCount) {
            const records = await recordsCollection.find().toArray();
            createBackup(records);
          }
          menu();
        });
        break;

      case '5':
        console.log('👋 Exiting NodeVault...');
        await client.close();
        rl.close();
        break;

      case '6': 
        rl.question('Enter search keyword (Name or ID): ', async keywordInput => {
          const keyword = keywordInput.toLowerCase();
          const allRecords = await recordsCollection.find().toArray();
          const matches = allRecords.filter(r =>
            r.name.toLowerCase().includes(keyword) || r._id.toString() === keyword
          );
          if (matches.length > 0) {
            console.log(`Found ${matches.length} matching records:`);
            matches.forEach(r => console.log(`ID: ${r._id} | Name: ${r.name} | Value: ${r.value}`));
          } else console.log("No records found.");
          menu();
        });
        break;

      case '7': 
        rl.question('Sort by field (Name/Created): ', async fieldInput => {
          const field = fieldInput.toLowerCase();
          rl.question('Order (Ascending/Descending): ', async orderInput => {
            const order = orderInput.toLowerCase();
            const allRecords = await recordsCollection.find().toArray();
            let sorted = [...allRecords];

            if (field === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
            else if (field === 'created') sorted.sort((a, b) => new Date(a.created) - new Date(b.created));
            else { console.log('Invalid field.'); return menu(); }

            if (order === 'descending') sorted.reverse();

            console.log('Sorted Records:');
            sorted.forEach(r => console.log(`ID: ${r._id} | Name: ${r.name} | Created: ${r.created}`));
            menu();
          });
        });
        break;

      case '8': 
        const exportRecords = await recordsCollection.find().toArray();
        if (exportRecords.length === 0) { console.log("No records to export."); return menu(); }
        const fileName = 'export.txt';
        const now = new Date().toISOString();
        let content = `===== Vault Export =====\nDate/Time: ${now}\nTotal Records: ${exportRecords.length}\nFile: ${fileName}\n=========================\n\n`;
        exportRecords.forEach(r => {
          content += `ID: ${r._id} | Name: ${r.name} | Value: ${r.value} | Created: ${r.created}\n`;
        });
        fs.writeFileSync(fileName, content);
        console.log(`Data exported successfully to ${fileName}`);
        menu();
        break;

      case '9': 
        const statsRecords = await recordsCollection.find().toArray();
        if (statsRecords.length === 0) { console.log("No records found."); return menu(); }

        const validDates = statsRecords.map(r => new Date(r.created)).filter(d => !isNaN(d));
        const totalRecords = statsRecords.length;
        const lastModified = statsRecords.map(r => new Date(r.updated || r.created)).filter(d => !isNaN(d)).sort((a,b)=>b-a)[0];
        const longestNameRecord = statsRecords.reduce((max, r) => r.name.length > max.name.length ? r : max, statsRecords[0]);
        const earliest = validDates.sort((a,b)=>a-b)[0];
        const latest = validDates.sort((a,b)=>a-b)[validDates.length -1];

        console.log(`
Vault Statistics:
--------------------------
Total Records: ${totalRecords}
Last Modified: ${lastModified ? lastModified.toISOString() : "N/A"}
Longest Name: ${longestNameRecord.name} (${longestNameRecord.name.length} characters)
Earliest Record: ${earliest ? earliest.toISOString().split('T')[0] : "N/A"}
Latest Record: ${latest ? latest.toISOString().split('T')[0] : "N/A"}
        `);
        menu();
        break;

      default:
        console.log('Invalid option.');
        menu();
    }
  });
}

async function startApp() {
  try {
    await connectDB();
    menu();
  } catch (err) {
    console.error(' MongoDB connection failed:', err);
    process.exit(1);
  }
}

startApp();

