import jsPDF from 'jspdf';

interface EventTicketData {
  event: {
    title: string;
    date: string;
    location: string;
    description?: string;
  };
  attendee: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  registrationId: string;
  paymentStatus: string;
  amount: number;
}

export async function generateEventTicketPDF(data: EventTicketData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;

  // Colors
  const primaryColor = [41, 128, 185]; // Blue
  const secondaryColor = [52, 73, 94]; // Dark gray
  const accentColor = [241, 196, 15]; // Gold

  // Header with background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('EVENT TICKET', pageWidth / 2, 30, { align: 'center' });

  yPos = 60;

  // Event Information Box
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos, contentWidth, 40, 'F');
  
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(data.event.title, margin + 5, yPos + 12);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  
  const eventDate = new Date(data.event.date);
  doc.text(`Date: ${eventDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}`, margin + 5, yPos + 22);
  doc.text(`Time: ${eventDate.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit' 
  })}`, margin + 5, yPos + 28);
  doc.text(`Location: ${data.event.location}`, margin + 5, yPos + 34);

  yPos += 50;

  // Attendee Information
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...secondaryColor);
  doc.text('ATTENDEE INFORMATION', margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  
  doc.text(`Name: ${data.attendee.firstName} ${data.attendee.lastName}`, margin, yPos);
  yPos += 7;
  doc.text(`Email: ${data.attendee.email}`, margin, yPos);
  yPos += 7;
  doc.text(`Phone: ${data.attendee.phone}`, margin, yPos);
  yPos += 7;
  doc.text(`Registration ID: ${data.registrationId.substring(0, 8).toUpperCase()}`, margin, yPos);

  yPos += 15;

  // Payment Information
  if (data.amount > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...secondaryColor);
    doc.text('PAYMENT INFORMATION', margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    
    doc.text(`Amount Paid: R ${data.amount.toFixed(2)}`, margin, yPos);
    yPos += 7;
    
    const statusColor = data.paymentStatus === 'paid' ? [46, 204, 113] : [241, 196, 15];
    doc.setTextColor(...statusColor);
    doc.setFont('helvetica', 'bold');
    doc.text(`Payment Status: ${data.paymentStatus.toUpperCase()}`, margin, yPos);
    yPos += 15;
  }

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(150, 150, 150);
  doc.text('This ticket serves as proof of registration. Please bring this ticket to the event.', 
    pageWidth / 2, pageHeight - 20, { align: 'center' });
  doc.text('Christian Leadership Movement', pageWidth / 2, pageHeight - 10, { align: 'center' });

  // QR Code area (placeholder - you can add actual QR code generation here)
  const qrSize = 40;
  const qrX = pageWidth - margin - qrSize;
  const qrY = pageHeight - margin - qrSize - 20;
  
  doc.setDrawColor(200, 200, 200);
  doc.rect(qrX, qrY, qrSize, qrSize);
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text('QR Code', qrX + qrSize / 2, qrY + qrSize / 2, { align: 'center' });

  // Save PDF
  const fileName = `event-ticket-${data.registrationId.substring(0, 8)}-${Date.now()}.pdf`;
  doc.save(fileName);
}

