const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Genre = sequelize.define('Genre', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: {
      msg: 'Tên thể loại này đã tồn tại!'
    },
    validate: {
      notEmpty: { msg: 'Tên thể loại không được để trống!' }
    }
  }
}, {
  timestamps: true
});

module.exports = Genre;