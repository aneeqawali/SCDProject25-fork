const readline = require('readline');
const db = require('./db');
require('./events/logger'); // Initialize event logger

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function menu() {
  console.log(`
===== NodeVault =====
1. Add Record
2. List Records
3. Update Record
4. Delete Record
5. Exit
6. Search Records
7. Sort Records
=====================
  `);

  rl.question('Choose option: ', ans => {
    switch (ans.trim()) {
      case '1':
        rl.question('Enter name: ', name => {
          rl.question('Enter value: ', value => {
            db.addRecord({ name, value });
            console.log('✅ Record added successfully!');
            menu();
          });
        });
        break;

      case '2':
        const records = db.listRecords();
        if (records.length === 0) console.log('No records found.');
        else records.forEach(r => console.log(`ID: ${r.id} | Name: ${r.name} | Value: ${r.value}`));
        menu();
        break;

      case '3':
        rl.question('Enter record ID to update: ', id => {
          rl.question('New name: ', name => {
            rl.question('New value: ', value => {
              const updated = db.updateRecord(Number(id), name, value);
              console.log(updated ? '✅ Record updated!' : '❌ Record not found.');
              menu();
            });
          });
        });
        break;

      case '4':
        rl.question('Enter record ID to delete: ', id => {
          const deleted = db.deleteRecord(Number(id));
          console.log(deleted ? '🗑️ Record deleted!' : '❌ Record not found.');
          menu();
        });
        break;

      case '5':
        console.log('👋 Exiting NodeVault...');
        rl.close();
        break;

      case '6':
        rl.question('Enter search keyword (Name or ID): ', keywordInput => {
        const keyword = keywordInput.toLowerCase();
        const records = db.listRecords(); // get current records
        const matches = records.filter(r =>
            r.name.toLowerCase().includes(keyword) || r.id.toString() === keyword
        );

        if (matches.length > 0) {
            console.log(`Found ${matches.length} matching records:`);
            matches.forEach(r => {
                console.log(`ID: ${r.id} | Name: ${r.name} | Value: ${r.value}`);
            });
        } else {
            console.log("No records found.");
        }

        menu(); 
        });
        break;

    case '7': 
    rl.question('Sort by field (Name/Created): ', fieldInput => {
        const field = fieldInput.toLowerCase();
        rl.question('Order (Ascending/Descending): ', orderInput => {
            const order = orderInput.toLowerCase();
            const records = db.listRecords();

            let sorted = [...records];
            if (field === 'name') {
                sorted.sort((a, b) => a.name.localeCompare(b.name));
            } else if (field === 'created') {
                sorted.sort((a, b) => new Date(a.created) - new Date(b.created));
            } else {
                console.log('Invalid field.');
                return menu();
            }

            if (order === 'descending') sorted.reverse();

            console.log('Sorted Records:');
            sorted.forEach(r => console.log(`ID: ${r.id} | Name: ${r.name} | Created: ${r.created}`));

            menu(); 
        });
    });
    break;

      default:
        console.log('Invalid option.');
        menu();
    }
  });
}

menu();
