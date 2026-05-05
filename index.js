const express = require('express');
const bodyParser = require('body-parser');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// ========== READ CREDENTIALS FROM ENV OR FILE ==========
let auth = null;

// Try 1: Read from PRIVATE_KEY environment variable
if (process.env.PRIVATE_KEY && process.env.GOOGLE_CLIENT_EMAIL) {
  try {
    auth = new JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    console.log("✅ Auth from ENV");
  } catch(e) { console.log("ENV auth failed:", e.message); }
}

// Try 2: Read from credentials.json file
if (!auth) {
  try {
    const creds = JSON.parse(fs.readFileSync('credentials.json', 'utf8'));
    auth = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    console.log("✅ Auth from credentials.json");
  } catch(e) { console.log("File auth failed:", e.message); }
}

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1P664K_tzT-a-GDfXw62TUt2H6_qZO7CV2-i5RYVrcj0';

// ========== ROUTES ==========
app.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === 'anak-iot') {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

app.get('/ambil-data', async (req, res) => {
  if (!auth) {
    return res.status(500).json({ error: 'Auth not configured. Check credentials.' });
  }
  
  const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    
    const dataHutang = rows.map(row => ({
      nama: row.get('Column 1'),
      nominal: row.get('Column 2'),
      keterangan: row.get('Column 3'),
      status: row.get('Column 4'),
      tanggal: row.get('Column 5')
    }));
    
    const validData = dataHutang.filter(item => item.nominal && item.nominal !== '0');
    res.json(validData);
  } catch (err) {
    console.error('Error ambil data:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/tambah-hutang', async (req, res) => {
  if (!auth) return res.status(500).send('Auth not configured');
  // ... (sama seperti sebelumnya)
});

app.post('/update-status', async (req, res) => {
  if (!auth) return res.status(500).json({ error: 'Auth not configured' });
  // ... (sama seperti sebelumnya)
});

app.post('/hapus-hutang', async (req, res) => {
  if (!auth) return res.status(500).json({ error: 'Auth not configured' });
  // ... (sama seperti sebelumnya)
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
  console.log('📊 Google Sheets ID:', SPREADSHEET_ID);
});