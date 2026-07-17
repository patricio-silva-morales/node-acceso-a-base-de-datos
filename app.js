require("dotenv").config();

const express = require("express");
const path = require("path");
const pool = require("./config/db");

const app = express();

const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");

app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

app.get("/", async(req, res) => {
    try {
        const resultado = await pool.query(
            "SELECT * FROM empleados ORDER BY id"
        );

        res.render("empleados", {
            empleados: resultado.rows
        });
    }
    catch (error) {
        console.log("Error al consultar los datos");
    }

});

app.listen(PORT, () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);
});