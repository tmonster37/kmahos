const fs = require('fs');
const { execSync } = require('child_process');

const files = fs.readdirSync('.');
const docxFile = files.find(f => f.endsWith('.docx'));
console.log('Found docx file:', docxFile);

fs.copyFileSync(docxFile, 'temp.zip');
execSync('powershell -Command "Expand-Archive -Path temp.zip -DestinationPath temp_unzip -Force"');
const xml = fs.readFileSync('temp_unzip/word/document.xml', 'utf8');
const txt = xml.replace(/<w:p[^>]*>/g, '\n').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
fs.writeFileSync('extracted_yeu_cau.txt', txt, 'utf8');

execSync('powershell -Command "Remove-Item temp.zip -Force; Remove-Item temp_unzip -Recurse -Force"');
console.log('=== EXTRACTED DOCX CONTENT ===\n');
console.log(txt);
