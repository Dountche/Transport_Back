const express = require("express");
const router = express.Router();
const {createTrajet, listTrajets, updateTrajet, deleteTrajet, getTrajetById} = require("../controllers/trajets")

router.post("/", createTrajet);
router.get("/", listTrajets);
router.put("/:id", updateTrajet);
router.delete("/:id", deleteTrajet);
router.get("/:id", getTrajetById)

module.exports = router;
