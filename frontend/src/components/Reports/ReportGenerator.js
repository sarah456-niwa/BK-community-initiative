import React, { useEffect, useMemo, useState } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import api from '../../services/api';
// NEW IMPORTS FOR AI
import { generateAIReport, getAIProviders } from '../../services/api';
import { Send, X, FileText, RefreshCw } from 'lucide-react';

const ReportGenerator = () => {
  const { canGenerateReports, user } = usePermissions();
  const [reportType, setReportType] = useState('summary');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [modules, setModules] = useState(['children', 'outreach']);
  const [report, setReport] = useState(null);
  const [reportContent, setReportContent] = useState('');
  const [downloadFormat, setDownloadFormat] = useState('json');
  const [savedReports, setSavedReports] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // NEW STATE FOR AI REPORT
  const [showReportChat, setShowReportChat] = useState(false);
  const [reportPrompt, setReportPrompt] = useState('');
  const [reportResult, setReportResult] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportProviderUsed, setReportProviderUsed] = useState(null);
  const [reportProviders, setReportProviders] = useState([]);
  const [selectedReportProvider, setSelectedReportProvider] = useState('auto');

  const isGuest = (user?.role || '').toLowerCase() === 'guest';
  const canEditFinalReport = useMemo(() => canGenerateReports() && !isGuest, [canGenerateReports, isGuest]);

  // Load saved reports
  useEffect(() => {
    if (!canGenerateReports()) {
      setError('You do not have permission to generate reports.');
    }
    loadSavedReports();
  }, [canGenerateReports]);

  // Load AI providers when chat opens
  useEffect(() => {
    if (showReportChat) {
      loadReportProviders();
    }
  }, [showReportChat]);

  const loadSavedReports = async () => {
    try {
      const response = await api.get('/final-reports/');
      setSavedReports(response.data.results || response.data);
    } catch (err) {
      console.error('Unable to load saved reports', err);
    }
  };

  const loadReportProviders = async () => {
    try {
      const response = await getAIProviders();
      setReportProviders(response.data.available_providers || []);
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  };

  // Existing handlers
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await api.post('/reports/', {
        report_type: reportType,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        modules,
        format: 'json',
      });
      const generated = response.data;
      setReport(generated);
      setReportContent(JSON.stringify(generated, null, 2));
      setSuccess('Report generated successfully.');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to generate report.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFile = async (format) => {
    if (!report) return;
    setError('');
    setSuccess('');
    try {
      const response = await api.post(
        '/reports/',
        {
          report_type: reportType,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          modules,
          format,
        },
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
      const filename = response.headers['content-disposition']?.split('filename=')[1]?.replace(/"/g, '') || `${report.report_type || 'report'}.${format === 'docx' ? 'docx' : format === 'word' ? 'docx' : format === 'xlsx' ? 'xlsx' : format}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      setSuccess(`Downloaded ${format.toUpperCase()} report.`);
    } catch (err) {
      setError('Unable to download report file.');
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!canEditFinalReport || !report) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/final-reports/', {
        report_type: report.report_type || reportType,
        title: report.title || `${reportType} report`,
        content: reportContent || JSON.stringify(report, null, 2),
        generated_at: report.generated_at,
        is_published: false,
      });
      setSuccess('Final report saved successfully.');
      loadSavedReports();
    } catch (err) {
      setError('Unable to save the report.');
    } finally {
      setSaving(false);
    }
  };

  // NEW AI REPORT HANDLER
  const handleGenerateAIReport = async () => {
    if (!reportPrompt.trim()) return;
    setReportLoading(true);
    setReportResult(null);
    setReportProviderUsed(null);

    try {
      const provider = selectedReportProvider === 'auto' ? null : selectedReportProvider;
      // Extract period from prompt (simple heuristic)
      let period = null;
      const match = reportPrompt.match(/Q([1-4])\s*(\d{4})/i);
      if (match) {
        const quarter = parseInt(match[1]);
        const year = parseInt(match[2]);
        const startMonth = (quarter - 1) * 3 + 1;
        const endMonth = quarter * 3;
        const endDay = new Date(year, endMonth, 0).getDate();
        period = {
          start: `${year}-${String(startMonth).padStart(2, '0')}-01`,
          end: `${year}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
        };
      } else {
        // Default: last 90 days
        const now = new Date();
        const end = now.toISOString().split('T')[0];
        const start = new Date(now);
        start.setDate(start.getDate() - 90);
        period = {
          start: start.toISOString().split('T')[0],
          end: end
        };
      }

      const response = await generateAIReport(reportPrompt, period, provider);
      setReportResult(response.data.report);
      setReportProviderUsed(response.data.provider_used);
    } catch (error) {
      alert('Failed to generate report: ' + (error.response?.data?.error || 'Unknown error'));
    }
    setReportLoading(false);
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Report Generator</h1>
      <p style={{ color: '#5A5C74', marginBottom: '20px' }}>Create, review, edit, and download reports based on your role.</p>

      {/* STANDARD REPORT GENERATION FORM */}
      <form onSubmit={handleSubmit} style={{ background: 'white', borderRadius: '12px', border: '1px solid #E4E6F0', padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div>
            <label>Report Type</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E4E6F0' }}>
              <option value="summary">Summary</option>
              <option value="monthly">Monthly</option>
              <option value="activity">Activity</option>
            </select>
          </div>
          <div>
            <label>Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E4E6F0' }} />
          </div>
          <div>
            <label>End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E4E6F0' }} />
          </div>
        </div>

        <div style={{ marginTop: '16px' }}>
          <label>Modules</label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
            {['children', 'outreach', 'therapy', 'nutrition', 'community', 'success_stories'].map((module) => (
              <label key={module} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="checkbox" checked={modules.includes(module)} onChange={() => setModules((current) => current.includes(module) ? current.filter((item) => item !== module) : [...current, module])} />
                {module}
              </label>
            ))}
          </div>
        </div>

        {error && <div style={{ color: '#C94B4B', marginTop: '12px' }}>{error}</div>}
        {success && <div style={{ color: '#2E7D32', marginTop: '12px' }}>{success}</div>}

        <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <button type="submit" disabled={loading || !canGenerateReports()} style={{ background: '#2E2C6E', color: 'white', padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
            {loading ? 'Generating...' : 'Generate Report Preview'}
          </button>
        </div>
      </form>

      {/* AI REPORT GENERATION TOGGLE */}
      <div style={{ marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setShowReportChat(!showReportChat)}
          style={{
            background: '#2E2C6E',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FileText size={16} /> {showReportChat ? 'Close AI Report Chat' : 'Generate AI Report'}
        </button>
        {showReportChat && (
          <span style={{ marginLeft: '12px', fontSize: '13px', color: '#9294AB' }}>
            Powered by multiple AI providers with automatic failover
          </span>
        )}
      </div>

      {/* AI REPORT CHAT PANEL */}
      {showReportChat && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E4E6F0', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '12px' }}>AI Report Generator</h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#5A5C74' }}>Provider:</span>
            <select
              value={selectedReportProvider}
              onChange={(e) => setSelectedReportProvider(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #E4E6F0', fontSize: '13px' }}
            >
              <option value="auto">🔄 Auto (Failover)</option>
              {reportProviders.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button
              onClick={loadReportProviders}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5A5C74' }}
              title="Refresh providers"
            >
              <RefreshCw size={16} />
            </button>
            {reportProviderUsed && (
              <span style={{ fontSize: '11px', color: '#2E7D32', background: '#E1F4EA', padding: '2px 8px', borderRadius: '12px' }}>
                Last: {reportProviderUsed}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <textarea
              rows="2"
              value={reportPrompt}
              onChange={(e) => setReportPrompt(e.target.value)}
              placeholder="Describe the report you want (e.g., 'Generate quarterly report for Q3 2026' or 'Focus on outreach activities')"
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #E4E6F0',
                borderRadius: '8px',
                resize: 'vertical',
                minHeight: '50px',
                fontFamily: 'inherit',
                fontSize: '14px'
              }}
            />
            <button
              onClick={handleGenerateAIReport}
              disabled={reportLoading || !reportPrompt.trim()}
              style={{
                background: '#2E2C6E',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {reportLoading ? 'Generating...' : <><Send size={16} /> Generate</>}
            </button>
          </div>
          {reportResult && (
            <div style={{ marginTop: '16px', maxHeight: '400px', overflowY: 'auto', background: '#FAFAFD', padding: '16px', borderRadius: '8px', border: '1px solid #E4E6F0' }}>
              <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontFamily: 'inherit', fontSize: '14px', margin: 0 }}>
                {reportResult}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* SAVED REPORTS */}
      {savedReports.length > 0 && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E4E6F0', padding: '20px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Saved Reports</h2>
          <div style={{ display: 'grid', gap: '10px' }}>
            {savedReports.map((savedReport) => (
              <button
                key={savedReport.id}
                type="button"
                onClick={() => {
                  setReport({ title: savedReport.title, report_type: savedReport.report_type, generated_at: savedReport.generated_at });
                  setReportContent(savedReport.content);
                  setSuccess(`Loaded saved report: ${savedReport.title}`);
                }}
                style={{ textAlign: 'left', padding: '12px 14px', border: '1px solid #E4E6F0', borderRadius: '8px', background: '#FAFAFD', cursor: 'pointer' }}
              >
                <div style={{ fontWeight: 600 }}>{savedReport.title}</div>
                <div style={{ color: '#5A5C74', fontSize: '13px', marginTop: '4px' }}>{savedReport.report_type} • {savedReport.generated_at}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* REPORT PREVIEW */}
      {report && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E4E6F0', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>{report.title}</h2>
            <span style={{ padding: '4px 10px', borderRadius: '999px', background: '#EEF0F8', fontSize: '12px' }}>
              {canEditFinalReport ? 'Editable' : 'View Only'}
            </span>
          </div>
          <p style={{ color: '#5A5C74', marginBottom: '12px' }}>Generated at: {report.generated_at}</p>
          <textarea value={reportContent} onChange={(e) => setReportContent(e.target.value)} style={{ width: '100%', minHeight: '240px', border: '1px solid #E4E6F0', borderRadius: '8px', padding: '12px' }} readOnly={!canEditFinalReport} />
          
          <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {canEditFinalReport && (
              <button type="button" onClick={handleSave} disabled={saving} style={{ background: '#2E2C6E', color: 'white', padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Save Report (JSON)'}
              </button>
            )}
            <button type="button" onClick={() => handleDownloadFile('json')} style={{ background: 'white', border: '1px solid #E4E6F0', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', color: '#1B1B2B' }}>
              Download JSON
            </button>
            <button type="button" onClick={() => handleDownloadFile('pdf')} style={{ background: 'white', border: '1px solid #E4E6F0', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', color: '#C94B4B' }}>
              Download PDF
            </button>
            <button type="button" onClick={() => handleDownloadFile('xlsx')} style={{ background: 'white', border: '1px solid #E4E6F0', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', color: '#2F9E68' }}>
              Download Excel
            </button>
            <button type="button" onClick={() => handleDownloadFile('docx')} style={{ background: 'white', border: '1px solid #E4E6F0', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', color: '#1C7EC4' }}>
              Download Word
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportGenerator;