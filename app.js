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

  // Si es el módulo de operadores/clientes, cargar datos
  if (modulo === "operadores_clientes") {
    cargarOperadores();
    cargarClientes();
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
  mostrarModulo("resumen");
  cargarResumenAutomatico();
  cargarTransferencias();
  cargarCables();
  cargarCash();
  cargarIngresoPesos();
  cargarDescuentoCheque();
  cargarCuentaCorrientePesos();
  cargarCuentaCorrienteDolares();

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

  // Cargar operadores y clientes para las listas desplegables
  cargarListasOperadoresClientes();

  // Inicializar formularios de operadores y clientes
  inicializarFormularioOperadores();
  inicializarFormularioClientes();

  // Inicializar formularios de cuenta corriente
  inicializarFormulariosCuentaCorriente();

  // Inicializar historial
  document
    .getElementById("btnFiltrarHistorial")
    ?.addEventListener("click", () => {
      const filtros = {
        fechaDesde: document.getElementById("fechaDesdeHistorial").value,
        fechaHasta: document.getElementById("fechaHastaHistorial").value,
        tipoRegistro: document.getElementById("tipoRegistroHistorial").value,
        tipoAccion: document.getElementById("tipoAccionHistorial").value,
      };

      cargarHistorial(filtros);
    });

  // Inicializar dropdown de exportación
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

  document.getElementById("tipoRegistroHistorial").innerHTML = `
    <option value="todos">Todos los registros</option>
    <option value="transferencias">Transferencias</option>
    <option value="cables">Cables</option>
    <option value="cash_to_cash">Cash to Cash</option>
    <option value="ingreso_pesos">Ingreso Pesos</option>
    <option value="descuento_cheque">Descuento Cheque</option>
    <option value="operadores">Operadores</option>
    <option value="clientes">Clientes</option>
    <option value="cuentaCorrientePesos">Cuenta Corriente Pesos</option>
    <option value="cuentaCorrienteDolares">Cuenta Corriente Dólares</option>
  `;
});

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
          const comision = parseFloat(item.comision || 0);
          const tc = parseFloat(item.tc_usd_salta || 1);
          // Calcular el equivalente en USD de la comisión en ARS si tc es válido
          const comisionUsd = tc > 0 ? comision / tc : 0;
          return total + comisionUsd;
        }, 0),
        comisionArs: transferencias.reduce((total, item) => {
          const comision = parseFloat(item.comision || 0);
          return total + comision;
        }, 0),
      },
      {
        tipo: "Cables",
        cantidad: cables.length,
        comisionUsd: cables.reduce((total, item) => {
          const comision = parseFloat(item.comision_usd || 0);
          return total + comision;
        }, 0),
        comisionArs: 0,
      },
      {
        tipo: "Cash to Cash",
        cantidad: cashToCash.length,
        comisionUsd: cashToCash.reduce((total, item) => {
          // Permitir comisiones negativas sumándolas al total
          const comision = parseFloat(item.comision_usd || 0);
          return total + comision; // Las comisiones negativas se restarán automáticamente
        }, 0),
        comisionArs: 0,
      },
      {
        tipo: "Ingreso Pesos",
        cantidad: ingresoPesos.length,
        comisionUsd: 0,
        comisionArs: ingresoPesos.reduce((total, item) => {
          const comision = parseFloat(item.comision_ars || 0);
          return total + comision;
        }, 0),
      },
      {
        tipo: "Descuento Cheque",
        cantidad: descuentoCheque.length,
        comisionUsd: 0,
        comisionArs: descuentoCheque.reduce((total, item) => {
          const comision = parseFloat(item.comision || 0);
          return total + comision;
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

    // Aplicar clases para valores negativos
    if (totalUsd < 0) {
      totalUsdElement.classList.add("negativo");
    } else {
      totalUsdElement.classList.remove("negativo");
    }

    if (totalArs < 0) {
      totalArsElement.classList.add("negativo");
    } else {
      totalArsElement.classList.remove("negativo");
    }

    // Mostrar resumen en la tabla
    tbody.innerHTML = "";

    if (resumen.every((item) => item.cantidad === 0)) {
      tbody.innerHTML =
        '<tr><td colspan="4" style="text-align: center;">No hay transacciones en el periodo seleccionado</td></tr>';
      return;
    }

    resumen.forEach((item) => {
      // Validar números
      const comisionUsd = isNaN(item.comisionUsd) ? 0 : item.comisionUsd;
      const comisionArs = isNaN(item.comisionArs) ? 0 : item.comisionArs;

      // Determinar clases para valores negativos
      const comisionUsdClass = comisionUsd < 0 ? "negativo" : "";
      const comisionArsClass = comisionArs < 0 ? "negativo" : "";

      // Formatear valores
      const comisionUsdFormateada = comisionUsd.toLocaleString("es-AR", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      const comisionArsFormateada = comisionArs.toLocaleString("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      tbody.innerHTML += `
      <tr>
        <td>${item.tipo}</td>
        <td>${item.cantidad}</td>
        <td class="${comisionUsdClass}">${comisionUsdFormateada}</td>
        <td class="${comisionArsClass}">${comisionArsFormateada}</td>
      </tr>
      `;
    });

    // Calcular el total de cantidades
    const totalCantidad = resumen.reduce(
      (total, item) => total + item.cantidad,
      0
    );

    // Determinar clases para valores negativos
    const totalUsdClass = totalUsd < 0 ? "negativo" : "";
    const totalArsClass = totalArs < 0 ? "negativo" : "";

    // Formatear los totales para la fila final
    const totalUsdFormateado = totalUsd.toLocaleString("es-AR", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const totalArsFormateado = totalArs.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    // Agregar fila de totales
    tbody.innerHTML += `
    <tr class="total-row">
      <td><strong>TOTAL</strong></td>
      <td><strong>${totalCantidad}</strong></td>
      <td class="${totalUsdClass}"><strong>${totalUsdFormateado}</strong></td>
      <td class="${totalArsClass}"><strong>${totalArsFormateado}</strong></td>
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
  const montoInput = document.getElementById("montoTrans");
  const tcBsAsInput = document.getElementById("tcUsdBsAsTrans");
  const tcSaltaInput = document.getElementById("tcUsdSaltaTrans");
  const comisionInput = document.getElementById("comisionArsTrans");

  // Elementos para mostrar resultados
  const difTcResult = document.getElementById("difTcResult");
  const montoNetoResult = document.getElementById("montoNetoResult");
  const cambioUsdResult = document.getElementById("cambioUsdResult");

  // Campos ocultos para enviar los valores
  const difTcTrans = document.getElementById("difTcTrans");
  const montoNetoTrans = document.getElementById("montoNetoTrans");
  const cambioUsdTrans = document.getElementById("cambioUsdTrans");

  const calcularValores = () => {
    // Obtener valores de los campos
    const monto = parseFloat(montoInput.value) || 0;
    const tcBsAs = parseFloat(tcBsAsInput.value) || 0;
    const tcSalta = parseFloat(tcSaltaInput.value) || 0;

    // 1. Diferencia entre tipos de cambio
    const difTc = tcSalta - tcBsAs;

    // 2. Cálculo de comisión (solo si ambos TC son mayores a cero)
    let comision = parseFloat(comisionInput.value) || 0;

    // Calcular comisión automáticamente basada en diferencia en USD
    if (tcBsAs > 0 && tcSalta > 0) {
      const montoUsdBsAs = monto / tcBsAs;
      const montoUsdSalta = monto / tcSalta;
      const diferenciaUsd = montoUsdBsAs - montoUsdSalta;

      // Actualizar el campo de comisión solo si está vacío o es cero
      if (comisionInput.value === "" || parseFloat(comisionInput.value) === 0) {
        comision = diferenciaUsd * tcSalta; // Convertir diferencia USD a ARS
        comisionInput.value = comision.toFixed(2);
      }
    }

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
    const cambioUsd = tcSalta > 0 ? montoNeto / tcSalta : 0;

    // Monto total en USD antes de comisión
    const montoTotalUsd = tcSalta > 0 ? monto / tcSalta : 0;

    // Comisión en USD (equivalente a la comisión en ARS convertida a USD)
    const comisionUsd = tcSalta > 0 ? comision / tcSalta : 0;

    // Obtener número de transferencia automático
    const numeroTransferencia = await obtenerSiguienteNumeroTransferencia();

    // Obtener operador y cliente seleccionados
    const operadorId = getVal("operadorTrans");
    const clienteId = getVal("clienteTrans");
    const tipoTransaccion = getVal("tipoTransaccionTrans") || "envio"; // Por defecto es envío

    // Obtener datos de operador y cliente
    const operadorDoc = await db.collection("operadores").doc(operadorId).get();
    const clienteDoc = await db.collection("clientes").doc(clienteId).get();

    if (!operadorDoc.exists) {
      throw new Error("Operador no encontrado");
    }

    if (!clienteDoc.exists) {
      throw new Error("Cliente no encontrado");
    }

    const operadorNombre = operadorDoc.data().nombre;
    const clienteNombre = clienteDoc.data().nombre;

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
        entidadId: operadorId,
        entidadNombre: operadorNombre,
        tipoEntidad: "Operador",
        fecha: new Date(getVal("fechaTrans")),
        fechaValor: new Date(getVal("fechaTrans")),
        tipoOperacion: "NOTA DE CREDITO",
        debito: 0,
        credito: cambioUsd,
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
        entidadId: clienteId,
        entidadNombre: clienteNombre,
        tipoEntidad: "Cliente",
        fecha: new Date(getVal("fechaTrans")),
        fechaValor: new Date(getVal("fechaTrans")),
        tipoOperacion: "NOTA DE DEBITO",
        debito: cambioUsd,
        credito: 0,
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
        entidadId: clienteId,
        entidadNombre: clienteNombre,
        tipoEntidad: "Cliente",
        fecha: new Date(getVal("fechaTrans")),
        fechaValor: new Date(getVal("fechaTrans")),
        tipoOperacion: "NOTA DE DEBITO",
        debito: monto,
        credito: 0,
        moneda: "ARS",
        concepto: `Transferencia #${numeroTransferencia} - Envío de pesos`,
        referenciaId: docRef.id,
        referenciaColeccion: "transferencias",
        timestamp: new Date(),
      });
    } else {
      // recibo
      await db.collection("cuentaCorrientePesos").add({
        entidadId: clienteId,
        entidadNombre: clienteNombre,
        tipoEntidad: "Cliente",
        fecha: new Date(getVal("fechaTrans")),
        fechaValor: new Date(getVal("fechaTrans")),
        tipoOperacion: "NOTA DE CREDITO",
        debito: 0,
        credito: monto,
        moneda: "ARS",
        concepto: `Transferencia #${numeroTransferencia} - Recibo de pesos`,
        referenciaId: docRef.id,
        referenciaColeccion: "transferencias",
        timestamp: new Date(),
      });
    }

    // 2.2 Registrar la comisión como un débito al cliente
    if (comision > 0) {
      await db.collection("cuentaCorrientePesos").add({
        entidadId: clienteId,
        entidadNombre: clienteNombre,
        tipoEntidad: "Cliente",
        fecha: new Date(getVal("fechaTrans")),
        fechaValor: new Date(getVal("fechaTrans")),
        tipoOperacion: "NOTA DE DEBITO",
        debito: comision,
        credito: 0,
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
      <td>${t.clienteNombre || t.cliente}</td>
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

// Configurar cálculos automáticos en tiempo real para cables
const setupCablesCalculos = () => {
  const montoUsdInput = document.getElementById("montoUsdCable");
  const comisionPorcInput = document.getElementById("comisionPorcCable");
  const comisionUsdInput = document.getElementById("comisionUsdCable");
  const comisionUsdResult = document.getElementById("comisionUsdResult");

  // Función para calcular la comisión
  const calcularComision = () => {
    const montoUsd = parseFloat(montoUsdInput.value) || 0;
    const comisionPorc = parseFloat(comisionPorcInput.value) || 0;

    // Calcular comisión en USD
    const comisionUsd = (montoUsd * comisionPorc) / 100;

    // Mostrar en la interfaz
    comisionUsdResult.textContent = comisionUsd.toFixed(2);

    // Establecer en el campo oculto
    comisionUsdInput.value = comisionUsd;
  };

  // Configurar eventos para actualizar cálculos cuando cambian los valores
  [montoUsdInput, comisionPorcInput].forEach((input) => {
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
      "transaccionCable",
      "montoUsdCable",
      "comisionPorcCable",
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
    const comisionPorc = parseFloat(getVal("comisionPorcCable"));
    const comisionUsd = parseFloat(getVal("comisionUsdCable"));

    await db.collection("cables").add({
      fecha: getVal("fechaCable"),
      cliente: getVal("clienteCable"),
      transaccion: getVal("transaccionCable"),
      monto_usd: montoUsd,
      comision_porc: comisionPorc,
      comision_usd: comisionUsd,
      estado: getVal("ingresoCable"),
      timestamp: new Date(),
    });

    clearForm("formCables");
    setupCablesCalculos(); // Reiniciar cálculos
    cargarCables();

    Swal.fire({
      icon: "success",
      title: "Éxito",
      text: "Cable registrado correctamente",
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
    const snap = await db
      .collection("cables")
      .orderBy("timestamp", "desc")
      .get();
    if (snap.empty) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align: center;">No hay registros</td></tr>';
      return;
    }

    snap.forEach((doc) => {
      const d = doc.data();
      const fecha = d.fecha
        ? new Date(d.fecha).toLocaleDateString("es-AR")
        : "-";
      const estado = d.estado || "Pendiente";
      tbody.innerHTML += `
      <tr>
        <td>${fecha}</td>
        <td>${d.cliente}</td>
        <td>$${d.monto_usd.toFixed(2)}</td>
        <td>${d.comision_porc.toFixed(2)}%</td>
        <td>$${d.comision_usd.toFixed(2)}</td>
        <td><span class="estado-${estado.toLowerCase()}">${estado}</span></td>
        <td>
          <button class="btn-editar" onclick="verDetallesCable('${
            doc.id
          }')">Ver</button>
          <button onclick="eliminarRegistro('cables', '${
            doc.id
          }', cargarCables)">Eliminar</button>
        </td>
      </tr>`;
    });
  } catch (error) {
    console.error("Error al cargar cables:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error al cargar los datos: " + error.message,
    });
  }
}

// Función para ver detalles de cable
async function verDetallesCable(id) {
  try {
    const doc = await db.collection("cables").doc(id).get();
    if (!doc.exists) {
      Swal.fire("Error", "Cable no encontrado", "error");
      return;
    }

    const c = doc.data();
    const fecha = c.fecha ? new Date(c.fecha).toLocaleDateString("es-AR") : "-";

    Swal.fire({
      title: `Cable - ${c.cliente}`,
      html: `
        <div style="text-align: left; margin: 15px 0;">
          <p><strong>Fecha:</strong> ${fecha}</p>
          <p><strong>Cliente:</strong> ${c.cliente}</p>
          <p><strong>Transacción:</strong> ${c.transaccion}</p>
          <p><strong>Monto USD:</strong> $${c.monto_usd.toFixed(2)}</p>
          <p><strong>Comisión %:</strong> ${c.comision_porc.toFixed(2)}%</p>
          <p><strong>Comisión USD:</strong> $${c.comision_usd.toFixed(2)}</p>
          <p><strong>Estado:</strong> ${c.estado || "Pendiente"}</p>
        </div>
      `,
      width: "500px",
    });
  } catch (error) {
    console.error("Error al obtener detalles:", error);
    Swal.fire("Error", "No se pudieron cargar los detalles", "error");
  }
}

// ================== CASH TO CASH ==================
const formCash = document.getElementById("formCash");

// Configurar cálculos automáticos para Cash to Cash
const setupCashCalculos = () => {
  const montoUsdInput = document.getElementById("montoUsdCash");
  const comisionPorcInput = document.getElementById("comisionPorcCash");
  const comisionUsdInput = document.getElementById("comisionUsdCash");
  const comisionUsdResult = document.getElementById("comisionUsdCashResult");

  // Función para calcular la comisión
  const calcularComision = () => {
    const montoUsd = parseFloat(montoUsdInput.value) || 0;
    const comisionPorc = parseFloat(comisionPorcInput.value) || 0;

    // Calcular comisión en USD (permitiendo valores negativos)
    const comisionUsd = (montoUsd * comisionPorc) / 100;

    // Mostrar en la interfaz con formato adecuado para valores negativos
    if (comisionUsd < 0) {
      comisionUsdResult.textContent = comisionUsd.toFixed(2);
      comisionUsdResult.classList.add("negativo");
    } else {
      comisionUsdResult.textContent = comisionUsd.toFixed(2);
      comisionUsdResult.classList.remove("negativo");
    }

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
      "tipoTransaccionCash",
      "transaccionCash",
      "montoUsdCash",
      "comisionPorcCash",
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

    // Obtener cliente seleccionado
    const clienteId = getVal("clienteCash");
    const clienteDoc = await db.collection("clientes").doc(clienteId).get();

    if (!clienteDoc.exists) {
      throw new Error("Cliente no encontrado");
    }

    const clienteNombre = clienteDoc.data().nombre;

    // Crear objeto con los datos
    const datosCash = {
      fecha: getVal("fechaCash"),
      cliente: clienteId,
      clienteNombre: clienteNombre,
      tipoTransaccion: tipoTransaccion,
      transaccion: getVal("transaccionCash"),
      monto_usd: montoUsd,
      comision_porc: comisionPorc,
      comision_usd: comisionUsd,
      estado: getVal("estadoCash"),
      timestamp: new Date(),
    };

    // Guardar en Firestore
    const docRef = await db.collection("cash_to_cash").add(datosCash);

    // Registrar en historial
    await registrarHistorial("cash_to_cash", "crear", docRef.id, datosCash);

    clearForm("formCash");
    setupCashCalculos(); // Reiniciar cálculos
    cargarCash();

    Swal.fire({
      icon: "success",
      title: "Éxito",
      text: "Transacción Cash to Cash registrada correctamente",
    });
  } catch (error) {
    console.error("Error al guardar transaction Cash to Cash:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo guardar la transacción: " + error.message,
    });
  }
};

async function cargarCash() {
  const tbody = document.getElementById("tablaCash");
  tbody.innerHTML = "";
  try {
    const snap = await db
      .collection("cash_to_cash")
      .orderBy("timestamp", "desc")
      .get();
    if (snap.empty) {
      tbody.innerHTML =
        '<tr><td colspan="8" style="text-align: center;">No hay registros</td></tr>';
      return;
    }

    snap.forEach((doc) => {
      const d = doc.data();
      const fecha = d.fecha
        ? new Date(d.fecha).toLocaleDateString("es-AR")
        : "-";
      const estado = d.estado || "Pendiente";
      const tipoTrans = d.tipoTransaccion === "envio" ? "Envío" : "Recibo";

      // Formatear comisión USD con clase especial si es negativa
      const comisionUsd = parseFloat(d.comision_usd) || 0;
      const comisionClass = comisionUsd < 0 ? "negativo" : "";
      const comisionText = `$${comisionUsd.toFixed(2)}`;

      tbody.innerHTML += `
      <tr>
        <td>${fecha}</td>
        <td>${d.clienteNombre || d.cliente}</td>
        <td>${tipoTrans}</td>
        <td>$${d.monto_usd.toFixed(2)}</td>
        <td>${d.comision_porc.toFixed(2)}%</td>
        <td class="${comisionClass}">${comisionText}</td>
        <td><span class="estado-${estado.toLowerCase()}">${estado}</span></td>
        <td>
          <button class="btn-editar" onclick="verDetallesCash('${
            doc.id
          }')">Ver</button>
          <button onclick="eliminarRegistro('cash_to_cash', '${
            doc.id
          }', cargarCash)">Eliminar</button>
        </td>
      </tr>`;
    });
  } catch (error) {
    console.error("Error al cargar Cash to Cash:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error al cargar los datos: " + error.message,
    });
  }
}

// Función para ver detalles de Cash to Cash
async function verDetallesCash(id) {
  try {
    const doc = await db.collection("cash_to_cash").doc(id).get();
    if (!doc.exists) {
      Swal.fire("Error", "Transacción no encontrada", "error");
      return;
    }

    const c = doc.data();
    const fecha = c.fecha ? new Date(c.fecha).toLocaleDateString("es-AR") : "-";
    const tipoTrans = c.tipoTransaccion === "envio" ? "Envío" : "Recibo";

    // Formatear comisión con clase especial si es negativa
    const comisionUsd = parseFloat(c.comision_usd) || 0;
    const comisionClass = comisionUsd < 0 ? "class='negativo'" : "";

    Swal.fire({
      title: `Cash to Cash - ${c.clienteNombre || c.cliente}`,
      html: `
        <div style="text-align: left; margin: 15px 0;">
          <p><strong>Fecha:</strong> ${fecha}</p>
          <p><strong>Cliente:</strong> ${c.clienteNombre || c.cliente}</p>
          <p><strong>Tipo:</strong> ${tipoTrans} de Cash</p>
          <p><strong>Transacción:</strong> ${c.transaccion}</p>
          <p><strong>Monto USD:</strong> $${c.monto_usd.toFixed(2)}</p>
          <p><strong>Comisión %:</strong> ${c.comision_porc.toFixed(2)}%</p>
          <p><strong>Comisión USD:</strong> <span ${comisionClass}>$${c.comision_usd.toFixed(
        2
      )}</span></p>
          <p><strong>Estado:</strong> ${c.estado || "Pendiente"}</p>
        </div>
      `,
      width: "500px",
    });
  } catch (error) {
    console.error("Error al obtener detalles:", error);
    Swal.fire("Error", "No se pudieron cargar los detalles", "error");
  }
}

// ================== INGRESO PESOS ==================
const formIngresoPesos = document.getElementById("formIngresoPesos");

// Configurar cálculos automáticos para Ingreso Pesos
const setupIngresoPesosCalculos = () => {
  const montoArsInput = document.getElementById("montoArsIngreso");
  const comisionPorcInput = document.getElementById("comisionPorcIngreso");
  const comisionArsInput = document.getElementById("comisionArsIngreso");
  const comisionArsResult = document.getElementById("comisionArsResult");

  // Función para calcular la comisión
  const calcularComision = () => {
    const montoArs = parseFloat(montoArsInput.value) || 0;
    const comisionPorc = parseFloat(comisionPorcInput.value) || 0;

    // Calcular comisión en ARS
    const comisionArs = (montoArs * comisionPorc) / 100;

    // Mostrar en la interfaz
    comisionArsResult.textContent = comisionArs.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
    });

    // Establecer en el campo oculto
    comisionArsInput.value = comisionArs;
  };

  // Configurar eventos para actualizar cálculos cuando cambian los valores
  [montoArsInput, comisionPorcInput].forEach((input) => {
    input.addEventListener("input", calcularComision);
  });
};

// Inicializar cálculos automáticos
setupIngresoPesosCalculos();

formIngresoPesos.onsubmit = async (e) => {
  e.preventDefault();
  try {
    // Verificar campos obligatorios
    const campos = [
      "fechaIngreso",
      "operadorIngreso",
      "transaccionIngreso",
      "montoArsIngreso",
      "comisionPorcIngreso",
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

    // Verificar que al menos hay un cliente (sistema o manual)
    const clienteId = getVal("clienteIngreso");
    const clienteManual = getVal("clienteManualIngreso");

    if (!clienteId && !clienteManual) {
      Swal.fire({
        icon: "error",
        title: "Cliente no especificado",
        text: "Debe seleccionar un cliente del sistema o ingresar un nombre manualmente",
      });
      return;
    }

    const montoArs = parseFloat(getVal("montoArsIngreso"));
    const comisionPorc = parseFloat(getVal("comisionPorcIngreso"));
    const comisionArs = parseFloat(getVal("comisionArsIngreso"));

    // Obtener datos del operador seleccionado
    const operadorId = getVal("operadorIngreso");
    const operadorDoc = await db.collection("operadores").doc(operadorId).get();

    if (!operadorDoc.exists) {
      throw new Error("Operador no encontrado");
    }

    const operadorNombre = operadorDoc.data().nombre;

    // Determinar cliente y nombre
    let clienteNombre = "";

    if (clienteId) {
      // Si hay cliente del sistema, obtener su nombre
      const clienteDoc = await db.collection("clientes").doc(clienteId).get();
      clienteNombre = clienteDoc.exists ? clienteDoc.data().nombre : "";
    } else {
      // Si no hay cliente del sistema, usar el manual
      clienteNombre = clienteManual;
    }

    // Crear objeto con los datos
    const datosIngreso = {
      fecha: getVal("fechaIngreso"),
      clienteId: clienteId || null,
      clienteManual: clienteManual || null,
      clienteNombre: clienteNombre,
      operadorId: operadorId,
      operadorNombre: operadorNombre,
      transaccion: getVal("transaccionIngreso"),
      monto_ars: montoArs,
      comision_porc: comisionPorc,
      comision_ars: comisionArs,
      estado: getVal("estadoIngreso"),
      timestamp: new Date(),
    };

    // Guardar en Firestore
    const docRef = await db.collection("ingreso_pesos").add(datosIngreso);

    // Registrar en historial
    await registrarHistorial("ingreso_pesos", "crear", docRef.id, datosIngreso);

    // Registrar débito en la cuenta corriente del operador
    await db.collection("cuentaCorrientePesos").add({
      entidadId: operadorId,
      entidadNombre: operadorNombre,
      tipoEntidad: "Operador",
      fecha: new Date(getVal("fechaIngreso")),
      fechaValor: new Date(getVal("fechaIngreso")),
      tipoOperacion: "NOTA DE DEBITO",
      debito: montoArs,
      credito: 0,
      moneda: "ARS",
      concepto: `Ingreso de Pesos - Transacción: ${getVal(
        "transaccionIngreso"
      )} - Cliente: ${clienteNombre}`,
      referenciaId: docRef.id,
      referenciaColeccion: "ingreso_pesos",
      timestamp: new Date(),
    });

    // Limpiar formulario y recargar datos
    clearForm("formIngresoPesos");
    setupIngresoPesosCalculos(); // Reiniciar cálculos
    cargarIngresoPesos();
    cargarCuentaCorrientePesos(); // Actualizar la cuenta corriente

    Swal.fire({
      icon: "success",
      title: "Éxito",
      text: "Ingreso en Pesos registrado correctamente",
    });
  } catch (error) {
    console.error("Error al guardar ingreso:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo guardar el ingreso: " + error.message,
    });
  }
};

async function cargarIngresoPesos() {
  const tbody = document.getElementById("tablaIngresoPesos");
  tbody.innerHTML = "";
  try {
    const snap = await db
      .collection("ingreso_pesos")
      .orderBy("timestamp", "desc")
      .get();
    if (snap.empty) {
      tbody.innerHTML =
        '<tr><td colspan="8" style="text-align: center;">No hay registros</td></tr>';
      return;
    }

    snap.forEach((doc) => {
      const d = doc.data();
      const fecha = d.fecha
        ? new Date(d.fecha).toLocaleDateString("es-AR")
        : "-";
      const estado = d.estado || "Pendiente";

      // Mostrar el nombre del cliente, según sea del sistema o manual
      const clienteNombre =
        d.clienteNombre || d.clienteManual || d.cliente || "-";

      // Mostrar el nombre del operador
      const operadorNombre = d.operadorNombre || d.operador || "-";

      tbody.innerHTML += `
      <tr>
        <td>${fecha}</td>
        <td>${clienteNombre}</td>
        <td>${operadorNombre}</td>
        <td>$${d.monto_ars.toLocaleString("es-AR")}</td>
        <td>${d.comision_porc.toFixed(2)}%</td>
        <td>$${d.comision_ars.toLocaleString("es-AR")}</td>
        <td><span class="estado-${estado.toLowerCase()}">${estado}</span></td>
        <td>
          <button class="btn-editar" onclick="verDetallesIngresoPesos('${
            doc.id
          }')">Ver</button>
          <button onclick="eliminarRegistro('ingreso_pesos', '${
            doc.id
          }', cargarIngresoPesos)">Eliminar</button>
        </td>
      </tr>`;
    });
  } catch (error) {
    console.error("Error al cargar ingresos en pesos:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error al cargar los datos: " + error.message,
    });
  }
}

// Función para ver detalles de Ingreso Pesos
async function verDetallesIngresoPesos(id) {
  try {
    const doc = await db.collection("ingreso_pesos").doc(id).get();
    if (!doc.exists) {
      Swal.fire("Error", "Ingreso no encontrado", "error");
      return;
    }

    const i = doc.data();
    const fecha = i.fecha ? new Date(i.fecha).toLocaleDateString("es-AR") : "-";

    // Determinar el origen del cliente (sistema o manual)
    const clienteNombre =
      i.clienteNombre || i.clienteManual || i.cliente || "-";
    const clienteOrigen = i.clienteId ? "Sistema" : "Ingreso manual";

    // Información del operador
    const operadorNombre = i.operadorNombre || i.operador || "-";

    Swal.fire({
      title: `Ingreso Pesos`,
      html: `
        <div style="text-align: left; margin: 15px 0;">
          <p><strong>Fecha:</strong> ${fecha}</p>
          <p><strong>Cliente:</strong> ${clienteNombre} <small>(${clienteOrigen})</small></p>
          <p><strong>Operador:</strong> ${operadorNombre}</p>
          <p><strong>Transacción:</strong> ${i.transaccion}</p>
          <p><strong>Monto ARS:</strong> $${i.monto_ars.toLocaleString(
            "es-AR"
          )}</p>
          <p><strong>Comisión %:</strong> ${i.comision_porc.toFixed(2)}%</p>
          <p><strong>Comisión ARS:</strong> $${i.comision_ars.toLocaleString(
            "es-AR"
          )}</p>
          <p><strong>Estado:</strong> ${i.estado || "Pendiente"}</p>
          <p><small>Nota: Este tipo de transacción genera un débito en la cuenta corriente del operador.</small></p>
        </div>
      `,
      width: "500px",
    });
  } catch (error) {
    console.error("Error al obtener detalles:", error);
    Swal.fire("Error", "No se pudieron cargar los detalles", "error");
  }
}

// ================== DESCUENTO CHEQUE ==================
const formDescuentoCheque = document.getElementById("formDescuentoCheque");

// Configurar cálculos automáticos para Descuento de Cheque
const setupDescuentoChequeCalculos = () => {
  const fechaTomaInput = document.getElementById("fechaTomaCheque");
  const fechaVencimientoInput = document.getElementById(
    "fechaVencimientoCheque"
  );
  const montoInput = document.getElementById("montoCheque");
  const tasaInput = document.getElementById("tasaCheque");
  const diasInput = document.getElementById("diasCheque");
  const interesDisarioInput = document.getElementById("interesDisarioCheque");
  const comisionInput = document.getElementById("comisionCheque");

  // Elementos para mostrar resultados
  const interesResult = document.getElementById("interesResult");
  const montoDescontadoResult = document.getElementById(
    "montoDescontadoResult"
  );

  // Campos ocultos para guardar valores
  const interesCheque = document.getElementById("interesCheque");
  const montoDescontadoCheque = document.getElementById(
    "montoDescontadoCheque"
  );

  // Función para calcular días entre fechas
  const calcularDias = () => {
    const fechaToma = fechaTomaInput.value
      ? new Date(fechaTomaInput.value)
      : null;
    const fechaVencimiento = fechaVencimientoInput.value
      ? new Date(fechaVencimientoInput.value)
      : null;

    if (fechaToma && fechaVencimiento) {
      // Convertir a UTC para evitar problemas con zonas horarias
      const fechaTomaUTC = Date.UTC(
        fechaToma.getFullYear(),
        fechaToma.getMonth(),
        fechaToma.getDate()
      );
      const fechaVencimientoUTC = Date.UTC(
        fechaVencimiento.getFullYear(),
        fechaVencimiento.getMonth(),
        fechaVencimiento.getDate()
      );

      // Calcular la diferencia en milisegundos y convertir a días
      const diferenciaMilisegundos = fechaVencimientoUTC - fechaTomaUTC;
      const dias = Math.floor(diferenciaMilisegundos / (1000 * 60 * 60 * 24));

      // Si es negativo, establecer a cero y posiblemente mostrar un mensaje
      if (dias < 0) {
        diasInput.value = 0;
        Swal.fire({
          icon: "warning",
          title: "Fecha inválida",
          text: "La fecha de vencimiento debe ser posterior a la fecha de toma",
        });
      } else {
        diasInput.value = dias;
      }
    }

    // Después de calcular los días, calcular todos los valores
    calcularValores();
  };

  // Función para realizar los cálculos completos
  const calcularValores = () => {
    const monto = parseFloat(montoInput.value) || 0;
    const tasa = parseFloat(tasaInput.value) || 0;
    const dias = parseInt(diasInput.value) || 0;
    const comision = parseFloat(comisionInput.value) || 0;

    // 1. Calcular interés diario (tasa anual dividida por 365 días, por el monto)
    const interesDisario = (monto * tasa) / 36500; // 365 días x 100 (para el %)
    interesDisarioInput.value = interesDisario.toFixed(2);

    // 2. Calcular interés total
    const interes = interesDisario * dias;

    // 3. Calcular monto descontado (lo que recibe el cliente)
    const montoDescontado = monto - (interes + comision);

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

    // Guardar en campos ocultos
    interesCheque.value = interes;
    montoDescontadoCheque.value = montoDescontado;
  };

  // Configurar eventos para las fechas (calcular días cuando cambian)
  fechaTomaInput.addEventListener("change", calcularDias);
  fechaVencimientoInput.addEventListener("change", calcularDias);

  // Configurar eventos para los demás inputs
  [montoInput, tasaInput, comisionInput].forEach((input) => {
    input.addEventListener("input", calcularValores);
  });
};

// Inicializar cálculos
setupDescuentoChequeCalculos();

// Manejo del formulario
formDescuentoCheque.onsubmit = async (e) => {
  e.preventDefault();
  try {
    // Verificar campos obligatorios
    const campos = [
      "fechaTomaCheque",
      "fechaVencimientoCheque",
      "clienteCheque",
      "montoCheque",
      "tasaCheque",
      "comisionCheque",
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

    // Obtener valores
    const monto = parseFloat(getVal("montoCheque"));
    const tasa = parseFloat(getVal("tasaCheque"));
    const dias = parseInt(getVal("diasCheque"));
    const interesDisario = parseFloat(getVal("interesDisarioCheque"));
    const comision = parseFloat(getVal("comisionCheque"));
    const interes = parseFloat(getVal("interesCheque"));
    const montoDescontado = parseFloat(getVal("montoDescontadoCheque"));

    // Obtener cliente seleccionado
    const clienteId = getVal("clienteCheque");
    const clienteDoc = await db.collection("clientes").doc(clienteId).get();

    if (!clienteDoc.exists) {
      throw new Error("Cliente no encontrado");
    }

    const clienteNombre = clienteDoc.data().nombre;

    // Crear objeto con los datos
    const datosCheque = {
      fechaToma: getVal("fechaTomaCheque"),
      fechaVencimiento: getVal("fechaVencimientoCheque"),
      clienteId: clienteId,
      clienteNombre: clienteNombre,
      monto: monto,
      tasa: tasa,
      dias: dias,
      interesDisario: interesDisario,
      comision: comision,
      interes: interes,
      monto_descontado: montoDescontado,
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

    // Limpiar formulario y recargar datos
    clearForm("formDescuentoCheque");
    setupDescuentoChequeCalculos();
    cargarDescuentoCheque();

    Swal.fire({
      icon: "success",
      title: "Éxito",
      text: "Descuento de cheque registrado correctamente",
    });
  } catch (error) {
    console.error("Error al guardar descuento de cheque:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo guardar el registro: " + error.message,
    });
  }
};

// Cargar datos de descuento de cheques
async function cargarDescuentoCheque() {
  const tbody = document.getElementById("tablaDescuentoCheque");
  tbody.innerHTML = "";

  try {
    const snap = await db
      .collection("descuento_cheque")
      .orderBy("timestamp", "desc")
      .get();

    if (snap.empty) {
      tbody.innerHTML =
        '<tr><td colspan="10" style="text-align: center;">No hay registros</td></tr>';
      return;
    }

    snap.forEach((doc) => {
      const d = doc.data();
      const fechaToma = d.fechaToma
        ? new Date(d.fechaToma).toLocaleDateString("es-AR")
        : "-";
      const fechaVencimiento = d.fechaVencimiento
        ? new Date(d.fechaVencimiento).toLocaleDateString("es-AR")
        : "-";
      const estado = d.estado || "Pendiente";

      tbody.innerHTML += `
      <tr>
        <td>${fechaToma}</td>
        <td>${fechaVencimiento}</td>
        <td>${d.clienteNombre || d.cliente}</td>
        <td>$${d.monto.toLocaleString("es-AR")}</td>
        <td>${d.tasa.toFixed(2)}%</td>
        <td>${d.dias}</td>
        <td>$${d.interes.toLocaleString("es-AR")}</td>
        <td>$${d.monto_descontado.toLocaleString("es-AR")}</td>
        <td><span class="estado-${estado.toLowerCase()}">${estado}</span></td>
        <td>
          <button class="btn-editar" onclick="verDetallesDescuentoCheque('${
            doc.id
          }')">Ver</button>
          <button onclick="eliminarRegistro('descuento_cheque', '${
            doc.id
          }', cargarDescuentoCheque)">Eliminar</button>
        </td>
      </tr>`;
    });
  } catch (error) {
    console.error("Error al cargar descuento de cheques:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error al cargar los datos: " + error.message,
    });
  }
}

// Función para ver detalles de descuento de cheque
async function verDetallesDescuentoCheque(id) {
  try {
    const doc = await db.collection("descuento_cheque").doc(id).get();
    if (!doc.exists) {
      Swal.fire("Error", "Registro no encontrado", "error");
      return;
    }

    const c = doc.data();
    const fechaToma = c.fechaToma
      ? new Date(c.fechaToma).toLocaleDateString("es-AR")
      : c.fecha
      ? new Date(c.fecha).toLocaleDateString("es-AR")
      : "-";
    const fechaVencimiento = c.fechaVencimiento
      ? new Date(c.fechaVencimiento).toLocaleDateString("es-AR")
      : "-";

    Swal.fire({
      title: `Descuento de Cheque - ${c.clienteNombre || c.cliente}`,
      html: `
        <div style="text-align: left; margin: 15px 0;">
          <p><strong>Fecha de Toma:</strong> ${fechaToma}</p>
          <p><strong>Fecha de Vencimiento:</strong> ${fechaVencimiento}</p>
          <p><strong>Días:</strong> ${c.dias}</p>
          <p><strong>Cliente:</strong> ${c.clienteNombre || c.cliente}</p>
          <p><strong>Monto:</strong> $${c.monto.toLocaleString("es-AR")}</p>
          <p><strong>Tasa Anual:</strong> ${c.tasa.toFixed(2)}%</p>
          <p><strong>Interés Diario:</strong> $${(
            c.interesDisario || 0
          ).toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</p>
          <p><strong>Interés Total:</strong> $${c.interes.toLocaleString(
            "es-AR"
          )}</p>
          <p><strong>Comisión:</strong> $${c.comision.toLocaleString(
            "es-AR"
          )}</p>
          <p><strong>Monto Descontado:</strong> $${c.monto_descontado.toLocaleString(
            "es-AR"
          )}</p>
          <p><strong>Estado:</strong> ${c.estado}</p>
          <p><strong>Observaciones:</strong> ${c.observaciones || "-"}</p>
        </div>
      `,
      width: "500px",
    });
  } catch (error) {
    console.error("Error al obtener detalles:", error);
    Swal.fire("Error", "No se pudieron cargar los detalles", "error");
  }
}

// Función genérica para eliminar documentos
delete window.eliminarRegistro;
window.eliminarRegistro = async (coleccion, id, callback) => {
  const result = await Swal.fire({
    title: "¿Estás seguro?",
    text: "No podrás revertir esta acción",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
  });

  if (result.isConfirmed) {
    try {
      // Obtener datos del registro antes de eliminarlo (para historial)
      const docRef = db.collection(coleccion).doc(id);
      const docSnap = await docRef.get();
      const datosAnteriores = docSnap.data();

      // Si es un ingreso de pesos, eliminar también el movimiento asociado en la cuenta corriente
      if (coleccion === "ingreso_pesos") {
        try {
          // Buscar movimientos en cuenta corriente que tengan este ID como referencia
          const movimientosQuery = await db
            .collection("cuentaCorrientePesos")
            .where("referenciaId", "==", id)
            .where("referenciaColeccion", "==", "ingreso_pesos")
            .get();

          // Eliminar cada movimiento encontrado
          const batch = db.batch();
          movimientosQuery.forEach((doc) => {
            batch.delete(doc.ref);
            // Registrar eliminación en historial
            registrarHistorial(
              "cuentaCorrientePesos",
              "eliminar",
              doc.id,
              doc.data()
            );
          });

          await batch.commit();
          console.log("Movimientos de cuenta corriente asociados eliminados");
        } catch (error) {
          console.error(
            "Error al eliminar movimientos de cuenta corriente asociados:",
            error
          );
        }
      }

      // Eliminar el registro
      await docRef.delete();

      // Registrar en historial
      await registrarHistorial(coleccion, "eliminar", id, datosAnteriores);

      // Ejecutar callback para recargar datos
      callback();

      // Si es un ingreso de pesos, también recargar la cuenta corriente
      if (coleccion === "ingreso_pesos") {
        cargarCuentaCorrientePesos();
      }

      Swal.fire("Eliminado", "El registro ha sido eliminado.", "success");
    } catch (error) {
      console.error("Error al eliminar:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo eliminar el registro: " + error.message,
      });
    }
  }
};

// Exponer funciones globales
window.mostrarTab = mostrarTab;
window.editarOperador = editarOperador;
window.editarCliente = editarCliente;
window.verDetallesTransferencia = verDetallesTransferencia;
window.verDetallesCable = verDetallesCable;
window.actualizarEstadoCable = actualizarEstadoCable;
window.ajustarMontoCable = ajustarMontoCable;
window.verDetallesCash = verDetallesCash;
window.verDetallesIngresoPesos = verDetallesIngresoPesos;
window.verDetallesDescuentoCheque = verDetallesDescuentoCheque;

// Funciones de paginación
function cambiarRegistrosPorPagina(modulo, valor) {
  estadoPaginacion[modulo].registrosPorPagina = parseInt(valor);
  estadoPaginacion[modulo].pagina = 1;
  actualizarTablaPaginada(modulo);
}

function paginaAnterior(modulo) {
  if (estadoPaginacion[modulo].pagina > 1) {
    estadoPaginacion[modulo].pagina--;
    actualizarTablaPaginada(modulo);
  }
}

function paginaSiguiente(modulo) {
  const totalPaginas = Math.ceil(
    estadoPaginacion[modulo].total / estadoPaginacion[modulo].registrosPorPagina
  );
  if (estadoPaginacion[modulo].pagina < totalPaginas) {
    estadoPaginacion[modulo].pagina++;
    actualizarTablaPaginada(modulo);
  }
}

function actualizarTablaPaginada(modulo) {
  // Mostrar loader
  document.getElementById("loader").classList.add("active");

  setTimeout(() => {
    const inicio =
      (estadoPaginacion[modulo].pagina - 1) *
      estadoPaginacion[modulo].registrosPorPagina;
    const fin = inicio + estadoPaginacion[modulo].registrosPorPagina;
    const datosPaginados = datosCompletos[modulo].slice(inicio, fin);

    // Actualizar la página actual
    document.getElementById(
      `paginaActual${modulo.charAt(0).toUpperCase() + modulo.slice(1)}`
    ).textContent = `Página ${estadoPaginacion[modulo].pagina} de ${Math.ceil(
      estadoPaginacion[modulo].total /
        estadoPaginacion[modulo].registrosPorPagina
    )}`;

    // Habilitar/deshabilitar botones de navegación
    document.getElementById(
      `btnAnterior${modulo.charAt(0).toUpperCase() + modulo.slice(1)}`
    ).disabled = estadoPaginacion[modulo].pagina === 1;
    document.getElementById(
      `btnSiguiente${modulo.charAt(0).toUpperCase() + modulo.slice(1)}`
    ).disabled =
      estadoPaginacion[modulo].pagina ===
      Math.ceil(
        estadoPaginacion[modulo].total /
          estadoPaginacion[modulo].registrosPorPagina
      );

    // Renderizar los datos según el módulo
    switch (modulo) {
      case "transferencias":
        renderizarTablaTransferencias(datosPaginados);
        break;
      case "cables":
        renderizarTablaCables(datosPaginados);
        break;
      case "cash_to_cash":
        renderizarTablaCash(datosPaginados);
        break;
      case "ingreso_pesos":
        renderizarTablaIngresoPesos(datosPaginados);
        break;
      case "descuento_cheque":
        renderizarTablaDescuentoCheque(datosPaginados);
        break;
      case "historial":
        renderizarTablaHistorial(datosPaginados);
        break;
    }

    // Ocultar loader
    document.getElementById("loader").classList.remove("active");
  }, 300);
}

// SISTEMA DE AUDITORÍA/HISTORIAL DE CAMBIOS
// Función para registrar una acción en el historial
async function registrarHistorial(tipoRegistro, accion, idRegistro, detalles) {
  try {
    // Obtener fecha y hora actual
    const fechaHora = new Date();

    // Guardar en Firestore
    await db.collection("historial").add({
      fecha: fechaHora.toISOString().split("T")[0],
      hora: fechaHora.toTimeString().split(" ")[0],
      usuario: "usuario_actual", // Aquí se podría implementar un sistema de autenticación
      tipo_registro: tipoRegistro,
      accion: accion,
      id_registro: idRegistro,
      detalles: detalles,
      timestamp: fechaHora,
    });

    console.log(`Acción registrada en historial: ${accion} en ${tipoRegistro}`);
  } catch (error) {
    console.error("Error al registrar historial:", error);
  }
}

// Cargar historial de cambios
async function cargarHistorial(filtros = {}) {
  const tbody = document.getElementById("tablaHistorial");
  tbody.innerHTML = "";

  try {
    document.getElementById("loader").classList.add("active");

    // Construir la consulta base
    let query = db.collection("historial").orderBy("timestamp", "desc");

    // Aplicar filtros
    if (filtros.fechaDesde) {
      const fechaDesde = new Date(filtros.fechaDesde);
      fechaDesde.setHours(0, 0, 0, 0);
      query = query.where("timestamp", ">=", fechaDesde);
    }

    if (filtros.fechaHasta) {
      const fechaHasta = new Date(filtros.fechaHasta);
      fechaHasta.setHours(23, 59, 59, 999);
      query = query.where("timestamp", "<=", fechaHasta);
    }

    if (filtros.tipoRegistro && filtros.tipoRegistro !== "todos") {
      query = query.where("tipo_registro", "==", filtros.tipoRegistro);
    }

    if (filtros.tipoAccion && filtros.tipoAccion !== "todos") {
      query = query.where("accion", "==", filtros.tipoAccion);
    }

    // Ejecutar consulta
    const snap = await query.get();

    if (snap.empty) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align: center;">No hay registros de historial</td></tr>';
      document.getElementById("loader").classList.remove("active");
      return;
    }

    // Almacenar todos los datos para paginación
    datosCompletos.historial = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Actualizar estado de paginación
    estadoPaginacion.historial.total = datosCompletos.historial.length;
    estadoPaginacion.historial.pagina = 1;

    // Renderizar datos paginados
    actualizarTablaPaginada("historial");
  } catch (error) {
    console.error("Error al cargar historial:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error al cargar el historial: " + error.message,
    });
    document.getElementById("loader").classList.remove("active");
  }
}

// Función para renderizar la tabla de historial
function renderizarTablaHistorial(datos) {
  const tbody = document.getElementById("tablaHistorial");
  tbody.innerHTML = "";

  if (datos.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align: center;">No hay registros de historial</td></tr>';
    return;
  }

  datos.forEach((h) => {
    const fecha = `${h.fecha} ${h.hora}`;
    const claseAccion = `accion-${h.accion.toLowerCase()}`;

    tbody.innerHTML += `
      <tr>
        <td>${fecha}</td>
        <td>${h.usuario}</td>
        <td>${h.tipo_registro}</td>
        <td class="${claseAccion}">${h.accion}</td>
        <td>${h.id_registro}</td>
        <td>
          <button class="btn-ver-detalles" onclick="mostrarDetallesHistorial('${h.id}')">
            Ver detalles
          </button>
        </td>
      </tr>`;
  });
}

// Función para mostrar detalles del historial
async function mostrarDetallesHistorial(id) {
  try {
    const doc = await db.collection("historial").doc(id).get();
    if (!doc.exists) {
      Swal.fire("Error", "Registro no encontrado", "error");
      return;
    }

    const h = doc.data();

    // Formatear los detalles para mostrarlos
    let detallesHTML = "";
    if (typeof h.detalles === "object") {
      // Si es un objeto, convertirlo a formato legible
      for (const [key, value] of Object.entries(h.detalles)) {
        detallesHTML += `<p><strong>${key}:</strong> ${value}</p>`;
      }
    } else {
      detallesHTML = `<p>${h.detalles || "No hay detalles disponibles"}</p>`;
    }

    Swal.fire({
      title: `Detalles del Cambio`,
      html: `
        <div style="text-align: left; margin: 15px 0;">
          <p><strong>Fecha:</strong> ${fecha}</p>
          <p><strong>Usuario:</strong> ${h.usuario}</p>
          <p><strong>Tipo de Registro:</strong> ${h.tipo_registro}</p>
          <p><strong>Acción:</strong> <span class="accion-${h.accion.toLowerCase()}">${
        h.accion
      }</span></p>
          <p><strong>ID Registro:</strong> ${h.id_registro}</p>
          <h4>Detalles:</h4>
          <div style="max-height: 300px; overflow-y: auto; padding: 10px; background: #f8f9fa; border-radius: 4px;">
            ${detallesHTML}
          </div>
        </div>
      `,
      width: "600px",
    });
  } catch (error) {
    console.error("Error al obtener detalles del historial:", error);
    Swal.fire("Error", "No se pudieron cargar los detalles", "error");
  }
}

// Evento para filtrar historial
document
  .getElementById("btnFiltrarHistorial")
  ?.addEventListener("click", () => {
    const filtros = {
      fechaDesde: document.getElementById("fechaDesdeHistorial").value,
      fechaHasta: document.getElementById("fechaHastaHistorial").value,
      tipoRegistro: document.getElementById("tipoRegistroHistorial").value,
      tipoAccion: document.getElementById("tipoAccionHistorial").value,
    };

    cargarHistorial(filtros);
  });

// EXPORTACIÓN DE DATOS
// Función para exportar datos a Excel
function exportarAExcel(datos, nombreArchivo) {
  // Crear una hoja de trabajo
  const worksheet = XLSX.utils.json_to_sheet(datos);

  // Crear un libro de trabajo
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");

  // Guardar el archivo
  XLSX.writeFile(workbook, `${nombreArchivo}.xlsx`);
}

// Función para exportar datos a PDF
function exportarAPdf(datos, columnas, nombreArchivo) {
  // Crear un nuevo documento PDF
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Añadir título
  doc.setFontSize(18);
  doc.text(nombreArchivo, 14, 22);

  // Añadir fecha de generación
  doc.setFontSize(11);
  doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 30);

  // Preparar encabezados
  const headers = columnas.map((col) => col.header);

  // Preparar filas de datos extrayendo los valores usando dataKey
  const rows = datos.map((item) =>
    columnas.map((col) => item[col.dataKey] || "")
  );

  // Crear tabla con los datos
  doc.autoTable({
    startY: 35,
    head: [headers],
    body: rows,
    theme: "striped",
    headStyles: {
      fillColor: [26, 61, 124],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
  });

  // Guardar el PDF
  doc.save(`${nombreArchivo}.pdf`);
}

// Función para transformar datos antes de exportarlos
function transformarDatosParaExportar(datos) {
  if (!datos || !Array.isArray(datos)) return [];

  return datos.map((item) => {
    const nuevoItem = {};

    // Recorrer todas las propiedades del objeto
    for (const key in item) {
      // Si es una fecha y tiene método toDate() (Firebase Timestamp)
      if (
        item[key] &&
        item[key].toDate &&
        typeof item[key].toDate === "function"
      ) {
        nuevoItem[key] = formatearFecha(item[key].toDate());
      }
      // Si es un número, formatearlo correctamente
      else if (typeof item[key] === "number") {
        // Si parece un valor monetario (basado en el nombre de la propiedad)
        if (
          key.toLowerCase().includes("monto") ||
          key.toLowerCase().includes("saldo") ||
          key.toLowerCase().includes("debito") ||
          key.toLowerCase().includes("credito") ||
          key.toLowerCase().includes("comision")
        ) {
          nuevoItem[key] = formatearMonto(item[key]);
        } else {
          nuevoItem[key] = item[key];
        }
      }
      // Si es undefined o null, convertir a cadena vacía
      else if (item[key] === undefined || item[key] === null) {
        nuevoItem[key] = "";
      }
      // En cualquier otro caso, usar el valor tal cual
      else {
        nuevoItem[key] = item[key];
      }
    }

    return nuevoItem;
  });
}

// Función principal de exportación de datos
async function exportarDatos(modulo, formato) {
  let datos = [];
  let columnas = [];
  let nombreArchivo = "";

  // Bloquear la interfaz durante la exportación
  document.getElementById("loader").style.display = "flex";

  try {
    switch (modulo) {
      case "resumen":
        datos = obtenerDatosResumen();
        columnas = [
          { header: "Tipo", dataKey: "tipo" },
          { header: "Cantidad", dataKey: "cantidad" },
          { header: "Comisión USD", dataKey: "comisionUsd" },
          { header: "Comisión ARS", dataKey: "comisionArs" },
        ];
        nombreArchivo = "resumen_comisiones";
        break;

      case "transferencias":
        datos = datosTransferencias;
        columnas = [
          { header: "Fecha", dataKey: "fecha" },
          { header: "Cliente", dataKey: "clienteNombre" },
          { header: "Monto ARS", dataKey: "montoArs" },
          { header: "Cambio USD", dataKey: "cambioUsd" },
          { header: "TC BsAs", dataKey: "tcUsdBsAs" },
          { header: "TC Salta", dataKey: "tcUsdSalta" },
          { header: "DIF TC", dataKey: "difTc" },
          { header: "Monto Neto", dataKey: "montoNeto" },
          { header: "Comisión", dataKey: "comisionArs" },
          { header: "Estado", dataKey: "recepcionada" },
          { header: "Comentario", dataKey: "comentario" },
        ];
        nombreArchivo = "transferencias";
        break;

      case "cables":
        datos = datosCables;
        columnas = [
          { header: "Fecha", dataKey: "fecha" },
          { header: "Cliente", dataKey: "clienteNombre" },
          { header: "Monto USD", dataKey: "montoUsd" },
          { header: "Comisión %", dataKey: "comisionPorc" },
          { header: "Comisión USD", dataKey: "comisionUsd" },
          { header: "Estado", dataKey: "ingreso" },
        ];
        nombreArchivo = "cables";
        break;

      case "cash_to_cash":
        datos = datosCash;
        columnas = [
          { header: "Fecha", dataKey: "fecha" },
          { header: "Cliente", dataKey: "clienteNombre" },
          { header: "Monto USD", dataKey: "montoUsd" },
          { header: "Comisión %", dataKey: "comisionPorc" },
          { header: "Comisión USD", dataKey: "comisionUsd" },
          { header: "Estado", dataKey: "estado" },
        ];
        nombreArchivo = "cash_to_cash";
        break;

      case "ingreso_pesos":
        datos = datosIngresoPesos;
        columnas = [
          { header: "Fecha", dataKey: "fecha" },
          { header: "Cliente", dataKey: "clienteNombre" },
          { header: "Operador", dataKey: "operadorNombre" },
          { header: "Monto ARS", dataKey: "montoArs" },
          { header: "Comisión %", dataKey: "comisionPorc" },
          { header: "Comisión ARS", dataKey: "comisionArs" },
          { header: "Estado", dataKey: "estado" },
        ];
        nombreArchivo = "ingreso_pesos";
        break;

      case "descuento_cheque":
        datos = datosDescuentoCheque;
        columnas = [
          { header: "Fecha", dataKey: "fecha" },
          { header: "Cliente", dataKey: "clienteNombre" },
          { header: "Monto", dataKey: "monto" },
          { header: "Tasa %", dataKey: "tasa" },
          { header: "Días", dataKey: "dias" },
          { header: "Interés", dataKey: "interes" },
          { header: "Monto Descontado", dataKey: "montoDescontado" },
          { header: "Estado", dataKey: "estado" },
          { header: "Observaciones", dataKey: "observaciones" },
        ];
        nombreArchivo = "descuento_cheque";
        break;

      case "historial":
        datos = datosHistorial;
        columnas = [
          { header: "Fecha", dataKey: "fecha" },
          { header: "Usuario", dataKey: "usuario" },
          { header: "Tipo de Registro", dataKey: "tipoRegistro" },
          { header: "Acción", dataKey: "accion" },
          { header: "ID Registro", dataKey: "idRegistro" },
          { header: "Detalles", dataKey: "detalles" },
        ];
        nombreArchivo = "historial";
        break;

      case "cuentaCorrientePesos":
        datos = await obtenerDatosCuentaCorriente("pesos");
        columnas = [
          { header: "Fecha Op.", dataKey: "fechaOp" },
          { header: "Fecha Valor", dataKey: "fechaValor" },
          { header: "Tipo Operación", dataKey: "tipoOperacion" },
          { header: "Débito", dataKey: "debito" },
          { header: "Crédito", dataKey: "credito" },
          { header: "Saldo", dataKey: "saldo" },
          { header: "Moneda", dataKey: "moneda" },
          { header: "Concepto", dataKey: "concepto" },
        ];
        nombreArchivo = "cuenta_corriente_pesos";
        break;

      case "cuentaCorrienteDolares":
        datos = await obtenerDatosCuentaCorriente("dolares");
        columnas = [
          { header: "Fecha Op.", dataKey: "fechaOp" },
          { header: "Fecha Valor", dataKey: "fechaValor" },
          { header: "Tipo Operación", dataKey: "tipoOperacion" },
          { header: "Débito", dataKey: "debito" },
          { header: "Crédito", dataKey: "credito" },
          { header: "Saldo", dataKey: "saldo" },
          { header: "Moneda", dataKey: "moneda" },
          { header: "Concepto", dataKey: "concepto" },
        ];
        nombreArchivo = "cuenta_corriente_dolares";
        break;

      default:
        throw new Error("Módulo no válido para exportación");
    }

    // Transformar datos para exportación
    datos = transformarDatosParaExportar(datos);

    // Exportar según formato solicitado
    if (formato === "excel") {
      exportarAExcel(datos, nombreArchivo);
    } else if (formato === "pdf") {
      exportarAPdf(datos, columnas, nombreArchivo);
    }
  } catch (error) {
    console.error("Error al exportar datos:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudieron exportar los datos: " + error.message,
    });
  } finally {
    // Desbloquear la interfaz
    document.getElementById("loader").style.display = "none";
  }
}

// Función auxiliar para obtener datos de cuenta corriente para exportación
async function obtenerDatosCuentaCorriente(tipo) {
  const coleccion =
    tipo === "pesos" ? "cuentaCorrientePesos" : "cuentaCorrienteDolares";
  const clienteId = getVal(
    tipo === "pesos" ? "clienteCCPesos" : "clienteCCDolares"
  );
  const fechaDesde = getVal(
    tipo === "pesos" ? "fechaDesdeCCPesos" : "fechaDesdeCCDolares"
  );
  const fechaHasta = getVal(
    tipo === "pesos" ? "fechaHastaCCPesos" : "fechaHastaCCDolares"
  );

  let query = db.collection(coleccion).orderBy("fecha", "desc");

  if (clienteId) {
    query = query.where("clienteId", "==", clienteId);
  }

  if (fechaDesde) {
    const fechaDesdeObj = new Date(fechaDesde);
    fechaDesdeObj.setHours(0, 0, 0, 0);
    query = query.where("fecha", ">=", fechaDesdeObj);
  }

  if (fechaHasta) {
    const fechaHastaObj = new Date(fechaHasta);
    fechaHastaObj.setHours(23, 59, 59, 999);
    query = query.where("fecha", "<=", fechaHastaObj);
  }

  const snapshot = await query.get();
  const datos = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    const fechaObj = data.fecha.toDate();
    const fechaValorObj = data.fechaValor.toDate();

    // Formatear correctamente los valores para exportación
    const saldoNumerico = data.saldo;
    // Para la exportación, ajustamos el formato del saldo
    let saldoFormateado = Math.abs(saldoNumerico).toFixed(2);
    if (saldoNumerico < 0) {
      saldoFormateado += "-"; // Signo negativo al final, como en el video
    }

    datos.push({
      fechaOp: fechaObj.toLocaleDateString("es-AR"),
      fechaValor: fechaValorObj.toLocaleDateString("es-AR"),
      tipoOperacion: data.tipoOperacion,
      debito: data.debito || 0,
      credito: data.credito || 0,
      saldo: saldoFormateado,
      moneda: data.moneda,
      concepto: data.concepto,
    });
  });

  return datos;
}

// Función para obtener datos del resumen para exportación
function obtenerDatosResumen() {
  const datos = [];
  const filas = document.querySelectorAll("#tablaResumen tr:not(.total-row)");

  filas.forEach((fila) => {
    const celdas = fila.querySelectorAll("td");
    if (celdas.length >= 4) {
      datos.push({
        Tipo: celdas[0].textContent,
        Cantidad: parseInt(celdas[1].textContent) || 0,
        ComisionUSD: celdas[2].textContent.replace("$", ""),
        ComisionARS: celdas[3].textContent.replace("$", ""),
      });
    }
  });

  // Agregar fila de totales
  const totalRow = document.querySelector("#tablaResumen tr.total-row");
  if (totalRow) {
    const totalCeldas = totalRow.querySelectorAll("td");
    datos.push({
      Tipo: "TOTAL",
      Cantidad: parseInt(totalCeldas[1].textContent) || 0,
      ComisionUSD: totalCeldas[2].textContent.replace("$", ""),
      ComisionARS: totalCeldas[3].textContent.replace("$", ""),
    });
  }

  return datos;
}

// Funcionalidad para el menú hamburguesa en dispositivos móviles
document.addEventListener("DOMContentLoaded", function () {
  const menuToggle = document.querySelector(".menu-toggle");
  const mainNav = document.getElementById("mainNav");
  const overlay = document.getElementById("overlay");

  if (menuToggle && mainNav && overlay) {
    const navButtons = mainNav.querySelectorAll("button");

    // Abrir/cerrar menú al hacer clic en el botón de hamburguesa
    menuToggle.addEventListener("click", function () {
      mainNav.classList.toggle("active");
      overlay.classList.toggle("active");
      menuToggle.classList.toggle("active");
      document.body.classList.toggle("no-scroll");
    });

    // Cerrar menú al hacer clic en el overlay
    overlay.addEventListener("click", function () {
      mainNav.classList.remove("active");
      overlay.classList.remove("active");
      menuToggle.classList.remove("active");
      document.body.classList.remove("no-scroll");
    });

    // Cerrar menú al hacer clic en un botón de navegación
    navButtons.forEach((button) => {
      button.addEventListener("click", function () {
        if (window.innerWidth <= 768) {
          mainNav.classList.remove("active");
          overlay.classList.remove("active");
          menuToggle.classList.remove("active");
          document.body.classList.remove("no-scroll");
        }
      });
    });

    // Ajustar menú si cambia el tamaño de la ventana
    window.addEventListener("resize", function () {
      if (window.innerWidth > 768) {
        mainNav.classList.remove("active");
        overlay.classList.remove("active");
        menuToggle.classList.remove("active");
        document.body.classList.remove("no-scroll");
      }
    });
  }
});

// ================== CUENTA CORRIENTE ==================
// Inicialización de formularios de cuenta corriente
function inicializarFormulariosCuentaCorriente() {
  // Cargar selector de tipo (Cliente u Operador)
  const setupTipoSelector = (tipoSelector, entidadSelector) => {
    const tipoSelect = document.getElementById(tipoSelector);
    const entidadSelect = document.getElementById(entidadSelector);

    if (!tipoSelect || !entidadSelect) return;

    tipoSelect.addEventListener("change", async () => {
      const tipo = tipoSelect.value;
      entidadSelect.innerHTML =
        '<option value="">Seleccione ' + tipo + "</option>";

      try {
        const coleccion = tipo === "Cliente" ? "clientes" : "operadores";
        const snap = await db.collection(coleccion).orderBy("nombre").get();

        snap.forEach((doc) => {
          const data = doc.data();
          entidadSelect.innerHTML += `<option value="${doc.id}">${data.nombre}</option>`;
        });
      } catch (error) {
        console.error(`Error al cargar ${tipo}s:`, error);
      }
    });

    // Trigger inicial para cargar las opciones por defecto
    if (tipoSelect.value) {
      tipoSelect.dispatchEvent(new Event("change"));
    }
  };

  // Configurar selectores para formularios pesos y dólares
  setupTipoSelector("tipoEntidadPesos", "entidadMovimientoPesos");
  setupTipoSelector("tipoEntidadDolares", "entidadMovimientoDolares");

  // También configuramos los filtros
  setupTipoSelector("tipoFiltroEntidadPesos", "clienteCCPesos");
  setupTipoSelector("tipoFiltroEntidadDolares", "clienteCCDolares");

  // Formulario para movimientos en pesos
  const formMovimientoPesos = document.getElementById("formMovimientoPesos");
  if (formMovimientoPesos) {
    formMovimientoPesos.onsubmit = async (e) => {
      e.preventDefault();
      try {
        // Verificar que todos los campos obligatorios estén completos
        const campos = [
          "fechaMovimientoPesos",
          "tipoEntidadPesos",
          "entidadMovimientoPesos",
          "tipoMovimientoPesos",
          "conceptoMovimientoPesos",
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

        // Verificar que se haya ingresado al menos un monto
        const montoDebito = parseFloat(getVal("montoDebitoPesos")) || 0;
        const montoCredito = parseFloat(getVal("montoCreditoPesos")) || 0;

        if (montoDebito === 0 && montoCredito === 0) {
          Swal.fire({
            icon: "error",
            title: "Monto inválido",
            text: "Debe ingresar un monto de débito o crédito mayor a cero",
          });
          return;
        }

        // Obtener entidad seleccionada (cliente u operador)
        const tipoEntidad = getVal("tipoEntidadPesos");
        const entidadId = getVal("entidadMovimientoPesos");
        const coleccion = tipoEntidad === "Cliente" ? "clientes" : "operadores";

        const entidadDoc = await db.collection(coleccion).doc(entidadId).get();

        if (!entidadDoc.exists) {
          throw new Error(`${tipoEntidad} no encontrado`);
        }

        const entidadNombre = entidadDoc.data().nombre;

        // Crear objeto con los datos
        const datosMovimiento = {
          fecha: new Date(getVal("fechaMovimientoPesos")),
          fechaValor: new Date(getVal("fechaMovimientoPesos")),
          tipoEntidad: tipoEntidad,
          entidadId: entidadId,
          entidadNombre: entidadNombre,
          tipoOperacion: getVal("tipoMovimientoPesos"),
          debito: montoDebito,
          credito: montoCredito,
          moneda: "USD",
          concepto: getVal("conceptoMovimientoDolares"),
          timestamp: new Date(),
        };

        // Guardar en Firestore
        const docRef = await db
          .collection("cuentaCorrienteDolares")
          .add(datosMovimiento);

        // Registrar en historial
        await registrarHistorial(
          "cuentaCorrienteDolares",
          "crear",
          docRef.id,
          datosMovimiento
        );

        clearForm("formMovimientoDolares");
        cargarCuentaCorrienteDolares();

        Swal.fire({
          icon: "success",
          title: "Éxito",
          text: "Movimiento en dólares registrado correctamente",
        });
      } catch (error) {
        console.error("Error al guardar movimiento en dólares:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudo guardar el movimiento: " + error.message,
        });
      }
    };
  }
}

// Función para cargar los movimientos de cuenta corriente en pesos
async function cargarCuentaCorrientePesos(filtros = {}) {
  try {
    document.getElementById("loader").classList.add("active");
    const tbody = document.getElementById("tablaCuentaCorrientePesos");
    tbody.innerHTML = "";

    // Construir consulta base
    let query = db.collection("cuentaCorrientePesos").orderBy("fecha", "desc");

    // Aplicar filtros
    if (filtros.entidadId) {
      query = query.where("entidadId", "==", filtros.entidadId);
    } else if (document.getElementById("clienteCCPesos").value) {
      query = query.where(
        "entidadId",
        "==",
        document.getElementById("clienteCCPesos").value
      );
    }

    // Filtrar por tipo de entidad si está especificado
    if (filtros.tipoEntidad && filtros.tipoEntidad !== "") {
      query = query.where("tipoEntidad", "==", filtros.tipoEntidad);
    }

    if (
      filtros.fechaDesde ||
      document.getElementById("fechaDesdeCCPesos").value
    ) {
      const fechaDesde = new Date(
        filtros.fechaDesde || document.getElementById("fechaDesdeCCPesos").value
      );
      fechaDesde.setHours(0, 0, 0, 0);
      query = query.where("fecha", ">=", fechaDesde);
    }

    if (
      filtros.fechaHasta ||
      document.getElementById("fechaHastaCCPesos").value
    ) {
      const fechaHasta = new Date(
        filtros.fechaHasta || document.getElementById("fechaHastaCCPesos").value
      );
      fechaHasta.setHours(23, 59, 59, 999);
      query = query.where("fecha", "<=", fechaHasta);
    }

    // Ejecutar consulta
    const snapshot = await query.get();

    if (snapshot.empty) {
      tbody.innerHTML =
        '<tr><td colspan="9" style="text-align: center;">No hay movimientos registrados</td></tr>';
      document.getElementById("loader").classList.remove("active");
      document.getElementById("saldoTotalPesos").textContent = "0,00";
      return;
    }

    // Procesar los datos y renderizar tabla
    const movimientos = [];
    snapshot.forEach((doc) => {
      const data = doc.data();

      // Asegurar que los valores numéricos son realmente números
      const debito = parseFloat(data.debito || 0);
      const credito = parseFloat(data.credito || 0);

      movimientos.push({
        id: doc.id,
        ...data,
        debito: debito,
        credito: credito,
      });
    });

    renderizarTablaCuentaCorriente(movimientos, tbody, "pesos");
    document.getElementById("loader").classList.remove("active");
  } catch (error) {
    console.error("Error al cargar cuenta corriente en pesos:", error);
    document.getElementById("loader").classList.remove("active");
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error al cargar los datos: " + error.message,
    });
  }
}

// Función para cargar los movimientos de cuenta corriente en dólares
async function cargarCuentaCorrienteDolares(filtros = {}) {
  try {
    document.getElementById("loader").classList.add("active");
    const tbody = document.getElementById("tablaCuentaCorrienteDolares");
    tbody.innerHTML = "";

    // Construir consulta base
    let query = db
      .collection("cuentaCorrienteDolares")
      .orderBy("fecha", "desc");

    // Aplicar filtros
    if (filtros.entidadId) {
      query = query.where("entidadId", "==", filtros.entidadId);
    } else if (document.getElementById("clienteCCDolares").value) {
      query = query.where(
        "entidadId",
        "==",
        document.getElementById("clienteCCDolares").value
      );
    }

    // Filtrar por tipo de entidad si está especificado
    if (filtros.tipoEntidad && filtros.tipoEntidad !== "") {
      query = query.where("tipoEntidad", "==", filtros.tipoEntidad);
    }

    if (
      filtros.fechaDesde ||
      document.getElementById("fechaDesdeCCDolares").value
    ) {
      const fechaDesde = new Date(
        filtros.fechaDesde ||
          document.getElementById("fechaDesdeCCDolares").value
      );
      fechaDesde.setHours(0, 0, 0, 0);
      query = query.where("fecha", ">=", fechaDesde);
    }

    if (
      filtros.fechaHasta ||
      document.getElementById("fechaHastaCCDolares").value
    ) {
      const fechaHasta = new Date(
        filtros.fechaHasta ||
          document.getElementById("fechaHastaCCDolares").value
      );
      fechaHasta.setHours(23, 59, 59, 999);
      query = query.where("fecha", "<=", fechaHasta);
    }

    // Ejecutar consulta
    const snapshot = await query.get();

    if (snapshot.empty) {
      tbody.innerHTML =
        '<tr><td colspan="9" style="text-align: center;">No hay movimientos registrados</td></tr>';
      document.getElementById("loader").classList.remove("active");
      document.getElementById("saldoTotalDolares").textContent = "0,00";
      return;
    }

    // Procesar los datos y renderizar tabla
    const movimientos = [];
    snapshot.forEach((doc) => {
      const data = doc.data();

      // Asegurar que los valores numéricos son realmente números
      const debito = parseFloat(data.debito || 0);
      const credito = parseFloat(data.credito || 0);

      movimientos.push({
        id: doc.id,
        ...data,
        debito: debito,
        credito: credito,
      });
    });

    renderizarTablaCuentaCorriente(movimientos, tbody, "dolares");
    document.getElementById("loader").classList.remove("active");
  } catch (error) {
    console.error("Error al cargar cuenta corriente en dólares:", error);
    document.getElementById("loader").classList.remove("active");
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error al cargar los datos: " + error.message,
    });
  }
}

// Función para renderizar movimientos en la tabla de cuenta corriente
function renderizarTablaCuentaCorriente(movimientos, tbody, tipo) {
  if (movimientos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center;">No hay movimientos registrados</td></tr>`;
    return;
  }

  // Ordenar movimientos por fecha (más reciente primero)
  movimientos.sort((a, b) => {
    const fechaA = a.fecha?.toDate() || new Date();
    const fechaB = b.fecha?.toDate() || new Date();
    return fechaB - fechaA;
  });

  tbody.innerHTML = "";
  const moneda = tipo === "pesos" ? "$" : "USD";
  let saldoAcumulado = 0;

  movimientos.forEach((m) => {
    // Convertir fechas de firebase a objetos Date
    const fechaOp = m.fecha?.toDate() || new Date();
    const fechaVal = m.fechaValor?.toDate() || new Date();

    // Asegurar que los valores numéricos sean números
    const debito = parseFloat(m.debito || 0);
    const credito = parseFloat(m.credito || 0);

    // Calcular saldo acumulado
    saldoAcumulado += credito - debito;

    // Determinar si el saldo es negativo para aplicar clase CSS
    const esNegativo = saldoAcumulado < 0 ? "negativo" : "";

    // Añadir etiqueta del tipo de entidad
    const tipoEntidad = m.tipoEntidad || "Cliente";
    const nombreEntidad = m.entidadNombre || "";
    const infoEntidad = `${tipoEntidad}: ${nombreEntidad}`;

    tbody.innerHTML += `
      <tr>
        <td>${formatearFecha(fechaOp)}</td>
        <td>${formatearFecha(fechaVal)}</td>
        <td>${m.tipoOperacion || ""}</td>
        <td class="monto">${
          !isNaN(debito) && debito > 0 ? formatearMonto(debito) : ""
        }</td>
        <td class="monto">${
          !isNaN(credito) && credito > 0 ? formatearMonto(credito) : ""
        }</td>
        <td class="monto ${esNegativo}">${formatearMontoConSigno(
      saldoAcumulado
    )}</td>
        <td>${m.moneda || moneda}</td>
        <td title="${infoEntidad}">${m.concepto || ""}</td>
        <td>
          <button class="btn-editar" onclick="editarMovimientoCuentaCorriente('${
            m.id
          }', '${tipo}')">Editar</button>
          <button onclick="eliminarMovimientoCuentaCorriente('${
            m.id
          }', '${tipo}')">Eliminar</button>
        </td>
      </tr>
    `;
  });

  // Actualizar el saldo total mostrado en el pie de tabla
  document.getElementById(
    tipo === "pesos" ? "saldoTotalPesos" : "saldoTotalDolares"
  ).innerHTML = formatearMontoConSigno(saldoAcumulado);

  // Aplicar clase para saldos negativos
  if (saldoAcumulado < 0) {
    document
      .getElementById(
        tipo === "pesos" ? "saldoTotalPesos" : "saldoTotalDolares"
      )
      .classList.add("negativo");
  } else {
    document
      .getElementById(
        tipo === "pesos" ? "saldoTotalPesos" : "saldoTotalDolares"
      )
      .classList.remove("negativo");
  }
}

// Función para formatear fechas
function formatearFecha(fecha) {
  if (!fecha) return "-";

  try {
    // Si ya es un objeto Date
    if (fecha instanceof Date) {
      return fecha.toLocaleDateString("es-AR");
    }

    // Si es un objeto Timestamp de Firebase
    if (typeof fecha.toDate === "function") {
      return fecha.toDate().toLocaleDateString("es-AR");
    }

    // Si es una cadena, intentar convertir a Date
    return new Date(fecha).toLocaleDateString("es-AR");
  } catch (error) {
    console.error("Error al formatear fecha:", error);
    return "-";
  }
}

// Función para formatear montos
function formatearMonto(monto) {
  // Verificar si el valor es un número válido
  if (monto === null || monto === undefined || isNaN(monto)) {
    return "0,00";
  }

  return monto.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Función para formatear montos con signo
function formatearMontoConSigno(monto) {
  // Verificar si el valor es un número válido
  if (monto === null || monto === undefined || isNaN(monto)) {
    return "0,00";
  }

  const abs = Math.abs(monto);
  const formateado = abs.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Colocar el signo negativo al final del número, como se muestra en el video
  return monto < 0 ? formateado + "-" : formateado;
}

// Función para editar un movimiento de cuenta corriente
async function editarMovimientoCuentaCorriente(id, tipo) {
  try {
    // Obtener datos del movimiento
    const collection =
      tipo === "pesos" ? "cuentaCorrientePesos" : "cuentaCorrienteDolares";
    const doc = await db.collection(collection).doc(id).get();

    if (!doc.exists) {
      Swal.fire("Error", "No se encontró el movimiento", "error");
      return;
    }

    const data = doc.data();

    // Mostrar formulario de edición
    const { value: formValues } = await Swal.fire({
      title: "Editar Movimiento",
      html: `
        <div class="swal-form">
          <div class="form-group">
            <label for="editFecha">Fecha</label>
            <input type="date" id="editFecha" class="swal2-input" value="${
              data.fecha.toDate().toISOString().split("T")[0]
            }" />
          </div>
          <div class="form-group">
            <label for="editTipoOperacion">Tipo de Operación</label>
            <select id="editTipoOperacion" class="swal2-input">
              <option value="NOTA DE DEBITO" ${
                data.tipoOperacion === "NOTA DE DEBITO" ? "selected" : ""
              }>NOTA DE DEBITO</option>
              <option value="NOTA DE CREDITO" ${
                data.tipoOperacion === "NOTA DE CREDITO" ? "selected" : ""
              }>NOTA DE CREDITO</option>
            </select>
          </div>
          <div class="form-group">
            <label for="editDebito">Monto Débito</label>
            <input type="number" id="editDebito" class="swal2-input" step="any" value="${
              data.debito || 0
            }" />
          </div>
          <div class="form-group">
            <label for="editCredito">Monto Crédito</label>
            <input type="number" id="editCredito" class="swal2-input" step="any" value="${
              data.credito || 0
            }" />
          </div>
          <div class="form-group">
            <label for="editConcepto">Concepto</label>
            <input type="text" id="editConcepto" class="swal2-input" value="${
              data.concepto || ""
            }" />
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        return {
          fecha: document.getElementById("editFecha").value,
          tipoOperacion: document.getElementById("editTipoOperacion").value,
          debito: parseFloat(document.getElementById("editDebito").value) || 0,
          credito:
            parseFloat(document.getElementById("editCredito").value) || 0,
          concepto: document.getElementById("editConcepto").value,
        };
      },
    });

    if (!formValues) return; // Usuario canceló

    // Actualizar documento
    const datosActualizados = {
      fecha: new Date(formValues.fecha),
      fechaValor: new Date(formValues.fecha),
      tipoOperacion: formValues.tipoOperacion,
      debito: formValues.debito,
      credito: formValues.credito,
      concepto: formValues.concepto,
    };

    await db.collection(collection).doc(id).update(datosActualizados);

    // Registrar en historial
    await registrarHistorial(collection, "editar", id, datosActualizados);

    // Recargar datos
    if (tipo === "pesos") {
      cargarCuentaCorrientePesos();
    } else {
      cargarCuentaCorrienteDolares();
    }

    Swal.fire("Éxito", "Movimiento actualizado correctamente", "success");
  } catch (error) {
    console.error("Error al editar movimiento:", error);
    Swal.fire(
      "Error",
      "No se pudo editar el movimiento: " + error.message,
      "error"
    );
  }
}

// Función para eliminar un movimiento de cuenta corriente
async function eliminarMovimientoCuentaCorriente(id, tipo) {
  try {
    const result = await Swal.fire({
      title: "¿Estás seguro?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    const collection =
      tipo === "pesos" ? "cuentaCorrientePesos" : "cuentaCorrienteDolares";

    // Obtener datos antes de eliminar para el historial
    const doc = await db.collection(collection).doc(id).get();
    const datosAntesDeEliminar = doc.data();

    // Eliminar documento
    await db.collection(collection).doc(id).delete();

    // Registrar en historial
    await registrarHistorial(collection, "eliminar", id, datosAntesDeEliminar);

    // Recargar datos
    if (tipo === "pesos") {
      cargarCuentaCorrientePesos();
    } else {
      cargarCuentaCorrienteDolares();
    }

    Swal.fire("Eliminado", "El movimiento ha sido eliminado", "success");
  } catch (error) {
    console.error("Error al eliminar movimiento:", error);
    Swal.fire(
      "Error",
      "No se pudo eliminar el movimiento: " + error.message,
      "error"
    );
  }
}

// Función para ver detalles de transferencia
async function verDetallesTransferencia(id) {
  try {
    const doc = await db.collection("transferencias").doc(id).get();
    if (!doc.exists) {
      Swal.fire("Error", "Registro no encontrado", "error");
      return;
    }

    const t = doc.data();
    const fecha = t.fecha ? new Date(t.fecha).toLocaleDateString("es-AR") : "-";
    const estado = t.recepcionada || "Pendiente";

    Swal.fire({
      title: `Transferencia #${t.numeroTransferencia || ""}`,
      html: `
        <div style="text-align: left; margin: 15px 0;">
          <p><strong>Fecha:</strong> ${fecha}</p>
          <p><strong>Cliente:</strong> ${t.clienteNombre || t.cliente}</p>
          <p><strong>Operador:</strong> ${t.operadorNombre || t.operador}</p>
          <p><strong>Destinatario:</strong> ${t.destinatario || "-"}</p>
          <p><strong>Monto:</strong> $${t.monto.toLocaleString("es-AR")}</p>
          <p><strong>Cambio USD:</strong> $${t.cambio_usd.toLocaleString(
            "es-AR",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }
          )}</p>
          <p><strong>TC USD BsAs:</strong> ${t.tc_usd_bsas.toLocaleString(
            "es-AR"
          )}</p>
          <p><strong>TC USD Salta:</strong> ${t.tc_usd_salta.toLocaleString(
            "es-AR"
          )}</p>
          <p><strong>Comisión ARS:</strong> $${t.comision.toLocaleString(
            "es-AR"
          )}</p>
          <p><strong>Comisión USD:</strong> $${(
            t.comision_usd || 0
          ).toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</p>
          <p><strong>Diferencia TC:</strong> ${t.dif_tc.toLocaleString(
            "es-AR"
          )}</p>
          <p><strong>Estado:</strong> ${estado}</p>
          <p><strong>Comentario:</strong> ${t.comentario || "-"}</p>
        </div>
      `,
      width: "500px",
    });
  } catch (error) {
    console.error("Error al obtener detalles:", error);
    Swal.fire("Error", "No se pudieron cargar los detalles", "error");
  }
}

// Estilos adicionales para valores negativos
document.addEventListener("DOMContentLoaded", function () {
  // Agregar estilos para valores negativos
  const styleElement = document.createElement("style");
  styleElement.textContent = `
    .negativo {
      color: #e74c3c !important;
      font-weight: bold;
    }
  `;
  document.head.appendChild(styleElement);
});

// Función para actualizar el estado de un cable
async function actualizarEstadoCable(id, nuevoEstado) {
  try {
    // Confirmar la acción con el usuario
    const result = await Swal.fire({
      title: "Cambiar estado",
      text: `¿Cambiar el estado a "${nuevoEstado}"?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, cambiar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    // Obtener el documento actual para el historial
    const docRef = db.collection("cables").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      Swal.fire("Error", "Cable no encontrado", "error");
      return;
    }

    const datosAnteriores = docSnap.data();

    // Actualizar el estado
    await docRef.update({
      estado: nuevoEstado,
      timestamp_actualizacion: new Date(),
    });

    // Registrar en historial
    await registrarHistorial("cables", "editar", id, {
      estado_anterior: datosAnteriores.estado || "Pendiente",
      estado_nuevo: nuevoEstado,
      timestamp: new Date(),
    });

    // Recargar datos
    cargarCables();

    Swal.fire("Actualizado", "Estado actualizado correctamente", "success");
  } catch (error) {
    console.error("Error al actualizar estado:", error);
    Swal.fire(
      "Error",
      "No se pudo actualizar el estado: " + error.message,
      "error"
    );
  }
}

// Función para ajustar monto de cable (si es necesaria)
async function ajustarMontoCable(id) {
  try {
    // Obtener datos actuales
    const docRef = db.collection("cables").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      Swal.fire("Error", "Cable no encontrado", "error");
      return;
    }

    const datosActuales = docSnap.data();

    // Mostrar formulario para ajustar el monto
    const { value: formValues } = await Swal.fire({
      title: "Ajustar Monto",
      html: `
        <div class="swal-form">
          <div class="form-group">
            <label for="montoUsd">Monto USD</label>
            <input type="number" id="montoUsd" class="swal2-input" step="any" value="${
              datosActuales.monto_usd || 0
            }" />
          </div>
          <div class="form-group">
            <label for="comisionPorc">Comisión %</label>
            <input type="number" id="comisionPorc" class="swal2-input" step="any" value="${
              datosActuales.comision_porc || 0
            }" />
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const montoUsd = parseFloat(document.getElementById("montoUsd").value);
        const comisionPorc = parseFloat(
          document.getElementById("comisionPorc").value
        );

        if (isNaN(montoUsd) || isNaN(comisionPorc)) {
          Swal.showValidationMessage("Ingrese valores numéricos válidos");
          return false;
        }

        return {
          montoUsd,
          comisionPorc,
          comisionUsd: (montoUsd * comisionPorc) / 100,
        };
      },
    });

    if (!formValues) return; // Usuario canceló

    // Guardar los nuevos valores
    await docRef.update({
      monto_usd: formValues.montoUsd,
      comision_porc: formValues.comisionPorc,
      comision_usd: formValues.comisionUsd,
      timestamp_actualizacion: new Date(),
    });

    // Registrar en historial
    await registrarHistorial("cables", "editar", id, {
      monto_anterior: datosActuales.monto_usd,
      monto_nuevo: formValues.montoUsd,
      comision_porc_anterior: datosActuales.comision_porc,
      comision_porc_nueva: formValues.comisionPorc,
      timestamp: new Date(),
    });

    // Recargar datos
    cargarCables();

    Swal.fire("Actualizado", "Monto ajustado correctamente", "success");
  } catch (error) {
    console.error("Error al ajustar monto:", error);
    Swal.fire(
      "Error",
      "No se pudo ajustar el monto: " + error.message,
      "error"
    );
  }
}
