require("dotenv").config();

const express = require("express");
const path = require("path");
const pool = require("./config/db");

const app = express();

const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");

app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

app.get("/", async(req, res) => {
    try {
        const resultado = await pool.query(
            "SELECT * FROM empleados ORDER BY id"
        );

        res.render("empleados", {
            empleados: resultado.rows,
            mensaje: req.query.mensaje || null,
            error: req.query.error || null
        });
    }
    catch (error) {
        console.log("Error al consultar los datos");
    }
});

app.post("/empleados", async(req, res) => {
    try {
        const { nombre, cargo, sueldo } = req.body;

        console.log("nombre: " + nombre);
        console.log("cargo: " + cargo);
        console.log("sueldo: " + sueldo);

        if (!nombre || !cargo || !sueldo) {
            return res.redirect("/?error=Todos los campos son obligatorios");
        }

        const sueldoNumero = Number(sueldo);

        if (!Number.isInteger(sueldoNumero) || sueldoNumero <= 0) {
            return res.redirect("/?error=El sueldo debe ser un número entero mayor a cero");
        }

        await pool.query(
            `INSERT INTO empleados (nombre, cargo, sueldo)
            VALUES ($1, $2, $3)
            `,
            [
                nombre.trim(),
                cargo.trim(),
                sueldoNumero
            ]
        );

        res.redirect("/?mensaje=Empleado registrado correctamente");
    }
    catch(error) {
        console.log("Error al consultar los datos");

        res.redirect("/?error=No fue posible registrar al empleado")
    }
});

app.get("/empleados/editar/:id", async(req, res) => {
    try {
        const { id } = req.params;
        
        const resultado = await pool.query("SELECT * FROM empleados where id = $1",
                                            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).send("Empleado no encontrado");
        }

        res.render("editar-empleado", {
            empleado: resultado.rows[0],
            error: null
        });

    }
    catch(error) {
        console.log("Error al buscar al empleado");

        res.status(500).send("Ocurrió un error al buscar al empleado");
    }
});

app.post("/empleados/actualizar/:id", async(req, res) => {
    try {
        const { id } = req.params;
        const { nombre, cargo, sueldo } = req.body;

        console.log(nombre + " - " + cargo + " - " + sueldo)

        if (!nombre || !cargo || !sueldo) {
            return res.status(400).send("Todos los campos son requeridos");        
        }

        const sueldoNumero = Number(sueldo);

        if (!Number.isInteger(sueldoNumero) || sueldoNumero <= 0) {
            return res.status(400).send("El sueldo debe ser un número entero mayor a cero");
        }

        const resultado = await pool.query(
            `   UPDATE empleados
                SET nombre = $1,
                    cargo = $2,
                    sueldo = $3
                WHERE id = $4
            `,
            [
                nombre.trim(),
                cargo.trim(),
                sueldoNumero,
                id
            ]
        );

        if (resultado.rowCount === 0) {
            return res.status(404).send("Empleado no encontrado");
        }

        res.redirect("/?mensaje=Empleado actualizado correctamente");
    }
    catch(error) {
        console.log("Error al actualizar al empleado");

        res.status(500).send("Ocurrió un error al intentar actualizar al empleado");
    }    
});

app.post("/empleados/eliminar/:id", async(req, res) => {
    try {
        const { id } = req.params;

        const resultado = await pool.query(`
                DELETE FROM empleados
                WHERE id = $1
            `,
            [ id ]
        );

        if (resultado.rowCount === 0) {
            return res.status(404).send("Empleado no encontrado");
        }
        
        res.redirect("/?mensaje=Empleado eliminado exitosamente");
    }
    catch(error) {
        console.log("Error al eliminar al empleado");

        res.status(500).send("Ocurrió un error al intentar eliminar al empleado");
    }
});

app.get("/consulta", async(req, res) => {
    try{
        const consulta = {
            text: `
                    SELECT id, nombre, cargo, sueldo
                    FROM empleados
                    ORDER BY id    
                `,
            values: []
        };

        const resultado = await pool.query(consulta);

        res.render('consulta', {
            empleados: resultado.rows,
            cargo: '',
            sueldoMinimo: '',
            mensaje: ''
        });
    }
    catch(error){
        console.log(error);
        res.status(500).render('consulta', {
                empleados: [],
                cargo: '',
                sueldoMinimo: '',
                mensaje: 'No se pudo obtener la lista de empleados'
            }
        );
    }
});

app.post("/consulta", async(req, res) => {
    const cargo = req.body.cargo?.trim() || '';
    const sueldoMinimo = req.body.sueldoMinimo?.trim() || '';

    try {
        let textoConsulta = `
            SELECT id, nombre, cargo, sueldo
            FROM empleados
            WHERE 1=1 
        `;

        const valores = [];

        if (cargo !== '') {
            valores.push(`${cargo}%`);
            textoConsulta += ` AND cargo ILIKE $${valores.length}`;
        }

        if (sueldoMinimo !== '') {
            const sueldo = Number(sueldoMinimo);

            if (!Number.isInteger(sueldo) || sueldo < 0){
                return res.status(400).render('consulta', {
                    empleados: [],
                    cargo,
                    sueldoMinimo,
                    mensaje: 'El sueldo mínimo debe ser un número entero positivo'
                });
            }
            
            valores.push(sueldo);
            textoConsulta += ` AND sueldo >= $${valores.length}`;
                       
        }
        textoConsulta += ' ORDER BY sueldo DESC';
        
        const consulta = {
            text: textoConsulta,
            values: valores
        }

        const resultado = await pool.query(consulta);

        res.render('consulta', {
            empleados: resultado.rows,
            cargo,
            sueldoMinimo,
            mensaje: resultado.rowCount === 0 ? "No se encontraron registros" : ''
        });
    }
    catch(error){
        console.log(error);
        res.status(500).render('consulta', {
                empleados: [],
                cargo: '',
                sueldoMinimo: '',
                mensaje: 'No se pudo obtener la lista de empleados'
            }
        );
    }
});

app.listen(PORT, () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);
});