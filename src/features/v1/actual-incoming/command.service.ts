import { inject, injectable } from 'inversify';
import { HTTP_STATUS } from '@/shared-libs/constants/http-status.constant';
import { IDataUser } from '@/shared-libs/interfaces/user-data.interface';
import { sequelize, nowWib } from '@/utils';
import { OutstandingIncomingRepository } from '../outstanding-incoming/repositories';
import { INCOMING_STATUS } from '../outstanding-incoming/constants';
import { ActualIncomingRepository } from './repositories';

const userOf = (req: any): string => {
  const userData = req.user as unknown as IDataUser;
  return userData?.tokenName ?? userData?.tokenUserId ?? 'system';
};

/** A-Delete — hapus record actual bulk + alasan (rollback header ke Binning) */
@injectable()
export class CommandService {
  constructor(
    @inject(ActualIncomingRepository)
    private readonly actualRepository: ActualIncomingRepository,
    @inject(OutstandingIncomingRepository)
    private readonly headerRepository: OutstandingIncomingRepository,
  ) {}

  async deleteActual(req: any) {
    const { items } = req.body;
    const userBy = req.body.userLogin ?? userOf(req);
    const now = nowWib();
    const deleted: string[] = [];
    const skipped: Array<{ id: string; reason: string }> = [];

    await sequelize.transaction(async (t) => {
      for (const item of items) {
        const header = await this.headerRepository.getById(item.id, t);
        // Guard: harus ada record actual aktif; header GR (sudah lanjut proses) ditolak
        const hasActual = (
          await this.actualRepository.findActiveByHeaderIds([item.id])
        ).length > 0;
        if (!header || !header.get('isActual') || !hasActual) {
          skipped.push({ id: item.id, reason: 'No active actual record' });
          continue;
        }
        if (header.get('status') === INCOMING_STATUS.GOODS_RECEIPT) {
          skipped.push({
            id: item.id,
            reason: `Status already ${INCOMING_STATUS.GOODS_RECEIPT}`,
          });
          continue;
        }

        // 1. soft-delete record ActualIncoming (audit deletedBy/Date = alasan via user)
        await this.actualRepository.softDeleteByHeaderIds(
          [item.id],
          `${userBy}: ${item.description}`,
          t,
        );

        // 2. header: balik ke Binning + isActual=0
        await this.headerRepository.updateHeader(
          item.id,
          {
            status: INCOMING_STATUS.BINNING,
            isActual: false,
            modifiedBy: userBy,
            modifiedDate: now,
          },
          t,
        );

        // 3. history rollback (status STRING(20) — alasan lengkap sudah di audit soft-delete)
        await this.headerRepository.insertHistory(
          item.id,
          'Delete Actual',
          userBy,
          t,
        );
        deleted.push(item.id);
      }
    });

    return {
      data: { deleted: deleted.length, skipped },
      httpCode: HTTP_STATUS.OK,
    };
  }
}
