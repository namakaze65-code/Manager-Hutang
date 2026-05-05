const express = require('express');
const bodyParser = require('body-parser');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// ========== DEBUGGING ENVIRONMENT VARIABLES ==========
console.log("=== CHECK ENVIRONMENT VARIABLES ===");
console.log("GOOGLE_CLIENT_EMAIL exists:", !!process.env.GOOGLE_CLIENT_EMAIL);
console.log("GOOGLE_PRIVATE_KEY exists:", !!process.env.GOOGLE_PRIVATE_KEY);
console.log("SPREADSHEET_ID exists:", !!process.env.SPREADSHEET_ID);
console.log("======================================");

// ========== AUTHENTICATION GOOGLE SHEETS ==========
let auth;
try {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : null;
  
  if (clientEmail && privateKey) {
    auth = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    console.log("✅ Auth JWT berhasil dibuat");
  } else {
    console.log("❌ Environment variables tidak lengkap");
    auth = null;
  }
} catch (err) {
  console.error("Error creating auth:", err.message);
  auth = null;
}

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1P664K_tzT-a-GDfXw62TUt2H6_qZO7CV2-i5RYVrcj0';

// ========== ROUTE LOGIN ==========
app.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === 'anak-iot') {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

// ========== ROUTE AMBIL DATA ==========
app.get('/ambil-data', async (req, res) => {
  if (!auth) {
    return res.status(500).json({ error: 'Auth not configured. Check environment variables.' });
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

// ========== ROUTE TAMBAH HUTANG ==========
app.post('/tambah-hutang', async (req, res) => {
  if (!auth) {
    return res.status(500).send('Auth not configured');
  }
  
  const { nama, nominal, keterangan } = req.body;
  const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    
    const today = new Date();
    const tanggal = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    await sheet.addRow({
      'Column 1': nama,
      'Column 2': nominal,
      'Column 3': keterangan,
      'Column 4': 'Belum Bayar',
      'Column 5': tanggal
    });
    
    console.log(`✅ Data ditambahkan: ${nama} - Rp${parseInt(nominal).toLocaleString()}`);
    res.redirect('/');
  } catch (err) {
    console.error('Error tambah data:', err.message);
    res.status(500).send('❌ Error: ' + err.message);
  }
});

// ========== ROUTE UPDATE STATUS (BAYAR) ==========
app.post('/update-status', async (req, res) => {
  if (!auth) {
    return res.status(500).json({ error: 'Auth not configured' });
  }
  
  const { nama, tanggal } = req.body;
  const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    
    const targetRow = rows.find(row => 
      row.get('Column 1') === nama && row.get('Column 5') === tanggal
    );
    
    if (targetRow) {
      targetRow.set('Column 4', 'Lunas');
      await targetRow.save();
      console.log(`✅ Status diupdate: ${nama} - ${tanggal} menjadi Lunas`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Data tidak ditemukan' });
    }
  } catch (err) {
    console.error('Error update status:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========== ROUTE HAPUS HUTANG ==========
app.post('/hapus-hutang', async (req, res) => {
  if (!auth) {
    return res.status(500).json({ error: 'Auth not configured' });
  }
  
  const { nama, tanggal } = req.body;
  console.log(`🗑️ Mencoba hapus: ${nama} - ${tanggal}`);
  
  const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    
    const targetRow = rows.find(row => 
      row.get('Column 1') === nama && row.get('Column 5') === tanggal
    );
    
    if (targetRow) {
      await targetRow.delete();
      console.log(`✅ Data berhasil dihapus: ${nama} - ${tanggal}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Data tidak ditemukan' });
    }
  } catch (err) {
    console.error('Error hapus data:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========== ROUTE HALAMAN UTAMA ==========
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== SERVER START ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
  console.log('📊 Terhubung ke Google Sheets ID:', SPREADSHEET_ID);
});