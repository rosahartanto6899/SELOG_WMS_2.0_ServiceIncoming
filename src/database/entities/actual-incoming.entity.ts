import { DataTypes, ModelDefined, Optional } from 'sequelize';
import { sequelize } from '@/utils/database.util';
import { ActualIncomingAttributes } from '@/database/attributes';

type Creation = Optional<
  ActualIncomingAttributes,
  | 'id'
  | 'isActive'
  | 'createdDate'
  | 'createdBy'
  | 'modifiedDate'
  | 'modifiedBy'
  | 'deletedBy'
  | 'deletedDate'
>;

const tableName = 'ActualIncoming';

/** Record GR/actual (PIC, GR date, lokasi binning) — NET-NEW */
const ActualIncoming: ModelDefined<
  ActualIncomingAttributes,
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
    picReceiver: { type: DataTypes.STRING(75), allowNull: true },
    picBinner: { type: DataTypes.STRING(75), allowNull: true },
    grBy: { type: DataTypes.STRING(75), allowNull: true },
    grDate: { type: DataTypes.DATE, allowNull: true },
    binningLocation: { type: DataTypes.STRING(50), allowNull: true },
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
        name: 'idx_actual_incoming_header_id',
        fields: ['planIncomingHeaderId'],
      },
    ],
  },
);

export { ActualIncoming };
