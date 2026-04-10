import type { PageWIds } from "utils/utils";
import * as path from "path";
import { mkdirSync } from "fs";

export const DEMO_DIR = path.join(__dirname, "../../demo/home");

export const createReceipt = async (page1: PageWIds) => {
  const context = await page1.context();
  const page = await context.newPage();
  const width = 500;
  const height = 600;
  await page.setViewportSize({ width, height });
  const receiptData = {
    hotelName: "Grand Ocean Hotel",
    guestName: "John Doe",
    roomNumber: "305",
    checkIn: "2025-09-10",
    checkOut: "2025-09-12",
    amount: "$450.00",
    receiptNumber: "RCPT-20250911-001",
  };

  const receiptHTML = `
    <html>
      <head>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            width: 500px;
            margin: 0;
            padding: 20px;
            border: 2px solid #333;
            border-radius: 10px;
            background: #fdfdfd;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          .logo {
            width: 80px;
            height: 80px;
            background: #ccc;
            border-radius: 50%;
            display: inline-block;
            margin-bottom: 10px;
          }
          h1 {
            margin: 0;
            font-size: 24px;
            color: #2c3e50;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          td {
            padding: 8px 5px;
          }
          tr:nth-child(even) {
            background: #f0f0f0;
          }
          .amount {
            font-weight: bold;
            font-size: 18px;
            text-align: right;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #555;
          }
          .qr {
            display: block;
            margin: 10px auto;
            width: 80px;
            height: 80px;
            background: #eee;
            text-align: center;
            line-height: 80px;
            color: #999;
            font-size: 10px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Logo</div>
          <h1>${receiptData.hotelName}</h1>
        </div>

        <table>
          <tr><td><strong>Guest:</strong></td><td>${receiptData.guestName}</td></tr>
          <tr><td><strong>Room:</strong></td><td>${receiptData.roomNumber}</td></tr>
          <tr><td><strong>Check-in:</strong></td><td>${receiptData.checkIn}</td></tr>
          <tr><td><strong>Check-out:</strong></td><td>${receiptData.checkOut}</td></tr>
          <tr><td><strong>Amount:</strong></td><td class="amount">${receiptData.amount}</td></tr>
        </table>

        <div class="footer">
          Receipt #: ${receiptData.receiptNumber}
          <div class="qr">QR</div>
        </div>
      </body>
    </html>
  `;

  await page.setContent(receiptHTML, { waitUntil: "domcontentloaded" });

  const sample_home_dir_folders = [
    "Documents/Receipts",
    "Downloads",
    "Pictures",
    "Music",
    "Videos",
  ];
  for (const folder of sample_home_dir_folders) {
    const folderPath = path.join(DEMO_DIR, folder);
    mkdirSync(folderPath, { recursive: true });
  }

  const fileName = "hotel_receipt.png";
  const filePath = path.join(DEMO_DIR, sample_home_dir_folders[0], fileName);
  await page.screenshot({
    path: filePath,
    fullPage: true,
  });
  await page.pdf({
    path: filePath.replace(".png", ".pdf"),
    width: `${width}px`,
    height: `${height}px`,
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });

  await page.close();
  return { filePath };
};
