const express = require('express');
const bodyParser = require('body-parser');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// ========== CREDENTIALS ==========
const GOOGLE_CLIENT_EMAIL = 'admin-hutang@hutang-manager.iam.gserviceaccount.com';
const GOOGLE_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCz2bg0yrie0C1W
9gxyoVH/qRjoruM4ZPdrbLkaHrNDPbCA62m1oPY/452Ifk9iE5H+UaGEgLW51OF5
Ie8Yg/VBMRRb2TPzWiuViSpxd9NL3reLnPKKNzdvhjjwAHeoOYYeZ7YAkMMwuQ8z
D9+BQCCaTtm3L0pInoPbD8eLsf+Zue8QUL/ol275JFwgFmMCR0/UmomrWmGtfCKi
kUbHAOa7oYsr4DAhNN+y6zBsgogCjXojGVyBD0rmhCm5QTTbhZhhE+ZH23yQKGrG
2it88HCeTOyBiI0wHGQl98NG+vRp21hOf6V8XyKrDR+zHPiLId4KHKzHfGXJUh4a
mWo6wUEDAgMBAAECggEAAwZAik8YO4WlmS3F46Ik24ALeI2DQTnMWSwHVwZ4mFps
8yg8fMG0dsYJNg9mEuT3uFvFEO8XWW2p2bxEQscwN0eedtg4UG32wdl0kHJIxUPD
FjoLWQJnbW48IT9FIPMtPQdLFoG1yvTHjO10lqbXJYQQqnt/YGNAkmRoLOsgvGzC
5pPiFuf5EH8jjCLK4a9EAA8mclHnbKZbdECE5lCRxCG4ihLpXk4HHaHKuMVKUpTP
zazBMbSdT6FotwIQW2jfD/1uVArQEoHXr0b78cA+uuh65p+Mrfy0VDvX3sDlQGFA
7sm4RASyPUtBNbQiIYXmkfoKfdRAOJ8KgZkiYyTtcQKBgQDbSirzv59yHQFWOs6x
AI4iu/iftFXFnEsEs4HaquXWbDWlZyBmnSvcG3ePHsObXfAuajn/nhoRATp2fosB
WgowA7jcGE8uZWyC/yiBHJdmfeWpQJi09VHnAZ6OA4gkCRLZ7mbnSLShY84v456P
4aHqVjuJnt9nYfFTai2CX11MmQKBgQDR9VoTZNzhZ4uln46/5XocIJRoiTEu9EqU
s5SHbm/kf6/oLms87sCctGc8nUpQ/8l9EJw4b//zHki2PJREGWhAJeouOlknnh2G
wyreAVy//em0LxKuNYczShuQmmuHCdq1T9U4RqixQhWJRs8Xt2iTNLLC8CSod3i6
1GdZCsm/+wKBgQDEzeaIhaSSpGdrvTF893OYxrxWkGEeDaviFzxmRFQrwUfQHyKc
FViknN4LS1/gE0mYTmuo9nqMYl7Ws7ELUISuHNkOZp7Bk/L0Cg2O+lsCd+Diqn+i
gDy2JuTmrVLEjIQnpGckEUNTSKBmqFDI7oYDKssaMsRrIyKTa0pWpEG2mQKBgQDR
Vj7EPXmZaAMtVIQgwq1YZAd0nu0h8sJ1twNtcOgxPDpoVffoHeh/lcOlBPK3BgGg
J7KK9uiMP3Kh+I6fw3FVHDh8dQK1ZInt9qPEDDms135vf8uxVH+D3OzU5ZI2ZtXg
l0NxQ8ooSkpsv+P1spGazB08DfGO4ufF58dPWVlEhwKBgCgFyqMjpc7A7ZkWsJ18
O/zXbyEFxg1LMttfYyC/IhMfANGrISprdK+UI71bFQP9nBFHiDb6iczOwzadgXSK
DGLoP0j7JKJzMz3FsZvdXRjrsPb2X4HN0dReQz8jm7OGPou5Jg38T/dROPw8jnG1
JrPBsqGv5M7zMg6X97Gx4XtH
-----END PRIVATE KEY-----\n`;

const SPREADSHEET_ID = '1P664K_tzT-a-GDfXw62TUt2H6_qZO7CV2-i5RYVrcj0';

// ========== AUTH JWT ==========
const auth = new JWT({
  email: GOOGLE_CLIENT_EMAIL,
  key: GOOGLE_PRIVATE_KEY,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

let doc = null;

async function initAuth() {
  try {
    doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);
    await doc.loadInfo();
    console.log("✅ Auth berhasil, sheet title:", doc.title);
    return true;
  } catch (err) {
    console.error("❌ Auth gagal:", err.message);
    return false;
  }
}

initAuth();

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
  if (!doc) {
    return res.status(500).json({ error: 'Auth not ready. Please wait.' });
  }

  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    const dataHutang = rows.map(row => ({
      nama: row.get('Column 1') || '-',
      nominal: row.get('Column 2') || '0',
      keterangan: row.get('Column 3') || '-',
      status: row.get('Column 4') || 'Belum Bayar',
      tanggal: row.get('Column 5') || new Date().toISOString().split('T')[0]
    }));

    const validData = dataHutang.filter(item => item.nominal && item.nominal !== '0');
    res.json(validData);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/tambah-hutang', async (req, res) => {
  if (!doc) return res.status(500).send('Auth not ready');

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

    res.redirect('/');
  } catch (err) {
    res.status(500).send('❌ Error: ' + err.message);
  }
});

app.post('/update-status', async (req, res) => {
  if (!doc) return res.status(500).json({ error: 'Auth not ready' });

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
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Data tidak ditemukan' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/hapus-hutang', async (req, res) => {
  if (!doc) return res.status(500).json({ error: 'Auth not ready' });

  const { nama, tanggal } = req.body;
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    const targetRow = rows.find(row =>
      row.get('Column 1') === nama && row.get('Column 5') === tanggal
    );

    if (targetRow) {
      await targetRow.delete();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Data tidak ditemukan' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
});