import { inject, injectable } from 'inversify';
import { HTTP_STATUS } from '@/shared-libs/constants/http-status.constant';
import { IDataUser } from '@/shared-libs/interfaces/user-data.interface';
import { sequelize, nowWib } from '@/utils';
import { awsSqsThird } from '@/integrations/thrid-party/aws-sqs.third';
import {
  OutstandingIncomingRepository,
  PlanIncomingDetailRepository,
} from '../outstanding-incoming/repositories';
import { INCOMING_STATUS } from '../outstanding-incoming/constants';

const userOf = (req: any): string => {
  const userData = req.user as unknown as IDataUser;
  return userData?.tokenName ?? userData?.tokenUserId ?? 'system';
};

/** Status yang tampil di list actual (usp_GetAllActualIncoming) — hanya itu yang bisa dihapus */
const DELETABLE_STATUS = [
  INCOMING_STATUS.GOODS_RECEIPT,
  INCOMING_STATUS.TRANSIT_OUT,
];

/** A-Delete — DELETE /:id, satu header per request (rollback ke Binning). */
@injectable()
export class CommandService {
  constructor(
    @inject(OutstandingIncomingRepository)
    private readonly headerRepository: OutstandingIncomingRepository,
    @inject(PlanIncomingDetailRepository)
    private readonly detailRepository: PlanIncomingDetailRepository,
  ) {}

  async deleteActual(req: any) {
    const { id } = req.params;
    const description = String(req.body?.description ?? '').trim();
    const userBy = req.body?.userLogin ?? userOf(req);
    const now = nowWib();

    const header = await this.headerRepository.getById(id);
    if (!header || !header.get('isActive')) {
      return {
        data: { deleted: 0, reason: 'Actual incoming not found' },
        httpCode: HTTP_STATUS.OK,
      };
    }
    const status = header.get('status') as string | null;
    if (!DELETABLE_STATUS.includes(status as never)) {
      return {
        data: { deleted: 0, reason: `Status ${status} is not deletable` },
        httpCode: HTTP_STATUS.OK,
      };
    }

    // ponytail: alasan diaudit di modifiedBy (STRING(75)) — tidak ada tabel
    // ActualIncoming untuk audit terpisah; pindah ke kolom sendiri jika perlu
    const auditBy = `${userBy}: ${description}`.slice(0, 75);

    await sequelize.transaction(async (t) => {
      // 1. header: balik ke Binning + isActual=0
      await this.headerRepository.updateHeader(
        id,
        {
          status: INCOMING_STATUS.BINNING,
          isActual: false,
          modifiedBy: auditBy,
          modifiedDate: now,
        },
        t,
      );
      // 2. history rollback
      await this.headerRepository.insertHistory(id, 'Delete Actual', userBy, t);

      // 3. SQS WHSINX per material — kembalikan SOH (parity CoreApp
      // DeleteActualIncoming: ActionType WHSINX, QtySOH = qty binning).
      // Di-dalam transaksi (beda tipis dgn CoreApp yang publish SETELAH delete):
      // gagal publish = delete rollback, SOH tidak pernah hilang.
      const details = await this.detailRepository.findByHeader(id, t);

      // 2.5. reset binning detail — qty binning dikembalikan (parity SP)
      await this.detailRepository.resetBinningByHeaderId(id, userBy, now, t);

      for (const d of details) {
        const qty = (d.get('binningQty') as number) ?? 0;
        if (!qty) continue;
        await awsSqsThird.publishToInventory(
          {
            CustomerCode: (header.get('customerCode') as string) ?? null,
            CustomerName: (header.get('customerName') as string) ?? null,
            DeliveryNoteNo: (header.get('deliveryNoteNo') as string) ?? null,
            POType: (header.get('poType') as string) ?? null,
            PODate: header.get('poDate')
              ? new Date(header.get('poDate') as Date).toISOString()
              : null,
            WarehouseCode: (header.get('warehouseCode') as string) ?? null,
            WarehouseName: (header.get('warehouseName') as string) ?? null,
            MaterialCode: (d.get('materialCode') as string) ?? null,
            MaterialName: (d.get('materialName') as string) ?? null,
            MaterialBrand: (d.get('materialBrand') as string) ?? null,
            UoM: (d.get('uom') as string) ?? null,
            QtyPlanIncoming: 0,
            QtyPlanOutgoing: 0,
            QtySOH: qty,
            QtyAvailable: 0,
          },
          userBy,
          'WHSINX',
        );
      }
    });

    return { data: { deleted: 1 }, httpCode: HTTP_STATUS.OK };
  }
}
