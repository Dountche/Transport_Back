const express = require("express");
const router = express.Router();
const { createLigne, listLignes, updateLigne, deleteLigne, getLigneById } = require("../controllers/lignes");


router.post("/", createLigne);
router.get("/", listLignes);
router.put("/:id", updateLigne);
router.delete("/:id", deleteLigne);
router.get("/:id", getLigneById)

module.exports = router;
