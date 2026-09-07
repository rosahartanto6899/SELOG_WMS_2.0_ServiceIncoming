import { injectable } from 'inversify';
import { col, fn, literal, Op, Order, Transaction, WhereOptions } from 'sequelize';
import {
  PlanIncomingHeader,
  PlanIncomingDetail,
  PlanIncomingHeaderAddInfo,
  PlanIncomingDetailAddInfo,
  PlanIncomingHistory,
} from '@/database/entities';
import { PlanIncomingHeaderAttributes } from '@/database/attributes';
import { nowWib } from '@/utils';
import { leadtimeMinutes, filterAddInfos } from '../constants';

/** Row header untuk list outstanding (Q1) */
export interface ListRow {
  id: string;
  customerCode: string | null;
  customerName: string;
  warehouseCode: string | null;
  warehouseName: string;
  deliveryNoteNo: string;
  poNo: string;
  poType: string | null;
  poDate: Date | null;
  supplierName: string | null;
  incomingDate: Date | null;
  referenceNo: string | null;
  description: string | null;
  status: string | null;
  isActive: boolean;
  createdDate: Date;
  createdBy: string | null;
  isHold: boolean;
}

/**
 * Query header/detail/history/totals/indicator — parity SP read
 * (usp_GetAllDataOutstandingIncoming dkk), tanpa SP.
 */
@injectable()
export class OutstandingIncomingRepository {
  /** Q1 — rows DISTINCT header + LEFT JOIN detail (filter material) */
  public async findAll(
    headerWhere: WhereOptions,
    detailWhere: WhereOptions | null,
    order: Order,
    limit: number,
    offset: number,
  ): Promise<ListRow[]> {
    const rows = await PlanIncomingHeader.findAll({
      attributes: [
        'id',
        'customerCode',
        'customerName',
        'warehouseCode',
        'warehouseName',
        'deliveryNoteNo',
        'poNo',
        'poType',
        'poDate',
        'supplierName',
        'incomingDate',
        'referenceNo',
        'description',
        'status',
        'isActive',
        'createdDate',
        'createdBy',
        'isHold',
      ],
      where: headerWhere,
      include: detailWhere
        ? [
            {
              model: PlanIncomingDetail,
              as: 'details',
              attributes: ['id'],
              where: detailWhere,
              required: true,
            },
          ]
        : [],
      order,
      limit,
      offset,
      subQuery: false,
    });
    return rows.map((r) => r.get({ plain: true })) as ListRow[];
  }

  /** Q1 — SUM po/binning/partialQty per header untuk kolom indikator (1 query per page) */
  public async findSumsByHeaderIds(ids: string[]) {
    if (!ids.length) return [];
    return PlanIncomingDetail.findAll({
      attributes: [
        'planIncomingHeaderId',
        [fn('SUM', col('poQty')), 'poQty'],
        [fn('SUM', col('binningQty')), 'binningQty'],
        [fn('SUM', col('partialQty')), 'partialQty'],
      ],
      where: { planIncomingHeaderId: { [Op.in]: ids } },
      group: ['planIncomingHeaderId'],
      raw: true,
    });
  }

  /** Q1 — COUNT DISTINCT header (dipakai recordsTotal & recordsFiltered) */
  public async countAll(
    headerWhere: WhereOptions,
    detailWhere: WhereOptions | null,
  ): Promise<number> {
    return await PlanIncomingHeader.count({
      distinct: true,
      col: 'id',
      where: headerWhere,
      include: detailWhere
        ? [
            {
              model: PlanIncomingDetail,
              as: 'details',
              attributes: [],
              where: detailWhere,
              required: true,
            },
          ]
        : [],
    });
  }

  /** Q2 — header + details + addInfos (header & per-detail) */
  public async findDetailById(id: string) {
    return PlanIncomingHeader.findOne({
      where: { id },
      include: [
        {
          model: PlanIncomingDetail,
          as: 'details',
          include: [
            {
              model: PlanIncomingDetailAddInfo,
              as: 'addInfos',
              separate: true,
            },
          ],
        },
        { model: PlanIncomingHeaderAddInfo, as: 'addInfos', separate: true },
      ],
    });
  }

  /** Q3 — by-material (status sempit + detail belum binning) */
  public async findByMaterial(
    customerCode: string,
    warehouseCode: string,
    materialCode: string,
  ) {
    return PlanIncomingHeader.findAll({
      attributes: [
        'id',
        'customerName',
        'warehouseName',
        'poNo',
        'poType',
        'materialCategory',
        'supplierName',
        'deliveryNoteNo',
        'incomingDate',
        'referenceNo',
        'description',
        'status',
        'isActive',
        'createdDate',
        'createdBy',
        'isHold',
      ],
      where: { customerCode, warehouseCode, isActive: true },
      include: [
        {
          model: PlanIncomingDetail,
          as: 'details',
          attributes: ['id'],
          where: { materialCode, binningDate: null },
          required: true,
        },
      ],
      order: [['createdDate', 'DESC']],
      subQuery: false,
    });
  }

  /** Q4 — Σ(POQty−BinningQty) group per material (CASE parity SP) */
  public async sumPlanQty(customerCode: string, warehouseCode: string) {
    return PlanIncomingDetail.findAll({
      attributes: [
        [fn('MIN', col('materialName')), 'materialName'],
        [fn('MIN', col('materialBrand')), 'materialBrand'],
        [fn('MIN', col('uom')), 'uom'],
        [
          fn(
            'SUM',
            literal(
              `CASE WHEN ISNULL(POQty,0) <= ISNULL(BinningQty,0) THEN 0 ELSE ISNULL(POQty,0) - ISNULL(BinningQty,0) END`,
            ),
          ),
          'qty',
        ],
        'materialCode',
      ],
      include: [
        {
          model: PlanIncomingHeader,
          as: 'header',
          attributes: [
            'customerCode',
            'customerName',
            'warehouseCode',
            'warehouseName',
          ],
          where: { customerCode, warehouseCode, isActive: true },
          required: true,
        },
      ],
      group: [
        'header.customerCode',
        'header.customerName',
        'header.warehouseCode',
        'header.warehouseName',
        'materialCode',
      ],
      raw: true,
    });
  }

  /** Q5 — sisa qty per baris detail satu material (binningQty=0, DESC) */
  public async planQtyByMaterial(
    customerCode: string,
    warehouseCode: string,
    materialCode: string,
  ) {
    return PlanIncomingDetail.findAll({
      attributes: [
        'materialCode',
        [
          literal(
            `CASE WHEN ISNULL(POQty,0) <= ISNULL(BinningQty,0) THEN 0 ELSE ISNULL(POQty,0) - ISNULL(BinningQty,0) END`,
          ),
          'qty',
        ],
        'createdDate',
      ],
      include: [
        {
          model: PlanIncomingHeader,
          as: 'header',
          attributes: [
            'customerCode',
            'customerName',
            'warehouseCode',
            'warehouseName',
            'deliveryNoteNo',
          ],
          where: { customerCode, warehouseCode, isActive: true },
          required: true,
        },
      ],
      where: { materialCode, binningQty: 0 },
      order: [['createdDate', 'DESC']],
      subQuery: false,
      raw: true,
    });
  }

  /** Q6 — grand total outstanding */
  public async countTotals(warehouseCodes: string[]): Promise<number> {
    return PlanIncomingHeader.count({ where: this.totalsWhere(warehouseCodes) });
  }

  /** Q7 — total per warehouse */
  public async countTotalsByWarehouse(warehouseCodes: string[]) {
    return PlanIncomingHeader.findAll({
      attributes: [
        [fn('COUNT', '*'), 'totalDataOutstanding'],
        'warehouseCode',
        'warehouseName',
      ],
      where: this.totalsWhere(warehouseCodes),
      group: ['warehouseCode', 'warehouseName'],
      raw: true,
    });
  }

  private totalsWhere(warehouseCodes: string[]): WhereOptions {
    return {
      isActive: true,
      status: {
        [Op.in]: [
          'Binning',
          'Barcode Labeling',
          'Quality Inspection',
          'Draft',
          'Confirmed',
        ],
      },
      warehouseCode: { [Op.in]: warehouseCodes },
    };
  }

  /** Q8 — history (ORDER BY date presentasional) */
  public async findHistory(headerId: string) {
    return PlanIncomingHistory.findAll({
      where: { planIncomingHeaderId: headerId },
      order: [['date', 'ASC']],
    });
  }

  /** Tanggal history terakhir per header (leadtime) */
  public async findLastHistoryDate(
    headerId: string,
    transaction?: Transaction,
  ): Promise<Date | null> {
    const last = await PlanIncomingHistory.findOne({
      where: { planIncomingHeaderId: headerId },
      order: [['date', 'DESC']],
      transaction,
    });
    return (last?.get('date') as Date) ?? null;
  }

  /** Insert satu baris history (leadtime menit +1 parity SP) */
  public async insertHistory(
    headerId: string,
    status: string,
    pic: string,
    transaction?: Transaction,
  ): Promise<void> {
    const now = nowWib();
    const lastDate = await this.findLastHistoryDate(headerId, transaction);
    await PlanIncomingHistory.create(
      {
        planIncomingHeaderId: headerId,
        status,
        date: now,
        leadtime: leadtimeMinutes(lastDate, now),
        pic,
        createdDate: now,
        createdBy: pic,
      },
      { transaction },
    );
  }

  /** Q9 — indicator: header aktif dengan detail POQty != BinningQty */
  public async findIndicator(customerCode: string, warehouseCode: string) {
    return PlanIncomingDetail.findAll({
      attributes: [
        'planIncomingHeaderId',
        [fn('SUM', col('poQty')), 'poQty'],
        [fn('SUM', col('binningQty')), 'binningQty'],
        [fn('SUM', col('partialQty')), 'partialQty'],
      ],
      include: [
        {
          model: PlanIncomingHeader,
          as: 'header',
          attributes: [],
          where: { customerCode, warehouseCode, isActive: true },
          required: true,
        },
      ],
      where: literal('"PlanIncomingDetail"."poQty" != "PlanIncomingDetail"."binningQty"'),
      group: ['planIncomingHeaderId'],
      raw: true,
    });
  }

  // === Mutasi umum (dipakai command.service) ===

  public async getByDeliveryNoteNo(
    deliveryNoteNo: string,
    transaction?: Transaction,
    lock = false,
  ) {
    // parity SP: EXISTS semua header dengan DN sama (termasuk soft-deleted)
    return PlanIncomingHeader.findOne({
      where: { deliveryNoteNo },
      transaction,
      ...(lock && transaction ? { lock } : {}),
    });
  }

  public async getById(id: string, transaction?: Transaction) {
    return PlanIncomingHeader.findByPk(id, { transaction });
  }

  public async findByIds(ids: string[], transaction?: Transaction) {
    return PlanIncomingHeader.findAll({ where: { id: ids }, transaction });
  }

  public async createHeader(
    data: PlanIncomingHeaderAttributes,
    transaction?: Transaction,
  ) {
    return PlanIncomingHeader.create(data, { transaction });
  }

  public async updateHeader(
    id: string,
    data: Partial<PlanIncomingHeaderAttributes>,
    transaction?: Transaction,
  ) {
    await PlanIncomingHeader.update(data, { where: { id }, transaction });
  }

  /** Add-info header replace (parity SP: DELETE → INSERT, skip 'skip') */
  public async replaceHeaderAddInfos(
    headerId: string,
    rows: { name?: string; value?: string }[],
    userBy: string,
    transaction?: Transaction,
  ): Promise<void> {
    await PlanIncomingHeaderAddInfo.destroy({
      where: { planIncomingHeaderId: headerId },
      transaction,
    });
    const now = nowWib();
    for (const row of filterAddInfos(rows)) {
      await PlanIncomingHeaderAddInfo.create(
        {
          planIncomingHeaderId: headerId,
          name: row.name,
          value: row.value,
          createdDate: now,
          createdBy: userBy,
        },
        { transaction },
      );
    }
  }
}
