export function downloadFile(contents: BlobPart, filename: string, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function downloadCsv(rows: (string | number | null | undefined)[][], filename: string) {
  const csv = rows.map(row => row.map(value => {
    let cell = String(value ?? '');
    if (/^[=+@\-\t\r]/.test(cell)) cell = `'${cell}`;
    return `"${cell.replaceAll('"', '""')}"`;
  }).join(',')).join('\r\n');
  downloadFile('\uFEFF' + csv, filename, 'text/csv;charset=utf-8');
}
