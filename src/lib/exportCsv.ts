interface ExportRow {
  full_name: string;
  email: string;
  phone: string;
  ticket_code: string;
  registered_by: string | null;
  is_checked: boolean;
  created_at: string;
}

const cell = (value: string) => {
  // Quote every cell; neutralise spreadsheet formulas (=, +, -, @).
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
};

/**
 * Downloads the participant list as a CSV that opens correctly in Excel
 * (UTF-8 BOM, semicolon separator used by French/Moroccan Excel).
 * Useful as a printed backup list at the door if the internet fails.
 */
export function downloadParticipantsCsv(rows: ExportRow[]) {
  const header = ['Nom', 'Email', 'Téléphone', 'Code', 'Invité par', 'Entré', 'Inscrit le'];
  const lines = rows.map((r) =>
    [
      r.full_name,
      r.email,
      r.phone,
      r.ticket_code,
      r.registered_by ?? '',
      r.is_checked ? 'Oui' : 'Non',
      new Date(r.created_at).toLocaleString('fr-FR', { timeZone: 'Africa/Casablanca' }),
    ]
      .map(cell)
      .join(';')
  );
  const csv = '﻿' + [header.map(cell).join(';'), ...lines].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `albassma-billets-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
