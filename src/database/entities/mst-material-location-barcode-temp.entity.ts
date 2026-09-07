import { DataTypes, ModelDefined, Optional } from 'sequelize';
import { sequelize } from '@/utils/database.util';
import { MstMaterialLocationBarcodeTempAttributes } from '@/database/attributes';

type Creation = Optional<MstMaterialLocationBarcodeTempAttributes, 'id'>;

const tableName = 'MstMaterialLocationBarcodeTemp';

/** Staging master barcode material+lokasi — sumber B4 barcode sync (read-only di fitur ini) */
const MstMaterialLocationBarcodeTemp: ModelDefined<
  MstMaterialLocationBarcodeTempAttributes,
  Creation
> = sequelize.define(
  tableName,
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    materialCode: { type: DataTypes.STRING(100), allowNull: true },
    materialBarcode: { type: DataTypes.STRING(12), allowNull: true },
    locationBarcode: { type: DataTypes.STRING(12), allowNull: true },
    warehouseCode: { type: DataTypes.STRING(50), allowNull: true },
    customerCode: { type: DataTypes.STRING(50), allowNull: true },
  },
  {
    tableName,
    timestamps: false,
    indexes: [
      {
        name: 'idx_mst_material_location_barcode_temp_material',
        fields: ['materialCode'],
      },
    ],
  },
);

export { MstMaterialLocationBarcodeTemp };
