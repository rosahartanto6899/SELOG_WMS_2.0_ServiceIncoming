import { injectable } from 'inversify';
import { Transaction } from 'sequelize';
import { ActualIncoming } from '@/database/entities';
import { ActualIncomingAttributes } from '@/database/attributes';
import { nowWib } from '@/utils';

/** A10/A11/B1 — record GR/actual (NET-NEW table) */
@injectable()
export class ActualIncomingRepository {
  public async insertActuals(
    rows: Omit<ActualIncomingAttributes, 'id'>[],
    userBy: string,
    transaction?: Transaction,
  ): Promise<void> {
    const now = nowWib();
    for (const row of rows) {
      await ActualIncoming.create(
        { ...row, isActive: true, createdDate: now, createdBy: userBy },
        { transaction },
      );
    }
  }

  /** B1 — lokasi binning dari ActualIncoming per header (parity usp_GetLocationActualIncoming) */
  public async findLocations(headerIds: string[]) {
    return ActualIncoming.findAll({
      attributes: ['binningLocation', 'planIncomingHeaderId'],
      where: { planIncomingHeaderId: headerIds },
    });
  }
}
