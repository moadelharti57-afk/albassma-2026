import { nanoid } from 'nanoid';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';

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
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  const qrDataUrl = await generateQRCodeDataURL(ticketCode);

  // Background
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, 148, 210, 'F');

  // Header accent
  pdf.setFillColor(5, 150, 105);
  pdf.rect(0, 0, 148, 8, 'F');

  // Event Title
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ALBASSMA FILME', 74, 35, { align: 'center' });

  // Club Name
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(156, 163, 175);
  pdf.text('Organized by Mohandiss Al Bassma', 74, 45, { align: 'center' });

  // Divider
  pdf.setDrawColor(55, 65, 81);
  pdf.setLineWidth(0.5);
  pdf.line(20, 55, 128, 55);

  // QR Code
  pdf.addImage(qrDataUrl, 'PNG', 44, 65, 60, 60);

  // Ticket Code
  pdf.setFontSize(10);
  pdf.setTextColor(156, 163, 175);
  pdf.text('TICKET CODE', 74, 135, { align: 'center' });
  
  pdf.setFontSize(16);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text(ticketCode, 74, 145, { align: 'center' });

  // Attendee Name
  pdf.setFontSize(10);
  pdf.setTextColor(156, 163, 175);
  pdf.setFont('helvetica', 'normal');
  pdf.text('ATTENDEE', 74, 160, { align: 'center' });
  
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text(fullName, 74, 170, { align: 'center' });

  // Date
  pdf.setFontSize(10);
  pdf.setTextColor(156, 163, 175);
  pdf.setFont('helvetica', 'normal');
  const date = new Date(createdAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  pdf.text(date, 74, 185, { align: 'center' });

  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(107, 114, 128);
  pdf.text('Present this QR code at the entrance', 74, 200, { align: 'center' });

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
