import { injectable } from 'inversify';
import { literal, Transaction, WhereOptions } from 'sequelize';
import {
  PlanIncomingDetail,
  PlanIncomingHeader,
  PlanIncomingSchedule,
  PlanIncomingHold,
  PlanIncomingDetailAddInfo,
  HoldPlanIncomingAttachment,
  HoldPlanIncomingAttachmentTemp,
} from '@/database/entities';
import { nowWib } from '@/utils';
import { PlanIncomingHoldAttributes } from '@/database/attributes';

/** A2–A5 + attachment hold (temp → permanen) */
@injectable()
export class HoldIncomingRepository {
  /** A2 — insert hold rows (parity TVP) */
  public async insertHoldRows(
    rows: PlanIncomingHoldAttributes[],
    userBy: string,
    transaction?: Transaction,
  ): Promise<void> {
    const now = nowWib();
    for (const row of rows) {
      await PlanIncomingHold.create(
        {
          ...row,
          isActive: true,
          createdDate: now,
          createdBy: userBy,
        },
        { transaction },
      );
    }
  }

  /** A2 — set isHold=1 pada headers */
  public async setHold(
    headerIds: string[],
    userBy: string,
    transaction?: Transaction,
  ): Promise<void> {
    await PlanIncomingHeader.update(
      { isHold: true, modifiedBy: userBy, modifiedDate: nowWib() },
      { where: { id: headerIds }, transaction },
    );
  }

  /** A5 — toggle isHold header */
  public async toggleHold(
    headerId: string,
    userBy: string,
    transaction?: Transaction,
  ): Promise<void> {
    await PlanIncomingHeader.update(
      {
        isHold: literal(
          `CASE WHEN ISNULL("PlanIncomingHeader"."isHold", 0) = 1 THEN 0 ELSE 1 END`,
        ),
        modifiedBy: userBy,
        modifiedDate: nowWib(),
      },
      { where: { id: headerId }, transaction },
    );
  }

  /** A3 — header isHold=1 + join schedule; order modifiedDate DESC */
  public async findHolds(headerWhere: WhereOptions) {
    return PlanIncomingHeader.findAll({
      where: { ...headerWhere, isHold: true },
      order: [['modifiedDate', 'DESC']],
    });
  }

  /** Jadwal binning untuk headerIds (merge di service) */
  public async findSchedulesByHeaderIds(headerIds: string[]) {
    if (!headerIds.length) return [];
    return PlanIncomingSchedule.findAll({
      where: { planIncomingHeaderId: headerIds, isActive: true },
    });
  }

  /** A4 — detail per header (hold detail view) */
  public async findHoldDetails(headerId: string) {
    return PlanIncomingDetail.findAll({
      where: { planIncomingHeaderId: headerId },
      include: [
        {
          model: PlanIncomingDetailAddInfo,
          as: 'addInfos',
          separate: true,
        },
      ],
    });
  }

  /** Hold rows terakhir per header (lokasi/qty/desc/attach) */
  public async findHoldRecords(headerIds: string[]) {
    if (!headerIds.length) return [];
    return PlanIncomingHold.findAll({
      where: { planIncomingHeaderId: headerIds, isActive: true },
      order: [['createdDate', 'DESC']],
    });
  }

  // === Attachment (A2b temp → A11 permanen) ===

  /** QI — temp attachments per detail (QI working screen) */
  public async findAttachmentTempsByDetail(incomingPlanDetailId: string) {
    return HoldPlanIncomingAttachmentTemp.findAll({
      where: { incomingPlanDetailId },
      order: [['createdDate', 'DESC']],
    });
  }

  public async insertAttachmentTemp(
    incomingPlanDetailId: string,
    fileName: string,
    attachmentUrl: string,
    userBy: string,
    transaction?: Transaction,
  ): Promise<void> {
    await HoldPlanIncomingAttachmentTemp.create(
      {
        incomingPlanDetailId,
        fileName,
        attachmentUrl,
        createdDate: nowWib(),
        createdBy: userBy,
      },
      { transaction },
    );
  }

  /** A10 — attachment temp untuk headers terpilih */
  public async findAttachmentTemps(headerIds: string[]) {
    if (!headerIds.length) return [];
    return HoldPlanIncomingAttachmentTemp.findAll({
      include: [
        {
          model: PlanIncomingDetail,
          as: 'attachmentDetail',
          attributes: ['id'],
          where: { planIncomingHeaderId: headerIds },
          required: true,
        },
      ],
    });
  }

  /** A10 — attachment permanen untuk headers terpilih */
  public async findAttachments(headerIds: string[]) {
    if (!headerIds.length) return [];
    return HoldPlanIncomingAttachment.findAll({
      include: [
        {
          model: PlanIncomingDetail,
          as: 'attachmentDetail',
          attributes: ['id'],
          where: { planIncomingHeaderId: headerIds },
          required: true,
        },
      ],
    });
  }

  /** A11 — pindah temp → permanen lalu hapus temp (parity usp_InsertActualIncoming) */
  public async moveTempToPermanent(
    headerIds: string[],
    transaction?: Transaction,
  ): Promise<void> {
    const temps = await this.findAttachmentTemps(headerIds);
    const now = nowWib();
    for (const temp of temps) {
      const plain = temp.get({ plain: true });
      await HoldPlanIncomingAttachment.create(
        {
          incomingPlanDetailId: plain.incomingPlanDetailId,
          fileName: plain.fileName,
          attachmentUrl: plain.attachmentUrl,
          createdDate: now,
          createdBy: plain.createdBy,
        },
        { transaction },
      );
      await HoldPlanIncomingAttachmentTemp.destroy({
        where: { id: plain.id },
        transaction,
      });
    }
  }
}
