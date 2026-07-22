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

app.get('/asistencias', async (req, res) => {
    try {
        const consulta = {
            text: `
                SELECT 
                    asistencias.id,
                    empleados.nombre,
                    asistencias.fecha,
                    asistencias.presente
                FROM asistencias
                INNER JOIN empleados
                    ON asistencias.empleado_id = empleados.id
                ORDER BY asistencias.fecha, empleados.nombre
            `,
            values: []
        };

        const resultado = await pool.query(consulta);

        res.render('asistencias', {
            asistencias: resultado.rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).send('Error al consultar las asistencias');
    }
});

app.get('/consulta-asistencias', (req, res) => {
    res.render('consulta_asistencias_con_filtro', {
        asistencias: [],
        nombre: '',
        fecha: '',
        mensaje: ''
    });
});

app.post('/consulta-asistencias', async (req, res) => {
    const nombre = req.body.nombre?.trim() || '';
    const fecha = req.body.fecha || '';

    try {
        let textoConsulta = `
            SELECT
                asistencias.id,
                empleados.nombre,
                asistencias.fecha,
                asistencias.presente
            FROM asistencias
            INNER JOIN empleados
                ON asistencias.empleado_id = empleados.id
            WHERE 1 = 1
        `;

        const valores = [];

        if (nombre !== '') {
            valores.push(`%${nombre}%`);
            textoConsulta += `
                AND empleados.nombre ILIKE $${valores.length}
            `;
        }

        if (fecha !== '') {
            valores.push(fecha);
            textoConsulta += `
                AND asistencias.fecha = $${valores.length}
            `;
        }

        textoConsulta += `
            ORDER BY asistencias.fecha, empleados.nombre
        `;

        const consulta = {
            text: textoConsulta,
            values: valores
        };

        const resultado = await pool.query(consulta);

        res.render('consulta_asistencias_con_filtro', {
            asistencias: resultado.rows,
            nombre,
            fecha,
            mensaje:
                resultado.rows.length === 0
                    ? 'No se encontraron registros de asistencia.'
                    : ''
        });

    } catch (error) {
        console.error(error);

        res.status(500).render('consulta_asistencias_con_filtro', {
            asistencias: [],
            nombre,
            fecha,
            mensaje: 'Ocurrió un error al realizar la consulta.'
        });
    }
});

app.get('/registrar-asistencia', async (req, res) => {
    try {
        const consulta = {
            text: `
                SELECT id, nombre
                FROM empleados
                ORDER BY nombre
            `,
            values: []
        };

        const resultado = await pool.query(consulta);

        res.render('registrar_asistencia', {
            empleados: resultado.rows,
            mensaje: '',
            tipoMensaje: ''
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al cargar los empleados');
    }
});

app.post('/registrar-asistencia', async (req, res) => {
    const empleadoId = Number(req.body.empleado_id);
    const fecha = req.body.fecha;
    const presente = req.body.presente === 'true';

    const cliente = await pool.connect();

    try {
        await cliente.query('BEGIN');

        const consultaEmpleado = {
            text: `
                SELECT id
                FROM empleados
                WHERE id = $1
            `,
            values: [empleadoId]
        };

        const resultadoEmpleado = await cliente.query(consultaEmpleado);

        if (resultadoEmpleado.rowCount === 0) {
            throw new Error('El empleado no existe');
        }

        const insertarAsistencia = {
            text: `
                INSERT INTO asistencias (
                    empleado_id,
                    fecha,
                    presente
                )
                VALUES ($1, $2, $3)
            `,
            values: [empleadoId, fecha, presente]
        };

        await cliente.query(insertarAsistencia);

        if (presente) {
            const actualizarEmpleado = {
                text: `
                    UPDATE empleados
                    SET total_asistencias = total_asistencias + 1
                    WHERE id = $1
                `,
                values: [empleadoId]
            };

            await cliente.query(actualizarEmpleado);
        }

        await cliente.query('COMMIT');

        const resultadoEmpleados = await pool.query({
            text: `
                SELECT id, nombre
                FROM empleados
                ORDER BY nombre
            `,
            values: []
        });

        res.render('registrar_asistencia', {
            empleados: resultadoEmpleados.rows,
            mensaje: 'Asistencia registrada correctamente.',
            tipoMensaje: 'success'
        });
    } catch (error) {
        await cliente.query('ROLLBACK');

        console.error(error);

        const resultadoEmpleados = await pool.query({
            text: `
                SELECT id, nombre
                FROM empleados
                ORDER BY nombre
            `,
            values: []
        });

        res.status(400).render('registrar_asistencia', {
            empleados: resultadoEmpleados.rows,
            mensaje: error.message,
            tipoMensaje: 'danger'
        });
    } finally {
        cliente.release();
    }
});

app.listen(PORT, () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);
});