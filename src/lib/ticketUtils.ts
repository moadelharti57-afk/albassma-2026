import { nanoid } from 'nanoid';
import QRCode from 'qrcode';
// jsPDF is large, so it's imported only when a ticket PDF is generated

export const generateTicketCode = (): string => {
  return nanoid(12).toUpperCase();
};

export const generateQRCodeDataURL = async (ticketCode: string): Promise<string> => {
  const verifyUrl = `${window.location.origin}/verify?ticket=${ticketCode}`;
  return await QRCode.toDataURL(verifyUrl, {
    width: 200,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
};

export const generateTicketPDF = async (
  fullName: string,
  ticketCode: string,
  createdAt: string
): Promise<Blob> => {
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  const qrDataUrl = await generateQRCodeDataURL(ticketCode);

  // Background: #264653
  pdf.setFillColor(38, 70, 83);
  pdf.rect(0, 0, 148, 210, 'F');

  // Header accent: #32b577 bar with a #86de76 line
  pdf.setFillColor(50, 181, 119);
  pdf.rect(0, 0, 148, 8, 'F');
  pdf.setFillColor(134, 222, 118);
  pdf.rect(0, 8, 148, 1.5, 'F');

  // Event Title
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ALBASSMA FILM 2026', 74, 35, { align: 'center' });

  // Club Name
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(234, 234, 234);
  pdf.text('Organisé par Mohandiss Al Bassma', 74, 45, { align: 'center' });

  // Divider
  pdf.setDrawColor(50, 181, 119);
  pdf.setLineWidth(0.5);
  pdf.line(20, 55, 128, 55);

  // QR Code on a white card
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(40, 61, 68, 68, 3, 3, 'F');
  pdf.addImage(qrDataUrl, 'PNG', 44, 65, 60, 60);

  // Ticket Code
  pdf.setFontSize(10);
  pdf.setTextColor(134, 222, 118);
  pdf.text('CODE DU BILLET', 74, 140, { align: 'center' });
  
  pdf.setFontSize(16);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text(ticketCode, 74, 149, { align: 'center' });

  // Attendee Name
  pdf.setFontSize(10);
  pdf.setTextColor(134, 222, 118);
  pdf.setFont('helvetica', 'normal');
  pdf.text('SPECTATEUR', 74, 162, { align: 'center' });
  
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text(fullName, 74, 171, { align: 'center' });

  // Date
  pdf.setFontSize(10);
  pdf.setTextColor(234, 234, 234);
  pdf.setFont('helvetica', 'normal');
  const date = new Date(createdAt).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  pdf.text(date, 74, 185, { align: 'center' });

  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(134, 222, 118);
  pdf.text("Présentez ce QR code à l'entrée", 74, 200, { align: 'center' });

  return pdf.output('blob');
};

export const downloadTicketPDF = async (
  fullName: string,
  ticketCode: string,
  createdAt: string
): Promise<void> => {
  const pdfBlob = await generateTicketPDF(fullName, ticketCode, createdAt);
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${ticketCode}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
