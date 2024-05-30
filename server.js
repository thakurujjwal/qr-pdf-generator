const express = require('express');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

app.post('/api/generate-qrs', async (req, res) => {
    try {
        const { x } = req.body;
        if (!x) {
            return res.status(400).json({ error: 'Data required' });
        }

        const qrCodes = [];
        for (let i = 1; i <= x.TotQty; i++) {
            const qrNumber = String(i).padStart(7, '0');
            const qrData = `QR${qrNumber} ! ${x.PNo} ! ${x.StyleCode} ! ${x.Color} ! ${x.Size}`;
            const qrCode = await QRCode.toDataURL(qrData);
            qrCodes.push({ data: qrData, qrCode });
        }

        const pageWidth = 12 * 72;    
        const pageHeight = 1200; 
        const qrBoxWidth = 84;          
        const qrBoxHeight = 200;       
        const qrWidth = 84;            
        const qrHeight = 84;            
        const paddingX = 36;           
        const paddingY = 36;            

        const doc = new PDFDocument({ autoFirstPage: false });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${x.PNo}-${x.StyleCode}-${x.Color}-${x.Size}.pdf"`,
                'Content-Length': pdfData.length
            });
            res.end(pdfData);
        });

        // const qrPerRow = Math.floor((pageWidth - paddingX) / (qrBoxWidth + paddingX));
        // const qrPerColumn = Math.floor((pageHeight - paddingY) / (qrBoxHeight + paddingY));
        const qrPerRow = 7;
        const qrPerColumn = 5;
        const qrPerPage = qrPerRow * qrPerColumn;

        qrCodes.forEach((qrCodeObj, index) => {
            if (index % qrPerPage === 0) {
                doc.addPage({ size: [pageWidth, pageHeight] });
            }

            const localIndex = index % qrPerPage;
            const row = Math.floor(localIndex / qrPerRow);
            const col = localIndex % qrPerRow;

            const xPosition = col * (qrBoxWidth + paddingX) + paddingX;
            const yPosition = row * (qrBoxHeight + paddingY) + paddingY;

            doc.image(qrCodeObj.qrCode, xPosition, yPosition, {
                fit: [qrWidth, qrHeight],
                align: 'center',
                valign: 'center'
            });
            doc.text(qrCodeObj.data, xPosition, yPosition + qrHeight + 10, { align: 'center', width: qrBoxWidth, height: qrBoxHeight });
        });

        doc.end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
