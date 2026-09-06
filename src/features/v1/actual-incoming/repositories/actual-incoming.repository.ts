import { injectable } from 'inversify';
import { Order, Transaction, WhereOptions } from 'sequelize';
import {
  ActualIncoming,
  PlanIncomingHeader,
  PlanIncomingHeaderAddInfo,
} from '@/database/entities';
import { nowWib } from '@/utils';

/** Row list actual incoming (A-List) — header + GR dari ActualIncoming */
export interface ActualListRow {
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
  createdDate: Date;
  createdBy: string | null;
  picReceiver: string | null;
  picBinner: string | null;
  grBy: string | null;
  grDate: Date | null;
  binningLocation: string | null;
  additionalInfo: string | null;
}

/** A-List/A-Detail/A-Delete — akses tabel ActualIncoming + header isActual */
@injectable()
export class ActualIncomingRepository {
  /** A-List — header isActual + exclude TRANSIT_OUT, JOIN ActualIncoming (grDate/grBy/PIC) */
  public async findActualAll(
    headerWhere: WhereOptions,
    order: Order,
    limit?: number,
    offset?: number,
  ): Promise<ActualListRow[]> {
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
        'createdDate',
        'createdBy',
      ],
      where: headerWhere,
      include: [
        {
          model: ActualIncoming,
          as: 'actuals',
          attributes: [
            'picReceiver',
            'picBinner',
            'grBy',
            'grDate',
            'binningLocation',
          ],
          required: true,
        },
      ],
      order,
      limit,
      offset,
      subQuery: false,
    });
    return rows.map((r) => {
      const plain = r.get({ plain: true }) as any;
      const actual = plain.actuals?.[0] ?? {};
      delete plain.actuals;
      return { ...plain, ...actual } as ActualListRow;
    });
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

  /** A-List — COUNT header isActual */
  public async countActualAll(headerWhere: WhereOptions): Promise<number> {
    return await PlanIncomingHeader.count({
      distinct: true,
      col: 'id',
      where: headerWhere,
      include: [
        { model: ActualIncoming, as: 'actuals', attributes: [], required: true },
      ],
    });
  }

  /** A-Delete — soft-delete record ActualIncoming per header (audit deletedBy/Date) */
  public async softDeleteByHeaderIds(
    headerIds: string[],
    userBy: string,
    transaction?: Transaction,
  ): Promise<void> {
    const now = nowWib();
    await ActualIncoming.update(
      {
        isActive: false,
        deletedBy: userBy,
        deletedDate: now,
        modifiedBy: userBy,
        modifiedDate: now,
      },
      {
        where: { planIncomingHeaderId: headerIds, isActive: true },
        transaction,
      },
    );
  }

  /** A-Detail/A-Delete — record aktif per header (guard: harus ada record actual) */
  public async findActiveByHeaderIds(headerIds: string[]) {
    return ActualIncoming.findAll({
      where: { planIncomingHeaderId: headerIds, isActive: true },
    });
  }
}
