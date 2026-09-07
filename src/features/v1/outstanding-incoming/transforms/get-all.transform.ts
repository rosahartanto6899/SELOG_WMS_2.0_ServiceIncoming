import { DateHelper } from '@/shared-libs/helpers/date.helper';

/** Map row Q1 — parity SP: description ''→'-', isHold COALESCE 0 */
export class GetAllTransform {
  transform(row: any): any {
    return {
      id: row.id,
      customerName: row.customerName,
      warehouseName: row.warehouseName,
      deliveryNoteNo: row.deliveryNoteNo,
      poNo: row.poNo,
      poType: row.poType ?? null,
      poDate: row.poDate ? DateHelper.formatDefault(row.poDate) : null,
      supplierName: row.supplierName ?? null,
      incomingDate: row.incomingDate
        ? DateHelper.formatDefault(row.incomingDate)
        : null,
      referenceNo: row.referenceNo ?? null,
      description:
        row.description && row.description !== '' ? row.description : '-',
      status: row.status,
      isActive: row.isActive,
      createdAt: row.createdDate
        ? DateHelper.formatDefault(row.createdDate)
        : null,
      createdBy: row.createdBy ?? null,
      isHold: row.isHold ? 1 : 0,
      poQtyTotal: Number(row.poQtyTotal ?? 0),
      binningQtyTotal: Number(row.binningQtyTotal ?? 0),
      partialQtyTotal: Number(row.partialQtyTotal ?? 0),
      indicator:
        Number(row.poQtyTotal ?? 0) === Number(row.binningQtyTotal ?? 0)
          ? 'green'
          : Number(row.partialQtyTotal ?? 0) > 0
            ? 'blue'
            : 'red',
    };
  }

  array(rows: any[]): any[] {
    return rows.map((row) => this.transform(row));
  }
}

/** Map Q2/Q6 — header + details + addInfos */
export class ByIdTransform {
  transformDetail(detail: any): any {
    return {
      id: detail.id,
      materialCode: detail.materialCode,
      materialName: detail.materialName,
      materialBrand: detail.materialBrand,
      materialBarcode: detail.materialBarcode ?? null,
      materialLocationBarcode: detail.materialLocationBarcode ?? null,
      uom: detail.uom,
      poQty: detail.poQty,
      partialQty: detail.partialQty ?? 0,
      binningQty: detail.binningQty ?? 0,
      binningDate: detail.binningDate
        ? DateHelper.formatDefault(detail.binningDate)
        : null,
      binningBy: detail.binningBy ?? null,
      description: detail.description ?? null,
      addInfos: (detail.addInfos ?? []).map((a: any) => ({
        name: a.name,
        value: a.value,
      })),
    };
  }

  transform(header: any): any {
    return {
      id: header.id,
      customerCode: header.customerCode,
      customerName: header.customerName,
      warehouseCode: header.warehouseCode,
      warehouseName: header.warehouseName,
      deliveryNoteNo: header.deliveryNoteNo,
      poNo: header.poNo,
      poType: header.poType ?? null,
      poDate: header.poDate ? DateHelper.formatDefault(header.poDate) : null,
      supplierName: header.supplierName ?? null,
      incomingDate: header.incomingDate
        ? DateHelper.formatDefault(header.incomingDate)
        : null,
      referenceNo: header.referenceNo ?? null,
      materialCategory: header.materialCategory ?? null,
      description: header.description ?? null,
      status: header.status,
      isHold: header.isHold ? 1 : 0,
      isActual: header.isActual ? 1 : 0,
      createdAt: header.createdDate
        ? DateHelper.formatDefault(header.createdDate)
        : null,
      createdBy: header.createdBy ?? null,
      addInfos: (header.addInfos ?? []).map((a: any) => ({
        name: a.name,
        value: a.value,
      })),
      details: (header.details ?? []).map((d: any) => this.transformDetail(d)),
    };
  }
}
