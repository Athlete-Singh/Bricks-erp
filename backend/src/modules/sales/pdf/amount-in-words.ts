/**
 * Convert an INR amount to Indian-English words: "Rupees One Thousand Only" or
 * "Rupees One Thousand and Twelve Paise Only". GST invoices in India must carry
 * the amount in words (Rule 46(l) of the CGST Rules), so this is not optional.
 *
 * Uses the Indian numbering system (lakhs, crores) — the standard "Hundred
 * Thousand" wording of English is wrong on an Indian invoice.
 */
const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function belowThousand(n: number): string {
  if (n === 0) return '';
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds > 0) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest > 0) {
    if (rest < 20) parts.push(ONES[rest]!);
    else {
      const t = Math.floor(rest / 10);
      const u = rest % 10;
      parts.push(u === 0 ? TENS[t]! : `${TENS[t]} ${ONES[u]}`);
    }
  }
  return parts.join(' ');
}

/** Indian numbering: ... Crore, Lakh, Thousand, below-thousand. */
function wordsIndian(n: number): string {
  if (n === 0) return 'Zero';
  const crore = Math.floor(n / 10_000_000);
  const lakh = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1_000);
  const rest = n % 1_000;
  const parts: string[] = [];
  if (crore > 0) parts.push(`${wordsIndian(crore)} Crore`);
  if (lakh > 0) parts.push(`${belowThousand(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${belowThousand(thousand)} Thousand`);
  if (rest > 0) parts.push(belowThousand(rest));
  return parts.join(' ');
}

export function amountInWords(amount: string | number): string {
  const value = typeof amount === 'string' ? amount : amount.toFixed(2);
  const [rupeesStr, paiseStr = '00'] = value.split('.');
  const rupees = Math.max(0, Math.floor(Number(rupeesStr ?? '0')));
  const paise = Math.min(99, Math.max(0, Math.floor(Number(paiseStr.padEnd(2, '0').slice(0, 2)))));

  const rupeeWords = wordsIndian(rupees);
  if (paise === 0) return `Rupees ${rupeeWords} Only`;
  return `Rupees ${rupeeWords} and ${belowThousand(paise)} Paise Only`;
}
