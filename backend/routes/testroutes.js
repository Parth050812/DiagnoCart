const express=require("express");
const router=express.Router();
const TestRequest=require("../models/TestRequest");


router.post('/request-test', async (req, res) => {
  try {
    const newRequest = new TestRequest(req.body);
    await newRequest.save();
    res.status(201).json({ message: 'Test request submitted', id: newRequest._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/status/:id', async (req, res) => {
  try {
    const test = await TestRequest.findById(req.params.id);
    if (!test) return res.status(404).json({ error: 'Not found' });
    res.json({ status: test.status });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;