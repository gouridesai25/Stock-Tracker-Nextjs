"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { ref, set } from "firebase/database";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { ArrowUpTrayIcon, DocumentIcon } from "@heroicons/react/24/outline";

type FileItem = {
  id: string;
  file?: File;
  name: string;
  date: string;
  size: string;
  type: string;
  headers?: string[];
};

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  const [strategyName, setStrategyName] = useState("");

  const [dateColumn, setDateColumn] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  type DateSelectionMode = "range" | "multiple";
  const [dateMode, setDateMode] = useState<DateSelectionMode>("range");
  const [randomDates, setRandomDates] = useState<Date[]>([]);

  /* ---------------- FILE UPLOAD ---------------- */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const uploaded: FileItem[] = [];

    for (const file of Array.from(e.target.files)) {
      let fileHeaders: string[] = [];

      // 👇 READ HEADERS PER FILE
      if (file.name.endsWith(".csv")) {
        const text = await file.text();
        const parsed = Papa.parse(text, { header: true });
        fileHeaders = parsed.meta.fields || [];
      } else if (file.name.endsWith(".xlsx")) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
        }) as string[][];
        fileHeaders = json[0] || [];
      }

      uploaded.push({
        id: crypto.randomUUID(),
        file,
        name: file.name,
        date: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        type: file.type || "Unknown",
        headers: fileHeaders, // ⭐ STORE HEADERS HERE
      });
    }

    setFiles((prev) => [...uploaded, ...prev]);

    // 👇 For dropdown UI only (first file headers)
    if (uploaded[0]) {
      setHeaders(uploaded[0].headers ?? []);
    }
  };

  /* ---------------- MULTI SELECT ---------------- */
  const toggleFileSelection = (file: FileItem) => {
    setSelectedFiles((prev) =>
      prev.some((f) => f.id === file.id)
        ? prev.filter((f) => f.id !== file.id)
        : [...prev, file]
    );
  };

  /* ---------------- HELPER TO GENERATE SELECTED DATES ARRAY ---------------- */
  const generateSelectedDates = (): string[] => {
    if (dateMode === "range") {
      // Range mode logic
      if (!startDate) return [];
      const dates: string[] = [];
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : start;

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const day = d.getDate().toString().padStart(2, "0");
        const month = (d.getMonth() + 1).toString().padStart(2, "0");
        const year = d.getFullYear();
        dates.push(`${day}-${month}-${year}`);
      }
      return dates;
    } else {
      // Multiple random dates mode
      return randomDates.map((date) => {
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      });
    }
  };

  const calculateStatsFromByDate = (byDate: Record<string, number>) => {
    const entries = Object.entries(byDate);

    const totalDays = entries.length;
    const winDays = entries.filter(([_, pnl]) => pnl > 0).length;

    const winRate =
      totalDays === 0 ? 0 : Number(((winDays / totalDays) * 100).toFixed(2));

    const sortedByDate = entries
      .map(([date, pnl]) => ({ date, pnl }))
      .sort((a, b) => b.pnl - a.pnl); // High → Low

    return { winRate, sortedByDate };
  };

  const resolveDateColumnForFile = (file: FileItem) => {
    if (!file.headers || file.headers.length === 0) return "";

    const normalizedHeaders = file.headers.map((h) => h.toLowerCase());

    // priority-based matching
    const candidates = ["exit", "date", "time", "order", "entry"];

    for (const keyword of candidates) {
      const idx = normalizedHeaders.findIndex((h) => h.includes(keyword));
      if (idx !== -1) {
        return file.headers[idx]; // exact header name
      }
    }

    return ""; // ❗ no match
  };

  const normalizeDate = (value: any): string | null => {
    if (!value) return null;

    // Excel serial number
    if (typeof value === "number") {
      const date = XLSX.SSF.parse_date_code(value);
      if (!date) return null;
      return `${String(date.d).padStart(2, "0")}-${String(date.m).padStart(
        2,
        "0"
      )}-${date.y}`;
    }

    const cleaned = value.toString().split(" ")[0];

    const parts = cleaned.includes("/")
      ? cleaned.split("/")
      : cleaned.split("-");

    if (parts.length !== 3) return null;

    let day, month, year;

    // yyyy-mm-dd
    if (parts[0].length === 4) {
      year = parts[0];
      month = parts[1];
      day = parts[2];
    } else {
      day = parts[0];
      month = parts[1];
      year = parts[2];
    }

    return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;
  };

  const parseCSV = (file: File, dateCol: string, selectedDates: string[]) =>
    new Promise<{
      totalProfitPct: number;
      totalLossPct: number;
      netPnLPct: number;
      byDate: Record<string, number>;
      winRate: number;
      sortedByDate: { date: string; pnl: number }[];
    }>((resolve) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          let totalProfitPct = 0;
          let totalLossPct = 0;
          let totalTrades = 0;
          let winningTrades = 0;

          const byDate: Record<string, number> = {};

          results.data.forEach((row: any) => {
            if (!row["Type"]?.toLowerCase().includes("exit")) return;

            const dateOnly = normalizeDate(row[dateCol]);
            if (!dateOnly || !selectedDates.includes(dateOnly)) return;

            const pnlKey = Object.keys(row).find(
              (k) => k.toLowerCase().includes("net") && k.includes("%")
            );

            const pnlPct = pnlKey ? parseFloat(row[pnlKey]) || 0 : 0;

            // Track trade outcomes for win rate
            totalTrades++;
            if (pnlPct > 0) {
              winningTrades++;
              totalProfitPct += pnlPct;
            } else {
              totalLossPct += pnlPct;
            }

            byDate[dateOnly] = (byDate[dateOnly] || 0) + pnlPct;
          });

          // Calculate win rate based on trades, not days
          const winRate =
            totalTrades === 0
              ? 0
              : Number(((winningTrades / totalTrades) * 100).toFixed(2));

          const { sortedByDate } = calculateStatsFromByDate(byDate);

          resolve({
            totalProfitPct,
            totalLossPct,
            netPnLPct: totalProfitPct + totalLossPct,
            byDate,
            winRate, // ✅ Correct win rate based on individual trades
            sortedByDate,
          });
        },
        error: () =>
          resolve({
            totalProfitPct: 0,
            totalLossPct: 0,
            netPnLPct: 0,
            byDate: {},
            winRate: 0,
            sortedByDate: [],
          }),
      });
    });

  const parseXLSX = async (
    file: File,
    dateCol: string,
    selectedDates: string[]
  ) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet) as any[];

    let totalProfitPct = 0;
    let totalLossPct = 0;
    let totalTrades = 0;
    let winningTrades = 0;
    const byDate: Record<string, number> = {};

    json.forEach((row) => {
      if (!row["Type"]?.toLowerCase().includes("exit")) return;

      const dateOnly = normalizeDate(row[dateCol]);
      if (!dateOnly || !selectedDates.includes(dateOnly)) return;

      const values = Object.values(row);
      const pnlPct = parseFloat(values[values.length - 3] as any) || 0;

      // Track trade outcomes for win rate
      totalTrades++;
      if (pnlPct > 0) {
        winningTrades++;
        totalProfitPct += pnlPct;
      } else {
        totalLossPct += pnlPct;
      }

      byDate[dateOnly] = (byDate[dateOnly] || 0) + pnlPct;
    });

    // Calculate win rate based on trades
    const winRate =
      totalTrades === 0
        ? 0
        : Number(((winningTrades / totalTrades) * 100).toFixed(2));
    const { sortedByDate } = calculateStatsFromByDate(byDate);

    return {
      totalProfitPct,
      totalLossPct,
      netPnLPct: totalProfitPct + totalLossPct,
      byDate,
      winRate, // ✅ Correct win rate
      sortedByDate,
    };
  };
  /* ---------------- ANALYZE ---------------- */
  const analyzeSelectedFiles = async () => {
    if (!dateColumn) return alert("Please select the Date column.");

    const datesArr = generateSelectedDates();
    if (datesArr.length === 0)
      return alert("Please select at least one date or range.");

    const validFiles = selectedFiles.filter((f) => f.file);
    if (validFiles.length === 0)
      return alert("Selected files are no longer available.");

    const analysisId = `analysis_${Date.now()}`;
    const createdAt = new Date().toISOString();

    const summaries = await Promise.all(
      validFiles.map(async (fileItem, index) => {
        let summaryData;

        if (fileItem.name.endsWith(".csv")) {
          const fileDateColumn = resolveDateColumnForFile(fileItem);

          if (!fileDateColumn) {
            console.warn(`No date column found for ${fileItem.name}`);
            return {
              fileName: fileItem.name,
              analysisId: `${analysisId}_${index + 1}`,
              createdAt,
              totalProfitPct: 0,
              totalLossPct: 0,
              netPnLPct: 0,
              byDate: {},
              winRate: 0,
              sortedByDate: [],
            };
          }

          summaryData = await parseCSV(
            fileItem.file!,
            fileDateColumn,
            datesArr
          );
        } else if (fileItem.name.endsWith(".xlsx")) {
          const fileDateColumn = resolveDateColumnForFile(fileItem);

          if (!fileDateColumn) {
            console.warn(`No date column found for ${fileItem.name}`);
            return {
              fileName: fileItem.name,
              analysisId: `${analysisId}_${index + 1}`,
              createdAt,
              totalProfitPct: 0,
              totalLossPct: 0,
              netPnLPct: 0,
              byDate: {},
              winRate: 0,
              sortedByDate: [],
            };
          }
          summaryData = await parseXLSX(
            fileItem.file!,
            fileDateColumn,
            datesArr
          );
        } else {
          summaryData = {
            totalProfitPct: 0,
            totalLossPct: 0,
            netPnLPct: 0,
            winRate: 0,
            byDate: {},
          };
        }

        return {
          fileName: fileItem.name,
          analysisId: `${analysisId}_${index + 1}`,
          createdAt,
          ...summaryData,
        };
      })
    );

    await set(ref(db, `analyses/${analysisId}`), {
      createdAt,
      strategyName,
      dateColumn,
      selectedDates: datesArr,
      summaries,
    });

    setSelectedFiles([]);
    // router.push(`/analysis/${analysisId}`);
    router.push(`/analysis?analysisId=${analysisId}`);
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upload Files</h1>
          <p className="text-gray-500 text-sm">
            Upload CSV/XLSX files with Net P&L INR column
          </p>
        </div>
        <label className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition cursor-pointer">
          <ArrowUpTrayIcon className="w-5 h-5" />
          Upload file
          <input
            type="file"
            multiple
            accept=".csv,.xlsx"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Date Column */}
      {headers.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <label className="text-gray-700 font-medium">
            Select Date Column:
          </label>
          <select
            value={dateColumn}
            onChange={(e) => setDateColumn(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="">--Select--</option>
            {headers.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
      )}
      {/* Date Mode Selection */}
      {dateColumn && (
        <div className="mb-4">
          <label className="text-gray-700 font-medium mb-2 block">
            Date Selection Mode:
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDateMode("range")}
              className={`px-4 py-2 rounded-lg transition ${
                dateMode === "range"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Date Range
            </button>
            <button
              type="button"
              onClick={() => setDateMode("multiple")}
              className={`px-4 py-2 rounded-lg transition ${
                dateMode === "multiple"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Multiple Random Dates
            </button>
          </div>
        </div>
      )}

      {/* Modern Date Picker */}
      {dateColumn && (
        <div className="mb-4">
          <label className="text-gray-700 font-medium mb-1 block">
            Select Date(s) for Analysis:
          </label>

          {dateMode === "range" ? (
            // Range mode (existing)
            <div>
              <DatePicker
                selected={startDate}
                onChange={(dates: [Date | null, Date | null] | Date | null) => {
                  if (!dates) {
                    setStartDate(null);
                    setEndDate(null);
                    return;
                  }
                  if (Array.isArray(dates)) {
                    const [start, end] = dates;
                    setStartDate(start || null);
                    setEndDate(end || null);
                  } else setStartDate(dates);
                }}
                startDate={startDate}
                endDate={endDate}
                selectsRange
                isClearable
                placeholderText="Select date range"
                className="border rounded px-3 py-2"
              />
              {startDate && !endDate && (
                <p className="text-sm text-gray-500 mt-1">
                  Single date selected: {startDate.toLocaleDateString()}
                </p>
              )}
            </div>
          ) : (
            // Multiple random dates mode
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div>
                  <DatePicker
                    selected={null}
                    onChange={(date: Date | null) => {
                      if (
                        date &&
                        !randomDates.some(
                          (d) => d.toDateString() === date.toDateString()
                        )
                      ) {
                        setRandomDates((prev) => [...prev, date]);
                      }
                    }}
                    placeholderText="Click to pick a date"
                    className="border rounded px-3 py-2"
                    inline
                  />
                </div>

                <div className="flex-1">
                  <div className="mb-2">
                    <p className="text-sm text-gray-600 mb-2">
                      Click dates on calendar to add them
                    </p>
                    <button
                      type="button"
                      onClick={() => setRandomDates([])}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Clear All Dates
                    </button>
                  </div>

                  {/* Display selected dates */}
                  {randomDates.length > 0 ? (
                    <div className="border rounded p-3 bg-gray-50">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Selected Dates ({randomDates.length}):
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {randomDates
                          .sort((a, b) => a.getTime() - b.getTime())
                          .map((date, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-1 bg-white border rounded px-3 py-1 text-sm"
                            >
                              <span>{date.toLocaleDateString()}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setRandomDates((prev) =>
                                    prev.filter((_, i) => i !== index)
                                  )
                                }
                                className="ml-1 text-gray-400 hover:text-red-500"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <div className="border rounded p-4 text-center text-gray-400 bg-gray-50">
                      No dates selected yet. Click dates on the calendar to add
                      them.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-gray-700 font-medium mb-1">
          Strategy Name
        </label>
        <input
          type="text"
          value={strategyName}
          onChange={(e) => setStrategyName(e.target.value)}
          placeholder="e.g. Intraday Scalping, Strategy A"
          className="border rounded px-3 py-2 w-full"
        />
      </div>

      {/* Analyze Button */}
      {selectedFiles.length > 0 &&
        dateColumn &&
        ((dateMode === "range" && startDate) ||
          (dateMode === "multiple" && randomDates.length > 0)) && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={analyzeSelectedFiles}
              className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition"
            >
              Analyze Selected ({selectedFiles.length})
            </button>
          </div>
        )}

      {/* Files Table */}
      <div className="bg-white rounded-xl shadow-sm border">
        <table className="w-full text-left">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-4 text-sm font-semibold text-gray-600">Name</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Date</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Size</th>
            </tr>
          </thead>
          <tbody>
            {files.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-6 text-center text-gray-400">
                  No files uploaded yet
                </td>
              </tr>
            ) : (
              files.map((file) => (
                <tr
                  key={file.id}
                  className="border-b last:border-b-0 hover:bg-gray-50 transition"
                >
                  <td className="p-4 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedFiles.some((f) => f.id === file.id)}
                      onChange={() => toggleFileSelection(file)}
                      className="w-4 h-4 accent-purple-600"
                    />
                    <DocumentIcon className="w-6 h-6 text-gray-400" />
                    {file.name}
                  </td>
                  <td className="p-4 text-gray-600">{file.date}</td>
                  <td className="p-4 text-gray-600">{file.size}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
