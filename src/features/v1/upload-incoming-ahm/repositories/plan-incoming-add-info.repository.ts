import { injectable } from 'inversify';
import { nowWib } from '@/utils';
import { Transaction } from 'sequelize';
import {
  PlanIncomingHeaderAddInfo,
  PlanIncomingDetailAddInfo,
} from '@/database/entities';

export interface AddInfoRow {
  name: string;
  value: string;
}

/**
 * EAV add-info repos — upsert per (parentId, name): update value jika ada,
 * insert jika belum. Paritas SP lama tanpa duplikasi.
 */
@injectable()
export class PlanIncomingAddInfoRepository {
  public async upsertHeaderAddInfos(
    planIncomingHeaderId: string,
    rows: AddInfoRow[],
    userBy: string,
    transaction?: Transaction,
  ) {
    for (const row of rows) {
      const existing = await PlanIncomingHeaderAddInfo.findOne({
        where: { planIncomingHeaderId, name: row.name, deletedDate: null },
        transaction,
      });
      if (existing) {
        if (existing.get('value') !== row.value) {
          await PlanIncomingHeaderAddInfo.update(
            { value: row.value, modifiedBy: userBy, modifiedDate: nowWib() },
            { where: { id: existing.get('id') as string }, transaction },
          );
        }
      } else {
        await PlanIncomingHeaderAddInfo.create(
          { planIncomingHeaderId, name: row.name, value: row.value, createdBy: userBy, createdDate: nowWib() },
          { transaction },
        );
      }
    }
  }

  public async upsertDetailAddInfos(
    planIncomingDetailId: string,
    rows: AddInfoRow[],
    userBy: string,
    transaction?: Transaction,
  ) {
    for (const row of rows) {
      const existing = await PlanIncomingDetailAddInfo.findOne({
        where: { planIncomingDetailId, name: row.name, deletedDate: null },
        transaction,
      });
      if (existing) {
        if (existing.get('value') !== row.value) {
          await PlanIncomingDetailAddInfo.update(
            { value: row.value, modifiedBy: userBy, modifiedDate: nowWib() },
            { where: { id: existing.get('id') as string }, transaction },
          );
        }
      } else {
        await PlanIncomingDetailAddInfo.create(
          { planIncomingDetailId, name: row.name, value: row.value, createdBy: userBy, createdDate: nowWib() },
          { transaction },
        );
      }
    }
  }
}
