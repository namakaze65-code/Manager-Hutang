const express = require('express');
const bodyParser = require('body-parser');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

const SPREADSHEET_ID = '1P664K_tzT-a-GDfXw62TUt2H6_qZO7CV2-i5RYVrcj0';

// Untuk production di Vercel (gunakan Environment Variables)
const auth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1P664K_tzT-a-GDfXw62TUt2H6_qZO7CV2-i5RYVrcj0';
// Route untuk halaman utama
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Ambil data dari Google Sheets
app.get('/ambil-data', async (req, res) => {
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
        console.error('Error ambil data:', err);
        res.status(500).json({ error: err.message });
    }
});

// Tambah hutang baru
app.post('/tambah-hutang', async (req, res) => {
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
        console.error('Error tambah data:', err);
        res.status(500).send('❌ Error: ' + err.message);
    }
});

// Update status jadi Lunas
app.post('/update-status', async (req, res) => {
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
        console.error('Error update status:', err);
        res.status(500).json({ error: err.message });
    }
});

// Hapus hutang
app.post('/hapus-hutang', async (req, res) => {
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
        console.error('Error hapus data:', err);
        res.status(500).json({ error: err.message });
    }
});

// ========== PENTING: Gunakan PORT dari environment Render ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di port ${PORT}`);
    console.log('📊 Terhubung ke Google Sheets ID:', SPREADSHEET_ID);
});
// ========== ROUTE LOGIN (Security Hardening) ==========
const VALID_PASSWORD = 'anak-iot'; // Password disimpan di BACKEND, aman!

app.post('/login', (req, res) => {
    const { password } = req.body;
    if (password === VALID_PASSWORD) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});