const express = require('express');
const bodyParser = require('body-parser');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// ========== BACA SERVICE ACCOUNT JSON LANGSUNG ==========
let doc = null;

// Fungsi untuk inisialisasi auth
async function initAuth() {
  try {
    const creds = JSON.parse(fs.readFileSync('credentials.json', 'utf8'));
    doc = new GoogleSpreadsheet('1P664K_tzT-a-GDfXw62TUt2H6_qZO7CV2-i5RYVrcj0');
    await doc.useServiceAccountAuth({
      client_email: creds.client_email,
      private_key: creds.private_key,
    });
    console.log("✅ Auth berhasil dari credentials.json");
    return true;
  } catch (err) {
    console.error("❌ Gagal auth:", err.message);
    return false;
  }
}

// Jalankan init auth
initAuth();

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
  if (!doc) {
    return res.status(500).json({ error: 'Auth not configured. Check credentials.json' });
  }
  
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
  if (!doc) return res.status(500).send('Auth not configured');
  
  const { nama, nominal, keterangan } = req.body;
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

// ========== ROUTE UPDATE STATUS ==========
app.post('/update-status', async (req, res) => {
  if (!doc) return res.status(500).json({ error: 'Auth not configured' });
  
  const { nama, tanggal } = req.body;
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
  if (!doc) return res.status(500).json({ error: 'Auth not configured' });
  
  const { nama, tanggal } = req.body;
  console.log(`🗑️ Mencoba hapus: ${nama} - ${tanggal}`);
  
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
});