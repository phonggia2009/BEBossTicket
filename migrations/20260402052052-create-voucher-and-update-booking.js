'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // 1. Tạo bảng vouchers
    await queryInterface.createTable('vouchers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      discount_type: {
        type: Sequelize.ENUM('PERCENTAGE', 'FIXED'),
        allowNull: false
      },
      discount_value: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      max_discount: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      min_order_value: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      usage_limit: {
        type: Sequelize.INTEGER,
        defaultValue: 100
      },
      used_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // 2. Thêm cột voucher_id vào bảng bookings (Kèm Khóa Ngoại)
    await queryInterface.addColumn('bookings', 'voucher_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'vouchers', // Tên bảng tham chiếu
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // 3. Thêm cột discount_amount vào bảng bookings
    await queryInterface.addColumn('bookings', 'discount_amount', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0
    });
  },

  async down (queryInterface, Sequelize) {
    // Khi rollback (undo), ta làm ngược lại: Xóa cột trước, xóa bảng sau
    await queryInterface.removeColumn('bookings', 'discount_amount');
    await queryInterface.removeColumn('bookings', 'voucher_id');
    await queryInterface.dropTable('vouchers');
    
    // (Dành riêng cho PostgreSQL) Xóa luôn kiểu ENUM để dọn dẹp sạch sẽ
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_vouchers_discount_type";').catch(() => {});
  }
};