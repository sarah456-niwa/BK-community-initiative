import io
from datetime import datetime
from django.utils import timezone
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)
from reportlab.pdfgen import canvas
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter


# ==============================================================================
# MODULE COLUMN DEFINITIONS & ROW EXTRACTORS
# ==============================================================================
MODULE_SPECS = {
    'children': {
        'display_name': 'Registered Children & Beneficiaries',
        'headers': ['Child ID', 'Full Name', 'Gender', 'Age', 'Disability Type', 'Severity', 'District', 'Status'],
        'col_widths_pdf': [75, 95, 45, 35, 95, 60, 75, 60],
        'extractor': lambda r: [
            str(r.get('child_id') or 'N/A'),
            str(r.get('full_name') or ''),
            str(r.get('gender') or ''),
            str(r.get('age') or (r.get('date_of_birth') or 'N/A')),
            str(r.get('disability_type') or 'N/A'),
            str(r.get('severity') or 'N/A'),
            str(r.get('district') or 'N/A'),
            str(r.get('status') or 'ACTIVE'),
        ]
    },
    'outreach': {
        'display_name': 'Outreach Clinics',
        'headers': ['Date', 'Venue', 'Village / District', 'Attended', 'Staff Involved'],
        'col_widths_pdf': [65, 120, 115, 60, 180],
        'extractor': lambda r: [
            str(r.get('date') or 'N/A'),
            str(r.get('venue') or 'N/A'),
            f"{r.get('village', '')}, {r.get('district', '')}".strip(', ') or 'N/A',
            str(r.get('number_attended') or 0),
            str(r.get('staff_involved') or 'N/A')[:60],
        ]
    },
    'assessments': {
        'display_name': 'Clinical Assessments',
        'headers': ['Date', 'Child', 'Type', 'Findings', 'Recommendations'],
        'col_widths_pdf': [65, 100, 80, 150, 145],
        'extractor': lambda r: [
            str(r.get('date') or 'N/A'),
            str(r.get('child_name') or r.get('child') or 'N/A'),
            str(r.get('assessment_type') or 'N/A'),
            str(r.get('findings') or 'N/A')[:80],
            str(r.get('recommendations') or 'N/A')[:60],
        ]
    },
    'therapy': {
        'display_name': 'Therapy Sessions',
        'headers': ['Date', 'Child', 'Therapy Type', 'Hours', 'Outcome Summary'],
        'col_widths_pdf': [65, 110, 95, 50, 220],
        'extractor': lambda r: [
            str(r.get('date') or 'N/A'),
            str(r.get('child_name') or r.get('child') or 'N/A'),
            str(r.get('therapy_type') or 'N/A'),
            str(r.get('hours') or '0.0'),
            str(r.get('outcome') or r.get('notes') or 'N/A')[:80],
        ]
    },
    'devices': {
        'display_name': 'Assistive Devices Issued',
        'headers': ['Date Issued', 'Child', 'Device Type', 'Serial No', 'Condition'],
        'col_widths_pdf': [75, 125, 130, 110, 100],
        'extractor': lambda r: [
            str(r.get('date_issued') or 'N/A'),
            str(r.get('child_name') or r.get('child') or 'N/A'),
            str(r.get('device_type') or 'N/A'),
            str(r.get('serial_number') or 'N/A'),
            str(r.get('condition') or 'NEW'),
        ]
    },
    'sensory_devices': {
        'display_name': 'Sensory Devices Distributed',
        'headers': ['Date Distributed', 'Child', 'Device Name', 'Quantity', 'Notes'],
        'col_widths_pdf': [85, 130, 140, 55, 130],
        'extractor': lambda r: [
            str(r.get('date_distributed') or 'N/A'),
            str(r.get('child_name') or r.get('child') or 'N/A'),
            str(r.get('device_name') or 'N/A'),
            str(r.get('quantity') or 1),
            str(r.get('notes') or 'N/A')[:50],
        ]
    },
    'training': {
        'display_name': 'Caregiver Training Workshops',
        'headers': ['Date', 'Workshop Name', 'Trainer', 'Attendance', 'Topics Covered'],
        'col_widths_pdf': [65, 130, 100, 65, 180],
        'extractor': lambda r: [
            str(r.get('date') or 'N/A'),
            str(r.get('workshop_name') or 'N/A'),
            str(r.get('trainer') or 'N/A'),
            str(r.get('attendance') or 0),
            str(r.get('topics') or 'N/A')[:70],
        ]
    },
    'materials': {
        'display_name': 'Educational Materials Distributed',
        'headers': ['Date', 'Material Name', 'Qty', 'Recipient', 'Purpose'],
        'col_widths_pdf': [65, 140, 45, 130, 160],
        'extractor': lambda r: [
            str(r.get('date_distributed') or 'N/A'),
            str(r.get('material_name') or 'N/A'),
            str(r.get('quantity') or 1),
            str(r.get('recipient') or 'N/A'),
            str(r.get('purpose') or 'N/A')[:60],
        ]
    },
    'nutrition': {
        'display_name': 'Nutrition Assessments & Support',
        'headers': ['Assessment Date', 'Child', 'Nutritional Status', 'Weight / Height', 'Food Ration'],
        'col_widths_pdf': [80, 120, 110, 90, 140],
        'extractor': lambda r: [
            str(r.get('assessment_date') or 'N/A'),
            str(r.get('child_name') or r.get('child') or 'N/A'),
            str(r.get('nutrition_status') or 'N/A'),
            f"{r.get('weight') or '-'} kg / {r.get('height') or '-'} cm",
            str(r.get('food_ration') or r.get('supplement') or 'N/A')[:50],
        ]
    },
    'food_parcels': {
        'display_name': 'Food Parcel Distributions',
        'headers': ['Date', 'Beneficiary Family', 'Parcel Type', 'Qty', 'Items Included'],
        'col_widths_pdf': [65, 135, 110, 45, 185],
        'extractor': lambda r: [
            str(r.get('date_distributed') or 'N/A'),
            str(r.get('family_name') or 'N/A'),
            str(r.get('parcel_type') or 'N/A'),
            str(r.get('quantity') or 1),
            str(r.get('items_included') or 'N/A')[:60],
        ]
    },
    'community': {
        'display_name': 'Community Outreach Activities',
        'headers': ['Date', 'Activity Name', 'Location', 'Participants', 'Outcomes'],
        'col_widths_pdf': [65, 140, 115, 60, 160],
        'extractor': lambda r: [
            str(r.get('date') or 'N/A'),
            str(r.get('activity_name') or 'N/A'),
            str(r.get('location') or 'N/A'),
            str(r.get('participants') or 0),
            str(r.get('outcomes') or 'N/A')[:60],
        ]
    },
    'community_outreach': {
        'display_name': 'Community Outreach Activities',
        'headers': ['Date', 'Activity Name', 'Location', 'Participants', 'Outcomes'],
        'col_widths_pdf': [65, 140, 115, 60, 160],
        'extractor': lambda r: [
            str(r.get('date') or 'N/A'),
            str(r.get('activity_name') or 'N/A'),
            str(r.get('location') or 'N/A'),
            str(r.get('participants') or 0),
            str(r.get('outcomes') or 'N/A')[:60],
        ]
    },
    'meetings': {
        'display_name': 'Stakeholder & Review Meetings',
        'headers': ['Date', 'Meeting Type', 'Participants', 'Key Decisions & Actions'],
        'col_widths_pdf': [65, 110, 65, 300],
        'extractor': lambda r: [
            str(r.get('date') or 'N/A'),
            str(r.get('meeting_type') or 'N/A'),
            str(r.get('participants') or 0),
            str(r.get('decisions') or r.get('action_items') or r.get('minutes') or 'N/A')[:100],
        ]
    },
    'challenges': {
        'display_name': 'Operational Challenges & Mitigation',
        'headers': ['Date', 'Module', 'Challenge Description', 'Action Taken', 'Status'],
        'col_widths_pdf': [60, 80, 160, 160, 80],
        'extractor': lambda r: [
            str(r.get('date') or 'N/A'),
            str(r.get('related_module') or 'General'),
            str(r.get('challenge_description') or 'N/A')[:80],
            str(r.get('action_taken') or 'Pending')[:80],
            'RESOLVED' if r.get('resolved') else 'OPEN',
        ]
    },
    'success_stories': {
        'display_name': 'Beneficiary Success Stories',
        'headers': ['Date Recorded', 'Child', 'Story Title', 'Impact Summary'],
        'col_widths_pdf': [75, 110, 140, 215],
        'extractor': lambda r: [
            str(r.get('date_recorded') or 'N/A'),
            str(r.get('child_name') or r.get('child') or 'N/A'),
            str(r.get('title') or 'N/A'),
            str(r.get('description') or r.get('after_story') or 'N/A')[:120],
        ]
    },
    'safeguarding': {
        'display_name': 'Safeguarding Incidents',
        'headers': ['Date', 'Child', 'Incident Type', 'Action Taken', 'Status'],
        'col_widths_pdf': [65, 110, 110, 175, 80],
        'extractor': lambda r: [
            str(r.get('date_of_incident') or 'N/A'),
            str(r.get('child_name') or r.get('child') or 'N/A'),
            str(r.get('incident_type') or 'N/A'),
            str(r.get('action_taken') or 'Under review')[:70],
            str(r.get('status') or 'LOGGED'),
        ]
    },
    'feedback': {
        'display_name': 'Beneficiary & Community Feedback',
        'headers': ['Date Received', 'Provider Name', 'Feedback Type', 'Comments'],
        'col_widths_pdf': [75, 110, 100, 255],
        'extractor': lambda r: [
            str(r.get('date_received') or 'N/A'),
            str(r.get('provider_name') or 'Anonymous'),
            str(r.get('feedback_type') or 'General'),
            str(r.get('comments') or 'N/A')[:100],
        ]
    },
}


def get_module_spec(module_name, sample_record=None):
    """Retrieve column specifications for a module, with dynamic fallback."""
    if module_name in MODULE_SPECS:
        return MODULE_SPECS[module_name]

    # Dynamic fallback for unspecified modules
    headers = []
    if sample_record and isinstance(sample_record, dict):
        # Exclude internal UUID and timestamp keys
        excluded = {'id', 'created_at', 'updated_at', 'created_by', 'updated_by'}
        headers = [k for k in sample_record.keys() if k not in excluded][:6]

    if not headers:
        headers = ['ID', 'Date', 'Description', 'Notes']

    clean_headers = [h.replace('_', ' ').title() for h in headers]
    col_width = int(540 / max(len(clean_headers), 1))
    col_widths = [col_width] * len(clean_headers)

    return {
        'display_name': module_name.replace('_', ' ').title(),
        'headers': clean_headers,
        'col_widths_pdf': col_widths,
        'extractor': lambda r: [str(r.get(h.lower().replace(' ', '_'), ''))[:50] for h in headers]
    }


# ==============================================================================
# REPORTLAB NUMBERED CANVAS (2-PASS HEADER & FOOTER)
# ==============================================================================
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_decorations(self, page_count):
        self.saveState()
        # Running top header for pages > 1
        if self._pageNumber > 1:
            self.setFont("Helvetica", 8)
            self.setFillColorHex("#5A5C74")
            self.drawString(36, 756, "BK Community Initiative • Monitoring, Evaluation & Learning (MEL) Report")
            self.setStrokeColorHex("#D7D9E4")
            self.setLineWidth(0.6)
            self.line(36, 750, 576, 750)

        # Running bottom footer on every page
        self.setStrokeColorHex("#D7D9E4")
        self.setLineWidth(0.6)
        self.line(36, 42, 576, 42)

        self.setFont("Helvetica", 8)
        self.setFillColorHex("#5A5C74")
        self.drawString(36, 30, "BK Community Initiative • Confidential • Disability & Child Support Program, Uganda")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(576, 30, page_str)
        self.restoreState()


# ==============================================================================
# 1. PROFESSIONAL PDF GENERATOR
# ==============================================================================
def generate_pdf_report(report_data):
    """
    Generate an executive-grade PDF report using ReportLab with custom NumberedCanvas,
    KPI summary blocks, branded typography, and auto-wrapped table cells.
    """
    buffer = io.BytesIO()
    # Usable width: 612 - 72 = 540 pt
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=46,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    # Brand Colors
    NAVY = colors.HexColor('#2E2C6E')
    LIGHT_NAVY = colors.HexColor('#EEF0F8')
    SLATE = colors.HexColor('#5A5C74')
    DARK_TEXT = colors.HexColor('#1B1B2B')
    BORDER_COLOR = colors.HexColor('#E4E6F0')
    ZEBRA_COLOR = colors.HexColor('#F8F9FD')
    ACCENT_GREEN = colors.HexColor('#2E7D32')

    # Custom Typography Styles
    styles.add(ParagraphStyle('DocOrg', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=15, leading=17, textColor=NAVY))
    styles.add(ParagraphStyle('DocTagline', parent=styles['Normal'], fontName='Helvetica', fontSize=8, leading=10, textColor=SLATE))
    styles.add(ParagraphStyle('DocTitle', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=18, leading=22, textColor=DARK_TEXT, spaceAfter=4))
    styles.add(ParagraphStyle('DocSubtitle', parent=styles['Normal'], fontName='Helvetica', fontSize=10, leading=13, textColor=SLATE, spaceAfter=8))
    styles.add(ParagraphStyle('MetaKey', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=NAVY))
    styles.add(ParagraphStyle('MetaVal', parent=styles['Normal'], fontName='Helvetica', fontSize=8.5, leading=11, textColor=DARK_TEXT))
    styles.add(ParagraphStyle('SectionHead', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=12, leading=15, textColor=NAVY, spaceBefore=8, spaceAfter=5))
    styles.add(ParagraphStyle('TableHead', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8, leading=9.5, textColor=colors.white))
    styles.add(ParagraphStyle('TableCell', parent=styles['Normal'], fontName='Helvetica', fontSize=7.5, leading=9, textColor=DARK_TEXT))
    styles.add(ParagraphStyle('TableCellBold', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=7.5, leading=9, textColor=DARK_TEXT))
    styles.add(ParagraphStyle('KPILabel', parent=styles['Normal'], fontName='Helvetica', fontSize=7.5, leading=9, textColor=SLATE, alignment=1))
    styles.add(ParagraphStyle('KPIVal', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=13, leading=15, textColor=NAVY, alignment=1))
    styles.add(ParagraphStyle('NotesText', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=8.5, leading=11, textColor=DARK_TEXT))

    story = []

    # 1. Header / Letterhead Banner
    org_cell = [
        Paragraph("BK COMMUNITY INITIATIVE", styles['DocOrg']),
        Paragraph("Child & Disability Community Support Program • Uganda", styles['DocTagline']),
    ]
    ref_cell = [
        Paragraph(f"<b>DOCUMENT REF:</b> BK-REP-{datetime.now().strftime('%Y%m%d')}", styles['MetaKey']),
        Paragraph(f"<b>GENERATED:</b> {timezone.now().strftime('%d %b %Y, %H:%M')}", styles['MetaVal']),
    ]
    header_table = Table([[org_cell, ref_cell]], colWidths=[340, 200])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=NAVY, spaceBefore=4, spaceAfter=10))

    # 2. Document Title & Subtitle
    title_text = report_data.get('title') or "Monitoring & Evaluation Report"
    subtitle_text = report_data.get('subtitle') or f"Comprehensive program data summary • {report_data.get('report_type', 'Operational').title()} Template"
    story.append(Paragraph(title_text, styles['DocTitle']))
    story.append(Paragraph(subtitle_text, styles['DocSubtitle']))

    # 3. Metadata Table
    start_date = report_data.get('start_date') or 'Project Inception'
    end_date = report_data.get('end_date') or 'Present'
    period_str = f"{start_date} to {end_date}"
    prepared_by = report_data.get('prepared_by') or "BK Program & M&E Team"

    meta_data = [
        [
            Paragraph("<b>Reporting Period:</b>", styles['MetaKey']),
            Paragraph(period_str, styles['MetaVal']),
            Paragraph("<b>Prepared By:</b>", styles['MetaKey']),
            Paragraph(prepared_by, styles['MetaVal']),
        ],
        [
            Paragraph("<b>Report Type:</b>", styles['MetaKey']),
            Paragraph(report_data.get('report_type', 'Standard').title(), styles['MetaVal']),
            Paragraph("<b>Classification:</b>", styles['MetaKey']),
            Paragraph("Official Program Record", styles['MetaVal']),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[90, 180, 85, 185])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_NAVY),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#DCDFEA')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # 4. Custom Executive Notes / Narrative (if provided)
    custom_notes = report_data.get('notes')
    if custom_notes:
        story.append(Paragraph("Executive Summary & Strategic Remarks", styles['SectionHead']))
        notes_table = Table([[Paragraph(custom_notes.replace('\n', '<br/>'), styles['NotesText'])]], colWidths=[540])
        notes_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), ZEBRA_COLOR),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('LINELEFT', (0, 0), (0, -1), 3.0, NAVY),
            ('TOPPADDING', (0, 0), (-1, -1), 7),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(notes_table)
        story.append(Spacer(1, 10))

    # 5. Program KPIs Summary Grid
    modules_data = report_data.get('data', {})
    if modules_data:
        story.append(Paragraph("Program Metric Highlights", styles['SectionHead']))
        kpi_cells = []
        for mod_name, mod_info in modules_data.items():
            spec = get_module_spec(mod_name)
            kpi_cells.append([
                Paragraph(spec['display_name'], styles['KPILabel']),
                Paragraph(str(mod_info.get('total', 0)), styles['KPIVal']),
            ])

        # Arrange in rows of 4 cards
        kpi_rows = []
        for i in range(0, len(kpi_cells), 4):
            chunk = kpi_cells[i:i + 4]
            # Flatten into a 2-row block: labels on top, values below
            labels = [c[0] for c in chunk]
            vals = [c[1] for c in chunk]
            while len(labels) < 4:
                labels.append(Paragraph("", styles['KPILabel']))
                vals.append(Paragraph("", styles['KPIVal']))
            kpi_rows.append(labels)
            kpi_rows.append(vals)

        kpi_table = Table(kpi_rows, colWidths=[135, 135, 135, 135])
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), ZEBRA_COLOR),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        story.append(kpi_table)
        story.append(Spacer(1, 12))

    # 6. Detailed Module Activity Tables
    section_num = 1
    for mod_name, mod_info in modules_data.items():
        records = mod_info.get('records', [])
        sample_rec = records[0] if records else None
        spec = get_module_spec(mod_name, sample_rec)

        header_text = f"{section_num}. {spec['display_name']} (Total: {mod_info.get('total', len(records))})"
        story.append(Paragraph(header_text, styles['SectionHead']))
        section_num += 1

        if not records:
            empty_para = Paragraph("<i>No activity records found matching the specified date criteria.</i>", styles['TableCell'])
            story.append(empty_para)
            story.append(Spacer(1, 8))
            continue

        # Build table rows
        table_rows = []
        # Header row
        table_rows.append([Paragraph(h, styles['TableHead']) for h in spec['headers']])

        # Limit to top 50 in PDF to maintain reasonable document size
        display_records = records[:50]
        for rec in display_records:
            row_vals = spec['extractor'](rec)
            table_rows.append([Paragraph(str(v), styles['TableCell']) for v in row_vals])

        mod_table = Table(table_rows, colWidths=spec['col_widths_pdf'], repeatRows=1)
        mod_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), NAVY),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, ZEBRA_COLOR]),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E9EBF2')),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(mod_table)

        if len(records) > 50:
            story.append(Paragraph(f"<i>Note: Showing 50 of {len(records)} records. Full dataset available in Excel export.</i>", styles['DocTagline']))

        story.append(Spacer(1, 10))

    # 7. Formal Sign-off & Verification Section
    sign_data = [
        [
            Paragraph("<b>Prepared By:</b>", styles['MetaKey']),
            Paragraph("<b>Verified By (M&E Officer):</b>", styles['MetaKey']),
            Paragraph("<b>Approved By (Executive Director):</b>", styles['MetaKey']),
        ],
        [
            Paragraph(f"Signature: ___________________<br/>Name: {prepared_by}<br/>Date: {datetime.now().strftime('%d/%m/%Y')}", styles['MetaVal']),
            Paragraph("Signature: ___________________<br/>Name: ______________________<br/>Date: ____/____/________", styles['MetaVal']),
            Paragraph("Signature: ___________________<br/>Name: ______________________<br/>Date: ____/____/________", styles['MetaVal']),
        ]
    ]
    sign_table = Table(sign_data, colWidths=[180, 180, 180])
    sign_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_NAVY),
        ('BACKGROUND', (0, 1), (-1, 1), colors.white),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(KeepTogether([
        Paragraph("Verification & Administrative Approval", styles['SectionHead']),
        sign_table,
    ]))

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer.getvalue()


# ==============================================================================
# 2. PROFESSIONAL WORD (.DOCX) GENERATOR
# ==============================================================================
def set_cell_background(cell, hex_color):
    """Set the background color of a table cell in python-docx."""
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)


def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Set internal cell margins (padding) in dxas (1/20 of a pt)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)


def generate_word_report(report_data):
    """
    Generate an executive Word (.docx) document formatted with BK Initiative
    branding, styled metadata tables, executive summary cards, and clean module tables.
    """
    doc = Document()

    # Set page margins (0.75 in / 54 pt)
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)

    NAVY_HEX = '2E2C6E'
    LIGHT_NAVY_HEX = 'EEF0F8'
    ZEBRA_HEX = 'F8F9FD'
    NAVY_RGB = RGBColor(0x2E, 0x2C, 0x6E)
    SLATE_RGB = RGBColor(0x5A, 0x5C, 0x74)
    DARK_RGB = RGBColor(0x1B, 0x1B, 0x2B)

    # 1. Header Banner
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(0)
    title_p.paragraph_format.space_after = Pt(2)
    run_org = title_p.add_run("BK COMMUNITY INITIATIVE\n")
    run_org.bold = True
    run_org.font.size = Pt(16)
    run_org.font.color.rgb = NAVY_RGB

    run_tag = title_p.add_run("Child & Disability Community Support Program • Uganda • Official M&E Report")
    run_tag.font.size = Pt(9)
    run_tag.font.color.rgb = SLATE_RGB

    # Document Title
    doc_title = report_data.get('title') or "Monitoring & Evaluation Report"
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(8)
    p_title.paragraph_format.space_after = Pt(2)
    r_t = p_title.add_run(doc_title)
    r_t.bold = True
    r_t.font.size = Pt(18)
    r_t.font.color.rgb = DARK_RGB

    subtitle_text = report_data.get('subtitle') or f"Program Activity Summary • {report_data.get('report_type', 'Standard').title()} Template"
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(10)
    r_sub = p_sub.add_run(subtitle_text)
    r_sub.font.size = Pt(10.5)
    r_sub.font.color.rgb = SLATE_RGB

    # 2. Metadata Table (2x4)
    start_date = report_data.get('start_date') or 'Project Inception'
    end_date = report_data.get('end_date') or 'Present'
    prepared_by = report_data.get('prepared_by') or "BK Program & M&E Team"

    meta_table = doc.add_table(rows=2, cols=4)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_rows = [
        [("Reporting Period:", True), (f"{start_date} to {end_date}", False), ("Prepared By:", True), (prepared_by, False)],
        [("Report Type:", True), (report_data.get('report_type', 'Standard').title(), False), ("Generated On:", True), (datetime.now().strftime('%d %b %Y'), False)],
    ]

    for row_idx, row_data in enumerate(meta_rows):
        for col_idx, (text, is_bold) in enumerate(row_data):
            cell = meta_table.cell(row_idx, col_idx)
            set_cell_background(cell, LIGHT_NAVY_HEX)
            set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            run = p.add_run(text)
            run.font.size = Pt(9)
            run.bold = is_bold
            run.font.color.rgb = NAVY_RGB if is_bold else DARK_RGB

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 3. Custom Executive Notes (if present)
    custom_notes = report_data.get('notes')
    if custom_notes:
        h_notes = doc.add_heading(level=2)
        r_hn = h_notes.add_run("Executive Summary & Strategic Remarks")
        r_hn.font.color.rgb = NAVY_RGB

        p_note = doc.add_paragraph()
        p_note.paragraph_format.left_indent = Inches(0.25)
        r_nt = p_note.add_run(custom_notes)
        r_nt.italic = True
        r_nt.font.size = Pt(9.5)
        doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # 4. KPI Highlights Table
    modules_data = report_data.get('data', {})
    if modules_data:
        h_kpi = doc.add_heading(level=2)
        r_hk = h_kpi.add_run("Program Metric Highlights")
        r_hk.font.color.rgb = NAVY_RGB

        kpi_table = doc.add_table(rows=1, cols=3)
        kpi_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        hdr_cells = kpi_table.rows[0].cells
        for idx, title in enumerate(["Module Component", "Total Records Recorded", "Focus Area"]):
            hdr_cells[idx].text = title
            set_cell_background(hdr_cells[idx], NAVY_HEX)
            set_cell_margins(hdr_cells[idx], top=100, bottom=100, left=120, right=120)
            hdr_p = hdr_cells[idx].paragraphs[0]
            hdr_p.runs[0].font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            hdr_p.runs[0].font.bold = True
            hdr_p.runs[0].font.size = Pt(9.5)

        for mod_name, mod_info in modules_data.items():
            spec = get_module_spec(mod_name)
            row_cells = kpi_table.add_row().cells
            row_cells[0].text = spec['display_name']
            row_cells[1].text = str(mod_info.get('total', 0))
            row_cells[2].text = "Community Beneficiary Support"
            for c_idx, c in enumerate(row_cells):
                set_cell_margins(c, top=80, bottom=80, left=100, right=100)
                p = c.paragraphs[0]
                if p.runs:
                    p.runs[0].font.size = Pt(9)
                    if c_idx == 1:
                        p.runs[0].font.bold = True
                        p.runs[0].font.color.rgb = NAVY_RGB

        doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # 5. Module Tables
    for mod_name, mod_info in modules_data.items():
        records = mod_info.get('records', [])
        sample_rec = records[0] if records else None
        spec = get_module_spec(mod_name, sample_rec)

        h_mod = doc.add_heading(level=2)
        r_hm = h_mod.add_run(f"{spec['display_name']} (Total: {mod_info.get('total', len(records))})")
        r_hm.font.color.rgb = NAVY_RGB

        if not records:
            p_empty = doc.add_paragraph()
            r_em = p_empty.add_run("No records found for the specified period.")
            r_em.italic = True
            continue

        table = doc.add_table(rows=1, cols=len(spec['headers']))
        table.alignment = WD_TABLE_ALIGNMENT.CENTER

        # Headers
        for idx, h_text in enumerate(spec['headers']):
            c = table.rows[0].cells[idx]
            c.text = h_text
            set_cell_background(c, NAVY_HEX)
            set_cell_margins(c, top=90, bottom=90, left=100, right=100)
            p = c.paragraphs[0]
            if p.runs:
                p.runs[0].font.bold = True
                p.runs[0].font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
                p.runs[0].font.size = Pt(8.5)

        # Rows
        for r_idx, rec in enumerate(records[:100]):
            row_cells = table.add_row().cells
            row_vals = spec['extractor'](rec)
            bg_color = ZEBRA_HEX if r_idx % 2 == 1 else 'FFFFFF'
            for idx, val in enumerate(row_vals):
                row_cells[idx].text = str(val)
                set_cell_background(row_cells[idx], bg_color)
                set_cell_margins(row_cells[idx], top=70, bottom=70, left=80, right=80)
                p = row_cells[idx].paragraphs[0]
                if p.runs:
                    p.runs[0].font.size = Pt(8)

        doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # 6. Sign-off Section
    h_sign = doc.add_heading(level=2)
    r_hs = h_sign.add_run("Verification & Official Approvals")
    r_hs.font.color.rgb = NAVY_RGB

    sign_table = doc.add_table(rows=2, cols=3)
    sign_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    sign_headers = ["Prepared By (Staff)", "Verified By (M&E Officer)", "Approved By (Director)"]
    for idx, sh in enumerate(sign_headers):
        c = sign_table.rows[0].cells[idx]
        c.text = sh
        set_cell_background(c, LIGHT_NAVY_HEX)
        set_cell_margins(c, top=80, bottom=80, left=100, right=100)
        p = c.paragraphs[0]
        if p.runs:
            p.runs[0].font.bold = True
            p.runs[0].font.color.rgb = NAVY_RGB
            p.runs[0].font.size = Pt(9)

    sign_bodies = [
        f"Name: {prepared_by}\nSignature: _________________\nDate: {datetime.now().strftime('%d/%m/%Y')}",
        "Name: _____________________\nSignature: _________________\nDate: ____/____/________",
        "Name: _____________________\nSignature: _________________\nDate: ____/____/________",
    ]
    for idx, sb in enumerate(sign_bodies):
        c = sign_table.rows[1].cells[idx]
        c.text = sb
        set_cell_margins(c, top=80, bottom=80, left=100, right=100)
        p = c.paragraphs[0]
        if p.runs:
            p.runs[0].font.size = Pt(8.5)

    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()


# ==============================================================================
# 3. PROFESSIONAL EXCEL (.XLSX) MULTI-SHEET GENERATOR
# ==============================================================================
def generate_excel_report(report_data):
    """
    Generate an executive multi-sheet Excel workbook using openpyxl with
    an Executive Summary tab and dedicated formatted tabs for each module.
    """
    wb = Workbook()
    # Sheet 1: Executive Summary
    ws_summary = wb.active
    ws_summary.title = "Executive Summary"
    ws_summary.views.sheetView[0].showGridLines = True

    # Styling constants
    NAVY_FILL = PatternFill(start_color="2E2C6E", end_color="2E2C6E", fill_type="solid")
    LIGHT_NAVY_FILL = PatternFill(start_color="EEF0F8", end_color="EEF0F8", fill_type="solid")
    ZEBRA_FILL = PatternFill(start_color="F8F9FD", end_color="F8F9FD", fill_type="solid")
    WHITE_FILL = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")

    FONT_ORG = Font(name="Segoe UI", size=15, bold=True, color="FFFFFF")
    FONT_TITLE = Font(name="Segoe UI", size=14, bold=True, color="2E2C6E")
    FONT_SUBTITLE = Font(name="Segoe UI", size=10, italic=True, color="5A5C74")
    FONT_HEADER = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
    FONT_BOLD = Font(name="Segoe UI", size=10, bold=True, color="1B1B2B")
    FONT_REG = Font(name="Segoe UI", size=9.5, color="1B1B2B")

    THIN_SIDE = Side(border_style="thin", color="E4E6F0")
    BORDER_ALL = Border(top=THIN_SIDE, bottom=THIN_SIDE, left=THIN_SIDE, right=THIN_SIDE)

    # 1. Title Banner
    ws_summary.merge_cells("A1:E1")
    cell_a1 = ws_summary["A1"]
    cell_a1.value = "BK COMMUNITY INITIATIVE — PROGRAM MONITORING REPORT"
    cell_a1.font = FONT_ORG
    cell_a1.fill = NAVY_FILL
    cell_a1.alignment = Alignment(horizontal="center", vertical="center")
    ws_summary.row_dimensions[1].height = 36

    # Subtitle
    ws_summary["A3"].value = report_data.get('title') or "Monitoring & Evaluation Report"
    ws_summary["A3"].font = FONT_TITLE
    ws_summary["A4"].value = report_data.get('subtitle') or "Child & Disability Community Support Program • Uganda"
    ws_summary["A4"].font = FONT_SUBTITLE

    # Metadata
    start_date = report_data.get('start_date') or 'Project Inception'
    end_date = report_data.get('end_date') or 'Present'
    prepared_by = report_data.get('prepared_by') or "BK Program & M&E Team"

    meta_items = [
        ("Reporting Period", f"{start_date} to {end_date}"),
        ("Report Template", report_data.get('report_type', 'Standard').title()),
        ("Prepared By", prepared_by),
        ("Generated At", timezone.now().strftime('%d %b %Y, %H:%M')),
    ]

    for idx, (label, val) in enumerate(meta_items, start=6):
        ws_summary[f"A{idx}"].value = label
        ws_summary[f"A{idx}"].font = FONT_BOLD
        ws_summary[f"A{idx}"].fill = LIGHT_NAVY_FILL
        ws_summary[f"A{idx}"].border = BORDER_ALL

        ws_summary[f"B{idx}"].value = val
        ws_summary[f"B{idx}"].font = FONT_REG
        ws_summary[f"B{idx}"].border = BORDER_ALL

    # KPI Summary Table
    ws_summary["A11"].value = "PROGRAM MODULE TOTALS"
    ws_summary["A11"].font = FONT_TITLE

    kpi_headers = ["Module Component", "Total Records", "Status", "Notes"]
    for c_idx, h_text in enumerate(kpi_headers, start=1):
        cell = ws_summary.cell(row=12, column=c_idx, value=h_text)
        cell.font = FONT_HEADER
        cell.fill = NAVY_FILL
        cell.alignment = Alignment(horizontal="center" if c_idx == 2 else "left", vertical="center")
        cell.border = BORDER_ALL

    current_row = 13
    modules_data = report_data.get('data', {})
    total_records_sum = 0
    for mod_name, mod_info in modules_data.items():
        spec = get_module_spec(mod_name)
        total_val = mod_info.get('total', 0)
        total_records_sum += total_val

        ws_summary.cell(row=current_row, column=1, value=spec['display_name']).font = FONT_REG
        cell_tot = ws_summary.cell(row=current_row, column=2, value=total_val)
        cell_tot.font = FONT_BOLD
        cell_tot.alignment = Alignment(horizontal="center")
        ws_summary.cell(row=current_row, column=3, value="Active / Recorded").font = FONT_REG
        ws_summary.cell(row=current_row, column=4, value="Standard Monitoring Component").font = FONT_REG

        for c in range(1, 5):
            ws_summary.cell(row=current_row, column=c).border = BORDER_ALL
            ws_summary.cell(row=current_row, column=c).fill = ZEBRA_FILL if current_row % 2 == 1 else WHITE_FILL
        current_row += 1

    # Total Sum Row
    ws_summary.cell(row=current_row, column=1, value="TOTAL PROGRAM RECORDS").font = FONT_BOLD
    cell_tot_sum = ws_summary.cell(row=current_row, column=2, value=total_records_sum)
    cell_tot_sum.font = FONT_BOLD
    cell_tot_sum.alignment = Alignment(horizontal="center")
    for c in range(1, 5):
        ws_summary.cell(row=current_row, column=c).border = BORDER_ALL
        ws_summary.cell(row=current_row, column=c).fill = LIGHT_NAVY_FILL

    # Notes if present
    custom_notes = report_data.get('notes')
    if custom_notes:
        current_row += 2
        ws_summary.cell(row=current_row, column=1, value="Executive Narrative Notes:").font = FONT_BOLD
        current_row += 1
        ws_summary.merge_cells(start_row=current_row, start_column=1, end_row=current_row + 2, end_column=5)
        note_cell = ws_summary.cell(row=current_row, column=1, value=custom_notes)
        note_cell.font = FONT_REG
        note_cell.alignment = Alignment(wrap_text=True, vertical="top")

    # Column dimensions for Summary
    for col in ws_summary.columns:
        col_letter = get_column_letter(col[0].column)
        max_len = max(len(str(c.value or '')) for c in col)
        ws_summary.column_dimensions[col_letter].width = max(max_len + 3, 14)

    # Dedicated Sheet per Module
    for mod_name, mod_info in modules_data.items():
        records = mod_info.get('records', [])
        sample_rec = records[0] if records else None
        spec = get_module_spec(mod_name, sample_rec)

        # Tab name max 31 chars
        tab_name = spec['display_name'][:30].replace('/', '-')
        ws = wb.create_sheet(title=tab_name)
        ws.views.sheetView[0].showGridLines = True

        # Header Title
        ws.merge_cells("A1:E1")
        banner = ws["A1"]
        banner.value = f"{spec['display_name'].upper()} — TOTAL: {mod_info.get('total', len(records))}"
        banner.font = Font(name="Segoe UI", size=12, bold=True, color="FFFFFF")
        banner.fill = NAVY_FILL
        banner.alignment = Alignment(horizontal="left", vertical="center")
        ws.row_dimensions[1].height = 28

        # Column Headers at Row 3
        headers = spec['headers']
        for col_idx, h_text in enumerate(headers, start=1):
            cell = ws.cell(row=3, column=col_idx, value=h_text)
            cell.font = FONT_HEADER
            cell.fill = NAVY_FILL
            cell.border = BORDER_ALL
            cell.alignment = Alignment(horizontal="center", vertical="center")
        ws.row_dimensions[3].height = 24

        # Data Rows
        for r_idx, rec in enumerate(records, start=4):
            row_vals = spec['extractor'](rec)
            is_odd = (r_idx % 2 == 1)
            for c_idx, val in enumerate(row_vals, start=1):
                cell = ws.cell(row=r_idx, column=c_idx, value=val)
                cell.font = FONT_REG
                cell.border = BORDER_ALL
                cell.fill = ZEBRA_FILL if is_odd else WHITE_FILL
                # Center-align dates or small numbers
                if len(str(val)) <= 10 and ('-' in str(val) or str(val).isdigit()):
                    cell.alignment = Alignment(horizontal="center")

        # Freeze Panes at row 4
        ws.freeze_panes = "A4"

        # Auto-fit column widths
        for col in ws.columns:
            col_letter = get_column_letter(col[0].column)
            max_len = 0
            for cell in col:
                # ignore merged banner
                if cell.row == 1:
                    continue
                max_len = max(max_len, len(str(cell.value or '')))
            ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()

