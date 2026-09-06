/**
 * Enum status incoming (parity SP: usp_GetTotalDetailOutstandingByWarehouseCode
 * + workflow usp_UpdateStatusIncoming / usp_InsertActualIncoming / B2).
 */
export const INCOMING_STATUS = {
  DRAFT: 'Draft',
  CONFIRMED: 'Confirmed',
  BARCODE_LABELING: 'Barcode Labeling',
  QUALITY_INSPECTION: 'Quality Inspection',
  BINNING: 'Binning',
  INCOMING_FINISHED: 'Incoming Finished',
  GOODS_RECEIPT: 'Goods Receipt',
  TRANSIT_IN: 'Transit In',
  TRANSIT_OUT: 'Transit Out',
  CANCELLED: 'Cancelled',
  HOLD: 'Hold',
} as const;

export type IncomingStatus = (typeof INCOMING_STATUS)[keyof typeof INCOMING_STATUS];

/** Q1 definisi outstanding (usp_GetAllDataOutstandingIncoming) */
export const OUTSTANDING_EXCLUDE_STATUS = [
  INCOMING_STATUS.GOODS_RECEIPT,
  INCOMING_STATUS.TRANSIT_OUT,
] as const;

/** Q6/Q7/B5 — enum 5 status aktif (usp_GetTotalDetailOutstandingByWarehouseCode) */
export const TOTALS_STATUS = [
  INCOMING_STATUS.BINNING,
  INCOMING_STATUS.BARCODE_LABELING,
  INCOMING_STATUS.QUALITY_INSPECTION,
  INCOMING_STATUS.DRAFT,
  INCOMING_STATUS.CONFIRMED,
] as const;

/** B5 lookup QI — 5 status + Cancelled (usp_DataFilterResult) */
export const FILTER_RESULT_STATUS = [
  ...TOTALS_STATUS,
  INCOMING_STATUS.CANCELLED,
] as const;

/** A7 guard — status final yang tidak boleh diubah (usp_UpdateStatusIncoming) */
export const STATUS_UPDATE_GUARD = [
  INCOMING_STATUS.CANCELLED,
  INCOMING_STATUS.GOODS_RECEIPT,
] as const;

/** Q3 — pengecualian by-material (usp_GetAllDataIncomingHeaderDetail) */
export const BY_MATERIAL_EXCLUDE_STATUS = [
  INCOMING_STATUS.INCOMING_FINISHED,
  INCOMING_STATUS.GOODS_RECEIPT,
  INCOMING_STATUS.DRAFT,
  INCOMING_STATUS.TRANSIT_OUT,
] as const;

/** Q4/Q5 — pengecualian plan-qty (usp_GetPlanIncomingQty) */
export const PLAN_QTY_EXCLUDE_STATUS = [
  INCOMING_STATUS.DRAFT,
  INCOMING_STATUS.GOODS_RECEIPT,
  INCOMING_STATUS.TRANSIT_OUT,
] as const;

/**
 * Q1 whitelist kolom sort (parity SP) — map FE camelCase → kolom entity.
 * `createdAt` default.
 */
export const LIST_ORDER_WHITELIST: Record<string, string> = {
  id: 'id',
  customerName: 'customerName',
  warehouseName: 'warehouseName',
  deliveryNoteNo: 'deliveryNoteNo',
  poNo: 'poNo',
  poType: 'poType',
  poDate: 'poDate',
  supplierName: 'supplierName',
  incomingDate: 'incomingDate',
  referenceNo: 'referenceNo',
  description: 'description',
  status: 'status',
  createdAt: 'createdDate',
  createdBy: 'createdBy',
  isHold: 'isHold',
};

/** Q1 search LIKE gabung 7 kolom (parity SP) */
export const LIST_SEARCH_COLUMNS = [
  'poNo',
  'deliveryNoteNo',
  'customerName',
  'referenceNo',
  'supplierName',
  'description',
  'status',
] as const;

export const outstandingIncomingConstant = {
  menuCode: 'OUTSTANDING-INCOMING',
  defaultDescription: '-',
  attachmentFolder: 'HoldPlanIncoming',
  imageExtensions: ['.jpeg', '.jpg', '.png'],
  maxFileBytes: 1024 * 1024, // 1 MB parity CoreApp
  resize: { width: 2420, height: 1580 }, // parity CoreApp resizeImage
  systemUser: 'System',
  messages: {
    success: 'Success',
    updateSkipped: 'Update skipped',
    alreadyExists: 'alreadyexists',
    uploadSuccess: 'Upload file successfully',
    fileTooBig: 'The file size is too big',
    notReady: 'Not Ready',
  },
};

/**
 * Leadtime history dalam MENIT (+1) parity SP
 * (DATEDIFF(MINUTE, LastDate, now) + 1; 0 untuk baris pertama).
 *
 * Kolom DATETIME menyimpan wall-clock WIB (timezone '+07:00' saat tulis),
 * tapi parse-balik driver memakai TZ server — epoch hasil baca TIDAK bisa
 * dibandingkan langsung dgn `now` (beda 7 jam → leadtime minus).
 * Solusi: bandingkan kedua tanggal sebagai string wall-clock naive.
 */
import moment from 'moment';

export function leadtimeMinutes(lastDate: Date | null, now: Date): number {
  if (!lastDate) return 0;
  const lastWall = moment(lastDate).format('YYYY-MM-DD HH:mm:ss');
  const nowWall = moment(now).utcOffset(420).format('YYYY-MM-DD HH:mm:ss');
  return moment(nowWall).diff(moment(lastWall), 'minutes') + 1;
}

/** Add-info EAV: baris name='skip' diabaikan (parity SP insert add-info) */
export function filterAddInfos(
  rows: Array<{ name?: string; value?: string }>,
): Array<{ name: string; value: string }> {
  return rows
    .filter((r) => r.name && r.name !== 'skip')
    .map((r) => ({ name: r.name!, value: r.value ?? '' }));
}

/** Rule A6: field mana saja yang berubah (parity CASE usp_UpdatePlanQtyOutstandingIncoming) */
export function computePlanQtyUpdate(
  detail: {
    poQty: number;
    binningQty: number | null;
    binningDate: Date | null;
    description: string | null;
  },
  header: { status: string | null; isActive?: boolean },
  planQty: number,
  description?: string,
): { updates: Record<string, unknown>; stockAvailability: boolean } {
  const isDraft = header.status === INCOMING_STATUS.DRAFT;
  const isBinned = detail.binningDate != null;
  const updates: Record<string, unknown> = {};
  if (isDraft) updates.poQty = planQty;
  if (isBinned) updates.binningQty = planQty;
  if (description != null) {
    updates.description = detail.description
      ? `${detail.description}. ${description}`
      : description;
  }
  return { updates, stockAvailability: isBinned && !isDraft && !!header.isActive };
}

/** Rule B2: binningQty baru = existing + actualQty (INCREMENT parity SP) */
export function computeBinningQty(
  existingBinningQty: number | null,
  actualQty: number,
): number {
  return (existingBinningQty ?? 0) + actualQty;
}

/** Rule B2 ready-check: header ready ⇔ tidak ada detail POQty != BinningQty */
export function isReadyToGoodsReceipt(
  details: Array<{ poQty: number; binningQty: number | null }>,
): boolean {
  return details.every((d) => d.poQty === (d.binningQty ?? 0));
}
