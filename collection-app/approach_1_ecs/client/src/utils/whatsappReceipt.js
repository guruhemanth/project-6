/**
 * Utility functions for generating formatted WhatsApp digital receipts and deep links.
 */

/**
 * Formats a clean, professional Telugu & English temple/festival donation receipt.
 */
export function formatDoorstepReceiptMessage({
  societyName = 'Festival Committee',
  city = '',
  receiptId,
  doorNumber,
  donorName = '',
  amount,
  paymentMode = 'Cash',
  collectorName = 'Volunteer',
  date = new Date(),
}) {
  const formattedDate = new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const formattedAmount = Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const receiptCode = receiptId ? `REC-${String(receiptId).padStart(5, '0')}` : `OFFLINE-${Date.now().toString().slice(-4)}`;

  return `🕉️ *${societyName.toUpperCase()}* ${city ? `(${city})` : ''} 🕉️
*VINAYAKA CHAVITHI CHANDAS RECEIPT 2026*
━━━━━━━━━━━━━━━━━━━━━━━━━━
📜 *Receipt No:* \`${receiptCode}\`
📅 *Date:* ${formattedDate}
🚪 *Flat / Door No:* *${doorNumber}*
👤 *Donor Name:* ${donorName?.trim() || 'Resident'}
💳 *Payment Mode:* *${paymentMode.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *AMOUNT RECEIVED:* *₹${formattedAmount}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
🙏 *ధన్యవాదములు! మీ కుటుంబానికి గణపతి బప్పా ఆశీస్సులు ఎల్లప్పుడూ ఉండాలని కోరుకుంటున్నాము.*
*(Thank you for your generous contribution. May Lord Ganesha bless your family with health, wealth & prosperity!)*

✍️ *Issued by:* ${collectorName}
🌟 *OneN Community Collection System*`;
}

/**
 * Opens WhatsApp with the pre-filled digital receipt.
 */
export function sendDoorstepWhatsAppReceipt(params) {
  const { phoneNumber } = params;
  const message = formatDoorstepReceiptMessage(params);
  const encodedMessage = encodeURIComponent(message);

  let cleanPhone = phoneNumber ? String(phoneNumber).replace(/\D/g, '') : '';

  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  }

  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedMessage}`
    : `https://wa.me/?text=${encodedMessage}`;

  window.open(waUrl, '_blank', 'noopener,noreferrer');
}

export const sendWhatsAppReceipt = sendDoorstepWhatsAppReceipt;
export const formatReceiptMessage = formatDoorstepReceiptMessage;
export default sendDoorstepWhatsAppReceipt;
