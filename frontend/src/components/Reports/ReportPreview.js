// frontend/src/components/Reports/ReportPreview.js
import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FileText, Users, Activity, Award, HeartHandshake, ShieldAlert,
  Search, Calendar, CheckCircle2, AlertCircle, Quote
} from 'lucide-react';

const MODULE_DISPLAY_CONFIG = {
  children: {
    title: 'Registered Children & Beneficiaries',
    icon: Users,
    headers: ['Child ID', 'Full Name', 'Gender', 'Age / DOB', 'Disability Type', 'Severity', 'District', 'Status'],
    renderRow: (r) => (
      <>
        <td><strong style={{ color: '#2E2C6E' }}>{r.child_id || 'N/A'}</strong></td>
        <td><strong>{r.full_name || '-'}</strong></td>
        <td>{r.gender || '-'}</td>
        <td>{r.age !== undefined && r.age !== null ? `${r.age} yrs` : (r.date_of_birth || '-')}</td>
        <td>{r.disability_type || 'Unspecified'}</td>
        <td>{r.severity || 'Moderate'}</td>
        <td>{r.district || '-'}</td>
        <td>
          <span className={`badge-status ${(r.status || 'ACTIVE').toLowerCase() === 'active' ? 'badge-status-active' : 'badge-status-pending'}`}>
            {r.status || 'ACTIVE'}
          </span>
        </td>
      </>
    )
  },
  outreach: {
    title: 'Outreach Clinics & Field Visits',
    icon: Activity,
    headers: ['Date', 'Venue', 'Village / District', 'Attended', 'Staff Involved'],
    renderRow: (r) => (
      <>
        <td>{r.date || '-'}</td>
        <td><strong>{r.venue || '-'}</strong></td>
        <td>{[r.village, r.district].filter(Boolean).join(', ') || '-'}</td>
        <td><strong style={{ color: '#2E2C6E' }}>{r.number_attended || 0}</strong></td>
        <td style={{ maxWidth: '240px' }}>{r.staff_involved || '-'}</td>
      </>
    )
  },
  assessments: {
    title: 'Clinical Assessments',
    icon: Activity,
    headers: ['Date', 'Child Name', 'Type', 'Findings', 'Recommendations'],
    renderRow: (r) => (
      <>
        <td>{r.date || '-'}</td>
        <td><strong>{r.child_name || r.child || '-'}</strong></td>
        <td><span className="feature-pill">{r.assessment_type || '-'}</span></td>
        <td style={{ maxWidth: '200px' }}>{r.findings || '-'}</td>
        <td style={{ maxWidth: '180px' }}>{r.recommendations || '-'}</td>
      </>
    )
  },
  therapy: {
    title: 'Therapy Sessions & Interventions',
    icon: HeartHandshake,
    headers: ['Date', 'Child Name', 'Therapy Type', 'Hours', 'Outcome Summary'],
    renderRow: (r) => (
      <>
        <td>{r.date || '-'}</td>
        <td><strong>{r.child_name || r.child || '-'}</strong></td>
        <td><span className="feature-pill">{r.therapy_type || '-'}</span></td>
        <td><strong>{r.hours || '0.0'} hrs</strong></td>
        <td style={{ maxWidth: '220px' }}>{r.outcome || r.notes || '-'}</td>
      </>
    )
  },
  devices: {
    title: 'Assistive Devices Issued',
    icon: Award,
    headers: ['Date Issued', 'Child Name', 'Device Type', 'Serial Number', 'Condition'],
    renderRow: (r) => (
      <>
        <td>{r.date_issued || '-'}</td>
        <td><strong>{r.child_name || r.child || '-'}</strong></td>
        <td><strong>{r.device_type || '-'}</strong></td>
        <td><code>{r.serial_number || 'N/A'}</code></td>
        <td>
          <span className="badge-status badge-status-active">
            {r.condition || 'NEW'}
          </span>
        </td>
      </>
    )
  },
  sensory_devices: {
    title: 'Sensory Devices Distributed',
    icon: Award,
    headers: ['Date Distributed', 'Child Name', 'Device Name', 'Quantity', 'Notes'],
    renderRow: (r) => (
      <>
        <td>{r.date_distributed || '-'}</td>
        <td><strong>{r.child_name || r.child || '-'}</strong></td>
        <td><strong>{r.device_name || '-'}</strong></td>
        <td>{r.quantity || 1}</td>
        <td>{r.notes || '-'}</td>
      </>
    )
  },
  training: {
    title: 'Caregiver Training Workshops',
    icon: Users,
    headers: ['Date', 'Workshop Name', 'Trainer', 'Attendance', 'Topics Covered'],
    renderRow: (r) => (
      <>
        <td>{r.date || '-'}</td>
        <td><strong>{r.workshop_name || '-'}</strong></td>
        <td>{r.trainer || '-'}</td>
        <td><strong style={{ color: '#2E2C6E' }}>{r.attendance || 0}</strong></td>
        <td style={{ maxWidth: '240px' }}>{r.topics || '-'}</td>
      </>
    )
  },
  materials: {
    title: 'Educational Materials Distributed',
    icon: FileText,
    headers: ['Date', 'Material Name', 'Qty', 'Recipient', 'Purpose'],
    renderRow: (r) => (
      <>
        <td>{r.date_distributed || '-'}</td>
        <td><strong>{r.material_name || '-'}</strong></td>
        <td>{r.quantity || 1}</td>
        <td>{r.recipient || '-'}</td>
        <td>{r.purpose || '-'}</td>
      </>
    )
  },
  nutrition: {
    title: 'Nutrition Support & Assessments',
    icon: HeartHandshake,
    headers: ['Date', 'Child Name', 'Status', 'Weight / Height', 'Food Ration / Supplement'],
    renderRow: (r) => (
      <>
        <td>{r.assessment_date || '-'}</td>
        <td><strong>{r.child_name || r.child || '-'}</strong></td>
        <td>
          <span className="badge-status badge-status-completed">
            {r.nutrition_status || 'Assessed'}
          </span>
        </td>
        <td>{r.weight ? `${r.weight} kg` : '-'} / {r.height ? `${r.height} cm` : '-'}</td>
        <td>{r.food_ration || r.supplement || '-'}</td>
      </>
    )
  },
  food_parcels: {
    title: 'Food Parcel Distributions',
    icon: HeartHandshake,
    headers: ['Date', 'Beneficiary Family', 'Parcel Type', 'Qty', 'Items Included'],
    renderRow: (r) => (
      <>
        <td>{r.date_distributed || '-'}</td>
        <td><strong>{r.family_name || '-'}</strong></td>
        <td>{r.parcel_type || '-'}</td>
        <td>{r.quantity || 1}</td>
        <td>{r.items_included || '-'}</td>
      </>
    )
  },
  community: {
    title: 'Community Outreach Activities',
    icon: Users,
    headers: ['Date', 'Activity Name', 'Location', 'Participants', 'Outcomes'],
    renderRow: (r) => (
      <>
        <td>{r.date || '-'}</td>
        <td><strong>{r.activity_name || '-'}</strong></td>
        <td>{r.location || '-'}</td>
        <td><strong style={{ color: '#2E2C6E' }}>{r.participants || 0}</strong></td>
        <td style={{ maxWidth: '220px' }}>{r.outcomes || '-'}</td>
      </>
    )
  },
  community_outreach: {
    title: 'Community Outreach Activities',
    icon: Users,
    headers: ['Date', 'Activity Name', 'Location', 'Participants', 'Outcomes'],
    renderRow: (r) => (
      <>
        <td>{r.date || '-'}</td>
        <td><strong>{r.activity_name || '-'}</strong></td>
        <td>{r.location || '-'}</td>
        <td><strong style={{ color: '#2E2C6E' }}>{r.participants || 0}</strong></td>
        <td style={{ maxWidth: '220px' }}>{r.outcomes || '-'}</td>
      </>
    )
  },
  meetings: {
    title: 'Stakeholder & Review Meetings',
    icon: FileText,
    headers: ['Date', 'Meeting Type', 'Participants', 'Key Decisions & Action Items'],
    renderRow: (r) => (
      <>
        <td>{r.date || '-'}</td>
        <td><strong>{r.meeting_type || '-'}</strong></td>
        <td>{r.participants || 0}</td>
        <td style={{ maxWidth: '260px' }}>{r.decisions || r.action_items || r.minutes || '-'}</td>
      </>
    )
  },
  challenges: {
    title: 'Operational Challenges & Mitigation',
    icon: AlertCircle,
    headers: ['Date', 'Module', 'Challenge Description', 'Action Taken', 'Status'],
    renderRow: (r) => (
      <>
        <td>{r.date || '-'}</td>
        <td><span className="feature-pill">{r.related_module || 'General'}</span></td>
        <td style={{ maxWidth: '200px' }}>{r.challenge_description || '-'}</td>
        <td style={{ maxWidth: '200px' }}>{r.action_taken || 'Pending action'}</td>
        <td>
          <span className={`badge-status ${r.resolved ? 'badge-status-completed' : 'badge-status-pending'}`}>
            {r.resolved ? 'RESOLVED' : 'OPEN'}
          </span>
        </td>
      </>
    )
  },
  success_stories: {
    title: 'Beneficiary Success Stories',
    icon: Quote,
    headers: ['Date Recorded', 'Child Name', 'Story Title', 'Impact Summary'],
    renderRow: (r) => (
      <>
        <td>{r.date_recorded || '-'}</td>
        <td><strong>{r.child_name || r.child || '-'}</strong></td>
        <td><strong>{r.title || '-'}</strong></td>
        <td style={{ maxWidth: '280px' }}>{r.description || r.after_story || '-'}</td>
      </>
    )
  },
  safeguarding: {
    title: 'Safeguarding Incidents',
    icon: ShieldAlert,
    headers: ['Date', 'Child Name', 'Incident Type', 'Action Taken', 'Status'],
    renderRow: (r) => (
      <>
        <td>{r.date_of_incident || '-'}</td>
        <td><strong>{r.child_name || r.child || '-'}</strong></td>
        <td><span className="badge-status badge-status-pending">{r.incident_type || '-'}</span></td>
        <td style={{ maxWidth: '220px' }}>{r.action_taken || 'Under review'}</td>
        <td><span className="badge-status badge-status-active">{r.status || 'LOGGED'}</span></td>
      </>
    )
  },
  feedback: {
    title: 'Community Feedback',
    icon: HeartHandshake,
    headers: ['Date Received', 'Provider Name', 'Feedback Type', 'Comments'],
    renderRow: (r) => (
      <>
        <td>{r.date_received || '-'}</td>
        <td><strong>{r.provider_name || 'Anonymous'}</strong></td>
        <td><span className="feature-pill">{r.feedback_type || 'General'}</span></td>
        <td style={{ maxWidth: '260px' }}>{r.comments || '-'}</td>
      </>
    )
  },
};

const ReportPreview = ({
  report,
  reportContent,
  setReportContent,
  viewMode = 'formatted',
  canEdit = true
}) => {
  const [tableSearch, setTableSearch] = useState({});

  if (!report) {
    return null;
  }

  const modulesData = report.data || {};
  const modulesKeys = Object.keys(modulesData);

  // Demographic analysis helper
  const demographics = useMemo(() => {
    const childrenRecords = modulesData.children?.records;
    if (!childrenRecords || !childrenRecords.length) return null;

    let males = 0;
    let females = 0;
    const disabilityCounts = {};

    childrenRecords.forEach((c) => {
      const g = (c.gender || '').toUpperCase();
      if (g === 'M' || g === 'MALE') males++;
      else if (g === 'F' || g === 'FEMALE') females++;

      const d = c.disability_type || 'Unspecified';
      disabilityCounts[d] = (disabilityCounts[d] || 0) + 1;
    });

    const topDisabilities = Object.entries(disabilityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    return {
      total: childrenRecords.length,
      males,
      females,
      topDisabilities
    };
  }, [modulesData]);

  const handleSearchChange = (moduleKey, term) => {
    setTableSearch((prev) => ({ ...prev, [moduleKey]: term }));
  };

  return (
    <div>
      {/* 1. FORMATTED PRINT-READY PAPER VIEW */}
      {viewMode === 'formatted' && (
        <div className="report-document-paper">
          {/* Official Letterhead */}
          <div className="paper-letterhead">
            <div className="org-brand">
              <h2>BK COMMUNITY INITIATIVE</h2>
              <div className="org-tagline">
                Child & Disability Community Support Program • Uganda
              </div>
            </div>
            <div className="doc-stamp">
              <div>OFFICIAL PROGRAM RECORD</div>
              <div className="doc-stamp-id">REF: BK-REP-{report.report_type?.toUpperCase()}</div>
              <div>Generated: {new Date(report.generated_at || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            </div>
          </div>

          {/* Title Area */}
          <div className="paper-title-area">
            <h3>{report.title || 'Program Monitoring Report'}</h3>
            <div className="paper-subtitle">
              {report.subtitle || `Monitoring, Evaluation & Learning (MEL) • ${report.report_type || 'Standard'} Report`}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="paper-meta-grid">
            <div className="meta-item">
              <span className="meta-label">Reporting Period</span>
              <span className="meta-value">
                {report.start_date || 'Project Inception'} &nbsp;to&nbsp; {report.end_date || 'Present'}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Prepared By</span>
              <span className="meta-value">{report.prepared_by || 'BK Program & M&E Team'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Report Template</span>
              <span className="meta-value" style={{ textTransform: 'capitalize' }}>
                {report.report_type?.replace(/_/g, ' ') || 'Summary'}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Verification Status</span>
              <span className="meta-value" style={{ color: '#2E7D32', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={14} /> Ready for Review
              </span>
            </div>
          </div>

          {/* Custom Executive Notes / Remarks */}
          {report.notes && (
            <div className="paper-notes-box">
              <h4>Executive Summary & Strategic Remarks</h4>
              <div className="paper-notes-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {report.notes}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Program KPI Metric Highlights */}
          {modulesKeys.length > 0 && (
            <div className="paper-kpi-grid">
              {modulesKeys.map((modKey) => {
                const info = modulesData[modKey];
                const cfg = MODULE_DISPLAY_CONFIG[modKey] || { title: modKey.replace(/_/g, ' ') };
                return (
                  <div key={modKey} className="paper-kpi-card">
                    <div className="kpi-card-num">{info.total || (info.records?.length || 0)}</div>
                    <div className="kpi-card-label">{cfg.title}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Beneficiary Demographics Spotlight (if children module present) */}
          {demographics && (
            <div className="paper-section" style={{ background: '#F8F9FD', padding: '16px 20px', borderRadius: '10px', border: '1px solid #E4E6F0' }}>
              <div className="paper-section-title" style={{ fontSize: '15px', marginBottom: '12px' }}>
                <Users size={16} /> Beneficiary Demographic Profile ({demographics.total} Total Enrolled)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#5A5C74', fontWeight: 600 }}>GENDER DISTRIBUTION</span>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <span className="feature-pill" style={{ background: '#E8F0FE', color: '#1B72E8', padding: '4px 10px', fontSize: '12px' }}>
                      Male: <strong>{demographics.males}</strong> ({demographics.total ? Math.round((demographics.males / demographics.total) * 100) : 0}%)
                    </span>
                    <span className="feature-pill" style={{ background: '#FCE8E6', color: '#C5221F', padding: '4px 10px', fontSize: '12px' }}>
                      Female: <strong>{demographics.females}</strong> ({demographics.total ? Math.round((demographics.females / demographics.total) * 100) : 0}%)
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#5A5C74', fontWeight: 600 }}>TOP CLASSIFIED DISABILITIES</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {demographics.topDisabilities.map(([dtype, count]) => (
                      <span key={dtype} className="feature-pill">
                        {dtype}: <strong>{count}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Module Detailed Tables */}
          {modulesKeys.map((modKey) => {
            const modInfo = modulesData[modKey];
            const cfg = MODULE_DISPLAY_CONFIG[modKey];
            const records = modInfo?.records || [];
            const term = (tableSearch[modKey] || '').toLowerCase().trim();

            const filteredRecords = term
              ? records.filter((r) => JSON.stringify(r).toLowerCase().includes(term))
              : records;

            // Success Stories special visual presentation
            if (modKey === 'success_stories' && records.length > 0) {
              return (
                <div key={modKey} className="paper-section">
                  <div className="paper-section-header">
                    <div className="paper-section-title">
                      <Quote size={17} /> Beneficiary Success Stories
                    </div>
                    <span className="paper-section-count">{records.length} Stories Recorded</span>
                  </div>
                  <div className="stories-preview-grid">
                    {records.map((story, sIdx) => (
                      <div key={story.id || sIdx} className="story-card-preview">
                        <div className="story-title">{story.title || 'Success Milestone'}</div>
                        <div className="story-child">
                          Child: <strong>{story.child_name || story.child || 'Beneficiary'}</strong> • {story.date_recorded || 'Recent'}
                        </div>
                        <div className="story-desc">
                          {story.description || story.after_story || 'No narrative recorded.'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <div key={modKey} className="paper-section">
                <div className="paper-section-header">
                  <div className="paper-section-title">
                    {cfg?.icon ? React.createElement(cfg.icon, { size: 17 }) : <FileText size={17} />}
                    {cfg?.title || modKey.replace(/_/g, ' ').toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {records.length > 5 && (
                      <div className="no-print" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Search size={13} style={{ position: 'absolute', left: '8px', color: '#9294AB' }} />
                        <input
                          type="text"
                          placeholder="Filter records..."
                          value={tableSearch[modKey] || ''}
                          onChange={(e) => handleSearchChange(modKey, e.target.value)}
                          style={{
                            padding: '4px 8px 4px 26px',
                            borderRadius: '6px',
                            border: '1px solid #DCDFEA',
                            fontSize: '12px',
                            width: '150px'
                          }}
                        />
                      </div>
                    )}
                    <span className="paper-section-count">
                      {modInfo.total !== undefined ? modInfo.total : records.length} Records
                    </span>
                  </div>
                </div>

                {filteredRecords.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', background: '#FAFAFD', borderRadius: '8px', border: '1px dashed #DCDFEA', color: '#5A5C74', fontSize: '13px' }}>
                    {term ? 'No matching records for your filter search.' : 'No records found for this module in the specified period.'}
                  </div>
                ) : (
                  <div className="paper-table-wrapper">
                    <table className="paper-table">
                      <thead>
                        <tr>
                          {cfg ? (
                            cfg.headers.map((h) => <th key={h}>{h}</th>)
                          ) : (
                            Object.keys(records[0] || {}).slice(0, 6).map((k) => (
                              <th key={k}>{k.replace(/_/g, ' ').toUpperCase()}</th>
                            ))
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecords.slice(0, 100).map((record, rIdx) => (
                          <tr key={record.id || rIdx}>
                            {cfg ? (
                              cfg.renderRow(record)
                            ) : (
                              Object.keys(records[0] || {}).slice(0, 6).map((k) => (
                                <td key={k}>{String(record[k] ?? '-')}</td>
                              ))
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredRecords.length > 100 && (
                      <div style={{ padding: '8px 12px', fontSize: '11.5px', color: '#5A5C74', background: '#FAFAFD', borderTop: '1px solid #E4E6F0' }}>
                        Showing first 100 of {filteredRecords.length} records. Download Excel workbook for complete datasets.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Formal Sign-off & Verification Section */}
          <div className="paper-signatures-grid">
            <div className="signature-block">
              <div className="sign-title">PREPARED BY (STAFF / OFFICER)</div>
              <div className="sign-line"></div>
              <div className="sign-details">
                <div>Name: <strong>{report.prepared_by || 'Officer in Charge'}</strong></div>
                <div>Role: Project / Field Officer</div>
                <div>Date: {new Date().toLocaleDateString('en-GB')}</div>
              </div>
            </div>

            <div className="signature-block">
              <div className="sign-title">VERIFIED BY (M&E OFFICER)</div>
              <div className="sign-line"></div>
              <div className="sign-details">
                <div>Name: ____________________________</div>
                <div>Role: Monitoring & Evaluation Lead</div>
                <div>Date: _____ / _____ / 2026</div>
              </div>
            </div>

            <div className="signature-block">
              <div className="sign-title">APPROVED BY (EXECUTIVE DIRECTOR)</div>
              <div className="sign-line"></div>
              <div className="sign-details">
                <div>Name: ____________________________</div>
                <div>Role: Executive Leadership</div>
                <div>Date: _____ / _____ / 2026</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. RAW JSON / ADVANCED EDIT VIEW */}
      {viewMode === 'json' && (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E4E6F0', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Structured Dataset (JSON)</h3>
            <span style={{ fontSize: '12px', color: '#5A5C74' }}>
              {canEdit ? 'Editable for custom integrations' : 'View only'}
            </span>
          </div>
          <textarea
            value={reportContent}
            onChange={(e) => setReportContent && setReportContent(e.target.value)}
            readOnly={!canEdit}
            style={{
              width: '100%',
              minHeight: '360px',
              fontFamily: 'Consolas, monospace',
              fontSize: '13px',
              padding: '14px',
              border: '1px solid #E4E6F0',
              borderRadius: '8px',
              background: '#FAFAFD',
              color: '#1B1B2B'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ReportPreview;
