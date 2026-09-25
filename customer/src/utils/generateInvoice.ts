import jsPDF from 'jspdf';
import { API_URL } from '@/config/api';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { ACS_LOGO_BASE64, URBAN_STEAM_LOGO_BASE64 } from './invoiceAssets';
import { getOrderBreakdown } from './orderBreakdown';

// Brand typography system
const setBrandFont = (doc: jsPDF, type: 'primary' | 'secondary', weight: 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black' = 'regular') => {
  try {
    // Primary: Montserrat, Secondary: Manrope
    // jsPDF doesn't support custom fonts directly, so we'll use closest system fonts
    const fontMap = {
      primary: 'helvetica', // Closest to Montserrat
      secondary: 'helvetica' // Closest to Manrope
    };
    
    const weightMap = {
      light: 'normal',
      regular: 'normal', 
      medium: 'normal',
      semibold: 'bold',
      bold: 'bold',
      extrabold: 'bold',
      black: 'bold'
    };
    
    doc.setFont(fontMap[type], weightMap[weight]);
  } catch (e) {
    doc.setFont('helvetica', 'normal');
  }
};

// Typography scale based on brand system
const setTypography = (doc: jsPDF, style: 'h1' | 'h2' | 'h3' | 'h4' | 'subtitle' | 'button' | 'body') => {
  switch (style) {
    case 'h1': // Montserrat Bold Size 16
      setBrandFont(doc, 'primary', 'bold');
      doc.setFontSize(16);
      break;
    case 'h2': // Montserrat Semibold Size 14  
      setBrandFont(doc, 'primary', 'semibold');
      doc.setFontSize(14);
      break;
    case 'h3': // Montserrat Medium Size 14
      setBrandFont(doc, 'primary', 'medium');
      doc.setFontSize(14);
      break;
    case 'h4': // Montserrat Regular Size 13
      setBrandFont(doc, 'primary', 'regular');
      doc.setFontSize(13);
      break;
    case 'subtitle': // Manrope Size 14
      setBrandFont(doc, 'secondary', 'bold');
      doc.setFontSize(14);
      break;
    case 'button': // Montserrat Size 12
      setBrandFont(doc, 'primary', 'medium');
      doc.setFontSize(12);
      break;
    case 'body': // Manrope Regular Size 12
      setBrandFont(doc, 'secondary', 'regular');
      doc.setFontSize(12);
      break;
  }
};

const getRupeeSymbol = () => 'Rs';

// Convert images to base64 for mobile compatibility
const loadImageAsBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject(new Error('Canvas context failed'));
        }
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = url;
    setTimeout(() => reject(new Error('Image load timeout')), 5000);
  });
};

export const generateInvoicePDF = async (order: any) => {
  if (!order) return;

  try {
    // Fetch customer data
    let customerName = order.customerId?.name || order.customer?.name || 'Customer';
    let customerMobile = order.customerId?.mobile || order.customer?.mobile || '';
    
    if (!customerName || customerName === 'Customer' || !customerMobile) {
      try {
        const response = await fetch(`${API_URL}/api/customers/${order.customerId?._id || order.customerId}`);
        const data = await response.json();
        if (data.success && data.data) {
          customerName = data.data.name || customerName;
          customerMobile = data.data.mobile || customerMobile;
        }
      } catch (error) {
        console.log('Could not fetch customer data');
      }
    }
    
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Set brand typography
    const rupeeSymbol = getRupeeSymbol();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Header logos - increase height, keep width same
    try {
      doc.addImage(ACS_LOGO_BASE64, 'PNG', 15, 8, 45, 40);
      doc.addImage(URBAN_STEAM_LOGO_BASE64, 'PNG', pageWidth - 50, 8, 35, 32);
    } catch (imgError) {
      setTypography(doc, 'h1');
      doc.text('ACS Group', 15, 24);
      doc.text('Urban Steam', pageWidth - 55, 24);
    }
    
    // Invoice header - remove border
    setTypography(doc, 'body');
    doc.setFontSize(8);
    doc.text('ORIGINAL FOR RECIPIENT', 17, 36);
    
    setTypography(doc, 'h1');
    doc.setFontSize(18);
    doc.text('TAX INVOICE', 17, 45);
    
    setTypography(doc, 'body');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`#${order.orderId || 'RW0R7'}`, 17, 51);
    doc.setTextColor(0, 0, 0);
    
    // Three column section - calculate dynamic height based on content
    let yStart = 65;
    
    // Calculate required height for billed to section
    const address = order.pickupAddress?.street || 'Xiv hall';
    const cityState = `${order.pickupAddress?.city || 'Rajkot'}, ${order.pickupAddress?.state || 'Gujarat'} - ${order.pickupAddress?.pincode || '360001'}`;
    
    // Base height + extra space for long addresses
    let sectionHeight = 45;
    if (address.length > 30 || cityState.length > 40) {
      sectionHeight = 55;
    }
    if (address.length > 50 || cityState.length > 60) {
      sectionHeight = 65;
    }
    
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.rect(15, yStart, pageWidth - 30, sectionHeight);
    
    // Vertical dividers between sections
    doc.line(75, yStart, 75, yStart + sectionHeight);
    doc.line(145, yStart, 145, yStart + sectionHeight);
    
    // Issued section
    setTypography(doc, 'subtitle');
    doc.setFontSize(10);
    doc.text('Issued', 17, yStart + 8);
    
    setTypography(doc, 'body');
    doc.setFontSize(9);
    doc.text(new Date(order.createdAt).toLocaleDateString('en-GB'), 17, yStart + 14);
    
    setTypography(doc, 'subtitle');
    doc.setFontSize(10);
    doc.text('Due', 17, yStart + 22);
    
    setTypography(doc, 'body');
    doc.setFontSize(9);
    doc.text(new Date(order.createdAt).toLocaleDateString('en-GB'), 17, yStart + 28);
    
    // Billed to section
    setTypography(doc, 'subtitle');
    doc.setFontSize(10);
    doc.text('Billed to', 77, yStart + 8);
    
    setTypography(doc, 'body');
    doc.setFontSize(9);
    doc.text(customerName, 77, yStart + 14);
    
    // Wrap address text to prevent overflow
    const maxWidth = 60; // Maximum width for address text
    const addressLines = doc.splitTextToSize(address, maxWidth);
    let addressY = yStart + 19;
    addressLines.forEach((line: string) => {
      doc.text(line, 77, addressY);
      addressY += 5;
    });
    
    const cityStateLines = doc.splitTextToSize(cityState, maxWidth);
    cityStateLines.forEach((line: string) => {
      doc.text(line, 77, addressY);
      addressY += 5;
    });
    
    setTypography(doc, 'body');
    doc.setFontSize(8);
    doc.text(`Contact Number: ${customerMobile || '8140126027'}`, 77, yStart + sectionHeight - 15);
    doc.text(`Order Id: ${order.orderId || 'RW0R7'}`, 77, yStart + sectionHeight - 8);
    
    // From section
    setTypography(doc, 'subtitle');
    doc.setFontSize(10);
    doc.text('From', 147, yStart + 8);
    
    setTypography(doc, 'body');
    doc.setFontSize(9);
    doc.text('Email: support@urbansteam.in', 147, yStart + 14);
    doc.text('GST: 29ACLFAA519M1ZW', 147, yStart + 22); // Moved down from 20 to 22
    
    // Service table - position after dynamic section
    yStart = 65 + sectionHeight + 5;
    doc.setFillColor(245, 245, 245);
    doc.rect(15, yStart, pageWidth - 30, 10, 'F');
    
    setTypography(doc, 'h3');
    doc.setFontSize(10);
    doc.text('Service & Description', 17, yStart + 7);
    doc.text('Qty', 130, yStart + 7, { align: 'center' });
    doc.text('Rate', 155, yStart + 7, { align: 'center' });
    doc.text('Total', pageWidth - 17, yStart + 7, { align: 'right' });
    
    yStart += 15;
    let subtotal = 0;
    const itemsPerPage = 15; // Max items per page
    const maxYPosition = pageHeight - 80; // Reserve space for footer
    
    if (order.items && order.items.length > 0) {
      order.items.forEach((item: any, index: number) => {
        // Check if we need a new page
        if (yStart > maxYPosition) {
          doc.addPage();
          yStart = 20;
          
          // Add service table header on new page
          doc.setFillColor(245, 245, 245);
          doc.rect(15, yStart, pageWidth - 30, 10, 'F');
          
          setTypography(doc, 'h3');
          doc.setFontSize(10);
          doc.text('Service & Description', 17, yStart + 7);
          doc.text('Qty', 130, yStart + 7, { align: 'center' });
          doc.text('Rate', 155, yStart + 7, { align: 'center' });
          doc.text('Total', pageWidth - 17, yStart + 7, { align: 'right' });
          yStart += 15;
        }
        
        const itemTotal = (item.quantity || 0) * (item.price || 0);
        subtotal += itemTotal;
        
        setTypography(doc, 'h4');
        doc.setFontSize(10);
        doc.text(item.name || 'Item', 17, yStart);
        
        setTypography(doc, 'body');
        doc.setFontSize(10);
        doc.text(String(item.quantity || 1), 130, yStart, { align: 'center' });
        doc.text('- Rs.' + (item.price || 0), 155, yStart, { align: 'center' });
        doc.text('- Rs.' + itemTotal, pageWidth - 17, yStart, { align: 'right' });
        yStart += 15;
      });
    } else {
      // Default items for demo
      setTypography(doc, 'h4');
      doc.setFontSize(10);
      doc.text('Curtain', 17, yStart);
      
      setTypography(doc, 'body');
      doc.setFontSize(10);
      doc.text('10', 130, yStart, { align: 'center' });
      doc.text('- Rs.75', 155, yStart, { align: 'center' });
      doc.text('- Rs.750', pageWidth - 17, yStart, { align: 'right' });
      subtotal = 750;
    }
    
    // Summary: prints the breakdown saved on the order (see getOrderBreakdown)
    const b = getOrderBreakdown(order);
    const summaryRows: { label: string; value: string; emphasis?: boolean }[] = [
      { label: 'Subtotal', value: 'Rs.' + Math.round(b.subtotal) },
      { label: 'Tax (0%)', value: 'Rs.0.00' },
    ];
    if (b.express > 0) summaryRows.push({ label: 'Express Delivery Fee', value: '+ Rs.' + Math.round(b.express) });
    if (b.due > 0) summaryRows.push({ label: 'Previous Due', value: '+ Rs.' + Math.round(b.due) });
    if (b.discount > 0) {
      const discountPercentage = b.subtotal > 0 ? Math.round((b.discount / b.subtotal) * 100) : 0;
      summaryRows.push({ label: `Discount - ${discountPercentage}%`, value: '- Rs.' + Math.round(b.discount) });
    }
    summaryRows.push({ label: 'Total', value: 'Rs.' + Math.round(b.total), emphasis: true });
    if (b.wallet > 0) summaryRows.push({ label: 'Paid from wallet', value: 'Rs.' + Math.round(b.wallet) });
    if (b.paidOnline !== null && b.paidOnline > 0) summaryRows.push({ label: 'Paid online', value: 'Rs.' + Math.round(b.paidOnline) });

    const summaryRowHeight = 10;
    if (yStart + 5 + summaryRows.length * summaryRowHeight > pageHeight - 40) {
      doc.addPage();
      yStart = 20;
    }

    yStart += 5;
    setTypography(doc, 'h2');
    doc.setFontSize(12);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);

    summaryRows.forEach((row) => {
      if (row.emphasis) doc.setTextColor(69, 45, 155);
      doc.text(row.label, 130, yStart);
      doc.text(row.value, pageWidth - 17, yStart, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      doc.line(130, yStart + 3, pageWidth - 15, yStart + 3);
      yStart += summaryRowHeight;
    });

    // Footer
    yStart = pageHeight - 30;
    setTypography(doc, 'h3');
    doc.setFontSize(10);
    doc.text('Thank you for choosing Urban Steam', 15, yStart);
    
    setTypography(doc, 'body');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('In case of any issues contact support@urbansteam.in within 24 hours of delivery', 15, yStart + 6);
  
    if (Capacitor.isNativePlatform()) {
      try {
        const pdfBlob = doc.output('blob');
        const reader = new FileReader();
        
        reader.onloadend = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            const fileName = `Invoice_${order.orderId || Date.now()}.pdf`;
            
            const result = await Filesystem.writeFile({
              path: fileName,
              data: base64,
              directory: Directory.Cache
            });
            
            const canShare = await Share.canShare();
            if (canShare.value) {
              await Share.share({
                title: `Invoice #${order.orderId}`,
                url: result.uri,
                dialogTitle: 'Save Invoice'
              });
            } else {
              alert(`Invoice saved to: ${result.uri}`);
            }
          } catch (shareError: any) {
            console.error('Share error:', shareError);
            alert(`Invoice generated but share failed: ${shareError.message}`);
          }
        };
        
        reader.onerror = () => {
          alert('Failed to read PDF data');
        };
        
        reader.readAsDataURL(pdfBlob);
      } catch (error: any) {
        console.error('Invoice error:', error);
        alert(`Error: ${error.message || 'Failed to generate invoice'}`);
      }
    } else {
      doc.save(`Invoice-${order.orderId || 'order'}.pdf`);
    }
  } catch (error: any) {
    console.error('PDF generation error:', error);
    alert(`Failed to create invoice: ${error.message || 'Unknown error'}`);
  }
};
