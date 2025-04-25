import express from "express";
import Doctor from "../models/doctorModel.js";
import doctorRouter from "./doctorRoute.js";

const router = express.Router();

router.post("/search-doctors", async (req, res) => {
  try {
    const { specialist, location, availabilitySlot } = req.body;

    if (!specialist || !location) {
      return res.status(400).json({ error: "Specialist and location are required!" });
    }

    // Ensure location string is trimmed
    const locationQuery = location.trim();

    // Build MongoDB query
    const query = {
      speciality: specialist,
      available: true,
      $or: [
        { "address.line1": { $regex: locationQuery, $options: "i" } },
        { "address.line2": { $regex: locationQuery, $options: "i" } },
      ],
    };

    if (availabilitySlot) {
      query.date = { $gte: availabilitySlot }; // Filter by availability date
    }

    const doctors = await Doctor.find(query);
    res.json(doctors);
  } catch (error) {
    console.error("Error searching doctors:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

export default doctorRouter;
