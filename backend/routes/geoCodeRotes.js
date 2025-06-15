const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/reverse-geocode', async (req, res) => {
  const { lat, lon } = req.query;

  try {
    const response = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
      params: {
        format: 'json',
        lat,
        lon,
        zoom: 18,
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'DiagnoCart-Prototype/1.0'
      }
    });

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch address' });
  }
});

module.exports = router;
