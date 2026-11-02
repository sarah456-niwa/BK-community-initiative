// frontend/src/components/Reports/ExportButtons.js
import React from 'react';
import { Printer, FileDown, FileSpreadsheet, FileText, Download, BookmarkPlus } from 'lucide-react';

const ExportButtons = ({
  onDownloadFormat,
  onPrint,
  onSaveReport,
  canSave,
  saving,
  disabled
}) => {
  return (
    <div className="export-toolbar no-print">
      <div className="export-group">
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#5A5C74' }}>
          Export Formats:
        </span>
        <button
          type="button"
          onClick={onPrint}
          disabled={disabled}
          className="btn-export btn-export-print"
          title="Print or Save as PDF directly in browser"
        >
          <Printer size={15} /> Print / PDF (Browser)
        </button>

        <button
          type="button"
          onClick={() => onDownloadFormat('pdf')}
          disabled={disabled}
          className="btn-export btn-export-pdf"
          title="Download official server-generated PDF with headers and page numbers"
        >
          <FileDown size={15} /> Official PDF
        </button>

        <button
          type="button"
          onClick={() => onDownloadFormat('docx')}
          disabled={disabled}
          className="btn-export btn-export-word"
          title="Download styled Microsoft Word (.docx) report"
        >
          <FileText size={15} /> Word (.docx)
        </button>

        <button
          type="button"
          onClick={() => onDownloadFormat('xlsx')}
          disabled={disabled}
          className="btn-export btn-export-excel"
          title="Download multi-sheet Excel (.xlsx) workbook with summary KPI tab"
        >
          <FileSpreadsheet size={15} /> Excel (.xlsx)
        </button>

        <button
          type="button"
          onClick={() => onDownloadFormat('json')}
          disabled={disabled}
          className="btn-export"
          style={{ background: '#F0F2FA', color: '#2E2C6E', borderColor: '#DCDFEA' }}
          title="Download raw structured JSON dataset"
        >
          <Download size={15} /> JSON
        </button>
      </div>

      {canSave && (
        <div className="export-group">
          <button
            type="button"
            onClick={onSaveReport}
            disabled={disabled || saving}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            <BookmarkPlus size={16} /> {saving ? 'Saving...' : 'Save to Final Reports'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportButtons;
