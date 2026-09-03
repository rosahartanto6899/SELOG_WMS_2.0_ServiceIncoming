import { PlanIncomingHeader } from './plan-incoming-header.entity';
import { PlanIncomingDetail } from './plan-incoming-detail.entity';
import {
  PlanIncomingHeaderAddInfo,
  PlanIncomingDetailAddInfo,
} from './plan-incoming-add-info.entity';
import { PlanIncomingSchedule } from './plan-incoming-schedule.entity';
import { PlanIncomingHistory } from './plan-incoming-history.entity';
import { PlanIncomingHold } from './plan-incoming-hold.entity';
import { ActualIncoming } from './actual-incoming.entity';
import { HoldPlanIncomingAttachment } from './hold-plan-incoming-attachment.entity';

export function setupAssociations() {
  // PlanIncomingHeader has many PlanIncomingDetail
  PlanIncomingHeader.hasMany(PlanIncomingDetail, {
    foreignKey: 'planIncomingHeaderId',
    as: 'details',
  });

  // PlanIncomingDetail belongs to PlanIncomingHeader
  PlanIncomingDetail.belongsTo(PlanIncomingHeader, {
    foreignKey: 'planIncomingHeaderId',
    as: 'header',
  });

  // PlanIncomingHeader has many AddInfo
  PlanIncomingHeader.hasMany(PlanIncomingHeaderAddInfo, {
    foreignKey: 'planIncomingHeaderId',
    as: 'addInfos',
  });

  // PlanIncomingDetail has many AddInfo
  PlanIncomingDetail.hasMany(PlanIncomingDetailAddInfo, {
    foreignKey: 'planIncomingDetailId',
    as: 'addInfos',
  });

  // PlanIncomingHeader has many Schedule (hold binning)
  PlanIncomingHeader.hasMany(PlanIncomingSchedule, {
    foreignKey: 'planIncomingHeaderId',
    as: 'schedules',
  });

  // PlanIncomingHeader has many History
  PlanIncomingHeader.hasMany(PlanIncomingHistory, {
    foreignKey: 'planIncomingHeaderId',
    as: 'histories',
  });

  // PlanIncomingHeader has many Hold record
  PlanIncomingHeader.hasMany(PlanIncomingHold, {
    foreignKey: 'planIncomingHeaderId',
    as: 'holds',
  });

  // PlanIncomingHeader has many ActualIncoming (GR)
  PlanIncomingHeader.hasMany(ActualIncoming, {
    foreignKey: 'planIncomingHeaderId',
    as: 'actuals',
  });

  // PlanIncomingDetail has many Attachment
  PlanIncomingDetail.hasMany(HoldPlanIncomingAttachment, {
    foreignKey: 'incomingPlanDetailId',
    as: 'attachments',
  });
}
