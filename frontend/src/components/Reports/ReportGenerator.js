import React, { useEffect, useMemo, useState } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import api, { generateAIReport, getAIProviders } from '../../services/api';
import {
  FileText, Send, RefreshCw, LayoutTemplate, Sliders, Sparkles,
  Check, Eye, Code, ArrowRight, BookmarkCheck, Calendar, Shield
} from 'lucide-react';
import { REPORT_TEMPLATES, ALL_AVAILABLE_MODULES } from './reportTemplatesConfig';
import ReportPreview from './ReportPreview';
import ExportButtons from './ExportButtons';
import './Reports.css';

const ReportGenerator = () => {
  const { canGenerateReports, user } = usePermissions();

  // Template Selection
  const [selectedTemplateId, setSelectedTemplateId] = useState('executive_summary');

  // Customization Metadata
  const [customTitle, setCustomTitle] = useState('Executive & Donor Program Summary');
  const [customSubtitle, setCustomSubtitle] = useState('Strategic Overview of Interventions, Reach & Beneficiary Outcomes');
  const [preparedBy, setPreparedBy] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  // Date Filtering
  const [periodPreset, setPeriodPreset] = useState('last_quarter');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Modules
  const [modules, setModules] = useState(['children', 'therapy', 'devices', 'outreach', 'nutrition', 'success_stories']);

  // Report Generation State
  const [report, setReport] = useState(null);
  const [reportContent, setReportContent] = useState('');
  const [viewMode, setViewMode] = useState('formatted'); // 'formatted' | 'json'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Saved Reports
  const [savedReports, setSavedReports] = useState([]);

  // AI Narrative Generator State
  const [showReportChat, setShowReportChat] = useState(false);
  const [reportPrompt, setReportPrompt] = useState('');
  const [reportResult, setReportResult] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportProviderUsed, setReportProviderUsed] = useState(null);
  const [reportProviders, setReportProviders] = useState([]);
  const [selectedReportProvider, setSelectedReportProvider] = useState('auto');

  const isGuest = (user?.role || '').toLowerCase() === 'guest';
  const canEditFinalReport = useMemo(() => canGenerateReports() && !isGuest, [canGenerateReports, isGuest]);

  // Set default prepared by from logged in user
  useEffect(() => {
    if (user && !preparedBy) {
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
      setPreparedBy(fullName || user.username || 'BK Program & M&E Lead');
    }
  }, [user, preparedBy]);

  // Load saved reports on mount
  useEffect(() => {
    if (!canGenerateReports()) {
      setError('You do not have permission to generate reports.');
    }
    loadSavedReports();
  }, [canGenerateReports]);

  // Load AI providers when chat panel opens
  useEffect(() => {
    if (showReportChat) {
      loadReportProviders();
    }
  }, [showReportChat]);

  // Handle template selection
  const handleSelectTemplate = (template) => {
    setSelectedTemplateId(template.id);
    setCustomTitle(template.defaultTitle);
    setCustomSubtitle(template.defaultSubtitle);
    setModules(template.defaultModules);
    applyPeriodPreset(template.recommendedPeriod || 'all');
  };

  // Quick period helper
  const applyPeriodPreset = (preset) => {
    setPeriodPreset(preset);
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(startOfMonth.toISOString().split('T')[0]);
      setEndDate(endStr);
    } else if (preset === 'last_quarter') {
      const start90 = new Date(today);
      start90.setDate(start90.getDate() - 90);
      setStartDate(start90.toISOString().split('T')[0]);
      setEndDate(endStr);
    } else if (preset === 'year') {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      setStartDate(startOfYear.toISOString().split('T')[0]);
      setEndDate(endStr);
    }
  };

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

  // Module toggle
  const toggleModule = (modId) => {
    setModules((curr) =>
      curr.includes(modId) ? curr.filter((m) => m !== modId) : [...curr, modId]
    );
  };

  // Select all or clear modules
  const handleSelectAllModules = () => {
    setModules(ALL_AVAILABLE_MODULES.map((m) => m.id));
  };

  const handleClearModules = () => {
    setModules([]);
  };

  // Generate Report Preview
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (modules.length === 0) {
      setError('Please select at least one module component.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/reports/', {
        report_type: selectedTemplateId,
        title: customTitle,
        subtitle: customSubtitle,
        prepared_by: preparedBy,
        notes: customNotes,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        modules,
        format: 'json',
      });

      const generated = response.data;
      setReport(generated);
      setReportContent(JSON.stringify(generated, null, 2));
      setSuccess('Report generated successfully. Review below and export as desired.');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to generate report.');
    } finally {
      setLoading(false);
    }
  };

  // Download export files
  const handleDownloadFile = async (format) => {
    if (!report) return;
    setError('');
    setSuccess('');

    try {
      const response = await api.post(
        '/reports/',
        {
          report_type: report.report_type || selectedTemplateId,
          title: report.title || customTitle,
          subtitle: report.subtitle || customSubtitle,
          prepared_by: report.prepared_by || preparedBy,
          notes: report.notes || customNotes,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          modules,
          format,
        },
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/octet-stream',
      });
      const contentDisp = response.headers['content-disposition'] || '';
      let filename = `${(report.title || 'report').toLowerCase().replace(/\s+/g, '_')}.${format}`;
      if (contentDisp.includes('filename=')) {
        filename = contentDisp.split('filename=')[1].replace(/"/g, '');
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      setSuccess(`Exported ${format.toUpperCase()} report successfully.`);
    } catch (err) {
      setError('Unable to download the report file.');
      console.error(err);
    }
  };

  // Print Browser View
  const handlePrint = () => {
    window.print();
  };

  // Save to Final Reports
  const handleSave = async () => {
    if (!canEditFinalReport || !report) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/final-reports/', {
        report_type: report.report_type || selectedTemplateId,
        title: report.title || customTitle,
        content: reportContent || JSON.stringify(report, null, 2),
        generated_at: report.generated_at,
        is_published: false,
      });
      setSuccess('Report archived to Final Reports successfully.');
      loadSavedReports();
    } catch (err) {
      setError('Unable to archive final report.');
    } finally {
      setSaving(false);
    }
  };

  // AI Report Generation
  const handleGenerateAIReport = async () => {
    if (!reportPrompt.trim()) return;
    setReportLoading(true);
    setReportResult(null);
    setReportProviderUsed(null);

    try {
      const provider = selectedReportProvider === 'auto' ? null : selectedReportProvider;
      let period = null;
      if (startDate && endDate) {
        period = { start: startDate, end: endDate };
      } else {
        const now = new Date();
        const end = now.toISOString().split('T')[0];
        const start = new Date(now);
        start.setDate(start.getDate() - 90);
        period = { start: start.toISOString().split('T')[0], end };
      }

      const response = await generateAIReport(reportPrompt, period, provider);
      setReportResult(response.data.report);
      setReportProviderUsed(response.data.provider_used);
    } catch (error) {
      alert('Failed to generate report: ' + (error.response?.data?.error || 'Unknown error'));
    } finally {
      setReportLoading(false);
    }
  };

  const handleUseAIAsNotes = () => {
    if (reportResult) {
      setCustomNotes(reportResult);
      if (report) {
        setReport((prev) => ({ ...prev, notes: reportResult }));
      }
      setSuccess('AI narrative inserted into Executive Remarks.');
      setShowReportChat(false);
    }
  };

  return (
    <div className="reports-container">
      {/* 1. Header */}
      <div className="reports-header no-print">
        <h1>
          <FileText size={28} color="#2E2C6E" /> Report Templates & Generator
        </h1>
        <p>
          Select a specialized report template, customize titles and narrative notes, preview formatted documents, and export to official PDF, Word, or Excel.
        </p>
      </div>

      {/* 2. Specialized Template Selector */}
      <div className="template-selector-section no-print">
        <div className="section-title">
          <LayoutTemplate size={18} color="#2E2C6E" /> Choose a Specialized Report Template
        </div>
        <div className="section-desc">
          Click any template preset to instantly load its layout, recommended modules, and metadata structure.
        </div>

        <div className="templates-grid">
          {REPORT_TEMPLATES.map((tmpl) => {
            const isSelected = selectedTemplateId === tmpl.id;
            return (
              <div
                key={tmpl.id}
                onClick={() => handleSelectTemplate(tmpl)}
                className={`template-card ${isSelected ? 'active' : ''}`}
              >
                <div className="template-card-header">
                  <span
                    className="template-card-badge"
                    style={{ background: tmpl.badgeBg, color: tmpl.badgeColor }}
                  >
                    {tmpl.badge}
                  </span>
                  {isSelected && (
                    <span style={{ color: '#2E2C6E', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', fontWeight: 700 }}>
                      <Check size={14} /> Active
                    </span>
                  )}
                </div>
                <div className="template-card-title">{tmpl.name}</div>
                <div className="template-card-desc">{tmpl.description}</div>
                <div className="template-card-features">
                  {tmpl.features.map((f) => (
                    <span key={f} className="feature-pill">{f}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Customization & Filter Controls Form */}
      <form onSubmit={handleSubmit} className="customization-section no-print">
        <div className="section-title">
          <Sliders size={18} color="#2E2C6E" /> Customize Report Settings & Scope
        </div>
        <div className="section-desc">
          Fine-tune titles, officer signature details, reporting timeframe, and included program modules.
        </div>

        {/* Text Metadata Controls */}
        <div className="form-grid-3">
          <div className="form-group">
            <label>Report Title</label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="form-input"
              placeholder="e.g. Executive & Donor Program Summary"
              required
            />
          </div>

          <div className="form-group">
            <label>Report Subtitle / Tagline</label>
            <input
              type="text"
              value={customSubtitle}
              onChange={(e) => setCustomSubtitle(e.target.value)}
              className="form-input"
              placeholder="e.g. Strategic Overview of Beneficiary Reach"
            />
          </div>

          <div className="form-group">
            <label>Prepared By (Staff / Officer)</label>
            <input
              type="text"
              value={preparedBy}
              onChange={(e) => setPreparedBy(e.target.value)}
              className="form-input"
              placeholder="Your Name & Title"
            />
          </div>
        </div>

        {/* Reporting Period Quick Selector */}
        <div style={{ marginTop: '10px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#2E2C6E', display: 'block', marginBottom: '8px' }}>
            Reporting Timeframe Preset:
          </label>
          <div className="quick-periods-row">
            <button
              type="button"
              className={`quick-period-btn ${periodPreset === 'all' ? 'active' : ''}`}
              onClick={() => applyPeriodPreset('all')}
            >
              All Recorded History
            </button>
            <button
              type="button"
              className={`quick-period-btn ${periodPreset === 'month' ? 'active' : ''}`}
              onClick={() => applyPeriodPreset('month')}
            >
              Current Month
            </button>
            <button
              type="button"
              className={`quick-period-btn ${periodPreset === 'last_quarter' ? 'active' : ''}`}
              onClick={() => applyPeriodPreset('last_quarter')}
            >
              Last 90 Days (Quarter)
            </button>
            <button
              type="button"
              className={`quick-period-btn ${periodPreset === 'year' ? 'active' : ''}`}
              onClick={() => applyPeriodPreset('year')}
            >
              This Year
            </button>
            <button
              type="button"
              className={`quick-period-btn ${periodPreset === 'custom' ? 'active' : ''}`}
              onClick={() => setPeriodPreset('custom')}
            >
              Custom Dates
            </button>
          </div>

          <div className="form-grid-3" style={{ marginTop: '8px' }}>
            <div className="form-group">
              <label>Start Date (Optional)</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPeriodPreset('custom');
                }}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>End Date (Optional)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPeriodPreset('custom');
                }}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Executive Remarks / Narrative Box */}
        <div style={{ marginTop: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#2E2C6E' }}>
              Executive Remarks / Narrative Summary (Optional)
            </label>
            <button
              type="button"
              onClick={() => setShowReportChat(!showReportChat)}
              className="quick-period-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <Sparkles size={13} /> {showReportChat ? 'Hide AI Writer' : 'Draft with AI'}
            </button>
          </div>
          <textarea
            rows="3"
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            className="form-textarea"
            style={{ width: '100%' }}
            placeholder="Add key highlights, donor notes, executive achievements, or recommendations to include at the top of the report..."
          />
        </div>

        {/* Modules Multi-Select Chips */}
        <div className="modules-selector-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#2E2C6E' }}>
              Included Program Modules ({modules.length} selected):
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={handleSelectAllModules}
                className="quick-period-btn"
                style={{ fontSize: '11px', padding: '3px 8px' }}
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearModules}
                className="quick-period-btn"
                style={{ fontSize: '11px', padding: '3px 8px' }}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="modules-chips-grid">
            {ALL_AVAILABLE_MODULES.map((mod) => {
              const isChecked = modules.includes(mod.id);
              return (
                <label
                  key={mod.id}
                  className={`module-chip ${isChecked ? 'selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleModule(mod.id)}
                  />
                  {isChecked && <Check size={12} />}
                  {mod.label}
                </label>
              );
            })}
          </div>
        </div>

        {error && <div style={{ color: '#C94B4B', marginTop: '14px', fontWeight: 500 }}>{error}</div>}
        {success && <div style={{ color: '#2E7D32', marginTop: '14px', fontWeight: 500 }}>{success}</div>}

        {/* Action Button */}
        <div className="generate-actions-bar">
          <button
            type="submit"
            disabled={loading || !canGenerateReports()}
            className="btn-primary"
          >
            {loading ? 'Generating Report...' : <><Eye size={16} /> Generate & Update Report</>}
          </button>
          <span style={{ fontSize: '12.5px', color: '#5A5C74' }}>
            Loads live database records into the chosen template layout.
          </span>
        </div>
      </form>

      {/* 4. AI Report Writer Panel */}
      {showReportChat && (
        <div className="customization-section no-print" style={{ border: '2px solid #2E2C6E' }}>
          <div className="section-title">
            <Sparkles size={18} color="#2E2C6E" /> AI Narrative Generator & Assistant
          </div>
          <div className="section-desc">
            Ask AI to generate an analytical program narrative based on live database statistics, then insert it directly into your report template.
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', color: '#5A5C74' }}>Provider:</span>
            <select
              value={selectedReportProvider}
              onChange={(e) => setSelectedReportProvider(e.target.value)}
              className="form-select"
              style={{ fontSize: '12px', padding: '4px 8px' }}
            >
              <option value="auto">🔄 Auto (Automatic Failover)</option>
              {reportProviders.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadReportProviders}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5A5C74' }}
              title="Refresh providers"
            >
              <RefreshCw size={14} />
            </button>
            {reportProviderUsed && (
              <span className="feature-pill" style={{ background: '#E1F4EA', color: '#2E7D32' }}>
                Used: {reportProviderUsed}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <textarea
              rows="2"
              value={reportPrompt}
              onChange={(e) => setReportPrompt(e.target.value)}
              placeholder="e.g. 'Write an executive summary highlighting our therapy outcomes and outreach clinic reach in Kampala'..."
              className="form-textarea"
              style={{ flex: 1, minHeight: '55px' }}
            />
            <button
              type="button"
              onClick={handleGenerateAIReport}
              disabled={reportLoading || !reportPrompt.trim()}
              className="btn-primary"
              style={{ alignSelf: 'flex-start', padding: '10px 16px' }}
            >
              {reportLoading ? 'Writing...' : <><Send size={15} /> Generate</>}
            </button>
          </div>

          {reportResult && (
            <div style={{ marginTop: '16px', background: '#FAFAFD', padding: '16px', borderRadius: '8px', border: '1px solid #E4E6F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#2E2C6E' }}>Generated AI Narrative:</span>
                <button
                  type="button"
                  onClick={handleUseAIAsNotes}
                  className="btn-secondary"
                  style={{ padding: '5px 12px', fontSize: '12px' }}
                >
                  <ArrowRight size={13} /> Insert into Report Narrative
                </button>
              </div>
              <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontFamily: 'inherit', fontSize: '13.5px', color: '#1B1B2B', margin: 0, maxHeight: '300px', overflowY: 'auto' }}>
                {reportResult}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* 5. Saved Reports Archive */}
      {savedReports.length > 0 && (
        <div className="saved-reports-section no-print" style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E4E6F0', padding: '18px 20px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookmarkCheck size={17} color="#2E2C6E" /> Previously Saved Final Reports ({savedReports.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            {savedReports.slice(0, 6).map((sr) => (
              <button
                key={sr.id}
                type="button"
                onClick={() => {
                  try {
                    const parsed = typeof sr.content === 'string' ? JSON.parse(sr.content) : sr.content;
                    setReport(parsed);
                    setReportContent(sr.content);
                  } catch {
                    setReport({
                      title: sr.title,
                      report_type: sr.report_type,
                      generated_at: sr.generated_at,
                      notes: sr.content,
                      data: {}
                    });
                    setReportContent(sr.content);
                  }
                  setSuccess(`Loaded archived report: ${sr.title}`);
                }}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  border: '1px solid #E4E6F0',
                  borderRadius: '8px',
                  background: '#FAFAFD',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#1B1B2B' }}>{sr.title}</div>
                <div style={{ color: '#5A5C74', fontSize: '11.5px', marginTop: '2px' }}>
                  {sr.report_type} • {new Date(sr.generated_at).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 6. Active Report Preview & Export Toolbar */}
      {report ? (
        <div>
          {/* View Mode Switcher and Export Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div className="view-mode-tabs no-print">
              <button
                type="button"
                className={`view-mode-btn ${viewMode === 'formatted' ? 'active' : ''}`}
                onClick={() => setViewMode('formatted')}
              >
                <Eye size={14} style={{ display: 'inline', marginRight: '4px' }} /> Formatted Template View
              </button>
              <button
                type="button"
                className={`view-mode-btn ${viewMode === 'json' ? 'active' : ''}`}
                onClick={() => setViewMode('json')}
              >
                <Code size={14} style={{ display: 'inline', marginRight: '4px' }} /> Raw Data (JSON)
              </button>
            </div>

            <span className="no-print" style={{ fontSize: '12px', color: '#5A5C74' }}>
              Template: <strong>{selectedTemplateId.replace(/_/g, ' ').toUpperCase()}</strong>
            </span>
          </div>

          {/* Export Toolbar */}
          <ExportButtons
            onDownloadFormat={handleDownloadFile}
            onPrint={handlePrint}
            onSaveReport={handleSave}
            canSave={canEditFinalReport}
            saving={saving}
            disabled={loading}
          />

          {/* Document Preview Paper */}
          <ReportPreview
            report={report}
            reportContent={reportContent}
            setReportContent={setReportContent}
            viewMode={viewMode}
            canEdit={canEditFinalReport}
          />
        </div>
      ) : (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px dashed #DCDFEA', padding: '48px 24px', textAlign: 'center', color: '#5A5C74' }}>
          <LayoutTemplate size={40} color="#A0A3BD" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1B1B2B', marginBottom: '6px' }}>
            Ready to Generate Your Report
          </h3>
          <p style={{ maxWidth: '480px', margin: '0 auto 16px auto', fontSize: '14px' }}>
            Select your preferred template preset above, customize any titles or timeframes, and click <strong>Generate & Update Report</strong> to view the formatted document.
          </p>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !canGenerateReports()}
            className="btn-primary"
            style={{ margin: '0 auto' }}
          >
            {loading ? 'Generating...' : <><Eye size={16} /> Generate Preview Now</>}
          </button>
        </div>
      )}
    </div>
  );
};

export default ReportGenerator;
