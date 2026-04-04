const { Op } = require('sequelize');
const Product = require('../models/Product');
const { cloudinary } = require('../config/cloudinary');

// ─── HELPER FUNCTIONS ───────────────────────────────────────────────────
const getPublicId = (url) => {
  if (!url) return null;
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return null;
  const afterUpload = url.slice(uploadIndex + 8);
  const withoutVersion = afterUpload.replace(/^v\d+\//, '');
  return withoutVersion.replace(/\.[^/.]+$/, '');
};

const deleteImageFromCloudinary = async (imageUrl) => {
  if (!imageUrl) return;
  try {
    const publicId = getPublicId(imageUrl);
    if (!publicId) return;
    console.log('🗑️ Đang xóa Cloudinary publicId:', publicId);
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('❌ Lỗi xóa ảnh Cloudinary:', err);
  }
};

// ─── MAIN SERVICES ──────────────────────────────────────────────────────

exports.getProducts = async (page = 1, limit = 15, type, search, isAvailable) => {
  const offset = (page - 1) * limit;
  const whereClause = {};

  if (type) whereClause.type = type;
  if (search) {
    whereClause.product_name = { [Op.iLike]: `%${search}%` };
  }
  if (isAvailable !== undefined) {
    whereClause.isAvailable = isAvailable === 'true' || isAvailable === true;
  }

  const { count, rows } = await Product.findAndCountAll({
    where: whereClause,
    limit,
    offset,
    order: [['createdAt', 'DESC']],
  });

  return {
    products: rows,
    pagination: {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    },
  };
};

exports.getProductById = async (id) => {
  const product = await Product.findByPk(id);
  if (!product) throw new Error('PRODUCT_NOT_FOUND');
  return product;
};

exports.createProduct = async (data, files) => {
  const { product_name, price, type, quantity, description } = data;

  if (!product_name || !price || !type) throw new Error('MISSING_FIELDS');
  if (!['FOOD', 'DRINK', 'COMBO'].includes(type)) throw new Error('INVALID_TYPE');
  if (Number(price) < 0) throw new Error('INVALID_PRICE');

  let imageUrl = null;
  const imageFile = files?.image?.[0];
  if (imageFile) {
    imageUrl = imageFile.path;
  }

  return await Product.create({
    product_name,
    price: Number(price),
    type,
    quantity: Number(quantity) || 0,
    description: description || null,
    imageUrl,
    isAvailable: true,
  });
};

exports.updateProduct = async (id, data, files) => {
  const product = await Product.findByPk(id);
  if (!product) throw new Error('PRODUCT_NOT_FOUND');

  const { product_name, price, type, quantity, description, isAvailable } = data;

  if (type && !['FOOD', 'DRINK', 'COMBO'].includes(type)) throw new Error('INVALID_TYPE');
  if (price !== undefined && Number(price) < 0) throw new Error('INVALID_PRICE');

  const imageFile = files?.image?.[0];
  let imageUrl = product.imageUrl;
  
  if (imageFile) {
    await deleteImageFromCloudinary(product.imageUrl);
    imageUrl = imageFile.path;
  }

  const updateData = {};
  if (product_name !== undefined) updateData.product_name = product_name;
  if (price !== undefined) updateData.price = Number(price);
  if (type !== undefined) updateData.type = type;
  if (quantity !== undefined) updateData.quantity = Number(quantity);
  if (description !== undefined) updateData.description = description;
  if (isAvailable !== undefined) updateData.isAvailable = isAvailable === 'true' || isAvailable === true;
  if (imageFile) updateData.imageUrl = imageUrl;

  await product.update(updateData);
  return product;
};

exports.deleteProduct = async (id) => {
  const product = await Product.findByPk(id);
  if (!product) throw new Error('PRODUCT_NOT_FOUND');

  await deleteImageFromCloudinary(product.imageUrl);
  await product.destroy();
  return true;
};

exports.updateStock = async (id, quantity) => {
  if (quantity === undefined || Number(quantity) < 0) throw new Error('INVALID_QUANTITY');

  const product = await Product.findByPk(id);
  if (!product) throw new Error('PRODUCT_NOT_FOUND');

  await product.update({ quantity: Number(quantity) });
  return product;
};

exports.toggleAvailability = async (id) => {
  const product = await Product.findByPk(id);
  if (!product) throw new Error('PRODUCT_NOT_FOUND');

  await product.update({ isAvailable: !product.isAvailable });
  return product;
};