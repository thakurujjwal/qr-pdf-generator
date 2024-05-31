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
        doc.pipe(res);

        let pageCount = 0;

        for (let i = 1; i <= x.TotQty; i++) {
            const qrNumber = String(i).padStart(7, '0');
            const qrData = `QR${qrNumber} ! ${x.PNo} ! ${x.StyleCode} ! ${x.Color} ! ${x.Size} `;
            const qrCode = await QRCode.toDataURL(qrData);

            if (i % qrPerPage === 1) {
                doc.addPage({ size: [pageWidth, pageHeight] });
                pageCount++;
            }

            const localIndex = (i - 1) % qrPerPage;
            const row = Math.floor(localIndex / qrPerRow);
            const col = localIndex % qrPerRow;

            const xPosition = col * (qrBoxWidth + paddingX) + paddingX;
            const yPosition = row * (qrBoxHeight + paddingY) + paddingY;

            doc.image(qrCode, xPosition, yPosition, {
                fit: [qrWidth, qrHeight],
                align: 'center',
                valign: 'center'
            });
            doc.text(qrData, xPosition, yPosition + qrHeight + 10, { align: 'center', width: qrBoxWidth, height: qrBoxHeight });

            // Allow the server to process other requests during large operations
            if (i % 100 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        doc.end();

        res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${x.PNo}-${x.StyleCode}-${x.Color}-${x.Size}-QR QTY ${x.TotQty}.pdf"`,
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
