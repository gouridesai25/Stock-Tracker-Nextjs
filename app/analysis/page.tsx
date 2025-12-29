"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { ref, get } from "firebase/database";

type Summary = {
  fileName: string;
  totalProfitPct: number;
  totalLossPct: number;
  netPnLPct: number;
  winRate: number;
};

type SortKey = "netPnL" | "winRate";
type SortOrder = "desc" | "asc";

function AnalysisContent() {
  const searchParams = useSearchParams();
  const analysisId = searchParams.get("analysisId");
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [sortKey, setSortKey] = useState<SortKey>("netPnL");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  useEffect(() => {
    if (!analysisId) {
      setLoading(false);
      return;
    }

    get(ref(db, `analyses/${analysisId}`)).then((snap) => {
      if (snap.exists()) setAnalysis(snap.val());
      setLoading(false);
    });
  }, [analysisId]);

  const summaries: Summary[] = analysis?.summaries || [];

  // ---------- OVERALL METRICS ----------
  const overallNetPnL = summaries.reduce((sum, s) => sum + s.netPnLPct, 0);

  const overallWinRate =
    summaries.length > 0
      ? summaries.reduce((sum, s) => sum + s.winRate, 0) / summaries.length
      : 0;

  // ---------- SORTING ----------
  const sortedSummaries = useMemo(() => {
    return [...summaries].sort((a, b) => {
      const aVal = sortKey === "netPnL" ? a.netPnLPct : a.winRate;
      const bVal = sortKey === "netPnL" ? b.netPnLPct : b.winRate;

      return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [summaries, sortKey, sortOrder]);

  if (loading) return <div className="p-8">Loading analysis...</div>;
  if (!analysis) return <div className="p-8">Analysis not found</div>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {analysis.strategyName || "Strategy Analysis"}
        </h1>
        <p className="text-sm text-gray-500">
          Dates: {analysis.selectedDates.join(", ")} · Files: {summaries.length}
        </p>
      </div>

      {/* OVERALL STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Overall Net P&L %" value={overallNetPnL} suffix="%" />
        <StatCard title="Average Win Rate" value={overallWinRate} suffix="%" />
        <StatCard title="Files Compared" value={summaries.length} />
      </div>

      {/* SORT CONTROLS */}
      <div className="flex gap-4 items-center">
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="netPnL">Sort by Net P&L %</option>
          <option value="winRate">Sort by Win Rate</option>
        </select>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="desc">High → Low</option>
          <option value="asc">Low → High</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm border">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 text-sm">File</th>
              <th className="p-4 text-sm">Profit %</th>
              <th className="p-4 text-sm">Loss %</th>
              <th className="p-4 text-sm">Net P&L %</th>
              <th className="p-4 text-sm">Win Rate %</th>
            </tr>
          </thead>
          <tbody>
            {sortedSummaries.map((s) => (
              <tr key={s.fileName} className="border-b last:border-0">
                <td className="p-4 font-medium">{s.fileName}</td>

                <td className="p-4 text-green-600">
                  {s.totalProfitPct.toFixed(2)}%
                </td>

                <td className="p-4 text-red-600">
                  {s.totalLossPct.toFixed(2)}%
                </td>

                <td
                  className={`p-4 font-semibold ${
                    s.netPnLPct >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {s.netPnLPct.toFixed(2)}%
                </td>

                <td className="p-4">{s.winRate.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  suffix = "",
}: {
  title: string;
  value: number;
  suffix?: string;
}) {
  const color = value < 0 ? "text-red-600" : "text-green-600";

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`text-2xl font-bold mt-2 ${color}`}>
        {value.toFixed(2)}
        {suffix}
      </p>
    </div>
  );
}

function AnalysisLoading() {
  return <div className="p-8">Loading analysis...</div>;
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<AnalysisLoading />}>
      <AnalysisContent />
    </Suspense>
  );
}
