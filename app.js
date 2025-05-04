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

/**
 * Actualiza y renderiza una tabla paginada
 * @param {string} modulo - Nombre del módulo cuya tabla se va a paginar
 */
function actualizarTablaPaginada(modulo) {
  // Si no hay datos para este módulo, salir
  if (!datosCompletos[modulo] || datosCompletos[modulo].length === 0) {
    document.getElementById("loader")?.classList.remove("active");
    return;
  }

  // Obtener parámetros de paginación actual
  const estado = estadoPaginacion[modulo];
  const inicio = (estado.pagina - 1) * estado.registrosPorPagina;
  const fin = inicio + estado.registrosPorPagina;

  // Obtener los datos para la página actual
  const datosPagina = datosCompletos[modulo].slice(inicio, fin);

  // Renderizar la tabla según el módulo
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
      console.warn(`No hay función de renderizado para el módulo: ${modulo}`);
  }

  // Actualizar información de paginación en la UI
  const paginaActualElement = document.getElementById(`paginaActual${modulo.charAt(0).toUpperCase() + modulo.slice(1)}`);
  if (paginaActualElement) {
    paginaActualElement.textContent = `Página ${estado.pagina}`;
  }

  // Habilitar/deshabilitar botones de paginación
  const btnAnterior = document.getElementById(`btnAnterior${modulo.charAt(0).toUpperCase() + modulo.slice(1)}`);
  const btnSiguiente = document.getElementById(`btnSiguiente${modulo.charAt(0).toUpperCase() + modulo.slice(1)}`);

  if (btnAnterior) {
    btnAnterior.disabled = estado.pagina <= 1;
  }
  if (btnSiguiente) {
    btnSiguiente.disabled = estado.pagina >= Math.ceil(estado.total / estado.registrosPorPagina);
  }

  // Quitar spinner de carga
  document.getElementById("loader")?.classList.remove("active");
}

/**
 * Cambia a la página anterior de la tabla paginada
 * @param {string} modulo - Nombre del módulo
 */
function paginaAnterior(modulo) {
  if (estadoPaginacion[modulo].pagina > 1) {
    estadoPaginacion[modulo].pagina--;
    actualizarTablaPaginada(modulo);
  }
}

/**
 * Cambia a la página siguiente de la tabla paginada
 * @param {string} modulo - Nombre del módulo
 */
function paginaSiguiente(modulo) {
  const totalPaginas = Math.ceil(
    estadoPaginacion[modulo].total / estadoPaginacion[modulo].registrosPorPagina
  );
  if (estadoPaginacion[modulo].pagina < totalPaginas) {
    estadoPaginacion[modulo].pagina++;
    actualizarTablaPaginada(modulo);
  }
}

/**
 * Cambia la cantidad de registros mostrados por página
 * @param {string} modulo - Nombre del módulo
 * @param {number} cantidad - Cantidad de registros por página
 */
function cambiarRegistrosPorPagina(modulo, cantidad) {
  estadoPaginacion[modulo].registrosPorPagina = parseInt(cantidad);
  estadoPaginacion[modulo].pagina = 1; // Volver a la primera página
  actualizarTablaPaginada(modulo);
}

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
    const snapOperadores = await db.collection("operadores").orderBy("nombre").get();
    
    const operadores = [];
    snapOperadores.forEach((doc) => {
      operadores.push({
        id: doc.id,
        nombre: doc.data().nombre,
      });
    });

    // Rellenar todos los selectores de operadores
    const selectoresOperadores = [
      "operadorTrans",
      "operadorIngreso"
    ];

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
    const snapClientes = await db.collection("clientes").orderBy("nombre").get();
    
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
      "clienteMovimientoDolares"
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
        comisionUsd: cables.reduce(
          (total, item) => {
            const comision = parseFloat(item.comision_usd || 0);
            return total + comision;
          }, 0
        ),
        comisionArs: 0,
      },
      {
        tipo: "Cash to Cash",
        cantidad: cashToCash.length,
        comisionUsd: cashToCash.reduce(
          (total, item) => {
            const comision = parseFloat(item.comision_usd || 0);
            return total + comision;
          }, 0
        ),
        comisionArs: 0,
      },
      {
        tipo: "Ingreso Pesos",
        cantidad: ingresoPesos.length,
        comisionUsd: 0,
        comisionArs: ingresoPesos.reduce(
          (total, item) => {
            const comision = parseFloat(item.comision_ars || 0);
            return total + comision;
          }, 0
        ),
      },
      {
        tipo: "Descuento Cheque",
        cantidad: descuentoCheque.length,
        comisionUsd: 0,
        comisionArs: descuentoCheque.reduce(
          (total, item) => {
            const comision = parseFloat(item.comision || 0);
            return total + comision;
          }, 0
        ),
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
      maximumFractionDigits: 2
    });
    
    totalArsElement.textContent = totalArs.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
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
        maximumFractionDigits: 2
      });
      
      const comisionArsFormateada = item.comisionArs.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
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
      maximumFractionDigits: 2
    });
    
    const totalArsFormateado = totalArs.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
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
        if (typeof data.timestamp.toDate === 'function') {
          docTimestamp = data.timestamp.toDate();
        } 
        // Caso 2: Es un objeto Date de JavaScript
        else if (data.timestamp instanceof Date) {
          docTimestamp = data.timestamp;
        }
        // Caso 3: Es un string que podemos convertir a Date
        else if (typeof data.timestamp === 'string') {
          docTimestamp = new Date(data.timestamp);
        }
      } 
      // Intentar con el campo fecha si no hay timestamp
      else if (data.fecha) {
        // Caso 1: Es un timestamp de Firestore
        if (typeof data.fecha.toDate === 'function') {
          docTimestamp = data.fecha.toDate();
        } 
        // Caso 2: Es un objeto Date de JavaScript
        else if (data.fecha instanceof Date) {
          docTimestamp = data.fecha;
        }
        // Caso 3: Es un string que podemos convertir a Date
        else if (typeof data.fecha === 'string') {
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
          ...data
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
  const comisionUsdInput = document.getElementById("comisionUsdTrans");

  // Campos para mostrar resultados
  const difTcResult = document.getElementById("difTcResult");
  const montoNetoResult = document.getElementById("montoNetoResult");
  const cambioUsdResult = document.getElementById("cambioUsdResult");
  const comisionArsResult = document.getElementById("comisionArsResult");

  // Campos ocultos para guardar valores calculados
  const difTcTrans = document.getElementById("difTcTrans");
  const montoNetoTrans = document.getElementById("montoNetoTrans");
  const cambioUsdTrans = document.getElementById("cambioUsdTrans");
  const comisionArsTrans = document.getElementById("comisionArsTrans");

  // Función para formatear entradas con decimales
  const formatearDecimal = (input) => {
    if (!input.value) return;
    
    // Primero, reemplazar comas por puntos
    let valor = input.value.replace(/,/g, '.');
    
    // Limitar a solo números y un punto decimal
    valor = valor.replace(/[^\d.]/g, '');
    
    // Asegurar que solo hay un punto decimal
    const partes = valor.split('.');
    if (partes.length > 2) {
      valor = partes[0] + '.' + partes.slice(1).join('');
    }
    
    // Limitar a dos decimales
    if (partes.length > 1 && partes[1].length > 2) {
      valor = partes[0] + '.' + partes[1].substring(0, 2);
    }
    
    input.value = valor;
  };

  // Agregar evento de formateo a cada input
  [montoInput, tcBsAsInput, tcSaltaInput, comisionUsdInput].forEach(input => {
    input.addEventListener("input", () => formatearDecimal(input));
  });

  // Función para realizar los cálculos
  const calcularValores = () => {
    // Obtener valores actuales y convertir a números
    const monto = parseFloat(montoInput.value.replace(/,/g, '.')) || 0;
    const tcBsAs = parseFloat(tcBsAsInput.value.replace(/,/g, '.')) || 0;
    const tcSalta = parseFloat(tcSaltaInput.value.replace(/,/g, '.')) || 0;
    const comisionUsd = parseFloat(comisionUsdInput.value.replace(/,/g, '.')) || 0;

    // Calcular valores
    // 1. Diferencia de tipo de cambio
    const difTc = tcSalta - tcBsAs;

    // 2. Comisión en ARS (basado en la comisión USD y el TC aplicado)
    const comisionArs = tcSalta > 0 ? comisionUsd * tcSalta : 0;

    // 3. Monto neto (después de comisión)
    const montoNeto = monto - comisionArs;

    // 4. Cambio a USD
    const cambioUsd = tcSalta > 0 ? montoNeto / tcSalta : 0;

    // Mostrar en la interfaz
    difTcResult.textContent = difTc.toFixed(2);
    montoNetoResult.textContent = montoNeto.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
    });
    cambioUsdResult.textContent = cambioUsd.toFixed(2);
    comisionArsResult.textContent = comisionArs.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
    });

    // Guardar en campos ocultos para envío
    difTcTrans.value = difTc;
    montoNetoTrans.value = montoNeto;
    cambioUsdTrans.value = cambioUsd;
    comisionArsTrans.value = comisionArs;
  };

  // Configurar eventos para actualizar cálculos cuando cambian los valores
  [montoInput, tcBsAsInput, tcSaltaInput, comisionUsdInput].forEach((input) => {
    input.addEventListener("input", calcularValores);
  });
};

// Inicializar cálculos automáticos cuando se carga la página
setupTransferenciasCalculos();

// Función para generar número de transacción automático
async function generarNumeroTransaccion(coleccion) {
  try {
    // Obtener el último número de transacción
    const docRef = db.collection("configuracion").doc("numeracion");
    const doc = await docRef.get();
    
    let ultimoNumero = 0;
    
    if (doc.exists) {
      const datos = doc.data();
      ultimoNumero = datos[coleccion] || 0;
    }
    
    // Incrementar número
    const nuevoNumero = ultimoNumero + 1;
    
    // Actualizar en Firestore (usar transaction para evitar condiciones de carrera)
    await db.runTransaction(async (transaction) => {
      // Volver a leer el documento en la transacción
      const docRef = db.collection("configuracion").doc("numeracion");
      const doc = await transaction.get(docRef);
      
      // Actualizar o crear el documento
      if (doc.exists) {
        transaction.update(docRef, {
          [coleccion]: nuevoNumero
        });
      } else {
        transaction.set(docRef, {
          [coleccion]: nuevoNumero
        });
      }
    });
    
    // Formatear número (ejemplo: TRF-00001)
    const prefijo = obtenerPrefijo(coleccion);
    const numeroFormateado = `${prefijo}-${nuevoNumero.toString().padStart(5, '0')}`;
    
    return numeroFormateado;
  } catch (error) {
    console.error("Error al generar número de transacción:", error);
    throw error;
  }
}

// Función para obtener prefijo según el tipo de transacción
function obtenerPrefijo(coleccion) {
  const prefijos = {
    transferencias: "TRF",
    cables: "CBL",
    cash_to_cash: "CSH",
    ingreso_pesos: "ING",
    descuento_cheque: "CHQ"
  };
  
  return prefijos[coleccion] || "TRX";
}

// Función para agregar movimiento de cuenta corriente
async function agregarMovimientoCuentaCorriente(datos) {
  try {
    const {
      clienteId, 
      clienteNombre, 
      moneda,
      fecha, 
      tipoOperacion, 
      debito, 
      credito, 
      concepto
    } = datos;

    // Verificar el tipo de moneda para determinar la colección
    const coleccion = moneda === "USD" ? "cuentaCorrienteDolares" : "cuentaCorrientePesos";
    
    // Calcular saldo actual
    const movimientos = await db.collection(coleccion)
      .where("clienteId", "==", clienteId)
      .orderBy("fecha", "desc")
      .limit(1)
      .get();
    
    let saldoAnterior = 0;
    if (!movimientos.empty) {
      saldoAnterior = movimientos.docs[0].data().saldo;
    }
    
    // Calcular nuevo saldo
    let nuevoSaldo = saldoAnterior;
    if (debito > 0) {
      nuevoSaldo -= debito; // Débito disminuye el saldo
    } else if (credito > 0) {
      nuevoSaldo += credito; // Crédito aumenta el saldo
    }
    
    // Guardar movimiento
    const fechaObj = new Date(fecha);
    await db.collection(coleccion).add({
      clienteId: clienteId,
      clienteNombre: clienteNombre,
      fecha: fechaObj,
      fechaValor: fechaObj,  // Misma fecha por defecto
      tipoOperacion: tipoOperacion,
      debito: debito,
      credito: credito,
      saldo: nuevoSaldo,
      moneda: moneda,
      concepto: concepto,
      timestamp: new Date()
    });
    
    return true;
  } catch (error) {
    console.error("Error al agregar movimiento de cuenta corriente:", error);
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
      "comisionUsdTrans",
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

    // Convertir valores a números, asegurándose de que las comas se traten correctamente
    const monto = parseFloat(getVal("montoTrans").replace(/,/g, '.'));
    const tcBsAs = parseFloat(getVal("tcUsdBsAsTrans").replace(/,/g, '.'));
    const tcSalta = parseFloat(getVal("tcUsdSaltaTrans").replace(/,/g, '.'));
    const comisionUsd = parseFloat(getVal("comisionUsdTrans").replace(/,/g, '.'));

    // Calcular valores
    const difTc = tcSalta - tcBsAs;
    const comisionArs = comisionUsd * tcSalta;
    const montoNeto = monto - comisionArs;
    const cambioUsd = montoNeto / tcSalta;

    // Obtener tipo de transacción
    const tipoTransaccion = getVal("tipoTransaccion") || "envio";

    // Obtener el operador para la cuenta corriente
    const operadorId = getVal("operadorTrans");
    const clienteId = getVal("clienteTrans");
    
    // Obtener número de transacción (ya no existe el campo transaccionTrans)
    let numeroTransaccion = await generarNumeroTransaccion("transferencias");

    // Crear objeto con los datos
    const datosTrans = {
      fecha: getVal("fechaTrans"),
      operador: getVal("operadorTrans"),
      operador_id: operadorId,
      cliente: getVal("clienteTrans"),
      cliente_id: clienteId,
      destinatario: getVal("destinatarioTrans"),
      monto: monto,
      tc_usd_bsas: tcBsAs,
      tc_usd_salta: tcSalta,
      comision: comisionArs,         // Se sigue usando para compatibilidad
      comision_ars: comisionArs,     // Comisión en ARS calculada
      comision_usd: comisionUsd,     // Comisión en USD ingresada
      cambio_usd: cambioUsd,
      dif_tc: difTc,
      monto_neto: montoNeto,
      tipo_transaccion: tipoTransaccion,
      recepcionada: getVal("recepcionadaTrans"),
      transaccion: numeroTransaccion,
      comentario: getVal("comentarioTrans") || "",
      timestamp: new Date(),
    };

    // Guardar en Firestore
    const docRef = await db.collection("transferencias").add(datosTrans);
    
    // Si la transacción está marcada como completada (OK), registrar en cuenta corriente
    if (datosTrans.recepcionada === "OK") {
      try {
        // Obtener nombres de cliente y operador para los registros
        const clienteDoc = await db.collection("clientes").doc(clienteId).get();
        const operadorDoc = await db.collection("operadores").doc(operadorId).get();
        
        const clienteNombre = clienteDoc.exists ? clienteDoc.data().nombre : "Cliente desconocido";
        const operadorNombre = operadorDoc.exists ? operadorDoc.data().nombre : "Operador desconocido";
        
        // 1. Registrar débito al operador (lo que debe entregar en USD)
        await agregarMovimientoCuentaCorriente({
          clienteId: operadorId,
          clienteNombre: operadorNombre,
          moneda: "USD",
          fecha: datosTrans.fecha,
          tipoOperacion: "CAMBIO USD POR TRANSFERENCIA",
          debito: cambioUsd,
          credito: 0,
          concepto: `Cambio USD por transferencia ${numeroTransaccion}`
        });
        
        // 2. Registrar crédito al cliente (lo que recibe en USD)
        await agregarMovimientoCuentaCorriente({
          clienteId: clienteId,
          clienteNombre: clienteNombre,
          moneda: "USD",
          fecha: datosTrans.fecha,
          tipoOperacion: "CAMBIO USD POR TRANSFERENCIA",
          debito: 0,
          credito: cambioUsd,
          concepto: `Cambio USD por transferencia ${numeroTransaccion}`
        });
      } catch (error) {
        console.error("Error al registrar en cuenta corriente:", error);
        // No interrumpir el proceso principal si falla la cuenta corriente
      }
    }

    // Registrar en historial
    await registrarHistorial("transferencias", "crear", docRef.id, datosTrans);

    clearForm("formTransferencias");
    setupTransferenciasCalculos();
    cargarTransferencias();

    Swal.fire({
      icon: "success",
      title: "Éxito",
      text: "Transferencia registrada correctamente",
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
    
    // Ensure numeric values exist before using toLocaleString
    const monto = t.monto !== undefined && t.monto !== null ? t.monto.toLocaleString("es-AR") : "0";
    const cambioUsd = t.cambio_usd !== undefined && t.cambio_usd !== null ? 
      t.cambio_usd.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : "0.00";
    const tcAplicado = t.tc_usd_salta !== undefined && t.tc_usd_salta !== null ?
      t.tc_usd_salta.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : "0.00";
    const difTc = t.dif_tc !== undefined && t.dif_tc !== null ?
      t.dif_tc.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : "0.00";
      
    // Formatear comisiones en ambas monedas
    const comisionArs = t.comision_ars !== undefined && t.comision_ars !== null ?
      t.comision_ars.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : "0.00";
    const comisionUsd = t.comision_usd !== undefined && t.comision_usd !== null ?
      t.comision_usd.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : "0.00";
      
    // Mostrar ambas comisiones
    const comisionFormateada = `$${comisionArs} / U$D ${comisionUsd}`;

    // Determinar clase CSS para estado
    let estadoClase = "";
    if (estado === "OK") estadoClase = "estado-ok";
    else if (estado === "Cancelada") estadoClase = "estado-cancelada";
    else estadoClase = "estado-pendiente";

    tbody.innerHTML += `
      <tr>
        <td>${fecha}</td>
        <td>${t.cliente}</td>
        <td>$${monto}</td>
        <td>${cambioUsd}</td>
        <td>${tcAplicado}</td>
        <td>${comisionFormateada}</td>
        <td>${difTc}</td>
        <td><span class="${estadoClase}">${estado}</span></td>
        <td>
          <button onclick="verDetallesTransferencia('${t.id}')" class="btn-icon">
            <i class="fas fa-eye"></i>
          </button>
          <button onclick="editarTransferencia('${t.id}')" class="btn-icon">
            <i class="fas fa-edit"></i>
          </button>
        </td>
      </tr>
    `;
  });

  document.getElementById("loader").classList.remove("active");
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
  
  // Configurar generación automática de notas
  const tipoCableSelect = document.getElementById("tipoCable");
  const estadoSelect = document.getElementById("ingresoCable");
  const notasTextarea = document.getElementById("notasCable");
  
  const actualizarNotas = () => {
    const tipoCable = tipoCableSelect.value;
    const estado = estadoSelect.value;
    
    // Mantener notas personalizadas si existen
    if (notasTextarea.getAttribute("data-personalizado") === "true") {
      return;
    }
    
    // Generar nota automática según tipo y estado
    let notaAutomatica = "";
    
    if (tipoCable === "subida") {
      if (estado === "Pendiente") {
        notaAutomatica = "Cable de subida pendiente de procesamiento.";
      } else if (estado === "OK") {
        notaAutomatica = "Cable de subida procesado correctamente.";
      } else if (estado === "Cancelado") {
        notaAutomatica = "Cable de subida cancelado.";
      }
    } else if (tipoCable === "bajada") {
      if (estado === "Pendiente") {
        notaAutomatica = "Cable de bajada pendiente de recepción.";
      } else if (estado === "OK") {
        notaAutomatica = "Cable de bajada recibido correctamente.";
      } else if (estado === "Cancelado") {
        notaAutomatica = "Cable de bajada cancelado.";
      }
    }
    
    notasTextarea.value = notaAutomatica;
  };
  
  // Ejecutar al iniciar
  if (tipoCableSelect && estadoSelect && notasTextarea) {
    actualizarNotas();
    
    // Vincular eventos
    tipoCableSelect.addEventListener("change", actualizarNotas);
    estadoSelect.addEventListener("change", actualizarNotas);
    
    // Marcar como personalizado cuando el usuario edita las notas
    notasTextarea.addEventListener("input", () => {
      notasTextarea.setAttribute("data-personalizado", "true");
    });
  }
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
    const tipoCable = getVal("tipoCable") || "subida";
    const notas = getVal("notasCable") || "";
    
    // Obtener o generar número de transacción
    let numeroTransaccion = getVal("transaccionCable");
    if (!numeroTransaccion) {
      numeroTransaccion = await generarNumeroTransaccion("cables");
    }

    const clienteId = getVal("clienteCable");
    
    // Crear objeto con datos
    const datosCable = {
      fecha: getVal("fechaCable"),
      cliente: getVal("clienteCable"),
      cliente_id: clienteId,
      tipo_cable: tipoCable,
      transaccion: numeroTransaccion,
      monto_usd: montoUsd,
      comision_porc: comisionPorc,
      comision_usd: comisionUsd,
      estado: getVal("ingresoCable"),
      notas: notas,
      timestamp: new Date(),
    };
    
    // Guardar en Firestore
    const docRef = await db.collection("cables").add(datosCable);
    
    // Registrar en historial
    await registrarHistorial("cables", "crear", docRef.id, datosCable);

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

    // Almacenar datos para paginación
    datosCompletos.cables = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Actualizar estado de paginación
    estadoPaginacion.cables.total = datosCompletos.cables.length;
    estadoPaginacion.cables.pagina = 1;

    // Renderizar datos paginados
    actualizarTablaPaginada("cables");
  } catch (error) {
    console.error("Error al cargar cables:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error al cargar los cables: " + error.message,
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
  const headers = columnas.map(col => col.header);
  
  // Preparar filas de datos extrayendo los valores usando dataKey
  const rows = datos.map(item => 
    columnas.map(col => item[col.dataKey] || "")
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
  
  return datos.map(item => {
    const nuevoItem = {};
    
    // Recorrer todas las propiedades del objeto
    for (const key in item) {
      // Si es una fecha y tiene método toDate() (Firebase Timestamp)
      if (item[key] && item[key].toDate && typeof item[key].toDate === 'function') {
        nuevoItem[key] = formatearFecha(item[key].toDate());
      }
      // Si es un número, formatearlo correctamente
      else if (typeof item[key] === 'number') {
        // Si parece un valor monetario (basado en el nombre de la propiedad)
        if (key.toLowerCase().includes('monto') || 
            key.toLowerCase().includes('saldo') || 
            key.toLowerCase().includes('debito') || 
            key.toLowerCase().includes('credito') || 
            key.toLowerCase().includes('comision')) {
          nuevoItem[key] = formatearMonto(item[key]);
        } else {
          nuevoItem[key] = item[key];
        }
      }
      // Si es undefined o null, convertir a cadena vacía
      else if (item[key] === undefined || item[key] === null) {
        nuevoItem[key] = '';
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
          { header: "Transacción", dataKey: "transaccion" },
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
          { header: "Transacción", dataKey: "transaccion" },
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
          { header: "Transacción", dataKey: "transaccion" },
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
          { header: "Transacción", dataKey: "transaccion" },
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
  const coleccion = tipo === "pesos" ? "cuentaCorrientePesos" : "cuentaCorrienteDolares";
  const clienteId = getVal(tipo === "pesos" ? "clienteCCPesos" : "clienteCCDolares");
  const fechaDesde = getVal(tipo === "pesos" ? "fechaDesdeCCPesos" : "fechaDesdeCCDolares");
  const fechaHasta = getVal(tipo === "pesos" ? "fechaHastaCCPesos" : "fechaHastaCCDolares");
  
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
  
  snapshot.forEach(doc => {
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
      fechaOp: fechaObj.toLocaleDateString('es-AR'),
      fechaValor: fechaValorObj.toLocaleDateString('es-AR'),
      tipoOperacion: data.tipoOperacion,
      debito: data.debito || 0,
      credito: data.credito || 0,
      saldo: saldoFormateado,
      moneda: data.moneda,
      concepto: data.concepto
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
  // Formulario para movimientos en pesos
  const formMovimientoPesos = document.getElementById("formMovimientoPesos");
  formMovimientoPesos.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const clienteId = getVal("clienteMovimientoPesos");
      const fecha = getVal("fechaMovimientoPesos");
      const tipoOperacion = getVal("tipoMovimientoPesos");
      const montoDebito = getVal("montoDebitoPesos") ? parseFloat(getVal("montoDebitoPesos")) : 0;
      const montoCredito = getVal("montoCreditoPesos") ? parseFloat(getVal("montoCreditoPesos")) : 0;
      const concepto = getVal("conceptoMovimientoPesos");
      
      // Validaciones básicas
      if (!clienteId) {
        throw new Error("Debe seleccionar un cliente");
      }
      if (!fecha) {
        throw new Error("Debe ingresar una fecha");
      }
      if (!tipoOperacion) {
        throw new Error("Debe seleccionar un tipo de operación");
      }
      if (montoDebito === 0 && montoCredito === 0) {
        throw new Error("Debe ingresar un monto de débito o crédito");
      }
      if (montoDebito > 0 && montoCredito > 0) {
        throw new Error("Solo puede ingresar un monto de débito o crédito, no ambos");
      }
      if (!concepto) {
        throw new Error("Debe ingresar un concepto");
      }
      
      // Obtener cliente para tener el nombre
      const clienteDoc = await db.collection("clientes").doc(clienteId).get();
      if (!clienteDoc.exists) {
        throw new Error("Cliente no encontrado");
      }
      
      // Calcular saldo actual
      const movimientos = await db.collection("cuentaCorrientePesos")
        .where("clienteId", "==", clienteId)
        .orderBy("fecha", "desc")
        .limit(1)
        .get();
      
      let saldoAnterior = 0;
      if (!movimientos.empty) {
        saldoAnterior = movimientos.docs[0].data().saldo;
      }
      
      // Calcular nuevo saldo - Nota: según el video, los débitos disminuyen el saldo y los créditos lo aumentan
      let nuevoSaldo = saldoAnterior;
      if (montoDebito > 0) {
        nuevoSaldo -= montoDebito; // Débito disminuye el saldo
      } else if (montoCredito > 0) {
        nuevoSaldo += montoCredito; // Crédito aumenta el saldo
      }
      
      // Guardar movimiento
      await db.collection("cuentaCorrientePesos").add({
        clienteId: clienteId,
        clienteNombre: clienteDoc.data().nombre,
        fecha: new Date(fecha),
        fechaValor: new Date(fecha),  // Misma fecha por defecto
        tipoOperacion: tipoOperacion,
        debito: montoDebito,
        credito: montoCredito,
        saldo: nuevoSaldo,
        moneda: "ARS",
        concepto: concepto,
        timestamp: new Date()
      });
      
      // Registrar en historial
      await registrarHistorial(
        "cuentaCorrientePesos",
        "crear",
        clienteId,
        `Nuevo movimiento de ${tipoOperacion} por ${montoDebito > 0 ? montoDebito : montoCredito} ARS`
      );
      
      // Limpiar formulario y recargar tabla
      clearForm("formMovimientoPesos");
      cargarCuentaCorrientePesos();
      
      Swal.fire({
        icon: "success",
        title: "Éxito",
        text: "Movimiento registrado correctamente"
      });
      
    } catch (error) {
      console.error("Error al guardar movimiento:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message
      });
    }
  };
  
  // Formulario para movimientos en dólares
  const formMovimientoDolares = document.getElementById("formMovimientoDolares");
  formMovimientoDolares.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const clienteId = getVal("clienteMovimientoDolares");
      const fecha = getVal("fechaMovimientoDolares");
      const tipoOperacion = getVal("tipoMovimientoDolares");
      const montoDebito = getVal("montoDebitoDolares") ? parseFloat(getVal("montoDebitoDolares")) : 0;
      const montoCredito = getVal("montoCreditoDolares") ? parseFloat(getVal("montoCreditoDolares")) : 0;
      const concepto = getVal("conceptoMovimientoDolares");
      
      // Validaciones básicas
      if (!clienteId) {
        throw new Error("Debe seleccionar un cliente");
      }
      if (!fecha) {
        throw new Error("Debe ingresar una fecha");
      }
      if (!tipoOperacion) {
        throw new Error("Debe seleccionar un tipo de operación");
      }
      if (montoDebito === 0 && montoCredito === 0) {
        throw new Error("Debe ingresar un monto de débito o crédito");
      }
      if (montoDebito > 0 && montoCredito > 0) {
        throw new Error("Solo puede ingresar un monto de débito o crédito, no ambos");
      }
      if (!concepto) {
        throw new Error("Debe ingresar un concepto");
      }
      
      // Obtener cliente para tener el nombre
      const clienteDoc = await db.collection("clientes").doc(clienteId).get();
      if (!clienteDoc.exists) {
        throw new Error("Cliente no encontrado");
      }
      
      // Calcular saldo actual
      const movimientos = await db.collection("cuentaCorrienteDolares")
        .where("clienteId", "==", clienteId)
        .orderBy("fecha", "desc")
        .limit(1)
        .get();
      
      let saldoAnterior = 0;
      if (!movimientos.empty) {
        saldoAnterior = movimientos.docs[0].data().saldo;
      }
      
      // Calcular nuevo saldo - Nota: según el video, los débitos disminuyen el saldo y los créditos lo aumentan
      let nuevoSaldo = saldoAnterior;
      if (montoDebito > 0) {
        nuevoSaldo -= montoDebito; // Débito disminuye el saldo
      } else if (montoCredito > 0) {
        nuevoSaldo += montoCredito; // Crédito aumenta el saldo
      }
      
      // Guardar movimiento
      await db.collection("cuentaCorrienteDolares").add({
        clienteId: clienteId,
        clienteNombre: clienteDoc.data().nombre,
        fecha: new Date(fecha),
        fechaValor: new Date(fecha),  // Misma fecha por defecto
        tipoOperacion: tipoOperacion,
        debito: montoDebito,
        credito: montoCredito,
        saldo: nuevoSaldo,
        moneda: "USD",
        concepto: concepto,
        timestamp: new Date()
      });
      
      // Registrar en historial
      await registrarHistorial(
        "cuentaCorrienteDolares",
        "crear",
        clienteId,
        `Nuevo movimiento de ${tipoOperacion} por ${montoDebito > 0 ? montoDebito : montoCredito} USD`
      );
      
      // Limpiar formulario y recargar tabla
      clearForm("formMovimientoDolares");
      cargarCuentaCorrienteDolares();
      
      Swal.fire({
        icon: "success",
        title: "Éxito",
        text: "Movimiento registrado correctamente"
      });
      
    } catch (error) {
      console.error("Error al guardar movimiento:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message
      });
    }
  };
  
  // Configurar filtros para cuentas corrientes
  document.getElementById("btnFiltrarCCPesos")?.addEventListener("click", () => {
    const filtros = {
      clienteId: getVal("clienteCCPesos"),
      fechaDesde: getVal("fechaDesdeCCPesos"),
      fechaHasta: getVal("fechaHastaCCPesos")
    };
    cargarCuentaCorrientePesos(filtros);
  });
  
  document.getElementById("btnFiltrarCCDolares")?.addEventListener("click", () => {
    const filtros = {
      clienteId: getVal("clienteCCDolares"),
      fechaDesde: getVal("fechaDesdeCCDolares"),
      fechaHasta: getVal("fechaHastaCCDolares")
    };
    cargarCuentaCorrienteDolares(filtros);
  });
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
    if (filtros.clienteId) {
      query = query.where("clienteId", "==", filtros.clienteId);
    } else if (document.getElementById("clienteCCPesos").value) {
      query = query.where("clienteId", "==", document.getElementById("clienteCCPesos").value);
    }
    
    if (filtros.fechaDesde || document.getElementById("fechaDesdeCCPesos").value) {
      const fechaDesde = new Date(filtros.fechaDesde || document.getElementById("fechaDesdeCCPesos").value);
      fechaDesde.setHours(0, 0, 0, 0);
      query = query.where("fecha", ">=", fechaDesde);
    }
    
    if (filtros.fechaHasta || document.getElementById("fechaHastaCCPesos").value) {
      const fechaHasta = new Date(filtros.fechaHasta || document.getElementById("fechaHastaCCPesos").value);
      fechaHasta.setHours(23, 59, 59, 999);
      query = query.where("fecha", "<=", fechaHasta);
    }
    
    // Ejecutar consulta
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">No hay movimientos registrados</td></tr>';
      document.getElementById("loader").classList.remove("active");
      return;
    }
    
    // Procesar los datos y renderizar tabla
    const movimientos = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Asegurar que los valores numéricos son realmente números
      const debito = parseFloat(data.debito || 0);
      const credito = parseFloat(data.credito || 0);
      const saldo = parseFloat(data.saldo || 0);
      
      movimientos.push({
        id: doc.id,
        ...data,
        debito: debito,
        credito: credito,
        saldo: saldo
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
      text: "Error al cargar los datos: " + error.message
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
    let query = db.collection("cuentaCorrienteDolares").orderBy("fecha", "desc");
    
    // Aplicar filtros
    if (filtros.clienteId) {
      query = query.where("clienteId", "==", filtros.clienteId);
    } else if (document.getElementById("clienteCCDolares").value) {
      query = query.where("clienteId", "==", document.getElementById("clienteCCDolares").value);
    }
    
    if (filtros.fechaDesde || document.getElementById("fechaDesdeCCDolares").value) {
      const fechaDesde = new Date(filtros.fechaDesde || document.getElementById("fechaDesdeCCDolares").value);
      fechaDesde.setHours(0, 0, 0, 0);
      query = query.where("fecha", ">=", fechaDesde);
    }
    
    if (filtros.fechaHasta || document.getElementById("fechaHastaCCDolares").value) {
      const fechaHasta = new Date(filtros.fechaHasta || document.getElementById("fechaHastaCCDolares").value);
      fechaHasta.setHours(23, 59, 59, 999);
      query = query.where("fecha", "<=", fechaHasta);
    }
    
    // Ejecutar consulta
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">No hay movimientos registrados</td></tr>';
      document.getElementById("loader").classList.remove("active");
      return;
    }
    
    // Procesar los datos y renderizar tabla
    const movimientos = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Asegurar que los valores numéricos son realmente números
      const debito = parseFloat(data.debito || 0);
      const credito = parseFloat(data.credito || 0);
      const saldo = parseFloat(data.saldo || 0);
      
      movimientos.push({
        id: doc.id,
        ...data,
        debito: debito,
        credito: credito,
        saldo: saldo
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
      text: "Error al cargar los datos: " + error.message
    });
  }
}

// Función para renderizar movimientos en la tabla de cuenta corriente
function renderizarTablaCuentaCorriente(movimientos, tbody, tipo) {
  if (movimientos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center;">No hay movimientos registrados</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  const moneda = tipo === "pesos" ? "$" : "USD";
  let saldoTotal = 0;

  movimientos.forEach((m) => {
    // Convertir fechas de firebase a objetos Date
    const fechaOp = m.fecha?.toDate() || new Date();
    const fechaVal = m.fechaValor?.toDate() || new Date();
    
    // Asegurar que los valores numéricos sean números
    const debito = parseFloat(m.debito || 0);
    const credito = parseFloat(m.credito || 0);
    const saldo = parseFloat(m.saldo || 0);
    
    // Actualizar el saldo total con el valor más reciente
    if (!isNaN(saldo)) {
      saldoTotal = saldo;
    }

    // Determinar si el saldo es negativo para aplicar clase CSS
    const esNegativo = saldo < 0 ? "negativo" : "";

    tbody.innerHTML += `
      <tr>
        <td>${formatearFecha(fechaOp)}</td>
        <td>${formatearFecha(fechaVal)}</td>
        <td>${m.tipoOperacion || ""}</td>
        <td class="monto">${!isNaN(debito) && debito > 0 ? formatearMonto(debito) : ""}</td>
        <td class="monto">${!isNaN(credito) && credito > 0 ? formatearMonto(credito) : ""}</td>
        <td class="monto ${esNegativo}">${formatearMontoConSigno(saldo)}</td>
        <td>${m.moneda || moneda}</td>
        <td>${m.concepto || ""}</td>
        <td>
          <button class="btn-editar" onclick="editarMovimientoCuentaCorriente('${m.id}', '${tipo}')">Editar</button>
          <button onclick="eliminarMovimientoCuentaCorriente('${m.id}', '${tipo}')">Eliminar</button>
        </td>
      </tr>
    `;
  });

  // Actualizar el saldo total mostrado en el pie de tabla
  document.getElementById(tipo === "pesos" ? "saldoTotalPesos" : "saldoTotalDolares").innerHTML = formatearMontoConSigno(saldoTotal);
  
  // Aplicar clase para saldos negativos
  if (saldoTotal < 0) {
    document.getElementById(tipo === "pesos" ? "saldoTotalPesos" : "saldoTotalDolares").classList.add("negativo");
  } else {
    document.getElementById(tipo === "pesos" ? "saldoTotalPesos" : "saldoTotalDolares").classList.remove("negativo");
  }
}

// Función para formatear fechas
function formatearFecha(fecha) {
  if (!fecha) return "-";
  
  try {
    // Si ya es un objeto Date
    if (fecha instanceof Date) {
      return fecha.toLocaleDateString('es-AR');
    }
    
    // Si es un objeto Timestamp de Firebase
    if (typeof fecha.toDate === 'function') {
      return fecha.toDate().toLocaleDateString('es-AR');
    }
    
    // Si es una cadena, intentar convertir a Date
    return new Date(fecha).toLocaleDateString('es-AR');
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
  
  return monto.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Función para formatear montos con signo
function formatearMontoConSigno(monto) {
  // Verificar si el valor es un número válido
  if (monto === null || monto === undefined || isNaN(monto)) {
    return "0,00";
  }
  
  const abs = Math.abs(monto);
  const formateado = abs.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  // Colocar el signo negativo al final del número, como se muestra en el video
  return monto < 0 ? formateado + '-' : formateado;
}

// Función para editar un movimiento de cuenta corriente
async function editarMovimientoCuentaCorriente(id, tipo) {
  try {
    const coleccion = tipo === "pesos" ? "cuentaCorrientePesos" : "cuentaCorrienteDolares";
    const doc = await db.collection(coleccion).doc(id).get();
    
    if (!doc.exists) {
      Swal.fire("Error", "Movimiento no encontrado", "error");
      return;
    }
    
    const movimiento = doc.data();
    const moneda = tipo === "pesos" ? "ARS" : "USD";
    
    // Formateo de fecha para el input date
    const fecha = movimiento.fecha.toDate().toISOString().split('T')[0];
    
    const { value: formValues } = await Swal.fire({
      title: `Editar Movimiento en ${tipo === "pesos" ? "Pesos" : "Dólares"}`,
      html: `
        <div class="swal-form-row">
          <label>Fecha:</label>
          <input id="swal-fecha" class="swal2-input" type="date" value="${fecha}" required>
        </div>
        <div class="swal-form-row">
          <label>Tipo de Operación:</label>
          <select id="swal-tipo" class="swal2-input">
            <option value="NOTA DE DEBITO" ${movimiento.tipoOperacion === "NOTA DE DEBITO" ? "selected" : ""}>NOTA DE DEBITO</option>
            <option value="ARREGLO CREDITO" ${movimiento.tipoOperacion === "ARREGLO CREDITO" ? "selected" : ""}>ARREGLO CREDITO</option>
          </select>
        </div>
        <div class="swal-form-row">
          <label>Monto Débito (${moneda}):</label>
          <input id="swal-debito" class="swal2-input" type="number" step="any" value="${movimiento.debito || 0}">
        </div>
        <div class="swal-form-row">
          <label>Monto Crédito (${moneda}):</label>
          <input id="swal-credito" class="swal2-input" type="number" step="any" value="${movimiento.credito || 0}">
        </div>
        <div class="swal-form-row">
          <label>Concepto:</label>
          <input id="swal-concepto" class="swal2-input" value="${movimiento.concepto}">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      customClass: {
        container: 'swal-wider'
      },
      preConfirm: () => {
        const nuevaFecha = document.getElementById("swal-fecha").value;
        const nuevoTipo = document.getElementById("swal-tipo").value;
        const nuevoDebito = parseFloat(document.getElementById("swal-debito").value) || 0;
        const nuevoCredito = parseFloat(document.getElementById("swal-credito").value) || 0;
        const nuevoConcepto = document.getElementById("swal-concepto").value;
        
        // Validaciones
        if (!nuevaFecha) {
          Swal.showValidationMessage("La fecha es obligatoria");
          return false;
        }
        if (nuevoDebito === 0 && nuevoCredito === 0) {
          Swal.showValidationMessage("Debe ingresar un monto de débito o crédito");
          return false;
        }
        if (nuevoDebito > 0 && nuevoCredito > 0) {
          Swal.showValidationMessage("Solo puede ingresar un monto de débito o crédito, no ambos");
          return false;
        }
        if (!nuevoConcepto) {
          Swal.showValidationMessage("El concepto es obligatorio");
          return false;
        }
        
        return {
          fecha: nuevaFecha,
          tipoOperacion: nuevoTipo,
          debito: nuevoDebito,
          credito: nuevoCredito,
          concepto: nuevoConcepto
        };
      },
    });
    
    if (formValues) {
      // Actualizamos el movimiento con los nuevos valores
      const nuevaFechaObj = new Date(formValues.fecha);
      
      // Guardamos los valores originales para calcular el ajuste de saldo
      const debitoOriginal = movimiento.debito || 0;
      const creditoOriginal = movimiento.credito || 0;
      
      // Cambio neto en el saldo debido a la edición
      let ajusteSaldo = 0;
      
      // Si era un débito y sigue siendo un débito, calculamos la diferencia
      if (debitoOriginal > 0 && formValues.debito > 0) {
        ajusteSaldo = debitoOriginal - formValues.debito;
      }
      // Si era un crédito y sigue siendo un crédito, calculamos la diferencia
      else if (creditoOriginal > 0 && formValues.credito > 0) {
        ajusteSaldo = formValues.credito - creditoOriginal;
      }
      // Si cambió de débito a crédito
      else if (debitoOriginal > 0 && formValues.credito > 0) {
        ajusteSaldo = debitoOriginal + formValues.credito;
      }
      // Si cambió de crédito a débito
      else if (creditoOriginal > 0 && formValues.debito > 0) {
        ajusteSaldo = -(creditoOriginal + formValues.debito);
      }
      
      // Actualizamos el movimiento con el nuevo saldo
      const nuevoSaldo = movimiento.saldo + ajusteSaldo;
      
      await db.collection(coleccion).doc(id).update({
        fecha: nuevaFechaObj,
        fechaValor: nuevaFechaObj, // Actualizamos también la fecha de valor
        tipoOperacion: formValues.tipoOperacion,
        debito: formValues.debito,
        credito: formValues.credito,
        concepto: formValues.concepto,
        saldo: nuevoSaldo
      });
      
      // Registrar en historial
      await registrarHistorial(
        coleccion,
        "editar",
        id,
        `Modificación de movimiento de ${formValues.tipoOperacion} por ${formValues.debito > 0 ? formValues.debito : formValues.credito} ${moneda}`
      );
      
      // Recargar la tabla
      if (tipo === "pesos") {
        cargarCuentaCorrientePesos();
      } else {
        cargarCuentaCorrienteDolares();
      }
      
      Swal.fire({
        icon: "success",
        title: "Éxito",
        text: "Movimiento actualizado correctamente"
      });
    }
    
  } catch (error) {
    console.error("Error al editar movimiento:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo editar el movimiento: " + error.message
    });
  }
}

// Función para eliminar un movimiento de cuenta corriente
async function eliminarMovimientoCuentaCorriente(id, tipo) {
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
      cancelButtonText: "Cancelar"
    });
    
    if (!result.isConfirmed) {
      return;
    }
    
    const coleccion = tipo === "pesos" ? "cuentaCorrientePesos" : "cuentaCorrienteDolares";
    
    // Obtener el movimiento antes de eliminarlo
    const doc = await db.collection(coleccion).doc(id).get();
    if (!doc.exists) {
      throw new Error("Movimiento no encontrado");
    }
    
    const movimiento = doc.data();
    
    // Guardamos la información para el historial
    const tipoOperacion = movimiento.tipoOperacion;
    const monto = movimiento.debito > 0 ? movimiento.debito : movimiento.credito;
    
    // Obtener el cliente para posibles actualizaciones
    const clienteId = movimiento.clienteId;
    
    // Determinamos el impacto del movimiento en el saldo
    // Si se elimina un débito, el saldo aumenta en el monto del débito
    // Si se elimina un crédito, el saldo disminuye en el monto del crédito
    
    // Eliminamos el movimiento
    await db.collection(coleccion).doc(id).delete();
    
    // Registrar en historial
    await registrarHistorial(
      coleccion,
      "eliminar",
      id,
      `Eliminación de movimiento de ${tipoOperacion} por ${monto} ${tipo === "pesos" ? "ARS" : "USD"}`
    );
    
    // Recargar la tabla - los saldos se recalcularán al cargar los datos
    if (tipo === "pesos") {
      cargarCuentaCorrientePesos();
    } else {
      cargarCuentaCorrienteDolares();
    }
    
    Swal.fire({
      icon: "success",
      title: "Éxito",
      text: "Movimiento eliminado correctamente"
    });
    
  } catch (error) {
    console.error("Error al eliminar movimiento:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo eliminar el movimiento: " + error.message
    });
  }
}

// Función para ver/editar detalles de transferencia
async function verDetallesTransferencia(id) {
  try {
    const doc = await db.collection("transferencias").doc(id).get();
    if (!doc.exists) {
      Swal.fire("Error", "Transferencia no encontrada", "error");
      return;
    }

    const t = doc.data();
    const fecha = t.fecha ? new Date(t.fecha).toLocaleDateString("es-AR") : "-";
    
    // Crear HTML para los detalles
    const html = `
      <div style="text-align: left; margin: 15px 0;">
        <p><strong>Fecha:</strong> ${fecha}</p>
        <p><strong>Transacción:</strong> ${t.transaccion || "Sin número"}</p>
        <p><strong>Cliente:</strong> ${t.cliente}</p>
        <p><strong>Operador:</strong> ${t.operador}</p>
        <p><strong>Destinatario:</strong> ${t.destinatario}</p>
        <p><strong>Monto ARS:</strong> $${t.monto.toLocaleString("es-AR")}</p>
        <p><strong>TC BsAs:</strong> ${t.tc_usd_bsas.toLocaleString("es-AR")}</p>
        <p><strong>TC Salta:</strong> ${t.tc_usd_salta.toLocaleString("es-AR")}</p>
        <p><strong>DIF TC:</strong> ${t.dif_tc.toLocaleString("es-AR")}</p>
        <p><strong>Comisión ARS:</strong> $${t.comision_ars.toLocaleString("es-AR")}</p>
        <p><strong>Comisión USD:</strong> U$D ${t.comision_usd.toLocaleString("es-AR")}</p>
        <p><strong>Monto Neto:</strong> $${t.monto_neto.toLocaleString("es-AR")}</p>
        <p><strong>Cambio USD:</strong> U$D ${t.cambio_usd.toLocaleString("es-AR")}</p>
        <p><strong>Tipo de transacción:</strong> ${t.tipo_transaccion || "envio"}</p>
        <p><strong>Estado actual:</strong> ${t.recepcionada || "Pendiente"}</p>
        <p><strong>Comentario:</strong> ${t.comentario || "-"}</p>
        
        <div class="form-group" style="margin-top: 20px;">
          <label for="swal-estado" style="font-weight: bold;">Cambiar Estado:</label>
          <select id="swal-estado" class="swal2-input">
            <option value="Pendiente" ${t.recepcionada === "Pendiente" ? "selected" : ""}>Pendiente</option>
            <option value="OK" ${t.recepcionada === "OK" ? "selected" : ""}>OK</option>
            <option value="Cancelada" ${t.recepcionada === "Cancelada" ? "selected" : ""}>Cancelada</option>
          </select>
        </div>
      </div>
    `;

    const result = await Swal.fire({
      title: `Transferencia - ${t.transaccion || "Sin número"}`,
      html: html,
      width: "600px",
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: "Guardar Cambios",
      denyButtonText: "Editar Completo",
      cancelButtonText: "Cerrar",
      focusConfirm: false,
      preConfirm: () => {
        return {
          estado: document.getElementById("swal-estado").value
        };
      }
    });

    if (result.isConfirmed) {
      const nuevoEstado = result.value.estado;
      const estadoAnterior = t.recepcionada || "Pendiente";
      
      // Si el estado cambió, actualizar en la base de datos
      if (nuevoEstado !== estadoAnterior) {
        await db.collection("transferencias").doc(id).update({
          recepcionada: nuevoEstado
        });
        
        // Si el estado ahora es "OK", necesitamos registrar en cuenta corriente
        if (nuevoEstado === "OK" && estadoAnterior !== "OK") {
          try {
            // Obtener nombres de cliente y operador para los registros
            const clienteId = t.cliente_id;
            const operadorId = t.operador_id;
            
            if (clienteId && operadorId) {
              const clienteDoc = await db.collection("clientes").doc(clienteId).get();
              const operadorDoc = await db.collection("operadores").doc(operadorId).get();
              
              const clienteNombre = clienteDoc.exists ? clienteDoc.data().nombre : "Cliente desconocido";
              const operadorNombre = operadorDoc.exists ? operadorDoc.data().nombre : "Operador desconocido";
              
              // 1. Registrar débito al operador (lo que debe entregar en USD)
              await agregarMovimientoCuentaCorriente({
                clienteId: operadorId,
                clienteNombre: operadorNombre,
                moneda: "USD",
                fecha: t.fecha,
                tipoOperacion: "CAMBIO USD POR TRANSFERENCIA",
                debito: t.cambio_usd,
                credito: 0,
                concepto: `Cambio USD por transferencia ${t.transaccion || id.substring(0, 8)}`
              });
              
              // 2. Registrar crédito al cliente (lo que recibe en USD)
              await agregarMovimientoCuentaCorriente({
                clienteId: clienteId,
                clienteNombre: clienteNombre,
                moneda: "USD",
                fecha: t.fecha,
                tipoOperacion: "CAMBIO USD POR TRANSFERENCIA",
                debito: 0,
                credito: t.cambio_usd,
                concepto: `Cambio USD por transferencia ${t.transaccion || id.substring(0, 8)}`
              });
              
              // Registrar en historial
              await registrarHistorial(
                "transferencias", 
                "editar", 
                id, 
                { 
                  estado_anterior: estadoAnterior, 
                  estado_nuevo: nuevoEstado,
                  cuenta_corriente: "Registrado movimiento en cuenta corriente"
                }
              );
            } else {
              console.warn("No se pudo registrar en cuenta corriente: falta ID de cliente u operador");
            }
          } catch (error) {
            console.error("Error al registrar en cuenta corriente:", error);
            // Mostrar advertencia pero no bloquear flujo
    Swal.fire({
              icon: "warning",
              title: "Advertencia",
              text: "La transferencia se marcó como completada pero hubo un error al registrar en cuenta corriente.",
              toast: true,
              position: "top-end",
              showConfirmButton: false,
              timer: 5000
            });
          }
        } else {
          // Si cambió a otro estado, registrar en historial
          await registrarHistorial(
            "transferencias", 
            "editar", 
            id, 
            { 
              estado_anterior: estadoAnterior, 
              estado_nuevo: nuevoEstado 
            }
          );
        }
        
        // Recargar datos
        cargarTransferencias();
        
        Swal.fire(
          "¡Actualizado!",
          `Estado actualizado a: ${nuevoEstado}`,
          "success"
        );
      }
    } else if (result.isDenied) {
      // Lógica para edición completa de la transferencia
      editarTransferenciaCompleta(id, t);
    }
  } catch (error) {
    console.error("Error al obtener detalles:", error);
    Swal.fire("Error", "No se pudieron cargar los detalles", "error");
  }
}

// Función para editar completamente una transferencia
async function editarTransferenciaCompleta(id, datos) {
  try {
    const result = await Swal.fire({
      title: 'Editar Transferencia',
      html: `
        <div class="form-group">
          <label for="swal-fecha">Fecha</label>
          <input type="date" id="swal-fecha" class="swal2-input" value="${datos.fecha}" required>
        </div>
        <div class="form-group">
          <label for="swal-transaccion">Número de transacción</label>
          <input type="text" id="swal-transaccion" class="swal2-input" value="${datos.transaccion || ''}">
        </div>
        <div class="form-group">
          <label for="swal-destinatario">Destinatario</label>
          <input type="text" id="swal-destinatario" class="swal2-input" value="${datos.destinatario}" required>
        </div>
        <div class="form-group">
          <label for="swal-monto">Monto ARS</label>
          <input type="text" id="swal-monto" class="swal2-input" value="${datos.monto}" pattern="[0-9]+(\.[0-9]{0,2})?" inputmode="decimal" required>
        </div>
        <div class="form-group">
          <label for="swal-tc-bsas">TC USD BsAs</label>
          <input type="text" id="swal-tc-bsas" class="swal2-input" value="${datos.tc_usd_bsas}" pattern="[0-9]+(\.[0-9]{0,2})?" inputmode="decimal" required>
        </div>
        <div class="form-group">
          <label for="swal-tc-salta">TC USD Salta</label>
          <input type="text" id="swal-tc-salta" class="swal2-input" value="${datos.tc_usd_salta}" pattern="[0-9]+(\.[0-9]{0,2})?" inputmode="decimal" required>
        </div>
        <div class="form-group">
          <label for="swal-comision-usd">Comisión USD</label>
          <input type="text" id="swal-comision-usd" class="swal2-input" value="${datos.comision_usd || (datos.comision / datos.tc_usd_salta).toFixed(2)}" pattern="[0-9]+(\.[0-9]{0,2})?" inputmode="decimal" required>
        </div>
        <div class="form-group">
          <label for="swal-tipo">Tipo de Transacción</label>
          <select id="swal-tipo" class="swal2-input">
            <option value="envio" ${datos.tipo_transaccion === 'envio' ? 'selected' : ''}>Envío</option>
            <option value="recibo" ${datos.tipo_transaccion === 'recibo' ? 'selected' : ''}>Recibo</option>
          </select>
        </div>
        <div class="form-group">
          <label for="swal-estado">Estado</label>
          <select id="swal-estado" class="swal2-input">
            <option value="Pendiente" ${datos.recepcionada === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
            <option value="OK" ${datos.recepcionada === 'OK' ? 'selected' : ''}>OK</option>
            <option value="Cancelada" ${datos.recepcionada === 'Cancelada' ? 'selected' : ''}>Cancelada</option>
          </select>
        </div>
        <div class="form-group">
          <label for="swal-comentario">Comentario</label>
          <input type="text" id="swal-comentario" class="swal2-input" value="${datos.comentario || ''}">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        // Validar campos obligatorios y convertir a números
        const montoStr = document.getElementById('swal-monto').value.replace(/,/g, '.');
        const tcBsAsStr = document.getElementById('swal-tc-bsas').value.replace(/,/g, '.');
        const tcSaltaStr = document.getElementById('swal-tc-salta').value.replace(/,/g, '.');
        const comisionUsdStr = document.getElementById('swal-comision-usd').value.replace(/,/g, '.');
        
        const monto = parseFloat(montoStr);
        const tcBsAs = parseFloat(tcBsAsStr);
        const tcSalta = parseFloat(tcSaltaStr);
        const comisionUsd = parseFloat(comisionUsdStr);
        
        if (!document.getElementById('swal-fecha').value || 
            !document.getElementById('swal-destinatario').value || 
            isNaN(monto) || isNaN(tcBsAs) || isNaN(tcSalta) || isNaN(comisionUsd)) {
          Swal.showValidationMessage('Por favor completa todos los campos requeridos');
          return false;
        }
        
        // Recalcular valores
        const difTc = tcSalta - tcBsAs;
        const comisionArs = comisionUsd * tcSalta;
        const montoNeto = monto - comisionArs;
        const cambioUsd = montoNeto / tcSalta;
        
        return {
          fecha: document.getElementById('swal-fecha').value,
          transaccion: document.getElementById('swal-transaccion').value,
          destinatario: document.getElementById('swal-destinatario').value,
          monto: monto,
          tc_usd_bsas: tcBsAs,
          tc_usd_salta: tcSalta,
          comision: comisionArs,           // Para compatibilidad con código existente
          comision_ars: comisionArs,
          comision_usd: comisionUsd,
          dif_tc: difTc,
          monto_neto: montoNeto,
          cambio_usd: cambioUsd,
          tipo_transaccion: document.getElementById('swal-tipo').value,
          recepcionada: document.getElementById('swal-estado').value,
          comentario: document.getElementById('swal-comentario').value
        };
      }
    });
    
    if (result.isConfirmed) {
      const nuevaData = result.value;
      const estadoAnterior = datos.recepcionada || "Pendiente";
      const estadoNuevo = nuevaData.recepcionada;
      
      // Actualizar la transferencia
      await db.collection('transferencias').doc(id).update({
        ...nuevaData,
        timestamp: new Date() // Actualizar timestamp
      });
      
      // Si el estado ahora es "OK" y antes no lo era, crear entradas en cuenta corriente
      if (estadoNuevo === "OK" && estadoAnterior !== "OK") {
        try {
          // Obtener nombres de cliente y operador para los registros
          const clienteId = datos.cliente_id;
          const operadorId = datos.operador_id;
          
          if (clienteId && operadorId) {
            const clienteDoc = await db.collection("clientes").doc(clienteId).get();
            const operadorDoc = await db.collection("operadores").doc(operadorId).get();
            
            const clienteNombre = clienteDoc.exists ? clienteDoc.data().nombre : "Cliente desconocido";
            const operadorNombre = operadorDoc.exists ? operadorDoc.data().nombre : "Operador desconocido";
            
            // 1. Registrar débito al operador (lo que debe entregar en USD)
            await agregarMovimientoCuentaCorriente({
              clienteId: operadorId,
              clienteNombre: operadorNombre,
              moneda: "USD",
              fecha: nuevaData.fecha,
              tipoOperacion: "CAMBIO USD POR TRANSFERENCIA",
              debito: nuevaData.cambio_usd,
              credito: 0,
              concepto: `Cambio USD por transferencia ${nuevaData.transaccion || id.substring(0, 8)}`
            });
            
            // 2. Registrar crédito al cliente (lo que recibe en USD)
            await agregarMovimientoCuentaCorriente({
              clienteId: clienteId,
              clienteNombre: clienteNombre,
              moneda: "USD",
              fecha: nuevaData.fecha,
              tipoOperacion: "CAMBIO USD POR TRANSFERENCIA",
              debito: 0,
              credito: nuevaData.cambio_usd,
              concepto: `Cambio USD por transferencia ${nuevaData.transaccion || id.substring(0, 8)}`
            });
          }
        } catch (error) {
          console.error("Error al registrar en cuenta corriente:", error);
        }
      }
      
      // Registrar en historial
      await registrarHistorial(
        "transferencias", 
        "editar", 
        id, 
        { 
          datos_anteriores: datos,
          datos_nuevos: nuevaData
        }
      );
      
      // Recargar datos
      cargarTransferencias();
      
      Swal.fire({
        icon: 'success',
        title: '¡Transferencia actualizada!',
        text: 'Los datos han sido actualizados correctamente.'
      });
    }
  } catch (error) {
    console.error('Error al editar transferencia:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo actualizar la transferencia: ' + error.message
    });
  }
}

// Función para renderizar tabla de cables paginada
function renderizarTablaCables(datos) {
  const tbody = document.getElementById("tablaCables");
  tbody.innerHTML = "";

  if (datos.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" style="text-align: center;">No hay registros</td></tr>';
    return;
  }

  datos.forEach((d) => {
    const fecha = d.fecha ? new Date(d.fecha).toLocaleDateString("es-AR") : "-";
    const estado = d.estado || "Pendiente";
    const tipoCable = d.tipo_cable === "bajada" ? "Bajada" : "Subida";
    
    // Add null checks for numeric values
    const montoUsd = d.monto_usd !== undefined && d.monto_usd !== null ? 
      d.monto_usd.toFixed(2) : "0.00";
    const comisionPorc = d.comision_porc !== undefined && d.comision_porc !== null ? 
      d.comision_porc.toFixed(2) : "0.00";
    const comisionUsd = d.comision_usd !== undefined && d.comision_usd !== null ? 
      d.comision_usd.toFixed(2) : "0.00";
    
    tbody.innerHTML += `
    <tr>
      <td>${fecha}</td>
      <td>${d.cliente || "-"}</td>
      <td>${tipoCable}</td>
      <td>$${montoUsd}</td>
      <td>${comisionPorc}%</td>
      <td>$${comisionUsd}</td>
      <td><span class="estado-${estado.toLowerCase()}">${estado}</span></td>
      <td>
        <button class="btn-editar" onclick="verDetallesCable('${
          d.id
        }')">Ver</button>
        <button onclick="eliminarRegistro('cables', '${
          d.id
        }', cargarCables)">Eliminar</button>
      </td>
    </tr>`;
  });
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
    const tipoCable = c.tipo_cable === "bajada" ? "Bajada" : "Subida";
    
    // Add null checks for numeric values
    const montoUsd = c.monto_usd !== undefined && c.monto_usd !== null ? 
      c.monto_usd.toFixed(2) : "0.00";
    const comisionPorc = c.comision_porc !== undefined && c.comision_porc !== null ? 
      c.comision_porc.toFixed(2) : "0.00";
    const comisionUsd = c.comision_usd !== undefined && c.comision_usd !== null ? 
      c.comision_usd.toFixed(2) : "0.00";

    const result = await Swal.fire({
      title: `Cable ${tipoCable} - ${c.cliente || ""}`,
      html: `
        <div style="text-align: left; margin: 15px 0;">
          <p><strong>Fecha:</strong> ${fecha}</p>
          <p><strong>Cliente:</strong> ${c.cliente || "-"}</p>
          <p><strong>Tipo:</strong> ${tipoCable}</p>
          <p><strong>Transacción:</strong> ${c.transaccion || "-"}</p>
          <p><strong>Monto USD:</strong> $${montoUsd}</p>
          <p><strong>Comisión %:</strong> ${comisionPorc}%</p>
          <p><strong>Comisión USD:</strong> $${comisionUsd}</p>
          <p><strong>Estado actual:</strong> ${c.estado || "Pendiente"}</p>
          <p><strong>Notas:</strong> ${c.notas || "-"}</p>
          
          <div class="form-group" style="margin-top: 20px;">
            <label for="swal-tipo" style="font-weight: bold;">Tipo de Cable:</label>
            <select id="swal-tipo" class="swal2-input">
              <option value="subida" ${c.tipo_cable === "subida" ? "selected" : ""}>Subida</option>
              <option value="bajada" ${c.tipo_cable === "bajada" ? "selected" : ""}>Bajada</option>
            </select>
          </div>
          <div class="form-group">
            <label for="swal-estado" style="font-weight: bold;">Cambiar Estado:</label>
            <select id="swal-estado" class="swal2-input">
              <option value="Pendiente" ${c.estado === "Pendiente" ? "selected" : ""}>Pendiente</option>
              <option value="OK" ${c.estado === "OK" ? "selected" : ""}>OK</option>
              <option value="Cancelado" ${c.estado === "Cancelado" ? "selected" : ""}>Cancelado</option>
            </select>
          </div>
          <div class="form-group">
            <label for="swal-notas" style="font-weight: bold;">Notas:</label>
            <textarea id="swal-notas" class="swal2-textarea" style="width: 100%;">${c.notas || ""}</textarea>
            <small style="display: block; margin-top: 5px;">Las notas se actualizarán automáticamente según el estado, a menos que las personalices.</small>
          </div>
        </div>
      `,
      width: "600px",
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: "Guardar Cambios",
      denyButtonText: "Editar Completo",
      cancelButtonText: "Cerrar",
      focusConfirm: false,
      preConfirm: () => {
        return {
          tipo_cable: document.getElementById("swal-tipo").value,
          estado: document.getElementById("swal-estado").value,
          notas: document.getElementById("swal-notas").value
        };
      }
    });

    if (result.isConfirmed) {
      const nuevoTipo = result.value.tipo_cable;
      const nuevoEstado = result.value.estado;
      const nuevasNotas = result.value.notas;
      const tipoAnterior = c.tipo_cable || "subida";
      const estadoAnterior = c.estado || "Pendiente";
      
      // Generar nota automática si no se personalizó
      let notasActualizadas = nuevasNotas;
      
      // Si las notas están vacías o son iguales a las notas automáticas anteriores, generar nuevas
      if (!nuevasNotas || nuevasNotas === generarNotaAutomatica(tipoAnterior, estadoAnterior)) {
        notasActualizadas = generarNotaAutomatica(nuevoTipo, nuevoEstado);
      }
      
      // Si hubo cambios, actualizar en la base de datos
      if (nuevoTipo !== tipoAnterior || nuevoEstado !== estadoAnterior || notasActualizadas !== (c.notas || "")) {
        await db.collection("cables").doc(id).update({
          tipo_cable: nuevoTipo,
          estado: nuevoEstado,
          notas: notasActualizadas
        });
        
        // Registrar en historial
        await registrarHistorial(
          "cables", 
          "editar", 
          id, 
          { 
            tipo_anterior: tipoAnterior,
            tipo_nuevo: nuevoTipo,
            estado_anterior: estadoAnterior, 
            estado_nuevo: nuevoEstado,
            notas_actualizadas: notasActualizadas !== (c.notas || "")
          }
        );
        
        // Recargar datos
        cargarCables();
        
        Swal.fire(
          "¡Actualizado!",
          `Información de cable actualizada`,
          "success"
        );
      }
    } else if (result.isDenied) {
      // Lógica para edición completa
      editarCableCompleto(id, c);
    }
  } catch (error) {
    console.error("Error al obtener detalles:", error);
    Swal.fire("Error", "No se pudieron cargar los detalles", "error");
  }
}

// Función para generar nota automática según el tipo de cable y estado
function generarNotaAutomatica(tipoCable, estado) {
  if (tipoCable === "subida") {
    if (estado === "Pendiente") {
      return "Cable de subida pendiente de procesamiento.";
    } else if (estado === "OK") {
      return "Cable de subida procesado correctamente.";
    } else if (estado === "Cancelado") {
      return "Cable de subida cancelado.";
    }
  } else if (tipoCable === "bajada") {
    if (estado === "Pendiente") {
      return "Cable de bajada pendiente de recepción.";
    } else if (estado === "OK") {
      return "Cable de bajada recibido correctamente.";
    } else if (estado === "Cancelado") {
      return "Cable de bajada cancelado.";
    }
  }
  return "";
}

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

    // Calcular comisión en USD (puede ser positiva o negativa)
    const comisionUsd = (montoUsd * comisionPorc) / 100;

    // Mostrar en la interfaz (con signo)
    if (comisionUsd >= 0) {
      comisionUsdResult.textContent = comisionUsd.toFixed(2);
      comisionUsdResult.classList.remove("negativo");
    } else {
      comisionUsdResult.textContent = `${Math.abs(comisionUsd).toFixed(2)} (negativo)`;
      comisionUsdResult.classList.add("negativo");
    }

    // Establecer en el campo oculto
    comisionUsdInput.value = comisionUsd;
  };

  // Configurar eventos para actualizar cálculos cuando cambian los valores
  [montoUsdInput, comisionPorcInput].forEach((input) => {
    input.addEventListener("input", calcularComision);
  });
};

// Configurar cálculos automáticos para Descuento de Cheque
const setupDescuentoChequeCalculos = () => {
  const montoInput = document.getElementById("montoCheque");
  const tasaInput = document.getElementById("tasaCheque");
  const diasInput = document.getElementById("diasCheque");
  const comisionInput = document.getElementById("comisionCheque");
  const fechaTomaInput = document.getElementById("fechaTomaCheque");
  const fechaVencimientoInput = document.getElementById("fechaVencimientoCheque");

  // Elementos para mostrar resultados
  const interesResult = document.getElementById("interesResult");
  const montoDescontadoResult = document.getElementById("montoDescontadoResult");

  // Campos ocultos para guardar valores
  const interesCheque = document.getElementById("interesCheque");
  const montoDescontadoCheque = document.getElementById("montoDescontadoCheque");

  // Función para calcular días entre dos fechas
  const calcularDiasEntreFechas = () => {
    if (fechaTomaInput.value && fechaVencimientoInput.value) {
      const fechaToma = new Date(fechaTomaInput.value);
      const fechaVencimiento = new Date(fechaVencimientoInput.value);
      
      // Verificar que las fechas sean válidas
      if (!isNaN(fechaToma.getTime()) && !isNaN(fechaVencimiento.getTime())) {
        // Calcular la diferencia en milisegundos
        const diferenciaMs = fechaVencimiento - fechaToma;
        
        // Convertir a días y establecer en el campo
        const dias = Math.round(diferenciaMs / (1000 * 60 * 60 * 24));
        
        // Establecer el valor en el campo de días
        diasInput.value = dias;
        
        // Actualizar los cálculos con el nuevo valor de días
        calcularValores();
      }
    }
  };

  // Función para realizar los cálculos
  const calcularValores = () => {
    const monto = parseFloat(montoInput.value) || 0;
    const tasa = parseFloat(tasaInput.value) || 0;
    const dias = parseFloat(diasInput.value) || 0;
    const comision = parseFloat(comisionInput.value) || 0;

    // Calcular interés
    const interes = (monto * tasa * dias) / 36500; // 365 días x 100 (para el %)

    // Calcular monto descontado (lo que recibe el cliente)
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

  // Configurar eventos para fechas
  fechaTomaInput.addEventListener("change", calcularDiasEntreFechas);
  fechaVencimientoInput.addEventListener("change", calcularDiasEntreFechas);
  
  // Configurar eventos para otros campos
  [montoInput, tasaInput, diasInput, comisionInput].forEach((input) => {
    input.addEventListener("input", calcularValores);
  });
};

// Manejo del formulario
formDescuentoCheque.onsubmit = async (e) => {
  e.preventDefault();
  try {
    // Verificar campos obligatorios
    const campos = [
      "fechaCheque",
      "fechaTomaCheque",
      "fechaVencimientoCheque",
      "clienteCheque",
      "montoCheque",
      "tasaCheque",
      "diasCheque",
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
    const comision = parseFloat(getVal("comisionCheque"));
    const interes = parseFloat(getVal("interesCheque"));
    const montoDescontado = parseFloat(getVal("montoDescontadoCheque"));
    const clienteId = getVal("clienteCheque");
    
    // Obtener o generar número de transacción
    let numeroTransaccion = await generarNumeroTransaccion("descuento_cheque");

    // Crear objeto con datos
    const datosCheque = {
      fecha: getVal("fechaCheque"),
      fecha_toma: getVal("fechaTomaCheque"),
      fecha_vencimiento: getVal("fechaVencimientoCheque"),
      cliente: getVal("clienteCheque"),
      cliente_id: clienteId,
      transaccion: numeroTransaccion,
      monto: monto,
      tasa: tasa,
      dias: dias,
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
    await registrarHistorial("descuento_cheque", "crear", docRef.id, datosCheque);

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
        '<tr><td colspan="11" style="text-align: center;">No hay registros</td></tr>';
      return;
    }
    
    // Almacenar datos para paginación
    datosCompletos.descuento_cheque = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Actualizar estado de paginación
    estadoPaginacion.descuento_cheque.total = datosCompletos.descuento_cheque.length;
    estadoPaginacion.descuento_cheque.pagina = 1;

    // Renderizar la primera página
    actualizarTablaPaginada("descuento_cheque");
  } catch (error) {
    console.error("Error al cargar descuento de cheques:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error al cargar los datos: " + error.message,
    });
  }
}

// Función para renderizar tabla de descuento de cheques paginada
function renderizarTablaDescuentoCheque(datos) {
  const tbody = document.getElementById("tablaDescuentoCheque");
  tbody.innerHTML = "";

  if (datos.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="11" style="text-align: center;">No hay registros</td></tr>';
    return;
  }

  datos.forEach((d) => {
    const fecha = d.fecha ? new Date(d.fecha).toLocaleDateString("es-AR") : "-";
    const fechaToma = d.fecha_toma ? new Date(d.fecha_toma).toLocaleDateString("es-AR") : "-";
    const fechaVencimiento = d.fecha_vencimiento ? new Date(d.fecha_vencimiento).toLocaleDateString("es-AR") : "-";
    const estado = d.estado || "Pendiente";

    tbody.innerHTML += `
    <tr>
      <td>${fecha}</td>
      <td>${fechaToma}</td>
      <td>${fechaVencimiento}</td>
      <td>${d.cliente}</td>
      <td>$${d.monto.toLocaleString("es-AR")}</td>
      <td>${d.tasa.toFixed(2)}%</td>
      <td>${d.dias}</td>
      <td>$${d.interes.toLocaleString("es-AR")}</td>
      <td>$${d.monto_descontado.toLocaleString("es-AR")}</td>
      <td><span class="estado-${estado.toLowerCase()}">${estado}</span></td>
      <td>
        <button class="btn-editar" onclick="verDetallesDescuentoCheque('${d.id}')">Ver</button>
        <button onclick="eliminarRegistro('descuento_cheque', '${d.id}', cargarDescuentoCheque)">Eliminar</button>
      </td>
    </tr>`;
  });
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
    const fecha = c.fecha ? new Date(c.fecha).toLocaleDateString("es-AR") : "-";
    const fechaToma = c.fecha_toma ? new Date(c.fecha_toma).toLocaleDateString("es-AR") : "-";
    const fechaVencimiento = c.fecha_vencimiento ? new Date(c.fecha_vencimiento).toLocaleDateString("es-AR") : "-";

    const result = await Swal.fire({
      title: `Descuento de Cheque - ${c.cliente}`,
      html: `
        <div style="text-align: left; margin: 15px 0;">
          <p><strong>Fecha:</strong> ${fecha}</p>
          <p><strong>Fecha de Toma:</strong> ${fechaToma}</p>
          <p><strong>Fecha de Vencimiento:</strong> ${fechaVencimiento}</p>
          <p><strong>Cliente:</strong> ${c.cliente}</p>
          <p><strong>Transacción:</strong> ${c.transaccion || "-"}</p>
          <p><strong>Monto:</strong> $${c.monto.toLocaleString("es-AR")}</p>
          <p><strong>Tasa:</strong> ${c.tasa.toFixed(2)}%</p>
          <p><strong>Días:</strong> ${c.dias}</p>
          <p><strong>Comisión:</strong> $${c.comision.toLocaleString("es-AR")}</p>
          <p><strong>Interés:</strong> $${c.interes.toLocaleString("es-AR")}</p>
          <p><strong>Monto Descontado:</strong> $${c.monto_descontado.toLocaleString("es-AR")}</p>
          <p><strong>Estado actual:</strong> ${c.estado || "Pendiente"}</p>
          <p><strong>Observaciones:</strong> ${c.observaciones || "-"}</p>
          
          <div class="form-group" style="margin-top: 20px;">
            <label for="swal-estado" style="font-weight: bold;">Cambiar Estado:</label>
            <select id="swal-estado" class="swal2-input">
              <option value="Pendiente" ${c.estado === "Pendiente" ? "selected" : ""}>Pendiente</option>
              <option value="Cobrado" ${c.estado === "Cobrado" ? "selected" : ""}>Cobrado</option>
              <option value="Rechazado" ${c.estado === "Rechazado" ? "selected" : ""}>Rechazado</option>
            </select>
          </div>
          <div class="form-group">
            <label for="swal-observaciones" style="font-weight: bold;">Observaciones:</label>
            <textarea id="swal-observaciones" class="swal2-textarea" style="width: 100%;">${c.observaciones || ""}</textarea>
          </div>
        </div>
      `,
      width: "600px",
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: "Guardar Cambios",
      denyButtonText: "Editar Completo",
      cancelButtonText: "Cerrar",
      focusConfirm: false,
      preConfirm: () => {
        return {
          estado: document.getElementById("swal-estado").value,
          observaciones: document.getElementById("swal-observaciones").value
        };
      }
    });

    if (result.isConfirmed) {
      const nuevoEstado = result.value.estado;
      const nuevasObservaciones = result.value.observaciones;
      const estadoAnterior = c.estado || "Pendiente";
      
      // Si hubo cambios, actualizar en la base de datos
      if (nuevoEstado !== estadoAnterior || nuevasObservaciones !== (c.observaciones || "")) {
        await db.collection("descuento_cheque").doc(id).update({
          estado: nuevoEstado,
          observaciones: nuevasObservaciones
        });
        
        // Registrar en historial
        await registrarHistorial(
          "descuento_cheque", 
          "editar", 
          id, 
          { 
            estado_anterior: estadoAnterior, 
            estado_nuevo: nuevoEstado,
            observaciones_actualizadas: nuevasObservaciones !== (c.observaciones || "")
          }
        );
        
        // Recargar datos
        cargarDescuentoCheque();
        
        Swal.fire(
          "¡Actualizado!",
          `Información de descuento de cheque actualizada`,
          "success"
        );
      }
    } else if (result.isDenied) {
      // Lógica para edición completa
      editarDescuentoChequeCompleto(id, c);
    }
  } catch (error) {
    console.error("Error al obtener detalles:", error);
    Swal.fire("Error", "No se pudieron cargar los detalles", "error");
  }
}

// Función para editar completamente un descuento de cheque
async function editarDescuentoChequeCompleto(id, datos) {
  try {
    const result = await Swal.fire({
      title: 'Editar Descuento de Cheque',
      html: `
        <div class="form-group">
          <label for="swal-fecha">Fecha</label>
          <input type="date" id="swal-fecha" class="swal2-input" value="${datos.fecha}" required>
        </div>
        <div class="form-group">
          <label for="swal-fecha-toma">Fecha de Toma</label>
          <input type="date" id="swal-fecha-toma" class="swal2-input" value="${datos.fecha_toma}" required>
        </div>
        <div class="form-group">
          <label for="swal-fecha-vencimiento">Fecha de Vencimiento</label>
          <input type="date" id="swal-fecha-vencimiento" class="swal2-input" value="${datos.fecha_vencimiento}" required>
        </div>
        <div class="form-group">
          <label for="swal-transaccion">Número de transacción</label>
          <input type="text" id="swal-transaccion" class="swal2-input" value="${datos.transaccion || ''}">
        </div>
        <div class="form-group">
          <label for="swal-monto">Monto</label>
          <input type="number" id="swal-monto" class="swal2-input" value="${datos.monto}" step="any" required>
        </div>
        <div class="form-group">
          <label for="swal-tasa">Tasa %</label>
          <input type="number" id="swal-tasa" class="swal2-input" value="${datos.tasa}" step="any" required>
        </div>
        <div class="form-group">
          <label for="swal-dias">Días</label>
          <input type="number" id="swal-dias" class="swal2-input" value="${datos.dias}" required>
        </div>
        <div class="form-group">
          <label for="swal-comision">Comisión</label>
          <input type="number" id="swal-comision" class="swal2-input" value="${datos.comision}" step="any" required>
        </div>
        <div class="form-group">
          <label for="swal-interes">Interés</label>
          <input type="number" id="swal-interes" class="swal2-input" value="${datos.interes}" step="any" required>
        </div>
        <div class="form-group">
          <label for="swal-monto-descontado">Monto Descontado</label>
          <input type="number" id="swal-monto-descontado" class="swal2-input" value="${datos.monto_descontado}" step="any" required>
        </div>
        <div class="form-group">
          <label for="swal-estado">Estado</label>
          <select id="swal-estado" class="swal2-input">
            <option value="Pendiente" ${datos.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
            <option value="Cobrado" ${datos.estado === 'Cobrado' ? 'selected' : ''}>Cobrado</option>
            <option value="Rechazado" ${datos.estado === 'Rechazado' ? 'selected' : ''}>Rechazado</option>
          </select>
        </div>
        <div class="form-group">
          <label for="swal-observaciones">Observaciones</label>
          <textarea id="swal-observaciones" class="swal2-textarea" style="width: 100%;">${datos.observaciones || ''}</textarea>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        // Validar campos obligatorios
        const monto = parseFloat(document.getElementById('swal-monto').value);
        const tasa = parseFloat(document.getElementById('swal-tasa').value);
        const dias = parseInt(document.getElementById('swal-dias').value);
        const comision = parseFloat(document.getElementById('swal-comision').value);
        const interes = parseFloat(document.getElementById('swal-interes').value);
        const montoDescontado = parseFloat(document.getElementById('swal-monto-descontado').value);
        
        if (!document.getElementById('swal-fecha').value || 
            !document.getElementById('swal-fecha-toma').value || 
            !document.getElementById('swal-fecha-vencimiento').value || 
            isNaN(monto) || isNaN(tasa) || isNaN(dias) || 
            isNaN(comision) || isNaN(interes) || isNaN(montoDescontado)) {
          Swal.showValidationMessage('Por favor completa todos los campos requeridos');
          return false;
        }
        
        return {
          fecha: document.getElementById('swal-fecha').value,
          fecha_toma: document.getElementById('swal-fecha-toma').value,
          fecha_vencimiento: document.getElementById('swal-fecha-vencimiento').value,
          transaccion: document.getElementById('swal-transaccion').value,
          monto: monto,
          tasa: tasa,
          dias: dias,
          comision: comision,
          interes: interes,
          monto_descontado: montoDescontado,
          estado: document.getElementById('swal-estado').value,
          observaciones: document.getElementById('swal-observaciones').value,
        };
      }
    });
    
    if (result.isConfirmed) {
      const nuevaData = result.value;
      
      // Actualizar el descuento de cheque
      await db.collection('descuento_cheque').doc(id).update({
        ...nuevaData,
        timestamp: new Date() // Actualizar timestamp
      });
      
      // Registrar en historial
      await registrarHistorial(
        "descuento_cheque", 
        "editar", 
        id, 
        { 
          datos_anteriores: datos,
          datos_nuevos: nuevaData
        }
      );
      
      // Recargar datos
      cargarDescuentoCheque();
      
      Swal.fire({
        icon: 'success',
        title: '¡Descuento de cheque actualizado!',
        text: 'Los datos han sido actualizados correctamente.'
      });
    }
  } catch (error) {
    console.error('Error al editar descuento de cheque:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo actualizar el descuento de cheque: ' + error.message
    });
  }
}

/**
 * Carga los datos de las operaciones Cash to Cash y los muestra en la tabla correspondiente
 */
async function cargarCash() {
  try {
    const datos = await obtenerDatosConFiltro("cash_to_cash", null);
    renderizarTablaCash(datos);
    actualizarTablaPaginada("cash_to_cash", datos);
  } catch (error) {
    console.error("Error al cargar cash to cash:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudieron cargar los datos de Cash to Cash",
    });
  }
}

/**
 * Renderiza la tabla de Cash to Cash con los datos proporcionados
 * @param {Array} datos - Array con los datos de cash to cash
 */
function renderizarTablaCash(datos) {
  const tabla = document.getElementById("tablaCash");
  tabla.innerHTML = "";

  datos.forEach((cash) => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${formatearFecha(cash.fecha)}</td>
      <td>${cash.cliente}</td>
      <td>${formatearMonto(cash.montoUsd)} USD</td>
      <td>${cash.comisionPorc}%</td>
      <td>${formatearMonto(cash.comisionUsd)} USD</td>
      <td class="estado-${cash.estado.toLowerCase()}">${cash.estado}</td>
      <td>
        <button class="btn-action" onclick="verDetallesCash('${cash.id}')">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn-action" onclick="eliminarRegistro('cash_to_cash', '${cash.id}')">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    tabla.appendChild(fila);
  });
}

/**
 * Muestra los detalles de una operación Cash to Cash
 * @param {string} id - ID de la operación
 */
async function verDetallesCash(id) {
  try {
    const doc = await firebase.firestore().collection("cash_to_cash").doc(id).get();
    
    if (doc.exists) {
      const data = doc.data();
      
      Swal.fire({
        title: "Detalles de Cash to Cash",
        html: `
          <div class="detalles-container">
            <p><strong>Fecha:</strong> ${formatearFecha(data.fecha)}</p>
            <p><strong>Cliente:</strong> ${data.cliente}</p>
            <p><strong>Transacción:</strong> ${data.transaccion || "N/A"}</p>
            <p><strong>Monto USD:</strong> ${formatearMonto(data.montoUsd)} USD</p>
            <p><strong>Comisión %:</strong> ${data.comisionPorc}%</p>
            <p><strong>Comisión USD:</strong> ${formatearMonto(data.comisionUsd)} USD</p>
            <p><strong>Estado:</strong> ${data.estado}</p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Editar",
        cancelButtonText: "Cerrar",
      }).then((result) => {
        if (result.isConfirmed) {
          editarCash(id);
        }
      });
    } else {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se encontró la operación",
      });
    }
  } catch (error) {
    console.error("Error al obtener detalles:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error al cargar los detalles",
    });
  }
}

/**
 * Abre el formulario para editar una operación Cash to Cash
 * @param {string} id - ID de la operación
 */
async function editarCash(id) {
  try {
    const doc = await firebase.firestore().collection("cash_to_cash").doc(id).get();
    
    if (doc.exists) {
      const data = doc.data();
      
      // Cargar datos en el formulario
      document.getElementById("fechaCash").value = formatearFechaInput(data.fecha);
      document.getElementById("clienteCash").value = data.cliente;
      document.getElementById("transaccionCash").value = data.transaccion || "";
      document.getElementById("montoUsdCash").value = data.montoUsd;
      document.getElementById("comisionPorcCash").value = data.comisionPorc;
      document.getElementById("comisionUsdCash").value = data.comisionUsd;
      document.getElementById("estadoCash").value = data.estado;
      
      // Calcular comisión
      document.getElementById("comisionUsdCashResult").textContent = formatearMonto(data.comisionUsd);
      
      // Mostrar botón para actualizar
      const btnGuardar = document.querySelector("#formCash button[type='submit']");
      btnGuardar.textContent = "Actualizar";
      btnGuardar.dataset.id = id;
      
      // Mostrar módulo de Cash to Cash
      mostrarModulo("cash_to_cash");
      
      // Scroll al formulario
      document.getElementById("formCash").scrollIntoView({ behavior: "smooth" });
    }
  } catch (error) {
    console.error("Error al editar Cash to Cash:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo editar la operación",
    });
  }
}

/**
 * Carga los datos de operaciones de Ingreso de Pesos y los muestra en la tabla
 */
async function cargarIngresoPesos() {
  try {
    const datos = await obtenerDatosConFiltro("ingreso_pesos", null);
    
    // Almacenar todos los datos para paginación y exportación
    datosCompletos.ingreso_pesos = datos;
    
    // Actualizar estado de paginación
    estadoPaginacion.ingreso_pesos.total = datos.length;
    estadoPaginacion.ingreso_pesos.pagina = 1;
    
    // Renderizar la primera página
    actualizarTablaPaginada("ingreso_pesos");
  } catch (error) {
    console.error("Error al cargar ingreso de pesos:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudieron cargar los datos de Ingreso de Pesos",
    });
  }
}

/**
 * Renderiza la tabla de Ingreso de Pesos con los datos proporcionados
 * @param {Array} datos - Array con los datos de ingreso de pesos
 */
function renderizarTablaIngresoPesos(datos) {
  const tabla = document.getElementById("tablaIngresoPesos");
  tabla.innerHTML = "";

  if (datos.length === 0) {
    tabla.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay registros de ingreso de pesos</td></tr>';
    return;
  }

  datos.forEach((ingreso) => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${formatearFecha(ingreso.fecha)}</td>
      <td>${ingreso.cliente || "-"}</td>
      <td>${ingreso.operador || "-"}</td>
      <td>${formatearMonto(ingreso.montoArs)} ARS</td>
      <td>${ingreso.comisionPorc}%</td>
      <td>${formatearMonto(ingreso.comisionArs)} ARS</td>
      <td class="estado-${ingreso.estado.toLowerCase()}">${ingreso.estado}</td>
      <td>
        <button class="btn-action" onclick="verDetallesIngresoPesos('${ingreso.id}')">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn-action" onclick="eliminarRegistro('ingreso_pesos', '${ingreso.id}')">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    tabla.appendChild(fila);
  });
}

/**
 * Muestra los detalles de una operación de Ingreso de Pesos
 * @param {string} id - ID de la operación
 */
async function verDetallesIngresoPesos(id) {
  try {
    const doc = await firebase.firestore().collection("ingreso_pesos").doc(id).get();
    
    if (doc.exists) {
      const data = doc.data();
      
      Swal.fire({
        title: "Detalles de Ingreso de Pesos",
        html: `
          <div class="detalles-container">
            <p><strong>Fecha:</strong> ${formatearFecha(data.fecha)}</p>
            <p><strong>Cliente:</strong> ${data.cliente || "-"}</p>
            <p><strong>Operador:</strong> ${data.operador || "-"}</p>
            <p><strong>Transacción:</strong> ${data.transaccion || "N/A"}</p>
            <p><strong>Monto ARS:</strong> ${formatearMonto(data.montoArs)} ARS</p>
            <p><strong>Comisión %:</strong> ${data.comisionPorc}%</p>
            <p><strong>Comisión ARS:</strong> ${formatearMonto(data.comisionArs)} ARS</p>
            <p><strong>Estado:</strong> ${data.estado}</p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Editar",
        cancelButtonText: "Cerrar",
      }).then((result) => {
        if (result.isConfirmed) {
          editarIngresoPesos(id);
        }
      });
    } else {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se encontró la operación",
      });
    }
  } catch (error) {
    console.error("Error al obtener detalles:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error al cargar los detalles",
    });
  }
}

/**
 * Abre el formulario para editar una operación de Ingreso de Pesos
 * @param {string} id - ID de la operación
 */
async function editarIngresoPesos(id) {
  try {
    const doc = await firebase.firestore().collection("ingreso_pesos").doc(id).get();
    
    if (doc.exists) {
      const data = doc.data();
      
      // Cargar datos en el formulario
      document.getElementById("fechaIngreso").value = formatearFechaInput(data.fecha);
      document.getElementById("clienteIngreso").value = data.cliente || "";
      document.getElementById("operadorIngreso").value = data.operador || "";
      document.getElementById("transaccionIngreso").value = data.transaccion || "";
      document.getElementById("montoArsIngreso").value = data.montoArs;
      document.getElementById("comisionPorcIngreso").value = data.comisionPorc;
      document.getElementById("comisionArsIngreso").value = data.comisionArs;
      document.getElementById("estadoIngreso").value = data.estado;
      
      // Calcular comisión
      document.getElementById("comisionArsResult").textContent = formatearMonto(data.comisionArs);
      
      // Mostrar botón para actualizar
      const btnGuardar = document.querySelector("#formIngresoPesos button[type='submit']");
      btnGuardar.textContent = "Actualizar";
      btnGuardar.dataset.id = id;
      
      // Mostrar módulo de Ingreso de Pesos
      mostrarModulo("ingreso_pesos");
      
      // Scroll al formulario
      document.getElementById("formIngresoPesos").scrollIntoView({ behavior: "smooth" });
    }
  } catch (error) {
    console.error("Error al editar Ingreso de Pesos:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo editar la operación",
    });
  }
}

/**
 * Formatea una fecha para usarla en un input de tipo date
 * @param {Date|string} fecha - Fecha a formatear
 * @returns {string} Fecha formateada en formato YYYY-MM-DD
 */
function formatearFechaInput(fecha) {
  if (!fecha) return "";
  
  const date = fecha instanceof Date ? fecha : new Date(fecha);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  
  return `${year}-${month}-${day}`;
}

// Setup for Ingreso Pesos module calculations
const setupIngresoPesosCalculos = () => {
  const montoArsInput = document.getElementById("montoArsIngreso");
  const comisionPorcInput = document.getElementById("comisionPorcIngreso");
  const comisionArsInput = document.getElementById("comisionArsIngreso");
  const comisionArsResult = document.getElementById("comisionArsResult");

  // Function to calculate commission
  const calcularComision = () => {
    const montoArs = parseFloat(montoArsInput.value) || 0;
    const comisionPorc = parseFloat(comisionPorcInput.value) || 0;

    // Calculate commission in ARS
    const comisionArs = (montoArs * comisionPorc) / 100;

    // Display in the interface
    comisionArsResult.textContent = comisionArs.toFixed(2);

    // Set the hidden field
    comisionArsInput.value = comisionArs;
  };

  // Configure events to update calculations when values change
  [montoArsInput, comisionPorcInput].forEach((input) => {
    input.addEventListener("input", calcularComision);
  });
};

// Initialize calculations
setupIngresoPesosCalculos();

// Form handler for Ingreso Pesos
const formIngresoPesos = document.getElementById("formIngresoPesos");
formIngresoPesos.onsubmit = async (e) => {
  e.preventDefault();
  try {
    // Verify required fields
    const campos = [
      "fechaIngreso",
      "clienteIngreso",
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

    // Get form values
    const fecha = getVal("fechaIngreso");
    const cliente = getVal("clienteIngreso"); // Using client name directly as entered
    const operadorId = getVal("operadorIngreso");
    const transaccion = getVal("transaccionIngreso") || await generarNumeroTransaccion("ingreso_pesos");
    const montoArs = parseFloat(getVal("montoArsIngreso"));
    const comisionPorc = parseFloat(getVal("comisionPorcIngreso"));
    const comisionArs = parseFloat(getVal("comisionArsIngreso"));
    const estado = getVal("estadoIngreso");

    // Get operator name if available
    let operador = "";
    if (operadorId) {
      const operadorDoc = await db.collection("operadores").doc(operadorId).get();
      if (operadorDoc.exists) {
        operador = operadorDoc.data().nombre;
      }
    }

    // Create data object
    const datos = {
      fecha,
      cliente,
      operador,
      operador_id: operadorId,
      transaccion,
      montoArs,
      comisionPorc,
      comisionArs,
      estado,
      timestamp: new Date(),
    };

    // Save in Firestore
    await db.collection("ingreso_pesos").add(datos);

    // Register in history
    await registrarHistorial("ingreso_pesos", "crear", transaccion, datos);

    clearForm("formIngresoPesos");
    setupIngresoPesosCalculos();
    cargarIngresoPesos();

    Swal.fire({
      icon: "success",
      title: "Éxito",
      text: "Ingreso de pesos registrado correctamente",
    });
  } catch (error) {
    console.error("Error al guardar ingreso de pesos:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo guardar el ingreso de pesos: " + error.message,
    });
  }
};

// Función para editar una transferencia
async function editarTransferencia(id) {
  try {
    const doc = await db.collection("transferencias").doc(id).get();
    if (!doc.exists) {
      Swal.fire("Error", "Transferencia no encontrada", "error");
      return;
    }

    const t = doc.data();
    editarTransferenciaCompleta(id, t);
  } catch (error) {
    console.error("Error al obtener datos para editar transferencia:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo obtener los datos de la transferencia: " + error.message,
    });
  }
}