const express = require("express");
const router = express.Router();
const { createVehicule, listVehicules, updateVehicule, deleteVehicule, getVehiculeById } = require("../controllers/vehicules");

// CRUD vehicule
router.post("/", createVehicule);
router.get("/", listVehicules);
router.put("/:id", updateVehicule);
router.delete("/:id", deleteVehicule);
router.get("/:id", getVehiculeById)

module.exports = router;
