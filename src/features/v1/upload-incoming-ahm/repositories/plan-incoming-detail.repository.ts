import { injectable } from 'inversify';
import { Transaction } from 'sequelize';
import { PlanIncomingDetail } from '@/database/entities';
import { PlanIncomingDetailAttributes } from '@/database/attributes';

@injectable()
export class PlanIncomingDetailRepository {
  public async getByHeaderAndMaterial(
    planIncomingHeaderId: string,
    materialCode: string,
    transaction?: Transaction,
  ) {
    return PlanIncomingDetail.findOne({
      where: { planIncomingHeaderId, materialCode, deletedDate: null },
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
    await PlanIncomingDetail.update(data, {
      where: { id },
      transaction,
    });
  }
}
