import Papa from "papaparse";
import * as XLSX from "xlsx";

export async function extractHeaders(file: File): Promise<string[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "csv") {
    return new Promise((resolve) => {
      Papa.parse(file, {
        preview: 1,
        header: false,
        complete: (results) => {
          resolve(results.data[0] as string[]);
        },
      });
    });
  }

  if (ext === "xls" || ext === "xlsx") {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    return rows[0] as string[];
  }

  return [];
}
