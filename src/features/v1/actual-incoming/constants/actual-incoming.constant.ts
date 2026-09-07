/** Konstanta modul Actual Incoming — halaman daftar hasil GR (parity CoreApp ActualIncoming) */

/** A-List search LIKE gabung 7 kolom */
export const ACTUAL_LIST_SEARCH_COLUMNS = [
  'poNo',
  'deliveryNoteNo',
  'customerName',
  'referenceNo',
  'supplierName',
  'description',
  'status',
] as const;

/** A-List whitelist kolom sort — `grDate`/`grBy` sort di sisi ActualIncoming join */
export const ACTUAL_LIST_ORDER_WHITELIST: Record<string, string> = {
  id: 'id',
  deliveryNoteNo: 'deliveryNoteNo',
  poNo: 'poNo',
  poType: 'poType',
  poDate: 'poDate',
  supplierName: 'supplierName',
  incomingDate: 'incomingDate',
  referenceNo: 'referenceNo',
  status: 'status',
  grDate: 'grDate',
  grBy: 'grBy',
  createdAt: 'createdDate',
};

export const actualIncomingConstant = {
  menuCode: 'ACTUAL-INCOMING',
};
