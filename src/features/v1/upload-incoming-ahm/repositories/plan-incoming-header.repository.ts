import { injectable } from 'inversify';
import { Transaction } from 'sequelize';
import { PlanIncomingHeader } from '@/database/entities';
import { PlanIncomingHeaderAttributes } from '@/database/attributes';

@injectable()
export class PlanIncomingHeaderRepository {
  public async getByDeliveryNoteNo(
    deliveryNoteNo: string,
    transaction?: Transaction,
    lock = false,
  ) {
    return PlanIncomingHeader.findOne({
      where: { deliveryNoteNo, deletedDate: null },
      transaction,
      ...(lock ? { lock: transaction ? lock : false } : {}),
    });
  }

  public async create(
    data: PlanIncomingHeaderAttributes,
    transaction?: Transaction,
  ) {
    return PlanIncomingHeader.create(data, { transaction });
  }

  public async update(
    id: string,
    data: Partial<PlanIncomingHeaderAttributes>,
    transaction?: Transaction,
  ) {
    await PlanIncomingHeader.update(data, {
      where: { id },
      transaction,
    });
  }
}
