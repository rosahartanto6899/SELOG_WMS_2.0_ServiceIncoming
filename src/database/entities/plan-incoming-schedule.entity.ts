import { DataTypes, ModelDefined, Optional } from 'sequelize';
import { sequelize } from '@/utils/database.util';
import { PlanIncomingScheduleAttributes } from '@/database/attributes';

type Creation = Optional<
  PlanIncomingScheduleAttributes,
  | 'id'
  | 'isActive'
  | 'createdDate'
  | 'createdBy'
  | 'modifiedDate'
  | 'modifiedBy'
  | 'deletedBy'
  | 'deletedDate'
>;

const tableName = 'HoldPlanIncoming';

/** Jadwal binning hold (PIC receiver/binner, lokasi, jadwal) — tabel legacy */
const PlanIncomingSchedule: ModelDefined<
  PlanIncomingScheduleAttributes,
  Creation
> = sequelize.define(
  'PlanIncomingSchedule',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    planIncomingHeaderId: { type: DataTypes.UUID, allowNull: true },
    picReceiver: { type: DataTypes.STRING(75), allowNull: true },
    picBinner: { type: DataTypes.STRING(75), allowNull: true },
    binningLocation: { type: DataTypes.STRING(50), allowNull: true },
    incomingStartDate: { type: DataTypes.DATEONLY, allowNull: true },
    incomingStartTime: { type: DataTypes.TIME, allowNull: true },
    incomingEndDate: { type: DataTypes.DATEONLY, allowNull: true },
    incomingEndTime: { type: DataTypes.TIME, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true },
    createdDate: { type: DataTypes.DATE, allowNull: true },
    createdBy: { type: DataTypes.STRING(75), allowNull: true },
    modifiedDate: { type: DataTypes.DATE, allowNull: true },
    modifiedBy: { type: DataTypes.STRING(75), allowNull: true },
    deletedBy: { type: DataTypes.STRING(100), allowNull: true },
    deletedDate: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName,
    timestamps: false,
    indexes: [
      {
        name: 'idx_hold_plan_incoming_header_id',
        fields: ['planIncomingHeaderId'],
      },
    ],
  },
);

export { PlanIncomingSchedule };
