export interface PlanIncomingHeaderAttributes {
  id?: string;
  customerCode?: string | null;
  customerName: string;
  warehouseCode?: string | null;
  warehouseName: string;
  deliveryNoteNo: string;
  incomingDate?: Date | string | null;
  poNo: string;
  poType?: string | null;
  poDate?: Date | string | null;
  supplierName?: string | null;
  referenceNo?: string | null;
  materialCategory?: string;
  description?: string | null;
  status?: string;
  isHold?: boolean;
  isActive?: boolean;
  createdDate?: Date;
  createdBy?: string | null;
  modifiedDate?: Date | null;
  modifiedBy?: string | null;
  deletedBy?: string | null;
  deletedDate?: Date | null;
}

export interface PlanIncomingDetailAttributes {
  id?: string;
  planIncomingHeaderId: string;
  materialCode: string;
  materialName: string;
  materialBrand: string;
  materialBarcode?: string | null;
  materialLocationBarcode?: string | null;
  uom: string;
  poQty: number;
  partialQty?: number | null;
  binningQty?: number | null;
  binningDate?: Date | null;
  binningBy?: string | null;
  description?: string | null;
  createdDate?: Date;
  createdBy?: string | null;
  modifiedDate?: Date | null;
  modifiedBy?: string | null;
  deletedBy?: string | null;
  deletedDate?: Date | null;
}

export interface PlanIncomingHeaderAddInfoAttributes {
  id?: string;
  planIncomingHeaderId?: string | null;
  name?: string | null;
  value?: string | null;
  createdDate?: Date;
  createdBy?: string | null;
  modifiedDate?: Date | null;
  modifiedBy?: string | null;
  deletedBy?: string | null;
  deletedDate?: Date | null;
}

export interface PlanIncomingDetailAddInfoAttributes {
  id?: string;
  planIncomingDetailId?: string | null;
  name?: string | null;
  value?: string | null;
  createdDate?: Date;
  createdBy?: string | null;
  modifiedDate?: Date | null;
  modifiedBy?: string | null;
  deletedBy?: string | null;
  deletedDate?: Date | null;
}

/** Jadwal binning hold — tabel legacy `HoldPlanIncoming` */
export interface PlanIncomingScheduleAttributes {
  id?: string;
  planIncomingHeaderId?: string | null;
  picReceiver?: string | null;
  picBinner?: string | null;
  binningLocation?: string | null;
  incomingStartDate?: Date | string | null;
  incomingStartTime?: string | null;
  incomingEndDate?: Date | string | null;
  incomingEndTime?: string | null;
  isActive?: boolean;
  createdDate?: Date;
  createdBy?: string | null;
  modifiedDate?: Date | null;
  modifiedBy?: string | null;
  deletedBy?: string | null;
  deletedDate?: Date | null;
}

/** Histori status — tabel legacy `PlanIncomingHistory` (append-only) */
export interface PlanIncomingHistoryAttributes {
  id?: string;
  planIncomingHeaderId?: string | null;
  status?: string | null;
  date?: Date | null;
  leadtime?: number | null;
  pic?: string | null;
  createdDate?: Date;
  createdBy?: string | null;
}

/** Attachment hold — tabel legacy `HoldPlanIncomingAttachment` */
export interface HoldPlanIncomingAttachmentAttributes {
  id?: string;
  incomingPlanDetailId: string;
  fileName: string;
  attachmentUrl: string;
  createdDate?: Date;
  createdBy?: string;
  modifiedDate?: Date | null;
  modifiedBy?: string | null;
}

/** Record hold per header — NET-NEW (parity field TVP HoldIncomingTempsList1) */
export interface PlanIncomingHoldAttributes {
  id?: string;
  planIncomingHeaderId: string;
  locationId?: string | null;
  locationName?: string | null;
  qty: number;
  description?: string | null;
  attachPhotos?: string | null;
  isActive?: boolean;
  createdDate?: Date;
  createdBy?: string | null;
  modifiedDate?: Date | null;
  modifiedBy?: string | null;
  deletedBy?: string | null;
  deletedDate?: Date | null;
}

/** Record GR/actual — NET-NEW */
export interface ActualIncomingAttributes {
  id?: string;
  planIncomingHeaderId: string;
  picReceiver?: string | null;
  picBinner?: string | null;
  grBy?: string | null;
  grDate?: Date | null;
  binningLocation?: string | null;
  isActive?: boolean;
  createdDate?: Date;
  createdBy?: string | null;
  modifiedDate?: Date | null;
  modifiedBy?: string | null;
  deletedBy?: string | null;
  deletedDate?: Date | null;
}
