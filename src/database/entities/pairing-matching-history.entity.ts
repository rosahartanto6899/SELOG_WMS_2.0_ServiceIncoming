import { DataTypes, ModelDefined, Optional } from 'sequelize';
import { sequelize } from '@/utils/database.util';
import { PairingMatchingHistoryAttributes } from '@/database/attributes';

type PairingMatchingHistoryCreationAttributes = Optional<
  PairingMatchingHistoryAttributes,
  'id'
>;

const tableName = 'PairingMatchingHistory';

const PairingMatchingHistory: ModelDefined<
  PairingMatchingHistoryAttributes,
  PairingMatchingHistoryCreationAttributes
> = sequelize.define(
  tableName,
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'ID',
    },
    shipmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'ShipmentId',
    },
    activityDetail: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'ActivityDetail',
    },
    activityDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'ActivityDate',
    },
    activityBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'ActivityBy',
    },
  },
  {
    tableName,
    timestamps: false,
  }
);

export { PairingMatchingHistory };
