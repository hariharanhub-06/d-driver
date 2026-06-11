const prisma = require('../prisma');

const SINGLETON_ID = 'singleton';

// GET /platform/config — public, returns logo URL and basic config
const getConfig = async (req, res) => {
  try {
    const config = await prisma.platformConfig.findUnique({ where: { id: SINGLETON_ID } });
    res.json(config || { platform_logo_url: null });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching platform config' });
  }
};

// PUT /platform/config — Dev SA only, update platform logo URL
const updateConfig = async (req, res) => {
  try {
    const { platform_logo_url } = req.body;

    const config = await prisma.platformConfig.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, platform_logo_url: platform_logo_url || null },
      update: { platform_logo_url: platform_logo_url || null },
    });

    res.json(config);
  } catch (err) {
    console.error('updateConfig error:', err);
    res.status(500).json({ error: 'Error updating platform config' });
  }
};

module.exports = { getConfig, updateConfig };
