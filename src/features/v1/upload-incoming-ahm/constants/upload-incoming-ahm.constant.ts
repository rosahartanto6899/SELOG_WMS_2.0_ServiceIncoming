/**
 * Constants for Upload Incoming AHM feature.
 * Header labels follow the legacy Excel template (ExcelHeaderLabelConstants,
 * WMS CoreApp) so existing AHM files remain compatible.
 */

export interface AhmColumn {
  header: string;
  key: string;
  width: number;
  optional?: boolean;
}

export const uploadIncomingAhmConstant = {
  // === Excel workbook conventions (pola ServiceVehicle) ===
  excelSheetMain: 'Formulir input',
  excelSheetBodyKey: 'Ref_bodyKey',
  excelSheetStateVeryHidden: 'veryHidden' as const,
  keyName: 'name',
  keyId: 'id',
  stringOptional: 'optional',
  stringTypePattern: 'pattern',
  stringPatternSolid: 'solid',
  yellowHexColor: 'FFFF00',
  headerRowNumber: 5,
  excelCellWidth25: 25,
  excelCellWidth30: 30,
  excelCellWidth40: 40,
  stringHeaderNameContentType: 'Content-Type',
  stringHeaderValueSpreadsheet:
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  stringHeaderNameContentDisposition: 'Content-Disposition',
  stringHeaderValueFilename: 'attachment; filename=Template-UploadIncomingAHM.xlsx',
  templateFileName: 'Template-UploadIncomingAHM.xlsx',

  // === Mandatory read & instructions ===
  excelMandatoryRead: 'WAJIB DIBACA',
  excelInstructionPoint1:
    '1. Isi data mulai baris ke-6. Jangan mengubah urutan/nama kolom pada baris ke-5.',
  excelInstructionPoint2:
    '2. Semua kolom wajib diisi kecuali kolom berwarna kuning (opsional).',

  // === 19 kolom AHM (header lama + field key baru) ===
  columns: [
    { header: 'Delivery Note No', key: 'deliveryNoteNo', width: 30 },
    { header: 'Delivery Note Date', key: 'deliveryNoteDate', width: 25 },
    { header: 'Delivery Note Status', key: 'deliveryNoteStatus', width: 25 },
    { header: 'Delivery Note Type', key: 'deliveryNoteType', width: 25 },
    { header: 'Plan Receive Min Date', key: 'planReceiveMinDate', width: 25 },
    { header: 'Plan Receive Min Time', key: 'planReceiveMinTime', width: 25 },
    { header: 'Plan Receive Max Date', key: 'planReceiveMaxDate', width: 25 },
    { header: 'Plan Receive Max Time', key: 'planReceiveMaxTime', width: 25 },
    { header: 'Plant ID', key: 'plantId', width: 25 },
    { header: 'Plant Desc', key: 'plantDesc', width: 30, optional: true },
    { header: 'PO Number', key: 'poNumber', width: 30 },
    { header: 'Gate ID', key: 'gateId', width: 25 },
    { header: 'Supplier ID', key: 'supplierId', width: 25 },
    { header: 'Supplier Desc', key: 'supplierDesc', width: 30, optional: true },
    { header: 'PO Item', key: 'poItem', width: 25 },
    { header: 'Supplier Part Number', key: 'supplierPartNumber', width: 30 },
    { header: 'Part Number Desc', key: 'partNumberDesc', width: 40, optional: true },
    { header: 'Qty SUM DI Ori', key: 'qtySumDiOri', width: 25 },
    { header: 'Qty DN', key: 'qtyDn', width: 25 },
  ] as AhmColumn[],

  // === Contoh baris (dari template lama) ===
  // Contoh baris — data asli template lama (Plant/Gate/Supplier free text)
  exampleRow: [
    'AHMRF/22/002325',
    '2022-11-07',
    'Printed',
    'EXPORT',
    '2022-11-07',
    '09:30',
    '2022-11-07',
    '09:30',
    '1800',
    'Plant KRW EXT 1',
    '4700628176',
    'P8P1',
    '1100073',
    'PT ASTRA VISTEON INDONESIA',
    '10',
    '37100-K15-7112-M1',
    'METER ASSY,COMB',
    100,
    100,
  ],

  // === Validation regexes (format baru YYYY-MM-DD/HH:mm + legacy AHM DD-MON-YYYY/HH:mm:ss) ===
  dateRegex: /^(\d{4}-\d{2}-\d{2}|\d{2}-[A-Za-z]{3}-\d{4})$/,
  timeRegex: /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/,

  // === Business defaults (paritas SP lama) ===
  materialCategoryPart: 'Part',
  statusDraft: 'Draft',
  materialBrandDefault: '-',
  uomDefault: 'Pcs',

  // === AddInfo names (paritas SP lama) ===
  addInfoName: {
    dnStatus: 'Delivery Note Status',
    plantId: 'Plant ID',
    plantDesc: 'Plant Desc',
    gateId: 'Gate ID',
    supplierId: 'Supplier ID',
    poItem: 'PO Item',
    sumDiOri: 'SUM DI Ori',
  },

  // === Field keys (kumpul error) ===
  key: {
    deliveryNoteNo: 'deliveryNoteNo',
    qtyDn: 'qtyDn',
    qtySumDiOri: 'qtySumDiOri',
    status: 'status',
  },

  messages: {
    templateHeadersKeyNotMatch:
      'Konfigurasi header template tidak sesuai, hubungi administrator.',
    dnNotDraft:
      'Delivery Note sudah diproses (status bukan Draft), tidak dapat diupload ulang.',
    qtyDnExceed:
      'Qty DN tidak boleh lebih besar dari Qty SUM DI Ori.',
    required: 'Kolom ini wajib diisi.',
  },
} as const;
