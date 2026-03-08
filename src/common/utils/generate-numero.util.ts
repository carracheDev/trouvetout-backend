// src/common/utils/generate-numero.util.ts
export function generateNumeroCommande(): string {
  const date = new Date();
  const year = date.getFullYear();
  const random = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, '0');
  return `TT-${year}-${random}`;
}

export function generateCodePromo(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
