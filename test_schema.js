const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('test.db');
const schema = fs.readFileSync('schema.sql', 'utf8');

db.serialize(() => {
  db.exec("INSERT INTO media (file_name, type) VALUES ('file1.jpg', 'PHOTO');");
  db.exec("INSERT INTO media (file_name, type) VALUES ('file1.jpg', 'EVENT_POSTER');"); // Emulating an update

  db.all("SELECT * FROM media_facts", [], (err, rows) => {
    console.log("Facts Table:");
    console.log(rows);
  });

  db.all("SELECT * FROM media", [], (err, rows) => {
    console.log("\nResolved View State:");
    console.log(rows);
  });
});

db.close();
