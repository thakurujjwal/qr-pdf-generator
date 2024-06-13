const express = require('express');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const cors = require('cors');
const ExcelJS = require('exceljs');

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

        // Define A3 page size
        const pageWidth = 841.89;
        const pageHeight = 1190.55;

        const qrBoxWidth = 92; 
        const qrBoxHeight = 200; 
        const qrWidth = 96;
        const qrHeight = 96;
        const paddingX = 25; 
        const paddingY = 30;

        const qrPerRow = 7;
        const qrPerColumn = 5;
        const qrPerPage = qrPerRow * qrPerColumn;

        const doc = new PDFDocument({ autoFirstPage: false });
        res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${x.PNo}-${x.StyleCode}-${x.Color}-${x.Size}-QR QTY - ${x.TotQty}.pdf"`
        });
        doc.pipe(res);

        // Prepare data for Excel
        const labelData = [];

        // Loop through pages
        for (let pageIndex = 0; pageIndex * qrPerPage < x.TotQty; pageIndex++) {
            doc.addPage({ size: [pageWidth, pageHeight] });

            // Loop through QR codes on the current page
            for (let i = 0; i < qrPerPage && (pageIndex * qrPerPage + i) < x.TotQty; i++) {
                const qrIndex = pageIndex * qrPerPage + i + 1;
                const qrNumber = String(qrIndex).padStart(7, '0');
                const qrData = `QR${qrNumber} ! ${x.PNo} ! ${x.StyleCode} ! ${x.Color} ! ${x.Size} `;
                // const qrCode = await QRCode.toDataURL(qrData);
                const qrCode = await QRCode.toDataURL(qrData, { width: 1440, margin: 1 });

                const row = Math.floor(i / qrPerRow);
                const col = i % qrPerRow;
                const xPosition = col * (qrBoxWidth + paddingX) + paddingX;
                const yPosition = row * (qrBoxHeight + paddingY) + paddingY;

                doc.image(qrCode, xPosition, yPosition, {
                    fit: [qrWidth, qrHeight],
                    align: 'center',
                    valign: 'center'
                });
                doc.text(qrData, xPosition, yPosition + qrHeight + 10, { align: 'center', width: qrWidth });

                // Add to label data for Excel
                labelData.push({
                    QRNumber: qrNumber,
                    PNo: x.PNo,
                    StyleCode: x.StyleCode,
                    Color: x.Color,
                    Size: x.Size,
                    QRData: qrData
                });
            }
        }

        doc.end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/generate-excel', async (req, res) => {
    try {
        const { x } = req.body;
        if (!x) {
            return res.status(400).json({ error: 'Data required' });
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Label Data');

        worksheet.columns = [
            { header: 'QR Number', key: 'QRNumber', width: 15 },
            { header: 'PNo', key: 'PNo', width: 15 },
            { header: 'Style Code', key: 'StyleCode', width: 15 },
            { header: 'Color', key: 'Color', width: 15 },
            { header: 'Size', key: 'Size', width: 15 },
            { header: 'QR Data', key: 'QRData', width: 50 }
        ];

        for (let i = 0; i < x.TotQty; i++) {
            const qrNumber = String(i + 1).padStart(7, '0');
            const qrData = `QR${qrNumber} ! ${x.PNo} ! ${x.StyleCode} ! ${x.Color} ! ${x.Size} `;

            worksheet.addRow({
                QRNumber: qrNumber,
                PNo: x.PNo,
                StyleCode: x.StyleCode,
                Color: x.Color,
                Size: x.Size,
                QRData: qrData
            });
        }

        res.writeHead(200, {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${x.PNo}-${x.StyleCode}-${x.Color}-${x.Size}-Label Data.xlsx"`
        });

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
