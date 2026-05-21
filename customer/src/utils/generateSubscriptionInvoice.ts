import jsPDF from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { ACS_LOGO_BASE64, URBAN_STEAM_LOGO_BASE64 } from './invoiceAssets';

export const generateSubscriptionInvoice = async (sub: any, customerName: string, customerMobile: string) => {
  if (!sub) return;

  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Logos
    try {
      doc.addImage(ACS_LOGO_BASE64, 'PNG', 15, 8, 45, 40);
      doc.addImage(URBAN_STEAM_LOGO_BASE64, 'PNG', pageWidth - 50, 8, 35, 32);
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('ACS Group', 15, 24);
      doc.text('Urban Steam', pageWidth - 55, 24);
    }

    // Invoice title
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('ORIGINAL FOR RECIPIENT', 17, 36);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('TAX INVOICE', 17, 45);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`#${sub._id?.slice(-8).toUpperCase() || 'SUB'}`, 17, 51);
    doc.setTextColor(0, 0, 0);

    // Three column box
    const yStart = 65;
    const sectionHeight = 45;

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.rect(15, yStart, pageWidth - 30, sectionHeight);
    doc.line(75, yStart, 75, yStart + sectionHeight);
    doc.line(145, yStart, 145, yStart + sectionHeight);

    // Issued
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Issued', 17, yStart + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(new Date(sub.purchasedAt).toLocaleDateString('en-GB'), 17, yStart + 14);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Due', 17, yStart + 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(new Date(sub.purchasedAt).toLocaleDateString('en-GB'), 17, yStart + 28);

    // Billed to
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Billed to', 77, yStart + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(customerName || 'Customer', 77, yStart + 14);
    doc.setFontSize(8);
    doc.text(`Contact: ${customerMobile || ''}`, 77, yStart + sectionHeight - 15);
    doc.text(`Receipt ID: ${sub._id?.slice(-8).toUpperCase()}`, 77, yStart + sectionHeight - 8);

    // From
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('From', 147, yStart + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('support@urbansteam.in', 147, yStart + 14);
    doc.text('GST: 29ACLFAA519M1ZW', 147, yStart + 22);

    // Table header
    let y = yStart + sectionHeight + 5;
    doc.setFillColor(245, 245, 245);
    doc.rect(15, y, pageWidth - 30, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Plan / Description', 17, y + 7);
    doc.text('Qty', 130, y + 7, { align: 'center' });
    doc.text('Rate', 155, y + 7, { align: 'center' });
    doc.text('Total', pageWidth - 17, y + 7, { align: 'right' });

    // Plan row
    y += 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(sub.planName || 'Wallet Top-Up Plan', 17, y);
    doc.setFont('helvetica', 'normal');
    doc.text('1', 130, y, { align: 'center' });
    doc.text(`Rs.${sub.price}`, 155, y, { align: 'center' });
    doc.text(`Rs.${sub.price}`, pageWidth - 17, y, { align: 'right' });

    // Summary
    y += 20;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Subtotal', 130, y);
    doc.text(`Rs.${sub.price}`, pageWidth - 17, y, { align: 'right' });
    y += 8;

    doc.line(130, y, pageWidth - 15, y);
    y += 8;

    doc.text('Tax (0%)', 130, y);
    doc.text('Rs.0.00', pageWidth - 17, y, { align: 'right' });
    y += 8;

    doc.line(130, y, pageWidth - 15, y);
    y += 8;

    doc.text('Total', 130, y);
    doc.text(`Rs.${sub.price}`, pageWidth - 17, y, { align: 'right' });
    y += 8;

    doc.line(130, y, pageWidth - 15, y);
    y += 8;

    doc.setTextColor(69, 45, 155);
    doc.text('Grand Total', 130, y);
    doc.text(`Rs.${sub.price}`, pageWidth - 17, y, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    y += 12;
    doc.setFillColor(240, 253, 244);
    doc.rect(15, y, pageWidth - 30, 14, 'F');
    doc.setTextColor(22, 163, 74);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Wallet Credited: Rs.${sub.walletCredited}`, 17, y + 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Payment ID: ${sub.razorpayPaymentId || 'N/A'}`, pageWidth - 17, y + 9, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    // Footer
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Thank you for choosing Urban Steam', 15, pageHeight - 24);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('In case of any issues contact support@urbansteam.in within 24 hours', 15, pageHeight - 18);

    const fileName = `UrbanSteam_Topup_${sub._id?.slice(-8).toUpperCase() || Date.now()}.pdf`;

    if (Capacitor.isNativePlatform()) {
      const pdfBlob = doc.output('blob');
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const result = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
        const canShare = await Share.canShare();
        if (canShare.value) {
          await Share.share({ title: `Receipt ${sub._id?.slice(-8).toUpperCase()}`, url: result.uri, dialogTitle: 'Save Receipt' });
        }
      };
      reader.readAsDataURL(pdfBlob);
    } else {
      doc.save(fileName);
    }
  } catch (error: any) {
    console.error('Subscription invoice error:', error);
    alert(`Failed to generate invoice: ${error.message}`);
  }
};
