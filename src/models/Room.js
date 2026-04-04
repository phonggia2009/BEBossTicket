const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Room = sequelize.define('Room', {
  room_name: { type: DataTypes.STRING, allowNull: false },
  capacity: { type: DataTypes.INTEGER, defaultValue: 0 }
});

module.exports = Room;