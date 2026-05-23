// app/tools/filters/FiltersClient.js
//
// 🖱️ CLIENT COMPONENT — all the interactive UI / state lives here
//
// This is your original page.js code, minus:
//   - The `export const metadata` (now in page.js — server-only)
//   - The `notFound()` check (now in page.js — runs earlier)

"use client";

import { useState, useEffect, useRef } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import Sidebar from "../../../components/Sidebar";
import { FNO_STOCKS } from "../../../data/fnoStocks";

function TooltipButton({ onClick, label, color, example }) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`px-6 py-2.5 rounded-lg ${color} text-sm font-semibold transition`}
      >
        {label}
      </button>

      <div
        className="absolute left-1/2 -translate-x-1/2 -botom-12
                   hidden group-hover:block
                   bg-gray-900 text-gray-200 text-xs
                   px-3 py-1.5 rounded-md shadow-lg
                   whitespace-nowrap border border-gray-700 z-10"
      >
        {example}
      </div>
    </div>
  );
}

function formatDateToNSE(date) {
  if (!date) return null;

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}${mm}${dd}`;
}

function extractLabelFromDate(date) {
  const months = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
  ];
  return `${months[date.getMonth()]}_${String(date.getDate()).padStart(2, "0")}`;
}

function extractLabelForDelivery(date) {
  const months = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
  ];
  return `${months[date.getMonth()]}_${date.getDate()}`;
}

function extractLabelForFNO(date) {
  const months = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
  ];
  return `${months[date.getMonth()]}_${String(date.getDate()).padStart(2, "0")}`;
}

export default function FiltersClient() {
  const [array1, setArray1] = useState("");
  const [array2, setArray2] = useState("");
  const [result, setResult] = useState("");
  const [resultCount, setResultCount] = useState(0);
  const [dedupInput, setDedupInput] = useState("");
  const [dedupOutput, setDedupOutput] = useState("");
  const [dedupCount, setDedupCount] = useState(0);
  const [jsonInput, setJsonInput] = useState("");
  const [jsonMinified, setJsonMinified] = useState("");
  const [eqJsonInput, setEqJsonInput] = useState("");
  const [eqJsonOutput, setEqJsonOutput] = useState("");
  const [eqCount, setEqCount] = useState(0);
  const [mappedData, setMappedData] = useState(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isOiModalOpen, setIsOiModalOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [csvFiles, setCsvFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [warningState, setWarningState] = useState(null);
  const [oiCsvFiles, setOiCsvFiles] = useState([]);
  const [selectedOiFile, setSelectedOiFile] = useState("");
  const [oiData, setOiData] = useState(null);
  const [oiRowCount, setOiRowCount] = useState(0);
  const [oiWarningState, setOiWarningState] = useState(null);
  const [fnoData, setFnoData] = useState(null);
  const [isFnoModalOpen, setIsFnoModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [fnoCsvFiles, setFnoCsvFiles] = useState([]);
  const [loadingFno, setLoadingFno] = useState(false);
  const [rolloverFiles, setRolloverFiles] = useState([]);
  const [selectedRolloverFile, setSelectedRolloverFile] = useState("");
  const [rolloverData, setRolloverData] = useState(null);
  const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false);
  const [rolloverCount, setRolloverCount] = useState(0);
  const [loadingDelivery, setLoadingDelivery] = useState(false);

  const deliveryInputRef = useRef(null);
  const oiInputRef = useRef(null);
  const fnoInputRef = useRef(null);

  useEffect(() => {
    fetchFiles("/api/list-rollover-csv", setRolloverFiles);
  }, []);

  useEffect(() => {
    fetchFiles("/api/list-csv", setCsvFiles, /^sec_bhavdata_full_\d{8}\.csv$/i);
    fetchFiles("/api/list-oi-csv", setOiCsvFiles);
  }, []);

  const fetchFiles = async (url, setter, regex = null) => {
    const res = await fetch(url);
    const data = await res.json();

    let files = data.files || [];

    if (regex) {
      files = files.filter((file) => regex.test(file));
    }

    setter(files);
  };

  useEffect(() => {
    if (isDeliveryModalOpen && deliveryInputRef.current) {
      setTimeout(() => deliveryInputRef.current.focus(), 0);
    }
  }, [isDeliveryModalOpen]);

  useEffect(() => {
    if (isOiModalOpen && oiInputRef.current) {
      setTimeout(() => oiInputRef.current.focus(), 0);
    }
  }, [isOiModalOpen]);

  useEffect(() => {
    if (isFnoModalOpen && fnoInputRef.current) {
      setTimeout(() => fnoInputRef.current.focus(), 0);
    }
  }, [isFnoModalOpen]);

  const handleEnterSubmit = (e, callback) => {
    if (e.key === "Enter") {
      e.preventDefault();
      callback();
    }
  };

  const handleProcessRolloverCSV = async () => {
    const res = await fetch("/api/process-rollover-csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: selectedRolloverFile }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error);
      return;
    }

    setRolloverData(data.data);
    setRolloverCount(Object.keys(data.data).length);
    setIsRolloverModalOpen(true);
  };

  const handleProcessDeliveryCSV = async () => {
    if (!selectedDate) {
      alert("Select date first");
      return;
    }

    setLoadingDelivery(true);

    try {
      const dateStr = formatDateToNSE(selectedDate);

      const dl = await fetch("/api/download-delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr }),
      });

      const dlRes = await dl.json();

      if (!dl.ok) {
        alert(dlRes.error);
        setLoadingDelivery(false);
        return;
      }

      const res = await fetch("/api/process-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: dlRes.fileName }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error);
        setLoadingDelivery(false);
        return;
      }

      if (!data.mappedData || Object.keys(data.mappedData).length === 0) {
        alert("No valid delivery data found");
        setLoadingDelivery(false);
        return;
      }

      setMappedData(data.mappedData);
      setNewLabel(extractLabelForDelivery(selectedDate));
      setIsDeliveryModalOpen(true);

      setLoadingDelivery(false);
    } catch (err) {
      alert("Something failed");
      setLoadingDelivery(false);
    }
  };

  const parseArray = (input) => {
    const trimmed = input.trim();
    let arr = [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        arr = parsed;
      }
    } catch {
      arr = trimmed.split(/\r?\n|,/);
    }

    return arr
      .map((item) => item.toString().trim().toUpperCase())
      .filter((item) => item.length > 0);
  };

  const handleProcessFnoCSV = async () => {
    if (!selectedDate) {
      alert("Select date first");
      return;
    }

    setLoadingFno(true);

    const dateStr = formatDateToNSE(selectedDate);
    console.log("📅 Selected Date:", selectedDate);
    console.log("📅 NSE Format:", dateStr);

    try {
      const dl = await fetch("/api/download-fno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr }),
      });

      let dlRes;
      try {
        dlRes = await dl.json();
      } catch {
        alert("Download failed (invalid response)");
        setLoadingFno(false);
        return;
      }

      if (!dl.ok) {
        alert(dlRes.error);
        setLoadingFno(false);
        return;
      }

      if (dlRes.cached) {
        console.log("⚡ Using cached file");
      }

      const fileName = `BhavCopy_NSE_FO_0_0_0_${dateStr}_F_0000.csv`;

      const res = await fetch("/api/process-fno-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName,
          label: null,
        }),
      });

      const data = await res.json();
      console.log("📊 Process response:", data);
      if (!res.ok) {
        alert(data.error);
        setLoadingFno(false);
        return;
      }
      if (!data.data || data.data.length === 0) {
        alert("No F&O data found");
        setLoadingFno(false);
        return;
      }

      setFnoData(data.data);
      setNewLabel(extractLabelForFNO(selectedDate));
      setIsFnoModalOpen(true);
      setLoadingFno(false);
    } catch (err) {
      alert("Something failed");
      setLoadingFno(false);
    }
  };

  const handleSaveFno = async () => {
    if (!newLabel.trim()) {
      alert("Label required");
      return;
    }

    const resSave = await fetch("/api/save-fno-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: newLabel.toLowerCase(),
        data: fnoData,
      }),
    });

    const result = await resSave.json();

    if (!resSave.ok) {
      alert(result.error);
      return;
    }

    alert("Saved Successfully 1111✅");

    setFnoData(null);
    setNewLabel("");
    setIsFnoModalOpen(false);
  };

  const convertFuturesJson = (arr) => {
    try {
      const output = {};

      arr.forEach((row) => {
        if (!row) return;

        const symbolKey = Object.keys(row).find((k) =>
          /^Symbol\s*\(\d+\)$/.test(k.trim()),
        );

        if (!symbolKey) return;

        const symbol = row[symbolKey];
        if (!symbol) return;

        const formatted = {};

        Object.entries(row).forEach(([key, value]) => {
          if (key === symbolKey) return;
          if (!key || key.trim() === "") return;

          let newKey = key.trim();
          newKey = newKey.replace(/ +/g, "_");
          newKey = newKey.replace(/^([A-Za-z]{3})_(\d{2})$/, "$1_$2");

          if (/MoM_OI_Chg_%/.test(newKey)) newKey = "MoM_OI_Change_%";
          if (/MoM_Price_Chg%/.test(newKey)) newKey = "MoM_Price_Change_%";

          if (/^\w+_\d{2}_1$/.test(newKey)) {
            newKey = newKey.replace(/_1$/, "_Price");
          }

          let cleaned;
          if (value === "-" || value === "") cleaned = "-";
          else if (typeof value === "string" && value.trim() === "-")
            cleaned = "-";
          else if (!isNaN(value)) cleaned = Number(value);
          else cleaned = value;

          formatted[newKey] = cleaned;
        });

        output[symbol] = formatted;
      });

      return JSON.stringify(output);
    } catch {
      return "❌ Unable to convert Futures JSON";
    }
  };

  const handleMinifyJson = (value) => {
    setJsonInput(value);

    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        setJsonMinified(convertFuturesJson(parsed));
        return;
      }

      setJsonMinified(JSON.stringify(parsed));
    } catch (e) {
      setJsonMinified("❌ Invalid JSON");
    }
  };

  const getUniqueItems = () => {
    const arr1 = parseArray(array1);
    const arr2 = parseArray(array2);
    const unique = [...new Set([...arr1, ...arr2])];
    setResult(JSON.stringify(unique, null, 0));
    setResultCount(unique.length);
  };

  const removeCommonItems = () => {
    const arr1 = parseArray(array1);
    const arr2 = parseArray(array2);
    const filtered = arr1.filter((item) => !arr2.includes(item));
    const uniqueFiltered = [...new Set(filtered)];
    setResult(JSON.stringify(uniqueFiltered, null, 0));
    setResultCount(uniqueFiltered.length);
  };

  const handleDedupInput = (value) => {
    setDedupInput(value);
    const parsed = parseArray(value);
    const unique = [...new Set(parsed)];
    setDedupOutput(JSON.stringify(unique, null, 0));
    setDedupCount(unique.length);
  };

  const handleOutputPaste = (value) => {
    try {
      const parsed = JSON.parse(value);
      setJsonMinified(JSON.stringify(parsed));
    } catch {
      setJsonMinified("❌ Invalid JSON");
    }
  };

  const getOnlyInList2 = () => {
    const arr1 = parseArray(array1);
    const arr2 = parseArray(array2);
    const filtered = arr2.filter((item) => !arr1.includes(item));
    const uniqueFiltered = [...new Set(filtered)];
    setResult(JSON.stringify(uniqueFiltered, null, 0));
    setResultCount(uniqueFiltered.length);
  };

  const getOnlyInList1 = () => {
    const arr1 = parseArray(array1);
    const arr2 = parseArray(array2);
    const resultArr = [...new Set(arr1.filter((item) => !arr2.includes(item)))];
    setResult(JSON.stringify(resultArr, null, 0));
    setResultCount(resultArr.length);
  };

  const getIntersection = () => {
    const arr1 = parseArray(array1);
    const arr2 = parseArray(array2);
    const common = arr1.filter((item) => arr2.includes(item));
    const uniqueCommon = [...new Set(common)];
    setResult(JSON.stringify(uniqueCommon, null, 0));
    setResultCount(uniqueCommon.length);
  };

  const handleFilterEQSeries = (value) => {
    setEqJsonInput(value);

    try {
      const parsed = JSON.parse(value);

      if (!Array.isArray(parsed)) {
        setEqJsonOutput("❌ JSON must be an array");
        setEqCount(0);
        setMappedData(null);
        return;
      }

      const fnoSet = new Set(FNO_STOCKS);
      const mapped = {};

      parsed.forEach((item) => {
        if (item?.SERIES === "EQ" && item?.SYMBOL && fnoSet.has(item.SYMBOL)) {
          mapped[item.SYMBOL] = item;
        }
      });

      setMappedData(mapped);
      setEqJsonOutput(JSON.stringify(mapped, null, 2));
      setEqCount(Object.keys(mapped).length);
    } catch (err) {
      setEqJsonOutput("❌ Invalid JSON");
      setEqCount(0);
      setMappedData(null);
    }
  };

  const handleSave = async () => {
    if (!mappedData || Object.keys(mappedData).length === 0) {
      setSaveError("No data to save");
      return;
    }

    if (!newLabel.trim()) {
      setSaveError("Label is required");
      return;
    }

    setIsSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      const res = await fetch("/api/save-delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newLabel.trim(),
          data: mappedData,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setSaveError(result.error || "Save failed");
      } else {
        setSaveSuccess("Saved successfully 22222✅");

        setEqJsonInput("");
        setEqJsonOutput("");
        setEqCount(0);
        setMappedData(null);
        setNewLabel("");

        setTimeout(() => {
          setIsDeliveryModalOpen(false);
          setSaveSuccess("");
        }, 1200);
      }
    } catch {
      setSaveError("Server error");
    }

    setIsSaving(false);
  };

  const list1Count = parseArray(array1).length;
  const list2Count = parseArray(array2).length;
  const dedupInputCount = parseArray(dedupInput).length;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100">
      <Sidebar />

      <main className="flex-1 p-10 overflow-y-auto">
        <div className="space-y-16">
          <section>
            <h2 className="text-xl font-semibold text-blue-300 mb-6">
              Compare Two Lists
            </h2>

            <div className="grid md:grid-cols-3 gap-8 mb-6">
              <div>
                <h3 className="mb-2 font-medium flex justify-between">
                  <span>List 1</span>
                  <span className="text-blue-400 font-semibold">
                    {list1Count}
                  </span>
                </h3>
                <textarea
                  id="textarea-list1"
                  value={array1}
                  onChange={(e) => setArray1(e.target.value)}
                  placeholder="Paste your first list here..."
                  className="w-full h-32 bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 rounded-lg p-3 text-sm font-mono resize-none outline-none transition"
                />
              </div>

              <div>
                <h3 className="mb-2 font-medium flex justify-between">
                  <span>List 2</span>
                  <span className="text-blue-400 font-semibold">
                    {list2Count}
                  </span>
                </h3>
                <textarea
                  id="textarea-list2"
                  value={array2}
                  onChange={(e) => setArray2(e.target.value)}
                  placeholder="Paste your second list here..."
                  className="w-full h-32 bg-gray-800 border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40 rounded-lg p-3 text-sm font-mono resize-none outline-none transition"
                />
              </div>

              <div>
                <h3 className="mb-2 font-medium flex justify-between">
                  Result{" "}
                  <span className="text-yellow-400 font-semibold">
                    Count: {resultCount}
                  </span>
                </h3>
                <textarea
                  id="textarea-result"
                  value={result}
                  readOnly
                  placeholder='Result will appear here like ["A","B","C"]'
                  className="w-full h-32 bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-gray-300 font-mono resize-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mb-6">
              <TooltipButton
                onClick={getUniqueItems}
                label="Get All Unique Items (Union)"
                color="bg-blue-600 hover:bg-blue-500"
                example={
                  <>
                    Example: L1 [A,B,C], L2 [C,D,E] → <b>[A,B,C,D,E]</b>
                  </>
                }
              />

              <TooltipButton
                onClick={getIntersection}
                label="Common Items (Intersection A ∩ B)"
                color="bg-yellow-600 hover:bg-yellow-500"
                example={
                  <>
                    Example: L1 [A,B,C,D,E], L2 [B,C,D,F] → <b>[B,C,D]</b>
                  </>
                }
              />

              <TooltipButton
                onClick={removeCommonItems}
                label="Remove Common Items (A1 − A2)"
                color="bg-indigo-600 hover:bg-indigo-500"
                example={
                  <>
                    Example: L1 [A,B,C,D,E,F], L2 [B,D,F] → <b>[A,C,E]</b>
                  </>
                }
              />

              <TooltipButton
                onClick={getOnlyInList1}
                label="Only in List 1 (A1 − A2)"
                color="bg-purple-600 hover:bg-purple-500"
                example={
                  <>
                    Example: L1 [A,B,C,D,E], L2 [B,C,F] → <b>[A,D,E]</b>
                  </>
                }
              />

              <TooltipButton
                onClick={getOnlyInList2}
                label="Only in List 2 (A2 − A1)"
                color="bg-emerald-600 hover:bg-emerald-500"
                example={
                  <>
                    Example: L1 [A,B,C], L2 [D,E,F,G] → <b>[D,E,F,G]</b>
                  </>
                }
              />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-green-300 mb-6">
              Remove Duplicates from a Single List
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="mb-2 font-medium flex justify-between">
                  <span>Original List</span>
                  <span className="text-green-400 font-semibold">
                    {dedupInputCount}
                  </span>
                </h3>
                <textarea
                  id="textarea-dedup-input"
                  value={dedupInput}
                  onChange={(e) => handleDedupInput(e.target.value)}
                  placeholder="Paste your list here..."
                  className="w-full h-32 bg-gray-800 border border-gray-700 focus:border-green-500 focus:ring-2 focus:ring-green-500/40 rounded-lg p-3 text-sm font-mono resize-none outline-none transition"
                />
              </div>

              <div>
                <h3 className="mb-2 font-medium flex justify-between">
                  <span>Unique Result</span>
                  <span className="text-yellow-400 font-semibold">
                    {dedupCount}
                  </span>
                </h3>
                <textarea
                  id="textarea-dedup-output"
                  value={dedupOutput}
                  readOnly
                  placeholder='Unique values like ["A","B","C"]'
                  className="w-full h-32 bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-gray-300 font-mono resize-none"
                />
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-950 to-gray-900 border border-gray-800 rounded-2xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-blue-300 mb-6">
                Fetch NSE Bhavcopy
              </h2>

              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="bg-gray-800 p-4 rounded-xl shadow-inner">
                  <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                  />
                </div>

                <div className="flex flex-col gap-4 w-full md:w-auto">
                  <button
                    onClick={handleProcessDeliveryCSV}
                    disabled={!selectedDate || loadingDelivery}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 px-6 py-3 rounded-lg text-lg font-semibold transition shadow-md"
                  >
                    {loadingDelivery
                      ? "Processing..."
                      : "Fetch NSE Daily Delivery Bhavcopy"}
                  </button>

                  <button
                    onClick={handleProcessFnoCSV}
                    disabled={!selectedDate || loadingFno}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 px-6 py-3 rounded-lg text-lg font-semibold transition shadow-md"
                  >
                    {loadingFno ? "Processing..." : "Fetch NSE F&O Bhavcopy"}
                  </button>
                </div>

                {isDeliveryModalOpen && (
                  <div className="mt-4 p-4 bg-gray-900 border border-gray-700 rounded-lg">
                    <div className="mb-2 text-sm font-semibold text-yellow-400">
                      Enter Label (example: feb_28)
                    </div>

                    <input
                      type="text"
                      ref={deliveryInputRef}
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 mb-3"
                    />

                    <div className="flex gap-3">
                      <button
                        onClick={handleSave}
                        className="bg-green-600 px-4 py-2 rounded"
                      >
                        Confirm
                      </button>

                      <button
                        onClick={() => setIsDeliveryModalOpen(false)}
                        className="bg-gray-600 px-4 py-2 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {isFnoModalOpen && (
                  <div className="mt-4 p-4 bg-gray-900 border border-gray-700 rounded-lg">
                    <div className="mb-2 text-sm font-semibold text-yellow-400">
                      Enter Label (example: mar_30)
                    </div>

                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 mb-3"
                    />

                    <div className="flex gap-3">
                      <button
                        onClick={handleSaveFno}
                        className="bg-green-600 px-4 py-2 rounded"
                      >
                        Confirm
                      </button>

                      <button
                        onClick={() => setIsFnoModalOpen(false)}
                        className="bg-gray-600 px-4 py-2 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-xl font-semibold mb-6">
                Update Rollover Data
              </h2>

              <div className="flex gap-3">
                <select
                  value={selectedRolloverFile}
                  onChange={(e) => setSelectedRolloverFile(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
                >
                  <option value="">Select CSV File</option>
                  {rolloverFiles.map((file) => (
                    <option key={file} value={file}>
                      {file}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleProcessRolloverCSV}
                  disabled={!selectedRolloverFile}
                  className="bg-blue-600 px-4 py-2 rounded disabled:bg-gray-700"
                >
                  Process
                </button>
              </div>

              {isRolloverModalOpen && (
                <div className="mt-4 p-4 bg-gray-900 border border-gray-700 rounded-lg">
                  <div className="mb-2 text-sm font-semibold text-yellow-400">
                    Confirm Rollover Data Save
                  </div>

                  <div className="text-sm text-gray-300 mb-3">
                    Stocks Processed: <b>{rolloverCount}</b>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        const res = await fetch("/api/save-rollover-data", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ data: rolloverData }),
                        });

                        const result = await res.json();

                        if (!res.ok) {
                          alert(result.error);
                          return;
                        }

                        alert("Saved Successfully 3333✅");

                        setIsRolloverModalOpen(false);
                        setRolloverData(null);
                        setSelectedRolloverFile("");
                      }}
                      className="bg-green-600 px-4 py-2 rounded"
                    >
                      Confirm
                    </button>

                    <button
                      onClick={() => setIsRolloverModalOpen(false)}
                      className="bg-gray-600 px-4 py-2 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {rolloverData && Object.keys(rolloverData).length > 0 && (
                <pre className="text-xs max-h-32 overflow-auto bg-gray-800 p-2 rounded">
                  {JSON.stringify(
                    Object.fromEntries(
                      Object.entries(rolloverData).slice(0, 3),
                    ),
                    null,
                    2,
                  )}
                </pre>
              )}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5"></div>
          </div>
        </div>
      </main>
    </div>
  );
}