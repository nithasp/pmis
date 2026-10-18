import ExcelJS from 'exceljs';
import path from 'path';
import PDFDocument from 'pdfkit';

export const FONT_REGULAR = path.resolve(process.cwd(), 'assets', 'fonts', 'Anuphan-Regular.ttf');
export const FONT_BOLD = path.resolve(process.cwd(), 'assets', 'fonts', 'Anuphan-Bold.ttf');

export const VESSEL_IMPORT_COLUMNS = [
  { header: 'Vessel Name', key: 'vesselName', width: 28 },
  { header: 'IMO Number', key: 'imoNumber', width: 14 },
  { header: 'Official Number', key: 'officialNumber', width: 16 },
  { header: 'Berth (name_alt)', key: 'berth', width: 16 },
  { header: 'Jetty', key: 'jetty', width: 12 },
  { header: 'GRT', key: 'grossTonnage', width: 14 },
  { header: 'Mooring Date (YYYY-MM-DD HH:mm)', key: 'mooringDate', width: 28 },
  { header: 'Unmooring Date (YYYY-MM-DD HH:mm)', key: 'unmooringDate', width: 30 },
  { header: 'Note', key: 'note', width: 30 },
];

export function pdfToBuffer(build: (doc: PDFKit.PDFDocument) => void, options: PDFKit.PDFDocumentOptions = {}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, ...options });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.registerFont('thai', FONT_REGULAR);
    doc.registerFont('thai-bold', FONT_BOLD);
    build(doc);
    doc.end();
  });
}

const cache = new Map<string, Buffer>();

export const templateService = {
  async agentManual(): Promise<Buffer> {
    const cached = cache.get('agent');
    if (cached) return cached;
    const buffer = await pdfToBuffer((doc) => {
      doc.font('thai-bold').fontSize(20).text('คู่มือการลงทะเบียนตัวแทนเรือ (Agent Registration Manual)', { align: 'center' });
      doc.moveDown();
      doc.font('thai').fontSize(13);
      const steps = [
        '1. กรอกอีเมลในหน้า "ลงทะเบียน" และยืนยันลิงก์ที่ส่งไปยังอีเมล',
        '2. กรอกข้อมูลบริษัท/บุคคล ที่อยู่ และเลขประจำตัวผู้เสียภาษี 13 หลัก',
        '3. แนบเอกสาร: หนังสือรับรองนิติบุคคล, หนังสือมอบอำนาจ และสำเนาบัตรประชาชนผู้รับมอบอำนาจ (PDF ไม่เกิน 10 MB)',
        '4. ยอมรับข้อกำหนดและเงื่อนไข แล้วกดยืนยันการลงทะเบียน',
        '5. เจ้าหน้าที่จะตรวจสอบและอนุมัติบัญชี จากนั้นสามารถเข้าสู่ระบบเพื่อเพิ่มข้อมูลเรือและยื่นใบคำร้องได้',
      ];
      for (const s of steps) doc.text(s, { paragraphGap: 6 });
      doc.moveDown();
      doc.fontSize(11).fillColor('#555').text('สำนักงานท่าเรืออุตสาหกรรมมาบตาพุด — โทร 0-3868-3305-8 ในวันและเวลาราชการ');
    });
    cache.set('agent', buffer);
    return buffer;
  },

  async vesselTemplate(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Vessel');
    ws.columns = [
      { header: 'Vessel Name', key: 'name', width: 28 },
      { header: 'Call Sign', key: 'callSign', width: 12 },
      { header: 'IMO Number', key: 'imoNumber', width: 14 },
      { header: 'MMSI Number', key: 'mmsiNumber', width: 14 },
      { header: 'Official Number', key: 'officialNumber', width: 16 },
      { header: 'Owner', key: 'owner', width: 28 },
      { header: 'Flag', key: 'flag', width: 14 },
      { header: 'Vessel Type', key: 'type', width: 18 },
      { header: 'GRT', key: 'grossTonnage', width: 12 },
      { header: 'NRT', key: 'netTonnage', width: 12 },
      { header: 'DWT', key: 'loadWeight', width: 12 },
      { header: 'LOA', key: 'lengthOverall', width: 10 },
      { header: 'Beam', key: 'breadthExtreme', width: 10 },
      { header: 'Draft', key: 'depth', width: 10 },
      { header: 'Main Engine', key: 'mainEngine', width: 18 },
      { header: 'Brand And Model', key: 'bandAndModel', width: 18 },
    ];
    ws.addRow({ name: 'NP BANGPAKONG', callSign: 'HSB2', imoNumber: '9020455', mmsiNumber: '5670001110', officialNumber: '570001110', owner: 'NP MARINE CO., LTD.', flag: 'Thailand', type: 'BULK CARRIER', grossTonnage: 3501, netTonnage: 1900, loadWeight: 5200, lengthOverall: 98.5, breadthExtreme: 16.2, depth: 6.1, mainEngine: 'MAN B&W 6S35MC', bandAndModel: 'MAN B&W' });
    ws.getRow(1).font = { bold: true };
    return Buffer.from(await wb.xlsx.writeBuffer());
  },

  async vesselImportTemplate(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('VesselImport');
    ws.columns = VESSEL_IMPORT_COLUMNS;
    ws.addRow({ vesselName: 'NP BANGPAKONG', imoNumber: '9020455', officialNumber: '570001110', berth: 'MIT', jetty: 'MIT-1', grossTonnage: 3501, mooringDate: '2026-10-01 08:30', unmooringDate: '2026-10-02 17:00', note: '' });
    ws.getRow(1).font = { bold: true };
    return Buffer.from(await wb.xlsx.writeBuffer());
  },
};
