const express = require('express');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
    res.send('Welcome to the QR Code Generator API');
});

app.post('/api/generate-qrs', async (req, res) => {
    try {
        const { x } = req.body;
        if (!x) {
            return res.status(400).json({ error: 'Data required' });
        }

        const pageWidth = 12 * 72;
        const pageHeight = 1200;
        const qrBoxWidth = 84;
        const qrBoxHeight = 200;
        const qrWidth = 84;
        const qrHeight = 84;
        const paddingX = 36;
        const paddingY = 36;
        const qrPerRow = 7;
        const qrPerColumn = 5;
        const qrPerPage = qrPerRow * qrPerColumn;

        const doc = new PDFDocument({ autoFirstPage: false });
        res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${x.PNo}-${x.StyleCode}-${x.Color}-${x.Size}-QR QTY ${x.TotQty}.pdf"`
        });
        doc.pipe(res);

        for (let page = 0; page * qrPerPage < x.TotQty; page++) {
            doc.addPage({ size: [pageWidth, pageHeight] });

            for (let i = 0; i < qrPerPage && (page * qrPerPage + i) < x.TotQty; i++) {
                const qrIndex = page * qrPerPage + i + 1;
                const qrNumber = String(qrIndex).padStart(7, '0');
                const qrData = `QR${qrNumber} ! ${x.PNo} ! ${x.StyleCode} ! ${x.Color} ! ${x.Size} `;
                const qrCode = await QRCode.toDataURL(qrData);

                const row = Math.floor(i / qrPerRow);
                const col = i % qrPerRow;
                const xPosition = col * (qrBoxWidth + paddingX) + paddingX;
                const yPosition = row * (qrBoxHeight + paddingY) + paddingY;

                doc.image(qrCode, xPosition, yPosition, {
                    fit: [qrWidth, qrHeight],
                    align: 'center',
                    valign: 'center'
                });
                doc.text(qrData, xPosition, yPosition + qrHeight + 10, { align: 'center', width: qrBoxWidth });
            }
        }

        doc.end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
