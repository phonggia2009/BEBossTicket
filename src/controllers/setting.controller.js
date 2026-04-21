const { Setting } = require('../models');

const getSettings = async (req, res) => {
  try {
    const [setting] = await Setting.findOrCreate({
      where: { id: 1 },
      defaults: { maintenanceMode: false, bannerMovies: [] } 
    });
    return res.status(200).json(setting);
  } catch (error) {
    console.error("===== LỖI GET SETTING =====", error); 
    return res.status(500).json({ message: 'Lỗi server khi lấy cấu hình', error: error.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { maintenanceMode, bannerMovies } = req.body;
    
    if (bannerMovies && bannerMovies.length > 3) {
      return res.status(400).json({ message: 'Chỉ được chọn tối đa 3 phim làm banner' });
    }

    await Setting.update(
      { maintenanceMode, bannerMovies },
      { where: { id: 1 } }
    );
    
    return res.status(200).json({ message: 'Cập nhật cấu hình thành công' });
  } catch (error) {
    console.error("===== LỖI UPDATE SETTING =====", error);
    return res.status(500).json({ message: 'Lỗi server khi cập nhật cấu hình', error: error.message });
  }
};

module.exports = { getSettings, updateSettings };