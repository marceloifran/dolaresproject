// Configuración general de Firestore
const db = firebase.firestore();

// Utilidad para obtener un valor del input
const getVal = (id) => document.getElementById(id).value;
const clearForm = (formId) => document.getElementById(formId).reset();

// CONFIGURACIÓN DE PAGINACIÓN
// Objeto para almacenar el estado de la paginación para cada módulo
const estadoPaginacion = {
  transferencias: { pagina: 1, registrosPorPagina: 10, total: 0 },
  cables: { pagina: 1, registrosPorPagina: 10, total: 0 },
  cash_to_cash: { pagina: 1, registrosPorPagina: 10, total: 0 },
  ingreso_pesos: { pagina: 1, registrosPorPagina: 10, total: 0 },
  descuento_cheque: { pagina: 1, registrosPorPagina: 10, total: 0 },
  historial: { pagina: 1, registrosPorPagina: 10, total: 0 },
};

// Almacenamiento temporal de todos los registros (para exportación y paginación)
const datosCompletos = {
  transferencias: [],
  cables: [],
  cash_to_cash: [],
  ingreso_pesos: [],
  descuento_cheque: [],
  historial: [],
};

// Mostrar/ocultar módulos
function mostrarModulo(modulo) {
  // Ocultar todos los módulos
  document.querySelectorAll(".modulo").forEach((mod) => {
    mod.style.display = "none";
  });

  // Mostrar el módulo seleccionado
  document.getElementById(modulo).style.display = "block";

  // Cargar datos según el módulo
  switch (modulo) {
    case "operadores_clientes":
      cargarOperadores();
      cargarClientes();
      break;
    case "transferencias":
      cargarTransferencias();
      break;
    case "cables":
      cargarCables();
      break;
    case "cash_to_cash":
      cargarCash();
      break;
    case "ingreso_pesos":
      cargarIngresoPesos();
      break;
    case "descuento_cheque":
      cargarDescuentoCheque();
      break;
    case "historial_cambios":
      cargarHistorial();
      break;
    case "cuenta_corriente":
      // Al no tener cliente seleccionado inicialmente, el usuario debe seleccionar uno
      // para ver los datos, así que no se llama a cargar datos específicos
      break;
    case "resumen":
      cargarResumenAutomatico();
      break;
  }

  // Actualizar listas desplegables al cambiar de módulo
  cargarListasOperadoresClientes();
}

// Función para cambiar entre pestañas
function mostrarTab(tabId) {
  // Ocultar todos los contenidos de pestaña
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.remove("active");
  });

  // Desactivar todos los botones de pestaña
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  // Activar la pestaña seleccionada
  document.getElementById(tabId).classList.add("active");

  // Activar el botón correspondiente
  document
    .querySelector(`[onclick="mostrarTab('${tabId}')"]`)
    .classList.add("active");
}

// Mostrar "Resumen" por defecto al cargar la página
window.addEventListener("DOMContentLoaded", () => {
  // Inicializar visualización
  mostrarModulo("resumen");

  // Cargar datos iniciales
  cargarResumenAutomatico();
  cargarOperadores();
  cargarClientes();

  // Configurar eventos para los botones de carga
  const btnCargarTransferencias = document.getElementById(
    "btnCargarTransferencias"
  );
  if (btnCargarTransferencias)
    btnCargarTransferencias.addEventListener("click", cargarTransferencias);

  const btnCargarCables = document.getElementById("btnCargarCables");
  if (btnCargarCables) btnCargarCables.addEventListener("click", cargarCables);

  const btnCargarCash = document.getElementById("btnCargarCash");
  if (btnCargarCash) btnCargarCash.addEventListener("click", cargarCash);

  const btnCargarIngresoPesos = document.getElementById(
    "btnCargarIngresoPesos"
  );
  if (btnCargarIngresoPesos)
    btnCargarIngresoPesos.addEventListener("click", cargarIngresoPesos);

  const btnCargarCheques = document.getElementById("btnCargarCheques");
  if (btnCargarCheques)
    btnCargarCheques.addEventListener("click", cargarDescuentoCheque);

  const btnCargarHistorial = document.getElementById("btnCargarHistorial");
  if (btnCargarHistorial)
    btnCargarHistorial.addEventListener("click", cargarHistorial);

  // Configurar filtros de fecha para el resumen
  document
    .getElementById("btnHoy")
    .addEventListener("click", () => filtrarResumen("hoy"));
  document
    .getElementById("btnSemana")
    .addEventListener("click", () => filtrarResumen("semana"));
  document
    .getElementById("btnMes")
    .addEventListener("click", () => filtrarResumen("mes"));
  document
    .getElementById("btnTodo")
    .addEventListener("click", () => filtrarResumen("todo"));

  // Cargar listas de operadores y clientes para los desplegables
  cargarListasOperadoresClientes();

  // Inicializar formularios
  inicializarFormularioOperadores();
  inicializarFormularioClientes();
  inicializarFormulariosCuentaCorriente();

  // Configurar cálculos automáticos para los formularios
  setupTransferenciasCalculos();
  setupCablesCalculos();
  setupCashCalculos();
  setupDescuentoChequeCalculos();
  setupIngresoPesosCalculos();

  // Configurar eventos para exportación
  document.querySelectorAll(".export-btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const dropdown = this.nextElementSibling;

      // Cerrar todos los dropdowns
      document.querySelectorAll(".export-dropdown").forEach((d) => {
        if (d !== dropdown) d.style.display = "none";
      });

      // Alternar el dropdown actual
      dropdown.style.display =
        dropdown.style.display === "block" ? "none" : "block";
    });
  });

  // Cerrar dropdowns al hacer clic en cualquier parte
  document.addEventListener("click", function () {
    document.querySelectorAll(".export-dropdown").forEach((d) => {
      d.style.display = "none";
    });
  });

  // Exportar cuenta corriente a Excel
  document
    .getElementById("btnExportarCCPesos")
    .addEventListener("click", () => {
      exportarCuentaCorriente("pesos");
    });

  document
    .getElementById("btnExportarCCDolares")
    .addEventListener("click", () => {
      exportarCuentaCorriente("dolares");
    });

  // Exportar datos del resumen a Excel
  document
    .getElementById("btnExportarResumen")
    .addEventListener("click", function () {
      exportarResumen();
    });
});

function exportarResumen() {
  // Verificar que haya datos para exportar
  const tablaResumen = document.getElementById("tablaResumen");
  if (!tablaResumen.rows.length) {
    mostrarAlerta("error", "No hay datos para exportar");
    return;
  }

  // Crear un libro de trabajo nuevo
  const wb = XLSX.utils.book_new();

  // Obtener datos de la tabla
  const datos = [];

  // Añadir encabezados
  datos.push(["Tipo", "Cantidad", "Comisión USD", "Comisión ARS"]);

  // Añadir filas de datos
  Array.from(tablaResumen.rows).forEach((row) => {
    const rowData = [];
    Array.from(row.cells).forEach((cell) => {
      // Limpiar los valores de moneda quitando el signo $
      const value = cell.textContent.replace("$", "").trim();
      rowData.push(value);
    });
    datos.push(rowData);
  });

  // Crear hoja de trabajo y añadirla al libro
  const ws = XLSX.utils.aoa_to_sheet(datos);

  // Obtener el filtro activo actual
  const filtroActivo = document
    .querySelector(".filter-btn.active")
    .textContent.trim();

  // Establecer ancho de columnas
  const anchoColumnas = [
    { wch: 20 }, // Tipo
    { wch: 12 }, // Cantidad
    { wch: 15 }, // Comisión USD
    { wch: 15 }, // Comisión ARS
  ];
  ws["!cols"] = anchoColumnas;

  // Nombre de la hoja
  XLSX.utils.book_append_sheet(wb, ws, "Resumen");

  // Nombre del archivo con fecha
  const fechaActual = new Date()
    .toLocaleDateString("es-AR")
    .replace(/\//g, "-");
  const nombreArchivo = `Resumen_Comisiones_${filtroActivo}_${fechaActual}.xlsx`;

  // Exportar archivo
  XLSX.writeFile(wb, nombreArchivo);

  mostrarAlerta("success", `Resumen exportado como ${nombreArchivo}`);
}

// ================== OPERADORES ==================
function inicializarFormularioOperadores() {
  const formOperadores = document.getElementById("formOperadores");

  formOperadores.onsubmit = async (e) => {
    e.preventDefault();
    try {
      await db.collection("operadores").add({
        nombre: getVal("nombreOperador"),
        telefono: getVal("telefonoOperador") || "",
        email: getVal("emailOperador") || "",
        notas: getVal("notasOperador") || "",
        timestamp: new Date(),
      });

      clearForm("formOperadores");
      cargarOperadores();
      cargarListasOperadoresClientes(); // Actualizar listas desplegables

      Swal.fire({
        icon: "success",
        title: "Éxito",
        text: "Operador agregado correctamente",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo guardar el operador: " + error.message,
      });
    }
  };
}

async function cargarOperadores() {
  const tbody = document.getElementById("tablaOperadores");
  tbody.innerHTML = "";

  try {
    const snap = await db.collection("operadores").orderBy("nombre").get();

    if (snap.empty) {
      tbody.innerHTML =
        '<tr><td colspan="4" style="text-align: center;">No hay operadores registrados</td></tr>';
      return;
    }

    snap.forEach((doc) => {
      const d = doc.data();
      tbody.innerHTML += `
      <tr>
          <td>${d.nombre}</td>
          <td>${d.telefono || "-"}</td>
          <td>${d.email || "-"}</td>
          <td>
            <button class="btn-editar" onclick="editarOperador('${
              doc.id
            }')">Editar</button>
            <button onclick="eliminarRegistro('operadores', '${
              doc.id
            }', function() { cargarOperadores(); cargarListasOperadoresClientes(); })">Eliminar</button>
          </td>
      </tr>`;
    });
  } catch (error) {
    console.error("Error al cargar operadores:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error al cargar los operadores: " + error.message,
    });
  }
}

// Función para editar operador
async function editarOperador(id) {
  try {
    const doc = await db.collection("operadores").doc(id).get();
    if (!doc.exists) {
      Swal.fire("Error", "Operador no encontrado", "error");
      return;
    }

    const operador = doc.data();

    const { value: formValues } = await Swal.fire({
      title: "Editar Operador",
      html: `
        <input id="swal-nombre" class="swal2-input" placeholder="Nombre" value="${
          operador.nombre || ""
        }" required>
        <input id="swal-telefono" class="swal2-input" placeholder="Teléfono" value="${
          operador.telefono || ""
        }">
        <input id="swal-email" class="swal2-input" placeholder="Email" value="${
          operador.email || ""
        }">
        <input id="swal-notas" class="swal2-input" placeholder="Notas" value="${
          operador.notas || ""
        }">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const nombre = document.getElementById("swal-nombre").value;
        if (!nombre.trim()) {
          Swal.showValidationMessage("El nombre es obligatorio");
          return false;
        }

        return {
          nombre: nombre,
          telefono: document.getElementById("swal-telefono").value,
          email: document.getElementById("swal-email").value,
          notas: document.getElementById("swal-notas").value,
        };
      },
    });

    if (formValues) {
      await db
        .collection("operadores")
        .doc(id)
        .update({
          ...formValues,
          timestamp: new Date(),
        });

      cargarOperadores();
      cargarListasOperadoresClientes(); // Actualizar listas desplegables

      Swal.fire(
        "¡Actualizado!",
        "Operador actualizado correctamente",
        "success"
      );
    }
  } catch (error) {
    console.error("Error al editar operador:", error);
    Swal.fire(
      "Error",
      "No se pudo editar el operador: " + error.message,
      "error"
    );
  }
}

// ================== CLIENTES ==================
function inicializarFormularioClientes() {
  const formClientes = document.getElementById("formClientes");

  formClientes.onsubmit = async (e) => {
    e.preventDefault();
    try {
      await db.collection("clientes").add({
        nombre: getVal("nombreCliente"),
        telefono: getVal("telefonoCliente") || "",
        email: getVal("emailCliente") || "",
        direccion: getVal("direccionCliente") || "",
        notas: getVal("notasCliente") || "",
        timestamp: new Date(),
      });

      clearForm("formClientes");
      cargarClientes();
      cargarListasOperadoresClientes(); // Actualizar listas desplegables

      Swal.fire({
        icon: "success",
        title: "Éxito",
        text: "Cliente agregado correctamente",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo guardar el cliente: " + error.message,
      });
    }
  };
}

async function cargarClientes() {
  const tbody = document.getElementById("tablaClientes");
  tbody.innerHTML = "";

  try {
    const snap = await db.collection("clientes").orderBy("nombre").get();

    if (snap.empty) {
      tbody.innerHTML =
        '<tr><td colspan="4" style="text-align: center;">No hay clientes registrados</td></tr>';
      return;
    }

    snap.forEach((doc) => {
      const d = doc.data();
      tbody.innerHTML += `
        <tr>
          <td>${d.nombre}</td>
          <td>${d.telefono || "-"}</td>
          <td>${d.email || "-"}</td>
          <td>
            <button class="btn-editar" onclick="editarCliente('${
              doc.id
            }')">Editar</button>
            <button onclick="eliminarRegistro('clientes', '${
              doc.id
            }', function() { cargarClientes(); cargarListasOperadoresClientes(); })">Eliminar</button>
          </td>
        </tr>`;
    });
  } catch (error) {
    console.error("Error al cargar clientes:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error al cargar los clientes: " + error.message,
    });
  }
}

// Función para editar cliente
async function editarCliente(id) {
  try {
    const doc = await db.collection("clientes").doc(id).get();
    if (!doc.exists) {
      Swal.fire("Error", "Cliente no encontrado", "error");
      return;
    }

    const cliente = doc.data();

    const { value: formValues } = await Swal.fire({
      title: "Editar Cliente",
      html: `
        <input id="swal-nombre" class="swal2-input" placeholder="Nombre" value="${
          cliente.nombre || ""
        }" required>
        <input id="swal-telefono" class="swal2-input" placeholder="Teléfono" value="${
          cliente.telefono || ""
        }">
        <input id="swal-email" class="swal2-input" placeholder="Email" value="${
          cliente.email || ""
        }">
        <input id="swal-direccion" class="swal2-input" placeholder="Dirección" value="${
          cliente.direccion || ""
        }">
        <input id="swal-notas" class="swal2-input" placeholder="Notas" value="${
          cliente.notas || ""
        }">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const nombre = document.getElementById("swal-nombre").value;
        if (!nombre.trim()) {
          Swal.showValidationMessage("El nombre es obligatorio");
          return false;
        }

        return {
          nombre: nombre,
          telefono: document.getElementById("swal-telefono").value,
          email: document.getElementById("swal-email").value,
          direccion: document.getElementById("swal-direccion").value,
          notas: document.getElementById("swal-notas").value,
        };
      },
    });

    if (formValues) {
      await db
        .collection("clientes")
        .doc(id)
        .update({
          ...formValues,
          timestamp: new Date(),
        });

      cargarClientes();
      cargarListasOperadoresClientes(); // Actualizar listas desplegables

      Swal.fire(
        "¡Actualizado!",
        "Cliente actualizado correctamente",
        "success"
      );
    }
  } catch (error) {
    console.error("Error al editar cliente:", error);
    Swal.fire(
      "Error",
      "No se pudo editar el cliente: " + error.message,
      "error"
    );
  }
}

// Función para llenar los selects de operadores y clientes
async function cargarListasOperadoresClientes() {
  try {
    // Operadores para los selectores
    const snapOperadores = await db
      .collection("operadores")
      .orderBy("nombre")
      .get();

    const operadores = [];
    snapOperadores.forEach((doc) => {
      operadores.push({
        id: doc.id,
        nombre: doc.data().nombre,
      });
    });

    // Rellenar todos los selectores de operadores
    const selectoresOperadores = ["operadorTrans", "operadorIngreso"];

    selectoresOperadores.forEach((id) => {
      const selector = document.getElementById(id);
      if (selector) {
        // Guardar la opción seleccionada actual
        const valorSeleccionado = selector.value;

        // Limpiar y agregar primera opción
        selector.innerHTML = '<option value="">Seleccione Operador</option>';

        // Agregar operadores
        operadores.forEach((op) => {
          selector.innerHTML += `<option value="${op.id}">${op.nombre}</option>`;
        });

        // Restaurar selección anterior si existía
        if (valorSeleccionado) {
          selector.value = valorSeleccionado;
        }
      }
    });

    // Clientes para los selectores
    const snapClientes = await db
      .collection("clientes")
      .orderBy("nombre")
      .get();

    const clientes = [];
    snapClientes.forEach((doc) => {
      clientes.push({
        id: doc.id,
        nombre: doc.data().nombre,
      });
    });

    // Rellenar todos los selectores de clientes
    const selectoresClientes = [
      "clienteTrans",
      "clienteCable",
      "clienteCash",
      "clienteIngreso",
      "clienteCheque",
      "clienteCCPesos",
      "clienteCCDolares",
      "clienteMovimientoPesos",
      "clienteMovimientoDolares",
    ];

    selectoresClientes.forEach((id) => {
      const selector = document.getElementById(id);
      if (selector) {
        // Guardar la opción seleccionada actual
        const valorSeleccionado = selector.value;

        // Limpiar y agregar primera opción
        selector.innerHTML = '<option value="">Seleccione Cliente</option>';

        // Agregar clientes
        clientes.forEach((cl) => {
          selector.innerHTML += `<option value="${cl.id}">${cl.nombre}</option>`;
        });

        // Restaurar selección anterior si existía
        if (valorSeleccionado) {
          selector.value = valorSeleccionado;
        }
      }
    });
  } catch (error) {
    console.error("Error al cargar listas:", error);
  }
}

// ================== RESUMEN AUTOMÁTICO ==================
// Reemplazar la función antigua de resumen manual
async function cargarResumenAutomatico(periodo = "todo") {
  const tbody = document.getElementById("tablaResumen");
  const totalUsdElement = document.getElementById("totalUsd");
  const totalArsElement = document.getElementById("totalArs");

  // Resetear las clases activas de los botones de filtro
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  document
    .getElementById(`btn${periodo.charAt(0).toUpperCase() + periodo.slice(1)}`)
    .classList.add("active");

  tbody.innerHTML =
    '<tr><td colspan="4" style="text-align: center;">Cargando datos...</td></tr>';

  try {
    // Obtener todas las colecciones necesarias
    const fechaInicio = obtenerFechaInicio(periodo);

    // Obtener datos de todas las colecciones
    const transferencias = await obtenerDatosConFiltro(
      "transferencias",
      fechaInicio
    );
    const cables = await obtenerDatosConFiltro("cables", fechaInicio);
    const cashToCash = await obtenerDatosConFiltro("cash_to_cash", fechaInicio);
    const ingresoPesos = await obtenerDatosConFiltro(
      "ingreso_pesos",
      fechaInicio
    );
    const descuentoCheque = await obtenerDatosConFiltro(
      "descuento_cheque",
      fechaInicio
    );

    // Crear resumen
    const resumen = [
      {
        tipo: "Transferencias",
        cantidad: transferencias.length,
        comisionUsd: transferencias.reduce((total, item) => {
          // Garantizar que los valores sean números válidos
          const comisionUsd = parseFloat(item.comision_usd || 0);
          return total + (isNaN(comisionUsd) ? 0 : comisionUsd);
        }, 0),
        comisionArs: transferencias.reduce((total, item) => {
          const comision = parseFloat(item.comision || 0);
          return total + (isNaN(comision) ? 0 : comision);
        }, 0),
      },
      {
        tipo: "Cables",
        cantidad: cables.length,
        comisionUsd: cables.reduce((total, item) => {
          const comision = parseFloat(item.comision_usd || 0);
          return total + (isNaN(comision) ? 0 : comision);
        }, 0),
        comisionArs: 0,
      },
      {
        tipo: "Cash to Cash",
        cantidad: cashToCash.length,
        comisionUsd: cashToCash.reduce((total, item) => {
          // Las comisiones pueden ser positivas o negativas, ambas suman al total
          const comision = parseFloat(item.comision_usd || 0);
          return total + (isNaN(comision) ? 0 : comision);
        }, 0),
        comisionArs: 0,
      },
      {
        tipo: "Ingreso Pesos",
        cantidad: ingresoPesos.length,
        comisionUsd: 0,
        comisionArs: ingresoPesos.reduce((total, item) => {
          const comision = parseFloat(item.comision_ars || 0);
          return total + (isNaN(comision) ? 0 : comision);
        }, 0),
      },
      {
        tipo: "Descuento Cheque",
        cantidad: descuentoCheque.length,
        comisionUsd: 0,
        comisionArs: descuentoCheque.reduce((total, item) => {
          const comision = parseFloat(item.comision || 0);
          return total + (isNaN(comision) ? 0 : comision);
        }, 0),
      },
    ];

    // Calcular totales asegurando que son números válidos
    const totalUsd = resumen.reduce(
      (total, item) => total + (isNaN(item.comisionUsd) ? 0 : item.comisionUsd),
      0
    );
    const totalArs = resumen.reduce(
      (total, item) => total + (isNaN(item.comisionArs) ? 0 : item.comisionArs),
      0
    );

    // Mostrar totales con formato
    totalUsdElement.textContent = totalUsd.toLocaleString("es-AR", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    totalArsElement.textContent = totalArs.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    // Mostrar resumen en la tabla
    tbody.innerHTML = "";

    if (resumen.every((item) => item.cantidad === 0)) {
      tbody.innerHTML =
        '<tr><td colspan="4" style="text-align: center;">No hay transacciones en el periodo seleccionado</td></tr>';
      return;
    }

    resumen.forEach((item) => {
      // Formatear los valores numéricos con locale
      const comisionUsdFormateada = item.comisionUsd.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      const comisionArsFormateada = item.comisionArs.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      tbody.innerHTML += `
        <tr>
          <td>${item.tipo}</td>
          <td>${item.cantidad}</td>
          <td>$${comisionUsdFormateada}</td>
          <td>$${comisionArsFormateada}</td>
        </tr>
      `;
    });

    // Calcular el total de cantidades
    const totalCantidad = resumen.reduce(
      (total, item) => total + item.cantidad,
      0
    );

    // Formatear los totales para la fila final
    const totalUsdFormateado = totalUsd.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const totalArsFormateado = totalArs.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    // Agregar fila de totales
    tbody.innerHTML += `
      <tr class="total-row">
        <td><strong>TOTAL</strong></td>
        <td><strong>${totalCantidad}</strong></td>
        <td><strong>$${totalUsdFormateado}</strong></td>
        <td><strong>$${totalArsFormateado}</strong></td>
      </tr>
    `;
  } catch (error) {
    console.error("Error al cargar resumen:", error);
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">Error al cargar los datos: ${error.message}</td></tr>`;

    // Restablecer los totales a cero para evitar NaN
    totalUsdElement.textContent = "$0,00";
    totalArsElement.textContent = "$0,00";

    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error al cargar los datos del resumen: " + error.message,
    });
  }
}

// Función para filtrar el resumen por período
function filtrarResumen(periodo) {
  cargarResumenAutomatico(periodo);
}

// Función helper para obtener la fecha de inicio según el período
function obtenerFechaInicio(periodo) {
  const ahora = new Date();
  let fechaInicio = new Date();

  switch (periodo) {
    case "hoy":
      fechaInicio.setHours(0, 0, 0, 0);
      break;
    case "semana":
      // Obtener el primer día de la semana (domingo = 0)
      const diaSemana = fechaInicio.getDay();
      const diff = fechaInicio.getDate() - diaSemana;
      fechaInicio = new Date(fechaInicio.setDate(diff));
      fechaInicio.setHours(0, 0, 0, 0);
      break;
    case "mes":
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      break;
    case "todo":
    default:
      fechaInicio = new Date(0); // 1970-01-01
      break;
  }

  return fechaInicio;
}

// Función para obtener datos de una colección filtrados por fecha
async function obtenerDatosConFiltro(coleccion, fechaInicio) {
  try {
    const snap = await db
      .collection(coleccion)
      .orderBy("timestamp", "desc")
      .get();
    const datos = [];

    snap.forEach((doc) => {
      const data = doc.data();
      let incluir = false;
      let docTimestamp = null;

      // Manejar diferentes formatos de fecha
      if (data.timestamp) {
        // Caso 1: Es un timestamp de Firestore
        if (typeof data.timestamp.toDate === "function") {
          docTimestamp = data.timestamp.toDate();
        }
        // Caso 2: Es un objeto Date de JavaScript
        else if (data.timestamp instanceof Date) {
          docTimestamp = data.timestamp;
        }
        // Caso 3: Es un string que podemos convertir a Date
        else if (typeof data.timestamp === "string") {
          docTimestamp = new Date(data.timestamp);
        }
      }
      // Intentar con el campo fecha si no hay timestamp
      else if (data.fecha) {
        // Caso 1: Es un timestamp de Firestore
        if (typeof data.fecha.toDate === "function") {
          docTimestamp = data.fecha.toDate();
        }
        // Caso 2: Es un objeto Date de JavaScript
        else if (data.fecha instanceof Date) {
          docTimestamp = data.fecha;
        }
        // Caso 3: Es un string que podemos convertir a Date
        else if (typeof data.fecha === "string") {
          docTimestamp = new Date(data.fecha);
        }
      }

      // Verificar si la fecha del documento es válida y está en el rango
      if (docTimestamp && !isNaN(docTimestamp.getTime())) {
        incluir = docTimestamp >= fechaInicio;
      } else {
        // Si no hay forma de filtrar por fecha, incluir el documento
        incluir = true;
      }

      if (incluir) {
        // Añadir el ID del documento a los datos
        datos.push({
          id: doc.id,
          ...data,
        });
      }
    });

    return datos;
  } catch (error) {
    console.error(`Error al obtener datos de ${coleccion}:`, error);
    return []; // Devolver array vacío en caso de error
  }
}

// Eliminar el antiguo formResumen puesto que ahora es automático
// const formResumen = document.getElementById("formResumen");
// formResumen.onsubmit = ... eliminar todo este bloque

// Redirigir la función cargarResumen a la nueva implementación
function cargarResumen() {
  cargarResumenAutomatico();
}

// ================== TRANSFERENCIAS ==================
const formTransferencias = document.getElementById("formTransferencias");

// Configurar cálculos automáticos en tiempo real para transferencias
const setupTransferenciasCalculos = () => {
  // Campos de entrada
  const montoInput = document.getElementById("montoTrans");
  const tcBsAsInput = document.getElementById("tcUsdBsAsTrans");
  const tcSaltaInput = document.getElementById("tcUsdSaltaTrans");
  const comisionInput = document.getElementById("comisionArsTrans");

  // Campos para mostrar resultados
  const difTcResult = document.getElementById("difTcResult");
  const montoNetoResult = document.getElementById("montoNetoResult");
  const cambioUsdResult = document.getElementById("cambioUsdResult");

  // Campos ocultos para guardar valores calculados
  const difTcTrans = document.getElementById("difTcTrans");
  const montoNetoTrans = document.getElementById("montoNetoTrans");
  const cambioUsdTrans = document.getElementById("cambioUsdTrans");

  // Función para realizar los cálculos
  const calcularValores = () => {
    // Obtener valores actuales
    const monto = parseFloat(montoInput.value) || 0;
    const tcBsAs = parseFloat(tcBsAsInput.value) || 0;
    const tcSalta = parseFloat(tcSaltaInput.value) || 0;

    // Calcular valores
    // 1. Diferencia de tipo de cambio
    const difTc = tcSalta - tcBsAs;

    // 2. Calcular automáticamente la comisión basada en la diferencia de TC
    // La comisión ahora se calcula como la diferencia en USD multiplicada por el TC actual
    const montoUsdTcBsAs = monto / tcBsAs; // Monto en USD a TC de BsAs
    const montoUsdTcSalta = monto / tcSalta; // Monto en USD a TC de Salta
    const diferenciaUsd = montoUsdTcBsAs - montoUsdTcSalta; // Diferencia en USD
    const comisionCalculada = diferenciaUsd * tcSalta; // Convertir diferencia a ARS

    // Actualizar el campo de comisión con el valor calculado
    if (tcBsAs > 0 && tcSalta > 0) {
      comisionInput.value = comisionCalculada.toFixed(2);
    }

    const comision = parseFloat(comisionInput.value) || 0;

    // 3. Monto neto (después de comisión)
    const montoNeto = monto - comision;

    // 4. Cambio a USD
    const cambioUsd = tcSalta > 0 ? montoNeto / tcSalta : 0;

    // Mostrar en la interfaz
    difTcResult.textContent = difTc.toFixed(2);
    montoNetoResult.textContent = montoNeto.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
    });
    cambioUsdResult.textContent = cambioUsd.toFixed(2);

    // Guardar en campos ocultos para envío
    difTcTrans.value = difTc;
    montoNetoTrans.value = montoNeto;
    cambioUsdTrans.value = cambioUsd;
  };

  // Configurar eventos para actualizar cálculos cuando cambian los valores
  [montoInput, tcBsAsInput, tcSaltaInput, comisionInput].forEach((input) => {
    input.addEventListener("input", calcularValores);
  });
};

// Inicializar cálculos automáticos cuando se carga la página
setupTransferenciasCalculos();

// Función para obtener el siguiente número de transferencia
async function obtenerSiguienteNumeroTransferencia() {
  try {
    // Consultar el último número de transferencia utilizado
    const configDoc = await db
      .collection("configuracion")
      .doc("numeracion")
      .get();

    let ultimoNumero = 0;

    // Si existe el documento de configuración, obtener el último número
    if (configDoc.exists) {
      ultimoNumero = configDoc.data().ultimaTransferencia || 0;
    } else {
      // Si no existe, crear el documento con valores iniciales
      await db.collection("configuracion").doc("numeracion").set({
        ultimaTransferencia: 0,
        ultimoCable: 0,
        ultimoCashToCash: 0,
        ultimoIngresoPesos: 0,
        ultimoDescuentoCheque: 0,
      });
    }

    // Incrementar el número para la nueva transferencia
    const nuevoNumero = ultimoNumero + 1;

    // Actualizar en Firestore
    await db.collection("configuracion").doc("numeracion").update({
      ultimaTransferencia: nuevoNumero,
    });

    return nuevoNumero;
  } catch (error) {
    console.error("Error al obtener numeración:", error);
    throw error;
  }
}

// Manejo del formulario de transferencias
formTransferencias.onsubmit = async (e) => {
  e.preventDefault();
  try {
    // Verificar que todos los campos obligatorios estén completos
    const campos = [
      "fechaTrans",
      "operadorTrans",
      "clienteTrans",
      "destinatarioTrans",
      "montoTrans",
      "tcUsdBsAsTrans",
      "tcUsdSaltaTrans",
      "comisionArsTrans",
    ];

    for (const campo of campos) {
      if (!getVal(campo)) {
        Swal.fire({
          icon: "error",
          title: "Campos incompletos",
          text: "Por favor completa todos los campos requeridos",
        });
        return;
      }
    }

    const monto = parseFloat(getVal("montoTrans"));
    const tcBsAs = parseFloat(getVal("tcUsdBsAsTrans"));
    const tcSalta = parseFloat(getVal("tcUsdSaltaTrans"));
    const comision = parseFloat(getVal("comisionArsTrans"));

    // Calcular valores
    const difTc = tcSalta - tcBsAs;
    const montoNeto = monto - comision;
    const cambioUsd = montoNeto / tcSalta;

    // Monto total en USD antes de comisión
    const montoTotalUsd = monto / tcSalta;

    // Monto neto en USD después de comisión
    const montoNetoUsd = montoNeto / tcSalta;

    // Comisión en USD (diferencia entre monto total USD y monto neto USD)
    const comisionUsd = montoTotalUsd - montoNetoUsd;

    // Obtener número de transferencia automático
    const numeroTransferencia = await obtenerSiguienteNumeroTransferencia();

    // Obtener operador y cliente seleccionados
    const operadorId = getVal("operadorTrans");
    const clienteId = getVal("clienteTrans");
    const tipoTransaccion = getVal("tipoTransaccionTrans") || "envio"; // Por defecto es envío

    // Obtener datos de operador y cliente
    const operadorDoc = await db.collection("operadores").doc(operadorId).get();
    const clienteDoc = await db.collection("clientes").doc(clienteId).get();

    const operadorNombre = operadorDoc.exists
      ? operadorDoc.data().nombre
      : "Operador desconocido";
    const clienteNombre = clienteDoc.exists
      ? clienteDoc.data().nombre
      : "Cliente desconocido";

    // Crear objeto con los datos
    const datosTrans = {
      numeroTransferencia: numeroTransferencia,
      fecha: getVal("fechaTrans"),
      operador: operadorId,
      operadorNombre: operadorNombre,
      cliente: clienteId,
      clienteNombre: clienteNombre,
      destinatario: getVal("destinatarioTrans"),
      monto: monto,
      tc_usd_bsas: tcBsAs,
      tc_usd_salta: tcSalta,
      comision: comision,
      comision_ars: comision,
      comision_usd: comisionUsd,
      cambio_usd: cambioUsd,
      dif_tc: difTc,
      monto_neto: montoNeto,
      recepcionada: getVal("recepcionadaTrans"),
      transaccion: getVal("transaccionTrans") || "",
      comentario: getVal("comentarioTrans") || "",
      tipoTransaccion: tipoTransaccion,
      timestamp: new Date(),
    };

    // Guardar en Firestore
    const docRef = await db.collection("transferencias").add(datosTrans);

    // Registrar en historial
    await registrarHistorial("transferencias", "crear", docRef.id, datosTrans);

    // ----- Manejo de cuentas corrientes -----

    // 1. CUENTA CORRIENTE DE DÓLARES:
    // 1.1 Nota de crédito al operador por el cambio a USD (se le debe al operador)
    if (cambioUsd > 0) {
      await db.collection("cuentaCorrienteDolares").add({
        clienteId: operadorId,
        clienteNombre: operadorNombre,
        fecha: new Date(getVal("fechaTrans")),
        fechaValor: new Date(getVal("fechaTrans")),
        tipoOperacion: "NOTA DE CREDITO",
        debito: 0,
        credito: cambioUsd,
        saldo: 0, // El saldo se calculará al consultar los movimientos
        moneda: "USD",
        concepto: `Transferencia #${numeroTransferencia} - Cambio a USD`,
        referenciaId: docRef.id,
        referenciaColeccion: "transferencias",
        timestamp: new Date(),
      });

      await registrarHistorial(
        "cuentaCorrienteDolares",
        "crear",
        operadorId,
        `Crédito por transferencia #${numeroTransferencia} - ${cambioUsd.toFixed(
          2
        )} USD para operador ${operadorNombre}`
      );
    }

    // 1.2 Nota de débito al cliente por el cambio a USD
    if (cambioUsd > 0) {
      await db.collection("cuentaCorrienteDolares").add({
        clienteId: clienteId,
        clienteNombre: clienteNombre,
        fecha: new Date(getVal("fechaTrans")),
        fechaValor: new Date(getVal("fechaTrans")),
        tipoOperacion: "NOTA DE DEBITO",
        debito: cambioUsd,
        credito: 0,
        saldo: 0, // El saldo se calculará al consultar los movimientos
        moneda: "USD",
        concepto: `Transferencia #${numeroTransferencia} - Cambio a USD`,
        referenciaId: docRef.id,
        referenciaColeccion: "transferencias",
        timestamp: new Date(),
      });

      await registrarHistorial(
        "cuentaCorrienteDolares",
        "crear",
        clienteId,
        `Débito por transferencia #${numeroTransferencia} - ${cambioUsd.toFixed(
          2
        )} USD para cliente ${clienteNombre}`
      );
    }

    // 2. CUENTA CORRIENTE DE PESOS:
    // 2.1 Movimiento principal: Débito o Crédito según tipo de transacción
    if (tipoTransaccion === "envio") {
      await db.collection("cuentaCorrientePesos").add({
        clienteId: clienteId,
        clienteNombre: clienteNombre,
        fecha: new Date(getVal("fechaTrans")),
        fechaValor: new Date(getVal("fechaTrans")),
        tipoOperacion: "NOTA DE DEBITO",
        debito: monto,
        credito: 0,
        saldo: 0, // El saldo se calculará al consultar los movimientos
        moneda: "ARS",
        concepto: `Transferencia #${numeroTransferencia} - Envío de pesos`,
        referenciaId: docRef.id,
        referenciaColeccion: "transferencias",
        timestamp: new Date(),
      });
    } else {
      // recibo
      await db.collection("cuentaCorrientePesos").add({
        clienteId: clienteId,
        clienteNombre: clienteNombre,
        fecha: new Date(getVal("fechaTrans")),
        fechaValor: new Date(getVal("fechaTrans")),
        tipoOperacion: "NOTA DE CREDITO",
        debito: 0,
        credito: monto,
        saldo: 0, // El saldo se calculará al consultar los movimientos
        moneda: "ARS",
        concepto: `Transferencia #${numeroTransferencia} - Recibo de pesos`,
        referenciaId: docRef.id,
        referenciaColeccion: "transferencias",
        timestamp: new Date(),
      });
    }

    // 2.2 Comisión para el cliente (siempre es débito)
    if (comision > 0) {
      await db.collection("cuentaCorrientePesos").add({
        clienteId: clienteId,
        clienteNombre: clienteNombre,
        fecha: new Date(getVal("fechaTrans")),
        fechaValor: new Date(getVal("fechaTrans")),
        tipoOperacion: "NOTA DE DEBITO",
        debito: comision,
        credito: 0,
        saldo: 0, // El saldo se calculará al consultar los movimientos
        moneda: "ARS",
        concepto: `Transferencia #${numeroTransferencia} - Comisión por cambio de divisas`,
        referenciaId: docRef.id,
        referenciaColeccion: "transferencias",
        timestamp: new Date(),
      });
    }

    clearForm("formTransferencias");
    setupTransferenciasCalculos();
    cargarTransferencias();
    cargarCuentaCorrienteDolares(); // Actualizar la cuenta corriente de dólares
    cargarCuentaCorrientePesos(); // Actualizar la cuenta corriente de pesos

    Swal.fire({
      icon: "success",
      title: "Éxito",
      text:
        "Transferencia #" + numeroTransferencia + " registrada correctamente",
    });
  } catch (error) {
    console.error("Error al guardar transferencia:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo guardar la transferencia: " + error.message,
    });
  }
};

async function cargarTransferencias() {
  const tbody = document.getElementById("tablaTransferencias");
  tbody.innerHTML = "";

  try {
    document.getElementById("loader").classList.add("active");

    const snap = await db
      .collection("transferencias")
      .orderBy("timestamp", "desc")
      .get();

    if (snap.empty) {
      tbody.innerHTML =
        '<tr><td colspan="9" style="text-align: center;">No hay transferencias registradas</td></tr>';
      document.getElementById("loader").classList.remove("active");
      return;
    }

    // Almacenar todos los datos para paginación y exportación
    datosCompletos.transferencias = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Actualizar estado de paginación
    estadoPaginacion.transferencias.total =
      datosCompletos.transferencias.length;

    // Renderizar la primera página
    actualizarTablaPaginada("transferencias");
  } catch (error) {
    console.error("Error al cargar transferencias:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error al cargar los datos: " + error.message,
    });
    document.getElementById("loader").classList.remove("active");
  }
}

// Función específica para renderizar tabla de transferencias (para paginación)
function renderizarTablaTransferencias(datos) {
  const tbody = document.getElementById("tablaTransferencias");
  tbody.innerHTML = "";

  if (datos.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="9" style="text-align: center;">No hay transferencias registradas</td></tr>';
    return;
  }

  datos.forEach((t) => {
    const fecha = t.fecha ? new Date(t.fecha).toLocaleDateString("es-AR") : "-";
    const estado = t.recepcionada || "Pendiente";
    tbody.innerHTML += `
      <tr>
      <td>${fecha}</td>
      <td>${t.cliente}</td>
      <td>$${t.monto.toLocaleString("es-AR")}</td>
      <td>$${t.cambio_usd.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}</td>
      <td>${t.tc_usd_salta.toLocaleString("es-AR")}</td>
      <td>$${t.comision.toLocaleString("es-AR")}</td>
      <td>$${t.dif_tc.toLocaleString("es-AR")}</td>
      <td><span class="estado-${estado.toLowerCase()}">${estado}</span></td>
      <td>
        <button class="btn-editar" onclick="verDetallesTransferencia('${
          t.id
        }')">Ver</button>
        <button onclick="eliminarRegistro('transferencias', '${
          t.id
        }', cargarTransferencias)">Eliminar</button>
      </td>
      </tr>`;
  });
}

// ================== CABLES ==================
const formCables = document.getElementById("formCables");

// Función para obtener el siguiente número de cable
async function obtenerSiguienteNumeroCable() {
  try {
    // Consultar el último número de cable utilizado
    const configDoc = await db
      .collection("configuracion")
      .doc("numeracion")
      .get();

    let ultimoNumero = 0;

    // Si existe el documento de configuración, obtener el último número
    if (configDoc.exists) {
      ultimoNumero = configDoc.data().ultimoCable || 0;
    } else {
      // Si no existe, crear el documento con valores iniciales
      await db.collection("configuracion").doc("numeracion").set({
        ultimaTransferencia: 0,
        ultimoCable: 0,
        ultimoCashToCash: 0,
        ultimoIngresoPesos: 0,
        ultimoDescuentoCheque: 0,
      });
    }

    // Incrementar el número para el nuevo cable
    const nuevoNumero = ultimoNumero + 1;

    // Actualizar en Firestore
    await db.collection("configuracion").doc("numeracion").update({
      ultimoCable: nuevoNumero,
    });

    return nuevoNumero;
  } catch (error) {
    console.error("Error al obtener numeración de cable:", error);
    throw error;
  }
}

// Configurar cálculos automáticos en tiempo real para cables
const setupCablesCalculos = () => {
  const montoUsdInput = document.getElementById("montoUsdCable");
  const montoCorregidoInput = document.getElementById("montoCorregidoUsdCable");
  const comisionPorcInput = document.getElementById("comisionPorcCable");
  const comisionUsdInput = document.getElementById("comisionUsdCable");
  const comisionUsdResult = document.getElementById("comisionUsdResult");
  const tipoCableSelect = document.getElementById("tipoCable");

  // Función para calcular la comisión
  const calcularComision = () => {
    // Determinar qué monto usar para el cálculo (usar monto corregido si existe, sino usar monto normal)
    const montoBase =
      parseFloat(montoCorregidoInput.value) ||
      parseFloat(montoUsdInput.value) ||
      0;
    const comisionPorc = parseFloat(comisionPorcInput.value) || 0;

    // Calcular comisión en USD
    const comisionUsd = (montoBase * comisionPorc) / 100;

    // Mostrar en la interfaz
    comisionUsdResult.textContent = comisionUsd.toFixed(2);

    // Establecer en el campo oculto
    comisionUsdInput.value = comisionUsd;
  };

  // Cuando el monto principal cambia, actualizar el monto corregido si está vacío
  montoUsdInput.addEventListener("input", function () {
    if (!montoCorregidoInput.value) {
      montoCorregidoInput.value = this.value;
    }
    calcularComision();
  });

  // Configurar eventos para actualizar cálculos cuando cambian los valores
  [montoCorregidoInput, comisionPorcInput].forEach((input) => {
    input.addEventListener("input", calcularComision);
  });
};

// Inicializar cálculos automáticos
setupCablesCalculos();

formCables.onsubmit = async (e) => {
  e.preventDefault();
  try {
    // Verificar campos obligatorios
    const campos = [
      "fechaCable",
      "clienteCable",
      "montoUsdCable",
      "comisionPorcCable",
      "tipoCable",
    ];

    for (const campo of campos) {
      if (!getVal(campo)) {
        Swal.fire({
          icon: "error",
          title: "Campos incompletos",
          text: "Por favor completa todos los campos requeridos",
        });
        return;
      }
    }

    const montoUsd = parseFloat(getVal("montoUsdCable"));
    const montoCorregidoUsd =
      parseFloat(getVal("montoCorregidoUsdCable")) || montoUsd;
    const comisionPorc = parseFloat(getVal("comisionPorcCable"));
    const comisionUsd = parseFloat(getVal("comisionUsdCable"));
    const tipoCable = getVal("tipoCable");
    const estadoCable = getVal("ingresoCable");
    const clienteId = getVal("clienteCable");

    // Obtener datos del cliente
    const clienteDoc = await db.collection("clientes").doc(clienteId).get();
    const clienteNombre = clienteDoc.exists
      ? clienteDoc.data().nombre
      : "Cliente desconocido";

    // Obtener número automático
    const numeroCable = await obtenerSiguienteNumeroCable();

    // Generar comentario automático según estado y tipo
    let comentarioAutomatico = "";
    if (tipoCable === "subida") {
      comentarioAutomatico =
        estadoCable === "Pendiente"
          ? "Pendiente de subida de cable"
          : "Subida de cable completada";
    } else {
      comentarioAutomatico =
        estadoCable === "Pendiente"
          ? "Pendiente de bajada de cable"
          : "Bajada de cable completada";
    }

    // Combinar con comentario manual si existe
    const comentarioManual = getVal("comentarioCable") || "";
    const comentarioFinal = comentarioManual
      ? `${comentarioAutomatico} - ${comentarioManual}`
      : comentarioAutomatico;

    // Datos para guardar
    const datosCable = {
      numeroCable: numeroCable,
      fecha: getVal("fechaCable"),
      cliente: clienteId,
      clienteNombre: clienteNombre,
      tipoCable: tipoCable,
      monto_usd: montoUsd,
      monto_corregido_usd: montoCorregidoUsd,
      comision_porc: comisionPorc,
      comision_usd: comisionUsd,
      estado: estadoCable,
      comentario: comentarioFinal,
      timestamp: new Date(),
    };

    // Guardar en Firestore
    const docRef = await db.collection("cables").add(datosCable);

    // Registrar en historial
    await registrarHistorial("cables", "crear", docRef.id, datosCable);

    // Crear movimientos en cuenta corriente basados en tipo de cable y estado
    // Para subida de cable:
    // - Si está pendiente: Nota de crédito al cliente (se le debe al cliente)
    // - Si está completado (OK): Nota de débito al cliente (el cliente debe)
    // Para bajada de cable:
    // - Si está pendiente: Nota de débito al cliente (el cliente debe)
    // - Si está completado (OK): Nota de crédito al cliente (se le debe al cliente)
    const montoOperacion = montoCorregidoUsd || montoUsd;

    if (tipoCable === "subida") {
      if (estadoCable === "Pendiente") {
        // Subida pendiente: crédito al cliente
        await db.collection("cuentaCorrienteDolares").add({
          clienteId: clienteId,
          clienteNombre: clienteNombre,
          fecha: new Date(getVal("fechaCable")),
          fechaValor: new Date(getVal("fechaCable")),
          tipoOperacion: "NOTA DE CREDITO",
          debito: 0,
          credito: montoOperacion,
          saldo: 0, // El saldo se calculará al consultar los movimientos
          moneda: "USD",
          concepto: `Cable #${numeroCable} - Subida pendiente`,
          referenciaId: docRef.id,
          referenciaColeccion: "cables",
          timestamp: new Date(),
        });
      } else if (estadoCable === "OK") {
        // Subida OK: débito al cliente
        await db.collection("cuentaCorrienteDolares").add({
          clienteId: clienteId,
          clienteNombre: clienteNombre,
          fecha: new Date(getVal("fechaCable")),
          fechaValor: new Date(getVal("fechaCable")),
          tipoOperacion: "NOTA DE DEBITO",
          debito: montoOperacion,
          credito: 0,
          saldo: 0, // El saldo se calculará al consultar los movimientos
          moneda: "USD",
          concepto: `Cable #${numeroCable} - Subida completada`,
          referenciaId: docRef.id,
          referenciaColeccion: "cables",
          timestamp: new Date(),
        });
      }
    } else {
      // Bajada de cable
      if (estadoCable === "Pendiente") {
        // Bajada pendiente: débito al cliente
        await db.collection("cuentaCorrienteDolares").add({
          clienteId: clienteId,
          clienteNombre: clienteNombre,
          fecha: new Date(getVal("fechaCable")),
          fechaValor: new Date(getVal("fechaCable")),
          tipoOperacion: "NOTA DE DEBITO",
          debito: montoOperacion,
          credito: 0,
          saldo: 0, // El saldo se calculará al consultar los movimientos
          moneda: "USD",
          concepto: `Cable #${numeroCable} - Bajada pendiente`,
          referenciaId: docRef.id,
          referenciaColeccion: "cables",
          timestamp: new Date(),
        });
      } else if (estadoCable === "OK") {
        // Bajada OK: crédito al cliente
        await db.collection("cuentaCorrienteDolares").add({
          clienteId: clienteId,
          clienteNombre: clienteNombre,
          fecha: new Date(getVal("fechaCable")),
          fechaValor: new Date(getVal("fechaCable")),
          tipoOperacion: "NOTA DE CREDITO",
          debito: 0,
          credito: montoOperacion,
          saldo: 0, // El saldo se calculará al consultar los movimientos
          moneda: "USD",
          concepto: `Cable #${numeroCable} - Bajada completada`,
          referenciaId: docRef.id,
          referenciaColeccion: "cables",
          timestamp: new Date(),
        });
      }
    }

    // Registrar en historial el movimiento en cuenta corriente
    await registrarHistorial(
      "cuentaCorrienteDolares",
      "crear",
      clienteId,
      `Movimiento por cable #${numeroCable} - ${tipoCable} (${estadoCable})`
    );

    clearForm("formCables");
    setupCablesCalculos(); // Reiniciar cálculos
    cargarCables();
    cargarCuentaCorrienteDolares(); // Actualizar la cuenta corriente

    Swal.fire({
      icon: "success",
      title: "Éxito",
      text: `Cable #${numeroCable} registrado correctamente`,
    });
  } catch (error) {
    console.error("Error al guardar cable:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo guardar el cable: " + error.message,
    });
  }
};

async function cargarCables() {
  const tbody = document.getElementById("tablaCables");
  tbody.innerHTML = "";
  try {
    document.getElementById("loader").classList.add("active");

    const snap = await db
      .collection("cables")
      .orderBy("timestamp", "desc")
      .get();

    if (snap.empty) {
      tbody.innerHTML =
        '<tr><td colspan="8" style="text-align: center;">No hay registros</td></tr>';
      document.getElementById("loader").classList.remove("active");
      return;
    }

    // Almacenar todos los datos para paginación y exportación
    datosCompletos.cables = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Actualizar estado de paginación
    estadoPaginacion.cables.total = datosCompletos.cables.length;

    // Renderizar la primera página
    actualizarTablaPaginada("cables");

    document.getElementById("loader").classList.remove("active");
  } catch (error) {
    console.error("Error al cargar cables:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error al cargar los datos: " + error.message,
    });
    document.getElementById("loader").classList.remove("active");
  }
}

// Función específica para renderizar tabla de cables (para paginación)
function renderizarTablaCables(datos) {
  const tbody = document.getElementById("tablaCables");
  tbody.innerHTML = "";

  if (datos.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" style="text-align: center;">No hay cables registrados</td></tr>';
    return;
  }

  datos.forEach((cable) => {
    const fecha = cable.fecha
      ? new Date(cable.fecha).toLocaleDateString("es-AR")
      : "-";
    const estado = cable.estado || "Pendiente";
    const tipoCable = cable.tipoCable === "subida" ? "Subida" : "Bajada";
    const numeroCable = cable.numeroCable || "-";

    // Mostrar monto corregido si es diferente del monto original
    const montoMostrar =
      cable.monto_corregido_usd !== cable.monto_usd && cable.monto_corregido_usd
        ? `$${cable.monto_usd.toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} → $${cable.monto_corregido_usd.toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        : `$${cable.monto_usd.toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;

    // Determinar el cliente a mostrar
    let clienteMostrar = cable.clienteNombre || cable.cliente || "-";

    tbody.innerHTML += `
      <tr>
      <td>${fecha}</td>
      <td>#${numeroCable} - ${tipoCable}</td>
      <td>${clienteMostrar}</td>
      <td>${montoMostrar}</td>
      <td>${cable.comision_porc.toLocaleString("es-AR")}%</td>
      <td>$${cable.comision_usd.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}</td>
      <td><span class="estado-${estado.toLowerCase()}">${estado}</span></td>
      <td>
        <button class="btn-editar" onclick="verDetallesCable('${
          cable.id
        }')">Ver</button>
        <button onclick="eliminarRegistro('cables', '${
          cable.id
        }', cargarCables)">Eliminar</button>
      </td>
      </tr>`;
  });
}

async function verDetallesCable(id) {
  // ... existing code ...
}

// ================== CASH TO CASH ==================
const formCash = document.getElementById("formCash");

// Función para obtener el siguiente número de cash to cash
async function obtenerSiguienteNumeroCashToCash() {
  try {
    // Consultar el último número de cash to cash utilizado
    const configDoc = await db
      .collection("configuracion")
      .doc("numeracion")
      .get();

    let ultimoNumero = 0;

    // Si existe el documento de configuración, obtener el último número
    if (configDoc.exists) {
      ultimoNumero = configDoc.data().ultimoCashToCash || 0;
    } else {
      // Si no existe, crear el documento con valores iniciales
      await db.collection("configuracion").doc("numeracion").set({
        ultimaTransferencia: 0,
        ultimoCable: 0,
        ultimoCashToCash: 0,
        ultimoIngresoPesos: 0,
        ultimoDescuentoCheque: 0,
      });
    }

    // Incrementar el número para el nuevo cash to cash
    const nuevoNumero = ultimoNumero + 1;

    // Actualizar en Firestore
    await db.collection("configuracion").doc("numeracion").update({
      ultimoCashToCash: nuevoNumero,
    });

    return nuevoNumero;
  } catch (error) {
    console.error("Error al obtener numeración de cash to cash:", error);
    throw error;
  }
}

// Configurar cálculos automáticos en tiempo real para cash to cash
const setupCashCalculos = () => {
  const montoUsdInput = document.getElementById("montoUsdCash");
  const comisionPorcInput = document.getElementById("comisionPorcCash");
  const comisionUsdInput = document.getElementById("comisionUsdCash");
  const comisionUsdResult = document.getElementById("comisionUsdCashResult");

  // Función para calcular la comisión
  const calcularComision = () => {
    const montoUsd = parseFloat(montoUsdInput.value) || 0;
    const comisionPorc = parseFloat(comisionPorcInput.value) || 0;

    // Calcular comisión en USD (permitir valores negativos)
    const comisionUsd = (montoUsd * comisionPorc) / 100;

    // Mostrar en la interfaz
    comisionUsdResult.textContent = comisionUsd.toFixed(2);
    comisionUsdResult.classList.toggle("negativo", comisionUsd < 0);

    // Establecer en el campo oculto
    comisionUsdInput.value = comisionUsd;
  };

  // Configurar eventos para actualizar cálculos cuando cambian los valores
  [montoUsdInput, comisionPorcInput].forEach((input) => {
    input.addEventListener("input", calcularComision);
  });
};

// Inicializar cálculos automáticos
setupCashCalculos();

formCash.onsubmit = async (e) => {
  e.preventDefault();
  try {
    // Verificar campos obligatorios
    const campos = [
      "fechaCash",
      "clienteCash",
      "transaccionCash",
      "montoUsdCash",
      "comisionPorcCash",
      "tipoTransaccionCash",
    ];

    for (const campo of campos) {
      if (!getVal(campo)) {
        Swal.fire({
          icon: "error",
          title: "Campos incompletos",
          text: "Por favor completa todos los campos requeridos",
        });
        return;
      }
    }

    const montoUsd = parseFloat(getVal("montoUsdCash"));
    const comisionPorc = parseFloat(getVal("comisionPorcCash"));
    const comisionUsd = parseFloat(getVal("comisionUsdCash"));
    const tipoTransaccion = getVal("tipoTransaccionCash");
    const clienteId = getVal("clienteCash");

    // Obtener número automático
    const numeroCash = await obtenerSiguienteNumeroCashToCash();

    // Obtener nombre del cliente para referencia
    const clienteDoc = await db.collection("clientes").doc(clienteId).get();
    const clienteNombre = clienteDoc.exists
      ? clienteDoc.data().nombre
      : "Cliente desconocido";

    // Crear objeto con los datos
    const datosCash = {
      numeroCash: numeroCash,
      fecha: getVal("fechaCash"),
      cliente: clienteId,
      clienteNombre: clienteNombre,
      transaccion: getVal("transaccionCash"),
      monto_usd: montoUsd,
      comision_porc: comisionPorc,
      comision_usd: comisionUsd,
      estado: getVal("estadoCash"),
      tipoTransaccion: tipoTransaccion,
      comentario: getVal("comentarioCash") || "",
      timestamp: new Date(),
    };

    // Guardar en Firestore
    const docRef = await db.collection("cash_to_cash").add(datosCash);

    // Registrar en historial
    await registrarHistorial("cash_to_cash", "crear", docRef.id, datosCash);

    // Crear movimientos en cuenta corriente para Cash to Cash
    if (tipoTransaccion === "envio") {
      // Si es envío, se debe crear un débito al cliente por el monto
      await db.collection("cuentaCorrienteDolares").add({
        clienteId: clienteId,
        clienteNombre: clienteNombre,
        fecha: new Date(getVal("fechaCash")),
        fechaValor: new Date(getVal("fechaCash")),
        tipoOperacion: "NOTA DE DEBITO",
        debito: montoUsd,
        credito: 0,
        saldo: 0,
        moneda: "USD",
        concepto: `Cash to Cash #${numeroCash} - Envío`,
        referenciaId: docRef.id,
        referenciaColeccion: "cash_to_cash",
        timestamp: new Date(),
      });
    } else {
      // recibo
      // Si es recibo, se debe crear un crédito al cliente por el monto
      await db.collection("cuentaCorrienteDolares").add({
        clienteId: clienteId,
        clienteNombre: clienteNombre,
        fecha: new Date(getVal("fechaCash")),
        fechaValor: new Date(getVal("fechaCash")),
        tipoOperacion: "NOTA DE CREDITO",
        debito: 0,
        credito: montoUsd,
        saldo: 0,
        moneda: "USD",
        concepto: `Cash to Cash #${numeroCash} - Recibo`,
        referenciaId: docRef.id,
        referenciaColeccion: "cash_to_cash",
        timestamp: new Date(),
      });
    }

    // Si hay comisión (positiva o negativa), añadir el registro correspondiente
    if (comisionUsd !== 0) {
      if (comisionUsd > 0) {
        // Comisión positiva: el cliente debe pagar (débito)
        await db.collection("cuentaCorrienteDolares").add({
          clienteId: clienteId,
          clienteNombre: clienteNombre,
          fecha: new Date(getVal("fechaCash")),
          fechaValor: new Date(getVal("fechaCash")),
          tipoOperacion: "NOTA DE DEBITO",
          debito: Math.abs(comisionUsd),
          credito: 0,
          saldo: 0,
          moneda: "USD",
          concepto: `Cash to Cash #${numeroCash} - Comisión`,
          referenciaId: docRef.id,
          referenciaColeccion: "cash_to_cash",
          timestamp: new Date(),
        });
      } else {
        // Comisión negativa: se le paga al cliente (crédito)
        await db.collection("cuentaCorrienteDolares").add({
          clienteId: clienteId,
          clienteNombre: clienteNombre,
          fecha: new Date(getVal("fechaCash")),
          fechaValor: new Date(getVal("fechaCash")),
          tipoOperacion: "NOTA DE CREDITO",
          debito: 0,
          credito: Math.abs(comisionUsd),
          saldo: 0,
          moneda: "USD",
          concepto: `Cash to Cash #${numeroCash} - Descuento`,
          referenciaId: docRef.id,
          referenciaColeccion: "cash_to_cash",
          timestamp: new Date(),
        });
      }
    }

    // Registrar en historial el movimiento en cuenta corriente
    await registrarHistorial(
      "cuentaCorrienteDolares",
      "crear",
      clienteId,
      `Movimiento por Cash to Cash #${numeroCash} - ${tipoTransaccion}`
    );

    clearForm("formCash");
    setupCashCalculos(); // Reiniciar cálculos
    cargarCash();
    cargarCuentaCorrienteDolares(); // Actualizar la cuenta corriente

    Swal.fire({
      icon: "success",
      title: "Éxito",
      text: `Cash to Cash #${numeroCash} registrado correctamente`,
    });
  } catch (error) {
    console.error("Error al guardar cash to cash:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo guardar el registro: " + error.message,
    });
  }
};

async function cargarCash() {
  const tbody = document.getElementById("tablaCash");
  tbody.innerHTML = "";
  try {
    document.getElementById("loader").classList.add("active");

    const snap = await db
      .collection("cash_to_cash")
      .orderBy("timestamp", "desc")
      .get();

    if (snap.empty) {
      tbody.innerHTML =
        '<tr><td colspan="8" style="text-align: center;">No hay registros</td></tr>';
      document.getElementById("loader").classList.remove("active");
      return;
    }

    // Almacenar todos los datos para paginación y exportación
    datosCompletos.cash_to_cash = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Actualizar estado de paginación
    estadoPaginacion.cash_to_cash.total = datosCompletos.cash_to_cash.length;

    // Renderizar la primera página
    actualizarTablaPaginada("cash_to_cash");

    document.getElementById("loader").classList.remove("active");
  } catch (error) {
    console.error("Error al cargar cash to cash:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error al cargar los datos: " + error.message,
    });
    document.getElementById("loader").classList.remove("active");
  }
}

// Función específica para renderizar tabla de cash to cash (para paginación)
function renderizarTablaCash(datos) {
  const tbody = document.getElementById("tablaCash");
  tbody.innerHTML = "";

  if (datos.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" style="text-align: center;">No hay registros</td></tr>';
    return;
  }

  datos.forEach((cash) => {
    const fecha = cash.fecha
      ? new Date(cash.fecha).toLocaleDateString("es-AR")
      : "-";
    const estado = cash.estado || "Pendiente";
    const numeroCash = cash.numeroCash || "-";
    const tipoTransaccion =
      cash.tipoTransaccion === "envio" ? "Envío" : "Recibo";

    // Determinar si la comisión es negativa para formatearla adecuadamente
    const comisionUsdClass = cash.comision_usd < 0 ? "negativo" : "";
    const comisionUsd = Math.abs(cash.comision_usd).toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const signoComision = cash.comision_usd < 0 ? "-" : "";

    // Determinar el cliente a mostrar
    let clienteMostrar = cash.clienteNombre || cash.cliente || "-";

    tbody.innerHTML += `
      <tr>
      <td>${fecha}</td>
      <td>#${numeroCash} - ${tipoTransaccion}</td>
      <td>${clienteMostrar}</td>
      <td>$${cash.monto_usd.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}</td>
      <td>${cash.comision_porc.toLocaleString("es-AR")}%</td>
      <td class="${comisionUsdClass}">${signoComision}$${comisionUsd}</td>
      <td><span class="estado-${estado.toLowerCase()}">${estado}</span></td>
      <td>
        <button class="btn-editar" onclick="verDetallesCash('${
          cash.id
        }')">Ver</button>
        <button onclick="eliminarRegistro('cash_to_cash', '${
          cash.id
        }', cargarCash)">Eliminar</button>
      </td>
      </tr>`;
  });
}

async function verDetallesCash(id) {
  // ... existing code ...
}

// ================== DESCUENTO DE CHEQUES ==================
const formDescuentoCheque = document.getElementById("formDescuentoCheque");

// Configurar cálculos automáticos en tiempo real para descuento de cheques
const setupDescuentoChequeCalculos = () => {
  // Campos de entrada
  const montoInput = document.getElementById("montoCheque");
  const tasaInput = document.getElementById("tasaCheque");
  const fechaTomaInput = document.getElementById("fechaTomaCheque");
  const fechaVencimientoInput = document.getElementById(
    "fechaVencimientoCheque"
  );
  const diasInput = document.getElementById("diasCheque");
  const comisionInput = document.getElementById("comisionCheque");

  // Campos para mostrar resultados
  const interesResult = document.getElementById("interesResult");
  const montoDescontadoResult = document.getElementById(
    "montoDescontadoResult"
  );

  // Campos ocultos para guardar valores calculados
  const interesCheque = document.getElementById("interesCheque");
  const montoDescontadoCheque = document.getElementById(
    "montoDescontadoCheque"
  );

  // Función para calcular días entre fechas
  const calcularDias = () => {
    if (fechaTomaInput.value && fechaVencimientoInput.value) {
      const fechaToma = new Date(fechaTomaInput.value);
      const fechaVencimiento = new Date(fechaVencimientoInput.value);

      // Calcular diferencia en días
      const diferenciaMilisegundos = fechaVencimiento - fechaToma;
      const dias = Math.ceil(diferenciaMilisegundos / (1000 * 60 * 60 * 24));

      // Actualizar campo de días
      diasInput.value = dias > 0 ? dias : 0;

      // Recalcular valores basados en los nuevos días
      calcularValores();
    }
  };

  // Función para realizar los cálculos de interés y monto descontado
  const calcularValores = () => {
    // Obtener valores actuales
    const monto = parseFloat(montoInput.value) || 0;
    const tasa = parseFloat(tasaInput.value) || 0;
    const dias = parseInt(diasInput.value) || 0;

    // Calcular interés: monto * tasa * (dias / 365)
    const interes = (monto * tasa * dias) / 36500; // Tasa anual dividida por 100

    // Calcular monto descontado (monto - interés)
    const montoDescontado = monto - interes;

    // Actualizar comisión (igual al interés)
    comisionInput.value = interes.toFixed(2);

    // Mostrar en la interfaz
    interesResult.textContent = interes.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
    });
    montoDescontadoResult.textContent = montoDescontado.toLocaleString(
      "es-AR",
      {
        style: "currency",
        currency: "ARS",
      }
    );

    // Guardar en campos ocultos para envío
    interesCheque.value = interes;
    montoDescontadoCheque.value = montoDescontado;
  };

  // Configurar eventos para actualizar cálculos cuando cambian los valores
  [montoInput, tasaInput, diasInput].forEach((input) => {
    input.addEventListener("input", calcularValores);
  });

  // Configurar eventos para cálculo automático de días
  [fechaTomaInput, fechaVencimientoInput].forEach((input) => {
    input.addEventListener("change", calcularDias);
  });
};

// Inicializar cálculos automáticos
setupDescuentoChequeCalculos();

// Manejo del formulario de descuento de cheques
formDescuentoCheque.onsubmit = async (e) => {
  e.preventDefault();
  try {
    // Verificar que todos los campos obligatorios estén completos
    const campos = [
      "fechaCheque",
      "nombreClienteCheque", // Campo de texto para ingresar el nombre del cliente manualmente
      "fechaTomaCheque",
      "fechaVencimientoCheque",
      "montoCheque",
      "tasaCheque",
    ];

    for (const campo of campos) {
      if (!getVal(campo)) {
        Swal.fire({
          icon: "error",
          title: "Campos incompletos",
          text: "Por favor completa todos los campos requeridos",
        });
        return;
      }
    }

    const monto = parseFloat(getVal("montoCheque"));
    const tasa = parseFloat(getVal("tasaCheque"));
    const dias = parseInt(getVal("diasCheque"));
    const interes = parseFloat(getVal("interesCheque"));
    const montoDescontado = parseFloat(getVal("montoDescontadoCheque"));
    const clienteNombre = getVal("nombreClienteCheque"); // Obtener el nombre del cliente del campo de texto

    // Obtener número automático
    const numeroCheque = await obtenerSiguienteNumeroDescuentoCheque();

    // Crear objeto con los datos
    const datosCheque = {
      numeroCheque: numeroCheque,
      fecha: getVal("fechaCheque"),
      cliente: "manual", // Indicar que fue ingresado manualmente
      clienteNombre: clienteNombre, // Usar el nombre ingresado por el usuario
      fechaToma: getVal("fechaTomaCheque"),
      fechaVencimiento: getVal("fechaVencimientoCheque"),
      dias: dias,
      monto: monto,
      tasa: tasa,
      interes: interes,
      comision: interes,
      montoDescontado: montoDescontado,
      estado: getVal("estadoCheque"),
      observaciones: getVal("observacionesCheque") || "",
      timestamp: new Date(),
    };

    // Guardar en Firestore
    const docRef = await db.collection("descuento_cheque").add(datosCheque);

    // Registrar en historial
    await registrarHistorial(
      "descuento_cheque",
      "crear",
      docRef.id,
      datosCheque
    );

    clearForm("formDescuentoCheque");
    setupDescuentoChequeCalculos();
    cargarDescuentoCheque();

    Swal.fire({
      icon: "success",
      title: "Éxito",
      text: `Descuento de Cheque #${numeroCheque} registrado correctamente`,
    });
  } catch (error) {
    console.error("Error al guardar descuento de cheque:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo guardar el descuento de cheque: " + error.message,
    });
  }
};

// Función para obtener el siguiente número de descuento de cheque
async function obtenerSiguienteNumeroDescuentoCheque() {
  try {
    console.log("Obteniendo siguiente número de descuento de cheque");
    // Consultar el último número utilizado
    const configDoc = await db
      .collection("configuracion")
      .doc("numeracion")
      .get();

    let ultimoNumero = 0;

    // Si existe el documento de configuración, obtener el último número
    if (configDoc.exists) {
      ultimoNumero = configDoc.data().ultimoDescuentoCheque || 0;
      console.log("Último número de cheque encontrado:", ultimoNumero);
    } else {
      // Si no existe, crear el documento con valores iniciales
      console.log(
        "No se encontró documento de configuración, creando uno nuevo"
      );
      await db.collection("configuracion").doc("numeracion").set({
        ultimaTransferencia: 0,
        ultimoCable: 0,
        ultimoCashToCash: 0,
        ultimoIngresoPesos: 0,
        ultimoDescuentoCheque: 0,
      });
    }

    // Incrementar el número para el nuevo descuento de cheque
    const nuevoNumero = ultimoNumero + 1;
    console.log("Nuevo número de cheque:", nuevoNumero);

    // Actualizar en Firestore
    await db.collection("configuracion").doc("numeracion").update({
      ultimoDescuentoCheque: nuevoNumero,
    });
    console.log("Número de cheque actualizado en Firestore");

    return nuevoNumero;
  } catch (error) {
    console.error("Error al obtener numeración de descuento de cheque:", error);
    // En caso de error, tratar de continuar con un nuevo número
    return Date.now(); // Usar timestamp como fallback
  }
}

async function cargarDescuentoCheque() {
  const tbody = document.getElementById("tablaDescuentoCheque");
  tbody.innerHTML = "";
  try {
    document.getElementById("loader").classList.add("active");

    const snap = await db
      .collection("descuento_cheque")
      .orderBy("timestamp", "desc")
      .get();

    if (snap.empty) {
      tbody.innerHTML =
        '<tr><td colspan="9" style="text-align: center;">No hay registros</td></tr>';
      document.getElementById("loader").classList.remove("active");
      return;
    }

    // Almacenar todos los datos para paginación y exportación
    datosCompletos.descuento_cheque = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Actualizar estado de paginación
    estadoPaginacion.descuento_cheque.total =
      datosCompletos.descuento_cheque.length;

    // Renderizar la primera página
    actualizarTablaPaginada("descuento_cheque");

    document.getElementById("loader").classList.remove("active");
  } catch (error) {
    console.error("Error al cargar descuento de cheques:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error al cargar los datos: " + error.message,
    });
    document.getElementById("loader").classList.remove("active");
  }
}

// Función específica para renderizar tabla de descuento de cheques (para paginación)
function renderizarTablaDescuentoCheque(datos) {
  const tbody = document.getElementById("tablaDescuentoCheque");
  tbody.innerHTML = "";

  if (datos.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="9" style="text-align: center;">No hay descuentos de cheques registrados</td></tr>';
    return;
  }

  datos.forEach((cheque) => {
    const fecha = cheque.fecha
      ? new Date(cheque.fecha).toLocaleDateString("es-AR")
      : "-";
    const estado = cheque.estado || "Pendiente";
    const numeroCheque = cheque.numeroCheque || "-";

    // Formatear fechas
    const fechaToma = cheque.fechaToma
      ? new Date(cheque.fechaToma).toLocaleDateString("es-AR")
      : "-";
    const fechaVenc = cheque.fechaVencimiento
      ? new Date(cheque.fechaVencimiento).toLocaleDateString("es-AR")
      : "-";

    // Determinar el cliente a mostrar
    let clienteMostrar = cheque.clienteNombre || cheque.cliente || "-";

    tbody.innerHTML += `
      <tr>
      <td>${fecha}</td>
      <td>${clienteMostrar}</td>
      <td>$${cheque.monto.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}</td>
      <td>${cheque.tasa.toLocaleString("es-AR")}%</td>
      <td>${cheque.dias}</td>
      <td>$${cheque.interes.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}</td>
      <td>$${cheque.montoDescontado.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}</td>
      <td><span class="estado-${estado.toLowerCase()}">${estado}</span></td>
      <td>
        <button class="btn-editar" onclick="verDetallesCheque('${
          cheque.id
        }')">Ver</button>
        <button onclick="eliminarRegistro('descuento_cheque', '${
          cheque.id
        }', cargarDescuentoCheque)">Eliminar</button>
      </td>
      </tr>`;
  });
}

async function verDetallesCheque(id) {
  try {
    const doc = await db.collection("descuento_cheque").doc(id).get();
    if (!doc.exists) {
      Swal.fire("Error", "Registro no encontrado", "error");
      return;
    }

    const cheque = doc.data();
    const fecha = cheque.fecha
      ? new Date(cheque.fecha).toLocaleDateString("es-AR")
      : "-";
    const fechaToma = cheque.fechaToma
      ? new Date(cheque.fechaToma).toLocaleDateString("es-AR")
      : "-";
    const fechaVencimiento = cheque.fechaVencimiento
      ? new Date(cheque.fechaVencimiento).toLocaleDateString("es-AR")
      : "-";
    const estado = cheque.estado || "Pendiente";

    Swal.fire({
      title: `Descuento de Cheque #${cheque.numeroCheque} - ${cheque.clienteNombre}`,
      html: `
        <div style="text-align: left; margin: 15px 0;">
          <p><strong>Fecha de Operación:</strong> ${fecha}</p>
          <p><strong>Cliente:</strong> ${cheque.clienteNombre}</p>
          <p><strong>Fecha de Toma:</strong> ${fechaToma}</p>
          <p><strong>Fecha de Vencimiento:</strong> ${fechaVencimiento}</p>
          <p><strong>Días:</strong> ${cheque.dias}</p>
          <p><strong>Monto:</strong> $${cheque.monto.toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</p>
          <p><strong>Tasa:</strong> ${cheque.tasa}%</p>
          <p><strong>Interés:</strong> $${cheque.interes.toLocaleString(
            "es-AR",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }
          )}</p>
          <p><strong>Monto Descontado:</strong> $${cheque.montoDescontado.toLocaleString(
            "es-AR",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }
          )}</p>
          <p><strong>Estado:</strong> ${estado}</p>
          <p><strong>Observaciones:</strong> ${cheque.observaciones || "-"}</p>
        </div>
      `,
      width: "500px",
    });
  } catch (error) {
    console.error("Error al obtener detalles:", error);
    Swal.fire("Error", "No se pudieron cargar los detalles", "error");
  }
}

// Función para actualizar la tabla paginada de cualquier módulo
function actualizarTablaPaginada(modulo) {
  // Obtener datos del módulo
  const datos = datosCompletos[modulo] || [];
  // Calcular índices para paginación
  const { pagina, registrosPorPagina, total } = estadoPaginacion[modulo];
  const inicio = (pagina - 1) * registrosPorPagina;
  const fin = Math.min(inicio + registrosPorPagina, total);

  // Obtener la porción de datos para la página actual
  const datosPagina = datos.slice(inicio, fin);

  // Actualizar texto de página actual
  const paginaActualEl = document.getElementById(
    `paginaActual${modulo.charAt(0).toUpperCase() + modulo.slice(1)}`
  );
  if (paginaActualEl) {
    paginaActualEl.textContent = `Página ${pagina}`;
  }

  // Habilitar/deshabilitar botones de paginación
  const btnAnterior = document.getElementById(
    `btnAnterior${modulo.charAt(0).toUpperCase() + modulo.slice(1)}`
  );
  const btnSiguiente = document.getElementById(
    `btnSiguiente${modulo.charAt(0).toUpperCase() + modulo.slice(1)}`
  );

  if (btnAnterior) btnAnterior.disabled = pagina <= 1;
  if (btnSiguiente)
    btnSiguiente.disabled = pagina >= Math.ceil(total / registrosPorPagina);

  // Renderizar la tabla correspondiente
  switch (modulo) {
    case "transferencias":
      renderizarTablaTransferencias(datosPagina);
      break;
    case "cables":
      renderizarTablaCables(datosPagina);
      break;
    case "cash_to_cash":
      renderizarTablaCash(datosPagina);
      break;
    case "ingreso_pesos":
      renderizarTablaIngresoPesos(datosPagina);
      break;
    case "descuento_cheque":
      renderizarTablaDescuentoCheque(datosPagina);
      break;
    case "historial":
      renderizarTablaHistorial(datosPagina);
      break;
    default:
      console.error(`No hay función de renderizado para el módulo: ${modulo}`);
  }

  // Remover el loader
  const loader = document.getElementById("loader");
  if (loader) {
    loader.classList.remove("active");
  }
}

// Cambiar el número de registros por página
function cambiarRegistrosPorPagina(modulo, valor) {
  estadoPaginacion[modulo].registrosPorPagina = parseInt(valor);
  estadoPaginacion[modulo].pagina = 1; // Volver a la primera página
  actualizarTablaPaginada(modulo);
}

// Ir a la página anterior
function paginaAnterior(modulo) {
  if (estadoPaginacion[modulo].pagina > 1) {
    estadoPaginacion[modulo].pagina--;
    actualizarTablaPaginada(modulo);
  }
}

// Ir a la página siguiente
function paginaSiguiente(modulo) {
  const { pagina, registrosPorPagina, total } = estadoPaginacion[modulo];
  if (pagina < Math.ceil(total / registrosPorPagina)) {
    estadoPaginacion[modulo].pagina++;
    actualizarTablaPaginada(modulo);
  }
}

// Función para eliminar un registro de cualquier colección
async function eliminarRegistro(coleccion, id, callbackRecarga) {
  try {
    // Confirmar eliminación
    const result = await Swal.fire({
      title: "¿Está seguro?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) {
      return;
    }

    // Obtener el documento antes de eliminarlo para tener registro en el historial
    const doc = await db.collection(coleccion).doc(id).get();
    if (!doc.exists) {
      throw new Error("Registro no encontrado");
    }

    // Eliminar el documento
    await db.collection(coleccion).doc(id).delete();

    // Registrar en historial
    await registrarHistorial(coleccion, "eliminar", id, doc.data());

    // Recargar datos
    if (typeof callbackRecarga === "function") {
      callbackRecarga();
    }

    Swal.fire({
      icon: "success",
      title: "Éxito",
      text: "Registro eliminado correctamente",
    });
  } catch (error) {
    console.error(`Error al eliminar registro de ${coleccion}:`, error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo eliminar el registro: " + error.message,
    });
  }
}

// Cargar historial de cambios
async function cargarHistorial() {
  try {
    // Limpiar tabla y mostrar loader
    const tablaBody = document.getElementById("tablaHistorialBody");
    tablaBody.innerHTML = "";
    document.getElementById("loader").classList.add("active");

    // Inicializar estado de paginación si no existe
    if (!estadoPaginacion.historial) {
      estadoPaginacion.historial = {
        pagina: 1,
        registrosPorPagina: 10,
        total: 0,
      };
    }

    // Obtener referencia a la colección y ordenar por fecha descendente
    const snapshot = await db
      .collection("historial")
      .orderBy("timestamp", "desc")
      .get();

    // Verificar si hay registros
    if (snapshot.empty) {
      tablaBody.innerHTML = `<tr><td colspan="7" class="text-center">No hay registros de historial</td></tr>`;
      document.getElementById("loader").classList.remove("active");
      document.getElementById("contadorHistorial").textContent = "0 registros";
      return;
    }

    // Procesar datos
    let historialRegistros = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      historialRegistros.push({
        id: doc.id,
        usuario: data.usuario || "Sistema",
        accion: data.accion || "",
        coleccion: data.coleccion || "",
        documento_id: data.documento_id || "",
        datos: data.datos || {},
        timestamp: data.timestamp?.toDate() || new Date(),
      });
    });

    // Guardar datos completos para paginación y exportación
    datosCompletos.historial = historialRegistros;

    // Actualizar contador y paginación
    estadoPaginacion.historial.total = historialRegistros.length;
    document.getElementById(
      "contadorHistorial"
    ).textContent = `${historialRegistros.length} registros`;

    // Mostrar primera página
    actualizarTablaPaginada("historial");
  } catch (error) {
    console.error("Error al cargar historial:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo cargar el historial: " + error.message,
    });
    document.getElementById("loader").classList.remove("active");
  }
}

// Renderizar tabla de historial
function renderizarTablaHistorial(datos) {
  const tablaBody = document.getElementById("tablaHistorialBody");
  tablaBody.innerHTML = "";

  if (datos.length === 0) {
    tablaBody.innerHTML = `<tr><td colspan="7" class="text-center">No hay registros para mostrar</td></tr>`;
    return;
  }

  datos.forEach((item) => {
    const fila = document.createElement("tr");

    // Formatear fecha
    const fecha =
      item.timestamp instanceof Date
        ? item.timestamp
        : new Date(item.timestamp);
    const fechaFormateada =
      fecha.toLocaleDateString("es-ES") +
      " " +
      fecha.toLocaleTimeString("es-ES");

    // Formatear acción
    let accionFormateada = "";
    switch (item.accion) {
      case "crear":
        accionFormateada = `<span class="badge bg-success">Creación</span>`;
        break;
      case "actualizar":
        accionFormateada = `<span class="badge bg-warning">Actualización</span>`;
        break;
      case "eliminar":
        accionFormateada = `<span class="badge bg-danger">Eliminación</span>`;
        break;
      default:
        accionFormateada = `<span class="badge bg-info">${item.accion}</span>`;
    }

    // Formatear colección
    let coleccionFormateada = "";
    switch (item.coleccion) {
      case "transferencias":
        coleccionFormateada = "Transferencias";
        break;
      case "cables":
        coleccionFormateada = "Cables";
        break;
      case "cash_to_cash":
        coleccionFormateada = "Cash to Cash";
        break;
      case "ingreso_pesos":
        coleccionFormateada = "Ingreso Pesos";
        break;
      case "descuento_cheque":
        coleccionFormateada = "Descuento de Cheques";
        break;
      case "clientes":
        coleccionFormateada = "Clientes";
        break;
      case "operadores":
        coleccionFormateada = "Operadores";
        break;
      default:
        coleccionFormateada = item.coleccion;
    }

    fila.innerHTML = `
      <td>${fechaFormateada}</td>
      <td>${item.usuario}</td>
      <td>${accionFormateada}</td>
      <td>${coleccionFormateada}</td>
      <td>${item.documento_id}</td>
      <td>
        <button class="btn btn-sm btn-info" onclick="verDetallesHistorial('${item.id}')">
          <i class="bi bi-eye"></i> Ver detalles
        </button>
      </td>
    `;

    tablaBody.appendChild(fila);
  });
}

// Ver detalles de un registro de historial
async function verDetallesHistorial(id) {
  try {
    const doc = await db.collection("historial").doc(id).get();

    if (!doc.exists) {
      throw new Error("Registro de historial no encontrado");
    }

    const data = doc.data();
    const timestamp = data.timestamp?.toDate() || new Date();
    const fechaFormateada =
      timestamp.toLocaleDateString("es-ES") +
      " " +
      timestamp.toLocaleTimeString("es-ES");

    let detallesHTML = "";
    if (data.datos) {
      // Convertir datos a formato legible
      const datosFormateados = JSON.stringify(data.datos, null, 2)
        .replace(/"/g, "")
        .replace(/,/g, "")
        .replace(/{/g, "")
        .replace(/}/g, "")
        .replace(/\[/g, "")
        .replace(/\]/g, "")
        .replace(/:/g, ": ");

      detallesHTML = `<pre style="text-align: left; max-height: 300px; overflow-y: auto;">${datosFormateados}</pre>`;
    } else {
      detallesHTML = "<p>No hay detalles disponibles</p>";
    }

    Swal.fire({
      title: "Detalles del historial",
      html: `
        <div class="table-responsive">
          <table class="table table-bordered">
            <tr>
              <th>Fecha:</th>
              <td>${fechaFormateada}</td>
            </tr>
            <tr>
              <th>Usuario:</th>
              <td>${data.usuario || "Sistema"}</td>
            </tr>
            <tr>
              <th>Acción:</th>
              <td>${data.accion || ""}</td>
            </tr>
            <tr>
              <th>Colección:</th>
              <td>${data.coleccion || ""}</td>
            </tr>
            <tr>
              <th>ID del documento:</th>
              <td>${data.documento_id || ""}</td>
            </tr>
            <tr>
              <th>Datos:</th>
              <td>${detallesHTML}</td>
            </tr>
          </table>
        </div>
      `,
      width: 800,
      confirmButtonText: "Cerrar",
    });
  } catch (error) {
    console.error("Error al obtener detalles del historial:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudieron obtener los detalles: " + error.message,
    });
  }
}

// Función para registrar acciones en el historial
async function registrarHistorial(coleccion, accion, documentoId, datos) {
  try {
    const usuario = usuarioActual
      ? usuarioActual.displayName || usuarioActual.email
      : "Sistema";

    await db.collection("historial").add({
      usuario: usuario,
      accion: accion,
      coleccion: coleccion,
      documento_id: documentoId,
      datos: datos,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Acción '${accion}' registrada en historial`);
  } catch (error) {
    console.error("Error al registrar en historial:", error);
  }
}

// Función para ver el detalle de la operación referenciada en un movimiento
async function verReferenciaMovimiento(referenciaId, coleccion) {
  if (!referenciaId || !coleccion) {
    Swal.fire(
      "Información",
      "No hay referencia disponible para este movimiento",
      "info"
    );
    return;
  }

  try {
    console.log(`Buscando referencia: ${coleccion}/${referenciaId}`);
    const doc = await db.collection(coleccion).doc(referenciaId).get();

    if (!doc.exists) {
      Swal.fire("Error", "La referencia no se encuentra disponible", "error");
      return;
    }

    const datos = doc.data();
    console.log("Datos de referencia:", datos);

    // Formatear la fecha
    let fecha = "-";
    if (datos.fecha) {
      fecha =
        typeof datos.fecha.toDate === "function"
          ? datos.fecha.toDate().toLocaleDateString("es-AR")
          : new Date(datos.fecha).toLocaleDateString("es-AR");
    }

    // Construir el HTML según el tipo de operación
    let detalleHTML = "";
    let titulo = "";

    if (coleccion === "transferencias") {
      titulo = `Transferencia #${datos.numeroTransferencia || "-"}`;
      detalleHTML = `
        <div style="text-align: left; margin: 15px 0;">
          <p><strong>Fecha:</strong> ${fecha}</p>
          <p><strong>Cliente:</strong> ${datos.clienteNombre || "-"}</p>
          <p><strong>Operador:</strong> ${datos.operadorNombre || "-"}</p>
          <p><strong>Destinatario:</strong> ${datos.destinatario || "-"}</p>
          <p><strong>Tipo:</strong> ${
            datos.tipoTransaccion === "envio" ? "Envío" : "Recibo"
          }</p>
          <p><strong>Monto ARS:</strong> $${(datos.monto || 0).toLocaleString(
            "es-AR",
            { minimumFractionDigits: 2 }
          )}</p>
          <p><strong>TC BsAs:</strong> ${
            datos.tc_usd_bsas?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            }) || "-"
          }</p>
          <p><strong>TC Salta:</strong> ${
            datos.tc_usd_salta?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            }) || "-"
          }</p>
          <p><strong>Diferencia TC:</strong> ${
            datos.dif_tc?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            }) || "0"
          }</p>
          <p><strong>Comisión ARS:</strong> $${(
            datos.comision || 0
          ).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
          <p><strong>Monto Neto ARS:</strong> $${(
            datos.monto_neto || 0
          ).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
          <p><strong>Cambio USD:</strong> $${(
            datos.cambio_usd || 0
          ).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
          <p><strong>Comisión USD:</strong> $${(
            datos.comision_usd || 0
          ).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
          <p><strong>Estado:</strong> ${datos.recepcionada || "Pendiente"}</p>
          <p><strong>Comentario:</strong> ${datos.comentario || "-"}</p>
        </div>
      `;
    } else if (coleccion === "cables") {
      titulo = `Cable #${datos.numeroCable || "-"}`;
      detalleHTML = `
        <div style="text-align: left; margin: 15px 0;">
          <p><strong>Fecha:</strong> ${fecha}</p>
          <p><strong>Cliente:</strong> ${datos.clienteNombre || "-"}</p>
          <p><strong>Tipo:</strong> ${
            datos.tipoCable === "subida" ? "Subida" : "Bajada"
          }</p>
          <p><strong>Monto USD:</strong> $${(
            datos.monto_usd || 0
          ).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
          ${
            datos.monto_corregido_usd &&
            datos.monto_corregido_usd !== datos.monto_usd
              ? `<p><strong>Monto Corregido USD:</strong> $${datos.monto_corregido_usd.toLocaleString(
                  "es-AR",
                  { minimumFractionDigits: 2 }
                )}</p>`
              : ""
          }
          <p><strong>Comisión %:</strong> ${
            datos.comision_porc?.toLocaleString("es-AR") || "0"
          }%</p>
          <p><strong>Comisión USD:</strong> $${(
            datos.comision_usd || 0
          ).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
          <p><strong>Estado:</strong> ${datos.estado || "Pendiente"}</p>
          <p><strong>Comentario:</strong> ${datos.comentario || "-"}</p>
        </div>
      `;
    } else if (coleccion === "cash_to_cash") {
      titulo = `Cash to Cash #${datos.numeroCash || "-"}`;
      detalleHTML = `
        <div style="text-align: left; margin: 15px 0;">
          <p><strong>Fecha:</strong> ${fecha}</p>
          <p><strong>Cliente:</strong> ${datos.clienteNombre || "-"}</p>
          <p><strong>Tipo:</strong> ${
            datos.tipoTransaccion === "envio" ? "Envío" : "Recibo"
          }</p>
          <p><strong>Transacción:</strong> ${datos.transaccion || "-"}</p>
          <p><strong>Monto USD:</strong> $${(
            datos.monto_usd || 0
          ).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
          <p><strong>Comisión %:</strong> ${
            datos.comision_porc?.toLocaleString("es-AR") || "0"
          }%</p>
          <p><strong>Comisión USD:</strong> $${Math.abs(
            datos.comision_usd || 0
          ).toLocaleString("es-AR", { minimumFractionDigits: 2 })}${
        datos.comision_usd < 0 ? " (descuento)" : ""
      }</p>
          <p><strong>Estado:</strong> ${datos.estado || "Pendiente"}</p>
          <p><strong>Comentario:</strong> ${datos.comentario || "-"}</p>
        </div>
      `;
    } else if (coleccion === "ingreso_pesos") {
      titulo = `Ingreso Pesos #${datos.numeroIngreso || "-"}`;
      detalleHTML = `
        <div style="text-align: left; margin: 15px 0;">
          <p><strong>Fecha:</strong> ${fecha}</p>
          <p><strong>Cliente:</strong> ${datos.clienteNombre || "-"}</p>
          <p><strong>Operador:</strong> ${datos.operadorNombre || "-"}</p>
          <p><strong>Transacción:</strong> ${datos.transaccion || "-"}</p>
          <p><strong>Monto ARS:</strong> $${(
            datos.monto_ars || 0
          ).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
          <p><strong>Comisión %:</strong> ${
            datos.comision_porc?.toLocaleString("es-AR") || "0"
          }%</p>
          <p><strong>Comisión ARS:</strong> $${(
            datos.comision_ars || 0
          ).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
          <p><strong>Monto Final:</strong> $${(
            datos.monto_final || 0
          ).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
          <p><strong>Estado:</strong> ${datos.estado || "Pendiente"}</p>
        </div>
      `;
    } else if (coleccion === "descuento_cheque") {
      titulo = `Descuento de Cheque #${datos.numeroCheque || "-"}`;

      // Formatear fechas adicionales
      let fechaToma = "-";
      if (datos.fechaToma) {
        fechaToma =
          typeof datos.fechaToma.toDate === "function"
            ? datos.fechaToma.toDate().toLocaleDateString("es-AR")
            : new Date(datos.fechaToma).toLocaleDateString("es-AR");
      }

      let fechaVencimiento = "-";
      if (datos.fechaVencimiento) {
        fechaVencimiento =
          typeof datos.fechaVencimiento.toDate === "function"
            ? datos.fechaVencimiento.toDate().toLocaleDateString("es-AR")
            : new Date(datos.fechaVencimiento).toLocaleDateString("es-AR");
      }

      detalleHTML = `
        <div style="text-align: left; margin: 15px 0;">
          <p><strong>Fecha:</strong> ${fecha}</p>
          <p><strong>Cliente:</strong> ${datos.clienteNombre || "-"}</p>
          <p><strong>Fecha de Toma:</strong> ${fechaToma}</p>
          <p><strong>Fecha de Vencimiento:</strong> ${fechaVencimiento}</p>
          <p><strong>Días:</strong> ${datos.dias || 0}</p>
          <p><strong>Monto:</strong> $${(datos.monto || 0).toLocaleString(
            "es-AR",
            { minimumFractionDigits: 2 }
          )}</p>
          <p><strong>Tasa:</strong> ${
            datos.tasa?.toLocaleString("es-AR") || "0"
          }%</p>
          <p><strong>Interés:</strong> $${(datos.interes || 0).toLocaleString(
            "es-AR",
            { minimumFractionDigits: 2 }
          )}</p>
          <p><strong>Monto Descontado:</strong> $${(
            datos.montoDescontado || 0
          ).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
          <p><strong>Estado:</strong> ${datos.estado || "Pendiente"}</p>
          <p><strong>Observaciones:</strong> ${datos.observaciones || "-"}</p>
        </div>
      `;
    } else {
      detalleHTML = `<p>No hay información detallada disponible para esta operación (${coleccion}).</p>`;
    }

    // Mostrar el detalle
    Swal.fire({
      title: titulo,
      html: detalleHTML,
      width: 600,
      confirmButtonText: "Cerrar",
    });
  } catch (error) {
    console.error("Error al obtener referencia:", error);
    Swal.fire(
      "Error",
      "No se pudo obtener la información de la referencia: " + error.message,
      "error"
    );
  }
}

// Función para exportar datos a Excel
function exportarDatos(coleccion) {
  try {
    console.log("Exportando datos de:", coleccion);
    console.log("Datos disponibles:", datosCompletos[coleccion]);

    // Determinar qué datos exportar según la colección
    let datos = datosCompletos[coleccion] || [];
    let nombreArchivo = "";

    switch (coleccion) {
      case "historial":
        nombreArchivo = "Historial_Cambios";
        break;
      case "transferencias":
        nombreArchivo = "Transferencias";
        break;
      case "cables":
        nombreArchivo = "Cables";
        break;
      case "cash_to_cash":
        nombreArchivo = "Cash_to_Cash";
        break;
      case "ingreso_pesos":
        nombreArchivo = "Ingreso_Pesos";
        break;
      case "descuento_cheque":
        nombreArchivo = "Descuento_Cheques";
        break;
      default:
        throw new Error(`Colección no reconocida: ${coleccion}`);
    }

    if (datos.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Sin datos",
        text: "No hay datos para exportar",
      });
      return;
    }

    // Crear un nuevo libro de trabajo
    const wb = XLSX.utils.book_new();

    // Preparar datos según la colección
    let datosFormateados = [];
    let nombreHoja = "";

    if (coleccion === "historial") {
      nombreHoja = "Historial de Cambios";

      datosFormateados = datos.map((item) => {
        // Formatear fecha
        const fecha =
          item.timestamp instanceof Date
            ? item.timestamp
            : new Date(item.timestamp);

        return {
          Fecha:
            fecha.toLocaleDateString("es-AR") +
            " " +
            fecha.toLocaleTimeString("es-AR"),
          Usuario: item.usuario || "Sistema",
          Acción: item.accion || "",
          Colección: item.coleccion || "",
          ID_Documento: item.documento_id || "",
          Detalles: item.datos
            ? JSON.stringify(item.datos).substring(0, 100) + "..."
            : "",
        };
      });
    } else if (coleccion === "transferencias") {
      nombreHoja = "Transferencias";

      datosFormateados = datos.map((item) => {
        const fecha = item.fecha
          ? new Date(item.fecha).toLocaleDateString("es-AR")
          : "-";

        return {
          Número: item.numeroTransferencia || "-",
          Fecha: fecha,
          Cliente: item.clienteNombre || "-",
          Operador: item.operadorNombre || "-",
          Destinatario: item.destinatario || "-",
          "Monto ARS":
            item.monto?.toLocaleString("es-AR", { minimumFractionDigits: 2 }) ||
            "0.00",
          "TC BsAs":
            item.tc_usd_bsas?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            }) || "0.00",
          "TC Salta":
            item.tc_usd_salta?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            }) || "0.00",
          "Diferencia TC":
            item.dif_tc?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            }) || "0.00",
          "Comisión ARS":
            item.comision?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            }) || "0.00",
          "Comisión USD":
            item.comision_usd?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            }) || "0.00",
          "Monto Neto":
            item.monto_neto?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            }) || "0.00",
          "Cambio USD":
            item.cambio_usd?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            }) || "0.00",
          Estado: item.recepcionada || "Pendiente",
          Tipo: item.tipoTransaccion || "envio",
          Comentario: item.comentario || "-",
        };
      });
    } else if (coleccion === "cables") {
      nombreHoja = "Cables";

      datosFormateados = datos.map((item) => {
        const fecha = item.fecha
          ? new Date(item.fecha).toLocaleDateString("es-AR")
          : "-";

        return {
          Número: item.numeroCable || "-",
          Fecha: fecha,
          Cliente: item.clienteNombre || "-",
          "Tipo Cable": item.tipoCable === "subida" ? "Subida" : "Bajada",
          "Monto USD":
            item.monto_usd?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            }) || "0.00",
          "Monto Corregido USD":
            item.monto_corregido_usd?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            }) || "0.00",
          "Comisión %":
            item.comision_porc?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            }) || "0.00",
          "Comisión USD":
            item.comision_usd?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            }) || "0.00",
          Estado: item.estado || "Pendiente",
          Comentario: item.comentario || "-",
        };
      });
    } else if (coleccion === "cash_to_cash") {
      nombreHoja = "Cash to Cash";

      datosFormateados = datos.map((item) => {
        const fecha = item.fecha
          ? new Date(item.fecha).toLocaleDateString("es-AR")
          : "-";

        return {
          Número: item.numeroCash || "-",
          Fecha: fecha,
          Cliente: item.clienteNombre || "-",
          Tipo: item.tipoTransaccion === "envio" ? "Envío" : "Recibo",
          Transacción: item.transaccion || "-",
          "Monto USD":
            item.monto_usd?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            }) || "0.00",
          "Comisión %":
            item.comision_porc?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            }) || "0.00",
          "Comisión USD":
            item.comision_usd?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            }) || "0.00",
          Estado: item.estado || "Pendiente",
          Comentario: item.comentario || "-",
        };
      });
    } else if (coleccion === "ingreso_pesos") {
      nombreHoja = "Ingreso de Pesos";

      datosFormateados = datos.map((item) => {
        const fecha = item.fecha
          ? new Date(item.fecha).toLocaleDateString("es-AR")
          : "-";

        return {
          Número: item.numeroIngreso || "-",
          Fecha: fecha,
          Cliente: item.clienteNombre || "-",
          Operador: item.operadorNombre || "-",
          Transacción: item.transaccion || "-",
          "Monto ARS":
            item.monto_ars?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            }) || "0.00",
          "Comisión %":
            item.comision_porc?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            }) || "0.00",
          "Comisión ARS":
            item.comision_ars?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            }) || "0.00",
          "Monto Final":
            item.monto_final?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            }) || "0.00",
          Estado: item.estado || "Pendiente",
        };
      });
    } else if (coleccion === "descuento_cheque") {
      nombreHoja = "Descuento de Cheques";

      datosFormateados = datos.map((item) => {
        const fecha = item.fecha
          ? new Date(item.fecha).toLocaleDateString("es-AR")
          : "-";
        const fechaToma = item.fechaToma
          ? new Date(item.fechaToma).toLocaleDateString("es-AR")
          : "-";
        const fechaVencimiento = item.fechaVencimiento
          ? new Date(item.fechaVencimiento).toLocaleDateString("es-AR")
          : "-";

        return {
          Número: item.numeroCheque || "-",
          Fecha: fecha,
          Cliente: item.clienteNombre || "-",
          "Fecha Toma": fechaToma,
          "Fecha Vencimiento": fechaVencimiento,
          Días: item.dias || "-",
          Monto:
            item.monto?.toLocaleString("es-AR", { minimumFractionDigits: 2 }) ||
            "0.00",
          "Tasa %":
            item.tasa?.toLocaleString("es-AR", { minimumFractionDigits: 2 }) ||
            "0.00",
          Interés:
            item.interes?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            }) || "0.00",
          "Monto Descontado":
            item.montoDescontado?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            }) || "0.00",
          Estado: item.estado || "Pendiente",
          Observaciones: item.observaciones || "-",
        };
      });
    }

    // Crear hoja de trabajo
    const ws = XLSX.utils.json_to_sheet(datosFormateados);

    // Añadir la hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja);

    // Generar nombre del archivo con fecha
    const fechaActual = new Date().toISOString().slice(0, 10);
    const nombreArchivoFinal = `${nombreArchivo}_${fechaActual}.xlsx`;

    // Exportar archivo
    XLSX.writeFile(wb, nombreArchivoFinal);

    Swal.fire({
      icon: "success",
      title: "Exportación Exitosa",
      text: `El archivo "${nombreArchivoFinal}" se ha descargado correctamente`,
    });
  } catch (error) {
    console.error("Error al exportar datos:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo exportar los datos: " + error.message,
    });
  }
}

// Función para cargar el resumen automático de comisiones
function cargarResumenAutomatico() {
  // Resetear clases activas de filtros
  document.querySelectorAll(".btn-filter").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.getElementById("btnResumenAutomatico").classList.add("active");

  try {
    // Mostrar loader
    document.getElementById("bodyTablaResumen").innerHTML = `
      <tr>
        <td colspan="6" class="text-center">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
        </td>
      </tr>
    `;

    // Inicializar totales
    let totalUSD = 0;
    let totalARS = 0;

    // Obtener fecha actual en formato YYYY-MM-DD
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const dia = String(hoy.getDate()).padStart(2, "0");
    const fechaHoy = `${año}-${mes}-${dia}`;

    // Referencia a las colecciones
    const transferenciasRef = coleccion("transferencias");
    const cablesRef = coleccion("cables");
    const cashToCashRef = coleccion("cash_to_cash");
    const ingresoPesosRef = coleccion("ingreso_pesos");
    const descuentoChequeRef = coleccion("descuento_cheque");

    // Consulta para transferencias de hoy
    consulta(transferenciasRef, donde("fecha", "==", fechaHoy))
      .then((snapshot) => {
        // Sumar comisiones USD de transferencias
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.comision_usd && !isNaN(parseFloat(data.comision_usd))) {
            totalUSD += parseFloat(data.comision_usd);
          }
        });
        console.log("Total USD de transferencias:", totalUSD);

        // Consulta para cables de hoy
        return consulta(cablesRef, donde("fecha", "==", fechaHoy));
      })
      .then((snapshot) => {
        // Sumar comisiones USD de cables
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.comision_usd && !isNaN(parseFloat(data.comision_usd))) {
            totalUSD += parseFloat(data.comision_usd);
          }
        });
        console.log("Total USD después de cables:", totalUSD);

        // Consulta para cash_to_cash de hoy
        return consulta(cashToCashRef, donde("fecha", "==", fechaHoy));
      })
      .then((snapshot) => {
        // Sumar comisiones USD de cash_to_cash
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.comision_usd && !isNaN(parseFloat(data.comision_usd))) {
            // Asegurar que se sumen correctamente las comisiones negativas
            totalUSD += parseFloat(data.comision_usd);
          }
        });
        console.log("Total USD después de cash_to_cash:", totalUSD);

        // Consulta para ingreso_pesos de hoy
        return consulta(ingresoPesosRef, donde("fecha", "==", fechaHoy));
      })
      .then((snapshot) => {
        // Sumar comisiones ARS de ingreso_pesos
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.comision_ars && !isNaN(parseFloat(data.comision_ars))) {
            totalARS += parseFloat(data.comision_ars);
          }
        });
        console.log("Total ARS después de ingreso_pesos:", totalARS);

        // Consulta para descuento_cheque de hoy
        return consulta(descuentoChequeRef, donde("fecha", "==", fechaHoy));
      })
      .then((snapshot) => {
        // Sumar intereses de descuento_cheque
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.interes && !isNaN(parseFloat(data.interes))) {
            totalARS += parseFloat(data.interes);
          }
        });
        console.log("Total ARS después de descuento_cheque:", totalARS);

        // Mostrar resultados en la tabla
        document.getElementById("bodyTablaResumen").innerHTML = "";
        document.getElementById("bodyTablaResumen").innerHTML = `
        <tr>
          <td>${fechaHoy}</td>
          <td>Resumen del día</td>
          <td>${totalUSD.toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} USD</td>
          <td>${totalARS.toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} ARS</td>
          <td>Automático</td>
          <td>
            <button class="btn btn-sm btn-info" onclick="exportarResumen('${fechaHoy}', ${totalUSD}, ${totalARS})">
              <i class="bi bi-file-earmark-excel"></i>
            </button>
          </td>
        </tr>
      `;
      })
      .catch((error) => {
        console.error("Error al cargar resumen automático:", error);
        // En caso de error, resetear totales
        totalUSD = 0;
        totalARS = 0;
        // Mostrar mensaje de error
        document.getElementById("bodyTablaResumen").innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-danger">
            Error al cargar el resumen: ${error.message}
          </td>
        </tr>
      `;
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudo cargar el resumen automático: " + error.message,
        });
      });
  } catch (error) {
    console.error("Error en cargarResumenAutomatico:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo cargar el resumen automático: " + error.message,
    });
  }
}

// Función para exportar el resumen diario
function exportarResumen(fecha, totalUSD, totalARS) {
  try {
    console.log("Exportando resumen para fecha:", fecha);

    // Crear un nuevo libro de trabajo
    const wb = XLSX.utils.book_new();

    // Datos para el resumen
    const datosResumen = [
      {
        Fecha: fecha,
        "Total USD": totalUSD.toLocaleString("es-AR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        "Total ARS": totalARS.toLocaleString("es-AR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        Generado: "Automático",
        "Generado el":
          new Date().toLocaleDateString("es-AR") +
          " " +
          new Date().toLocaleTimeString("es-AR"),
      },
    ];

    // Crear hoja de trabajo
    const ws = XLSX.utils.json_to_sheet(datosResumen);

    // Añadir la hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, "Resumen Diario");

    // Generar nombre del archivo con fecha
    const nombreArchivo = `Resumen_Diario_${fecha}.xlsx`;

    // Exportar archivo
    XLSX.writeFile(wb, nombreArchivo);

    Swal.fire({
      icon: "success",
      title: "Exportación Exitosa",
      text: `El archivo "${nombreArchivo}" se ha descargado correctamente`,
    });
  } catch (error) {
    console.error("Error al exportar resumen:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo exportar el resumen: " + error.message,
    });
  }
}
