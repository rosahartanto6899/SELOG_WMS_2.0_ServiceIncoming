import { injectable } from 'inversify';
import { col, Op, QueryTypes, Transaction, WhereOptions } from 'sequelize';
import {
  PlanIncomingDetail,
  PlanIncomingDetailAddInfo,
  PlanIncomingHeader,
} from '@/database/entities';
import {
  PlanIncomingDetailAttributes,
  PlanIncomingHeaderAttributes,
} from '@/database/attributes';
import { sequelize, nowWib } from '@/utils';
import { filterAddInfos } from '../constants';

/** Detail CRUD + add-info replace + binning + barcode sync + QI (B2/B4/B6/C2/C4/C5) */
@injectable()
export class PlanIncomingDetailRepository {
  public async getById(id: string, transaction?: Transaction) {
    return PlanIncomingDetail.findByPk(id, { transaction });
  }

  /** Detail + header (A6/B2 butuh status header) */
  public async findWithHeader(id: string) {
    return PlanIncomingDetail.findOne({
      where: { id },
      include: [{ model: PlanIncomingHeader, as: 'header' }],
    });
  }

  public async findByHeader(headerId: string, transaction?: Transaction) {
    return PlanIncomingDetail.findAll({
      where: { planIncomingHeaderId: headerId },
      transaction,
    });
  }

  /** A-Delete — reset binning detail (parity usp_DeleteActualIncomingDetail:
   *  BinningDate=null; 2.0 juga reset binningQty/partialQty/binningBy karena
   *  ready-check GR membandingkan poQty vs binningQty) */
  public async resetBinningByHeaderId(
    headerId: string,
    userBy: string,
    now: Date,
    transaction?: Transaction,
  ): Promise<void> {
    await PlanIncomingDetail.update(
      {
        binningQty: 0,
        partialQty: 0,
        binningDate: null,
        binningBy: null,
        modifiedDate: now,
        modifiedBy: userBy,
      },
      { where: { planIncomingHeaderId: headerId }, transaction },
    );
  }

  public async getByHeaderAndMaterial(
    headerId: string,
    materialCode: string,
    transaction?: Transaction,
  ) {
    return PlanIncomingDetail.findOne({
      where: {
        planIncomingHeaderId: headerId,
        materialCode,
      },
      transaction,
    });
  }

  public async create(
    data: PlanIncomingDetailAttributes,
    transaction?: Transaction,
  ) {
    return PlanIncomingDetail.create(data, { transaction });
  }

  public async update(
    id: string,
    data: Partial<PlanIncomingDetailAttributes>,
    transaction?: Transaction,
  ) {
    await PlanIncomingDetail.update(data, { where: { id }, transaction });
  }

  /** Add-info detail replace (parity SP: DELETE → INSERT, skip 'skip') */
  public async replaceDetailAddInfos(
    detailId: string,
    rows: { name?: string; value?: string }[],
    userBy: string,
    transaction?: Transaction,
  ): Promise<void> {
    await PlanIncomingDetailAddInfo.destroy({
      where: { planIncomingDetailId: detailId },
      transaction,
    });
    const now = nowWib();
    for (const row of filterAddInfos(rows)) {
      await PlanIncomingDetailAddInfo.create(
        {
          planIncomingDetailId: detailId,
          name: row.name,
          value: row.value,
          createdDate: now,
          createdBy: userBy,
        },
        { transaction },
      );
    }
  }

  /** C5 — hapus add-info semua id, lalu detail hanya yang belum binning */
  public async deleteWhereNotBinned(
    ids: string[],
    transaction?: Transaction,
  ): Promise<number> {
    await PlanIncomingDetailAddInfo.destroy({
      where: { planIncomingDetailId: ids },
      transaction,
    });
    return PlanIncomingDetail.destroy({
      where: { id: ids, binningDate: null },
      transaction,
    });
  }

  /** B2 ready-check: ada detail dengan POQty != BinningQty? (parity usp_CheckReadyToGoodsReceipt) */
  public async existsUnbinned(
    headerId: string,
    transaction?: Transaction,
  ): Promise<boolean> {
    const count = await PlanIncomingDetail.count({
      where: {
        planIncomingHeaderId: headerId,
        deletedDate: null,
        poQty: { [Op.ne]: col('binningQty') },
      },
      transaction,
    });
    return count > 0;
  }

  /** B4 — sync barcode dari master temp (raw UPDATE...FROM join, parity usp_UpdateBarcodeIncoming) */
  public async syncBarcodes(transaction?: Transaction): Promise<number> {
    const [result] = await sequelize.query(
      `UPDATE D SET
         D.MaterialBarcode = M.MaterialBarcode,
         D.MaterialLocationBarcode = M.LocationBarcode,
         D.ModifiedDate = :now,
         D.ModifiedBy = 'System'
       FROM PlanIncomingDetail D
       INNER JOIN PlanIncomingHeader H ON H.Id = D.PlanIncomingHeaderId
       INNER JOIN MstMaterialLocationBarcodeTemp M
         ON D.MaterialCode = M.MaterialCode
        AND H.WarehouseCode = M.WarehouseCode
        AND H.CustomerCode = M.CustomerCode
       WHERE D.MaterialBarcode IS NULL OR D.MaterialLocationBarcode IS NULL`,
      { replacements: { now: nowWib() }, transaction, type: QueryTypes.UPDATE },
    );
    return Number(result ?? 0);
  }

  /** B6 — QI: update partialQty + description per materialCode (parity usp_SaveQualityInspectionChanges) */
  public async updateQualityInspection(
    headerId: string,
    items: { materialCode: string; partialQty: number; description?: string }[],
    modifiedBy: string,
    transaction?: Transaction,
  ): Promise<void> {
    const now = nowWib();
    for (const item of items) {
      await PlanIncomingDetail.update(
        {
          partialQty: item.partialQty,
          description: item.description ?? null,
          modifiedDate: now,
          modifiedBy,
        },
        {
          where: { planIncomingHeaderId: headerId, materialCode: item.materialCode },
          transaction,
        },
      );
    }
  }

  /** A10 — detail incoming untuk headers terpilih */
  public async findByHeaderIds(headerIds: string[]): Promise<any[]> {
    if (!headerIds.length) return [];
    return PlanIncomingDetail.findAll({
      where: { planIncomingHeaderId: headerIds },
      include: [
        { model: PlanIncomingHeader, as: 'header', attributes: ['id'] },
      ],
    });
  }

  /** B3 — baris slip per header (PartialQty != 0) */
  public async findBinningSlipRows(headerId: string) {
    return PlanIncomingDetail.findAll({
      where: {
        planIncomingHeaderId: headerId,
        partialQty: { [Op.ne]: 0 },
      },
      include: [{ model: PlanIncomingHeader, as: 'header' }],
    });
  }

  /** Header where helper untuk detail-level query */
  public headerWhere(attrs: Partial<PlanIncomingHeaderAttributes>): WhereOptions {
    return attrs as WhereOptions;
  }
}
