const Genre = require('../models/Genre');

exports.getAllGenres = async () => {
  return await Genre.findAll({ order: [['name', 'ASC']] });
};

exports.createGenre = async (name) => {
  return await Genre.create({ name });
};

exports.updateGenre = async (id, name) => {
  const genre = await Genre.findByPk(id);
  if (!genre) throw new Error('GENRE_NOT_FOUND');
  
  await genre.update({ name });
  return genre;
};

exports.deleteGenre = async (id) => {
  const genre = await Genre.findByPk(id);
  if (!genre) throw new Error('GENRE_NOT_FOUND');
  
  await genre.destroy();
  return true;
};