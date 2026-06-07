import { useRef, useState } from 'react';
import { useAttendanceStore } from '@/store/attendanceStore';
import { Spinner, WarningBanner } from '@/components/shared';
import { Upload, FileText, AlertTriangle } from 'lucide-react';

export default function ImportCSV() {
  const { importCSV, importResult, loading } = useAttendanceStore();
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const inputRef = useRef();

  const handleFile = (selectedFile) => {
    if (!selectedFile || !selectedFile.name.endsWith('.csv')) {
      alert('Please select a .csv file');
      return;
    }
    setFile(selectedFile);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    handleFile(event.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!file) return;
    await importCSV(file);
    setFile(null);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-neutral-900">Import Attendance CSV</h1>

      <WarningBanner message="CSV must include roll_no or student_id, session_id, and status. Import validates students, sessions, and statuses, and re-uploading the same file will not create duplicates." />

      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer
          ${dragOver ? 'border-primary bg-primary-light' : 'border-neutral-300 hover:border-primary/50'}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(event) => handleFile(event.target.files[0])}
        />
        <Upload size={36} className="mx-auto text-neutral-400 mb-3" />
        {file ? (
          <p className="font-medium text-primary">{file.name}</p>
        ) : (
          <>
            <p className="font-medium text-neutral-700">Drop CSV file here or click to browse</p>
            <p className="text-sm text-neutral-400 mt-1">Minimum 50 rows supported</p>
          </>
        )}
      </div>

      <button className="btn-primary" onClick={handleSubmit} disabled={!file || loading}>
        {loading ? <Spinner size="sm" /> : <><Upload size={16} /> Import</>}
      </button>

      {importResult && (
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-neutral-900">Import Summary</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-success-light rounded-lg p-3">
              <p className="text-2xl font-bold text-success">{importResult.imported}</p>
              <p className="text-xs text-success">Imported</p>
            </div>
            <div className="bg-warning-light rounded-lg p-3">
              <p className="text-2xl font-bold text-warning">{importResult.skipped}</p>
              <p className="text-xs text-warning">Skipped</p>
            </div>
            <div className="bg-danger-light rounded-lg p-3">
              <p className="text-2xl font-bold text-danger">{importResult.errors?.length ?? 0}</p>
              <p className="text-xs text-danger">Errors</p>
            </div>
          </div>

          {importResult.errors?.length > 0 && (
            <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
              {importResult.errors.map((error, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm text-danger bg-danger-light rounded px-3 py-1.5"
                >
                  <AlertTriangle size={14} />
                  Row {error.row}: {error.message || error.reason || error.error || JSON.stringify(error)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <a href="/sample_attendance.csv" download className="btn-secondary text-sm inline-flex">
        <FileText size={16} /> Download Sample CSV
      </a>
    </div>
  );
}
