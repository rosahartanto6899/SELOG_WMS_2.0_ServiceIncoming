import { injectable } from 'inversify';
import { Op } from 'sequelize';
import { PlanIncomingHeader, PlanIncomingHeaderAddInfo } from '@/database/entities';

/** Row list actual incoming (A-List) — header GR/Transit Out ≤2 bulan.
 *  Kolom GR (picReceiver/picBinner/grBy/grDate/binningLocation) tidak ada di header → null. */
export interface ActualListRow {
  id: string;
  customerCode: string | null;
  customerName: string;
  warehouseCode: string | null;
  warehouseName: string;
  materialCategory: string | null;
  deliveryNoteNo: string;
  poNo: string;
  poType: string | null;
  poDate: Date | null;
  supplierName: string | null;
  incomingDate: Date | null;
  referenceNo: string | null;
  description: string | null;
  status: string | null;
  createdDate: Date;
  createdBy: string | null;
  modifiedDate: Date | null;
  modifiedBy: string | null;
  picReceiver: string | null;
  picBinner: string | null;
  grBy: string | null;
  grDate: Date | null;
  binningLocation: string | null;
}

/** A-List via query Sequelize PlanIncomingHeader (parity SP); A-Delete rollback header */
@injectable()
export class ActualIncomingRepository {
  /** A-List — parity usp_GetAllActualIncoming: status GR/Transit Out, aktif,
   *  modifiedDate ≤ 2 bulan terakhir (WIB), customerCode/warehouseCode exact.
   *  customerCode wajib (dari customer aktif token), tanpa itu 0 baris. */
  public async findActualAll(
    customerCode?: string | null,
    warehouseCode?: string | null,
  ): Promise<ActualListRow[]> {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 2); // parity DATEADD(MONTH, -2, ...)

    const rows = await PlanIncomingHeader.findAll({
      where: {
        status: { [Op.in]: ['Goods Receipt', 'Transit Out'] },
        isActive: true,
        customerCode: customerCode ?? null,
        ...(warehouseCode ? { warehouseCode } : {}),
        modifiedDate: { [Op.gte]: cutoff },
      },
      order: [['createdDate', 'DESC']],
      raw: true,
    });
    return rows.map((r: any) => ({
      id: r.id,
      customerCode: r.customerCode,
      customerName: r.customerName,
      warehouseCode: r.warehouseCode,
      warehouseName: r.warehouseName,
      materialCategory: r.materialCategory,
      deliveryNoteNo: r.deliveryNoteNo || '-',
      poNo: r.poNo,
      poType: r.poType,
      poDate: r.poDate,
      supplierName: r.supplierName,
      incomingDate: r.incomingDate,
      referenceNo: r.referenceNo || '-',
      description: r.description || '-',
      status: r.status,
      createdDate: r.createdDate,
      createdBy: r.createdBy,
      modifiedDate: r.modifiedDate,
      modifiedBy: r.modifiedBy,
      // ponytail: kolom GR tidak ada di header; isi saat sumber data GR tersedia
      picReceiver: null,
      picBinner: null,
      grBy: null,
      grDate: null,
      binningLocation: null,
    }));
  }

  /** A-List — addinfo header per id (query terpisah, hindari duplikasi join 1:N) */
  public async findAddInfoByHeaderIds(
    headerIds: string[],
  ): Promise<
    Array<{ planIncomingHeaderId: string; name: string; value: string }>
  > {
    if (!headerIds.length) return [];
    return (await PlanIncomingHeaderAddInfo.findAll({
      attributes: ['planIncomingHeaderId', 'name', 'value'],
      where: { planIncomingHeaderId: headerIds },
      raw: true,
    })) as any;
  }
}
