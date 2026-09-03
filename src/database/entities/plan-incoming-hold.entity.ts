import { DataTypes, ModelDefined, Optional } from 'sequelize';
import { sequelize } from '@/utils/database.util';
import { PlanIncomingHoldAttributes } from '@/database/attributes';

type Creation = Optional<
  PlanIncomingHoldAttributes,
  | 'id'
  | 'isActive'
  | 'createdDate'
  | 'createdBy'
  | 'modifiedDate'
  | 'modifiedBy'
  | 'deletedBy'
  | 'deletedDate'
>;

const tableName = 'PlanIncomingHold';

/** Record hold per header — NET-NEW (parity field TVP HoldIncomingTempsList1) */
const PlanIncomingHold: ModelDefined<
  PlanIncomingHoldAttributes,
  Creation
> = sequelize.define(
  tableName,
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    planIncomingHeaderId: { type: DataTypes.UUID, allowNull: false },
    locationId: { type: DataTypes.STRING(50), allowNull: true },
    locationName: { type: DataTypes.STRING(100), allowNull: true },
    qty: { type: DataTypes.INTEGER, allowNull: false },
    description: { type: DataTypes.STRING(500), allowNull: true },
    attachPhotos: { type: DataTypes.STRING(500), allowNull: true },
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
        name: 'idx_plan_incoming_hold_header_id',
        fields: ['planIncomingHeaderId'],
      },
    ],
  },
);

export { PlanIncomingHold };
