// Configuración general de Firestore
const db = firebase.firestore();

// Utilidad para obtener un valor del input
const getVal = (id) => document.getElementById(id).value;
const clearForm = (formId) => document.getElementById(formId).reset();

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
    // Cargar operadores en los selectores
    const selectores = ["operadorTrans", "operadorIngreso"];
    const operadores = await db
      .collection("operadores")
      .orderBy("nombre")
      .get();

    selectores.forEach((selector) => {
      const select = document.getElementById(selector);
      if (!select) return;

      // Conservar la opción seleccionada
      const valorSeleccionado = select.value;
      select.innerHTML = '<option value="">Seleccione Operador</option>';

      operadores.forEach((doc) => {
        const operador = doc.data();
        const option = document.createElement("option");
        option.value = operador.nombre;
        option.textContent = operador.nombre;
        select.appendChild(option);
      });

      // Restaurar valor seleccionado si existía
      if (valorSeleccionado) {
        select.value = valorSeleccionado;
      }
    });

    // Cargar clientes en los selectores
    const selectoresClientes = [
      "clienteTrans",
      "clienteCable",
      "clienteCash",
      "clienteIngreso",
      "clienteCheque",
    ];
    const clientes = await db.collection("clientes").orderBy("nombre").get();

    selectoresClientes.forEach((selector) => {
      const select = document.getElementById(selector);
      if (!select) return;

      // Conservar la opción seleccionada
      const valorSeleccionado = select.value;
      select.innerHTML = '<option value="">Seleccione Cliente</option>';

      clientes.forEach((doc) => {
        const cliente = doc.data();
        const option = document.createElement("option");
        option.value = cliente.nombre;
        option.textContent = cliente.nombre;
        select.appendChild(option);
      });

      // Restaurar valor seleccionado si existía
      if (valorSeleccionado) {
        select.value = valorSeleccionado;
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
          // Calcular el equivalente en USD de la comisión en ARS
          const comisionUsd = item.comision_ars / item.tc_usd_salta;
          return total + comisionUsd;
        }, 0),
        comisionArs: transferencias.reduce(
          (total, item) => total + item.comision_ars,
          0
        ),
      },
      {
        tipo: "Cables",
        cantidad: cables.length,
        comisionUsd: cables.reduce(
          (total, item) => total + item.comision_usd,
          0
        ),
        comisionArs: 0,
      },
      {
        tipo: "Cash to Cash",
        cantidad: cashToCash.length,
        comisionUsd: cashToCash.reduce(
          (total, item) => total + item.comision_usd,
          0
        ),
        comisionArs: 0,
      },
      {
        tipo: "Ingreso Pesos",
        cantidad: ingresoPesos.length,
        comisionUsd: 0,
        comisionArs: ingresoPesos.reduce(
          (total, item) => total + item.comision_ars,
          0
        ),
      },
      {
        tipo: "Descuento Cheque",
        cantidad: descuentoCheque.length,
        comisionUsd: 0,
        comisionArs: descuentoCheque.reduce(
          (total, item) => total + item.comision,
          0
        ),
      },
    ];

    // Calcular totales
    const totalUsd = resumen.reduce(
      (total, item) => total + item.comisionUsd,
      0
    );
    const totalArs = resumen.reduce(
      (total, item) => total + item.comisionArs,
      0
    );

    // Mostrar totales
    totalUsdElement.textContent = `$${totalUsd.toFixed(2)}`;
    totalArsElement.textContent = `$${totalArs.toLocaleString("es-AR")}`;

    // Mostrar resumen en la tabla
    tbody.innerHTML = "";

    if (resumen.every((item) => item.cantidad === 0)) {
      tbody.innerHTML =
        '<tr><td colspan="4" style="text-align: center;">No hay transacciones en el periodo seleccionado</td></tr>';
      return;
    }

    resumen.forEach((item) => {
      tbody.innerHTML += `
        <tr>
          <td>${item.tipo}</td>
          <td>${item.cantidad}</td>
          <td>$${item.comisionUsd.toFixed(2)}</td>
          <td>$${item.comisionArs.toLocaleString("es-AR")}</td>
        </tr>
      `;
    });

    // Agregar fila de totales
    tbody.innerHTML += `
      <tr class="total-row">
        <td><strong>TOTAL</strong></td>
        <td><strong>${resumen.reduce(
          (total, item) => total + item.cantidad,
          0
        )}</strong></td>
        <td><strong>$${totalUsd.toFixed(2)}</strong></td>
        <td><strong>$${totalArs.toLocaleString("es-AR")}</strong></td>
      </tr>
    `;
  } catch (error) {
    console.error("Error al cargar resumen:", error);
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">Error al cargar los datos: ${error.message}</td></tr>`;
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
  const snap = await db
    .collection(coleccion)
    .orderBy("timestamp", "desc")
    .get();
  const datos = [];

  snap.forEach((doc) => {
    const data = doc.data();
    // Si tenemos una fecha de documento válida en timestamp, filtrar por ella
    if (data.timestamp && data.timestamp instanceof Date) {
      if (data.timestamp >= fechaInicio) {
        datos.push(data);
      }
    } else if (data.fecha) {
      // Si no hay timestamp pero hay fecha en formato string, intentar usar esa
      const fechaDoc = new Date(data.fecha);
      if (!isNaN(fechaDoc.getTime()) && fechaDoc >= fechaInicio) {
        datos.push(data);
      }
    } else {
      // Si no hay forma de filtrar por fecha, incluir todos los datos
      datos.push(data);
    }
  });

  return datos;
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
    const comision = parseFloat(comisionInput.value) || 0;

    // Calcular valores
    // 1. Diferencia de tipo de cambio
    const difTc = tcSalta - tcBsAs;

    // 2. Monto neto (después de comisión)
    const montoNeto = monto - comision;

    // 3. Cambio a USD
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

    // Guardar en la base de datos
    await db.collection("transferencias").add({
      fecha: getVal("fechaTrans"),
      operador: getVal("operadorTrans"),
      cliente: getVal("clienteTrans"),
      destinatario: getVal("destinatarioTrans"),
      transaccion: getVal("transaccionTrans") || "",
      tc_usd_bsas: tcBsAs,
      tc_usd_salta: tcSalta,
      monto: monto,
      comision_ars: comision,
      monto_neto: montoNeto,
      dif_tc: difTc,
      cambio_usd: cambioUsd,
      recepcionada: getVal("recepcionadaTrans"),
      comentario: getVal("comentarioTrans") || "",
      timestamp: new Date(),
    });

    clearForm("formTransferencias");
    setupTransferenciasCalculos(); // Reiniciar cálculos
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
    const snap = await db
      .collection("transferencias")
      .orderBy("timestamp", "desc")
      .get();
    if (snap.empty) {
      tbody.innerHTML =
        '<tr><td colspan="9" style="text-align: center;">No hay registros</td></tr>';
      return;
    }

    snap.forEach((doc) => {
      const d = doc.data();
      const fecha = d.fecha
        ? new Date(d.fecha).toLocaleDateString("es-AR")
        : "-";
      tbody.innerHTML += `
      <tr>
        <td>${fecha}</td>
        <td>${d.cliente}</td>
        <td>$${d.monto.toLocaleString("es-AR")}</td>
        <td>$${d.cambio_usd.toFixed(2)}</td>
        <td>${d.tc_usd_salta.toLocaleString("es-AR")}</td>
        <td>$${d.comision_ars.toLocaleString("es-AR")}</td>
        <td>${d.dif_tc.toFixed(2)}</td>
        <td><span class="estado-${d.recepcionada.toLowerCase()}">${
        d.recepcionada
      }</span></td>
        <td>
          <button class="btn-editar" onclick="verDetallesTransferencia('${
            doc.id
          }')">Ver</button>
          <button onclick="eliminarRegistro('transferencias', '${
            doc.id
          }', cargarTransferencias)">Eliminar</button>
        </td>
      </tr>`;
    });
  } catch (error) {
    console.error("Error al cargar transferencias:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error al cargar los datos: " + error.message,
    });
  }
}

// Función para ver detalles de transferencia
async function verDetallesTransferencia(id) {
  try {
    const doc = await db.collection("transferencias").doc(id).get();
    if (!doc.exists) {
      Swal.fire("Error", "Transferencia no encontrada", "error");
      return;
    }

    const t = doc.data();
    const fecha = t.fecha ? new Date(t.fecha).toLocaleDateString("es-AR") : "-";

    Swal.fire({
      title: `Transferencia - ${t.cliente}`,
      html: `
        <div style="text-align: left; margin: 15px 0;">
          <p><strong>Fecha:</strong> ${fecha}</p>
          <p><strong>Operador:</strong> ${t.operador}</p>
          <p><strong>Destinatario:</strong> ${t.destinatario}</p>
          <p><strong>Monto ARS:</strong> $${t.monto.toLocaleString("es-AR")}</p>
          <p><strong>Comisión ARS:</strong> $${t.comision_ars.toLocaleString(
            "es-AR"
          )}</p>
          <p><strong>Monto Neto ARS:</strong> $${t.monto_neto.toLocaleString(
            "es-AR"
          )}</p>
          <p><strong>TC USD BsAs:</strong> ${t.tc_usd_bsas.toLocaleString(
            "es-AR"
          )}</p>
          <p><strong>TC USD Salta:</strong> ${t.tc_usd_salta.toLocaleString(
            "es-AR"
          )}</p>
          <p><strong>DIF TC:</strong> ${t.dif_tc.toFixed(2)}</p>
          <p><strong>Cambio a USD:</strong> $${t.cambio_usd.toFixed(2)}</p>
          <p><strong>Estado:</strong> ${t.recepcionada}</p>
          <p><strong>Transacción:</strong> ${t.transaccion || "-"}</p>
          <p><strong>Comentario:</strong> ${t.comentario || "-"}</p>
        </div>
      `,
      width: "600px",
    });
  } catch (error) {
    console.error("Error al obtener detalles:", error);
    Swal.fire("Error", "No se pudieron cargar los detalles", "error");
  }
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

    await db.collection("cash_to_cash").add({
      fecha: getVal("fechaCash"),
      cliente: getVal("clienteCash"),
      transaccion: getVal("transaccionCash"),
      monto_usd: montoUsd,
      comision_porc: comisionPorc,
      comision_usd: comisionUsd,
      estado: getVal("estadoCash"),
      timestamp: new Date(),
    });

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

    Swal.fire({
      title: `Cash to Cash - ${c.cliente}`,
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
      "clienteIngreso",
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

    const montoArs = parseFloat(getVal("montoArsIngreso"));
    const comisionPorc = parseFloat(getVal("comisionPorcIngreso"));
    const comisionArs = parseFloat(getVal("comisionArsIngreso"));

    await db.collection("ingreso_pesos").add({
      fecha: getVal("fechaIngreso"),
      cliente: getVal("clienteIngreso"),
      operador: getVal("operadorIngreso"),
      transaccion: getVal("transaccionIngreso"),
      monto_ars: montoArs,
      comision_porc: comisionPorc,
      comision_ars: comisionArs,
      estado: getVal("estadoIngreso"),
      timestamp: new Date(),
    });

    clearForm("formIngresoPesos");
    setupIngresoPesosCalculos(); // Reiniciar cálculos
    cargarIngresoPesos();

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
      tbody.innerHTML += `
      <tr>
        <td>${fecha}</td>
        <td>${d.cliente}</td>
        <td>${d.operador}</td>
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

    Swal.fire({
      title: `Ingreso Pesos - ${i.cliente}`,
      html: `
        <div style="text-align: left; margin: 15px 0;">
          <p><strong>Fecha:</strong> ${fecha}</p>
          <p><strong>Cliente:</strong> ${i.cliente}</p>
          <p><strong>Operador:</strong> ${i.operador}</p>
          <p><strong>Transacción:</strong> ${i.transaccion}</p>
          <p><strong>Monto ARS:</strong> $${i.monto_ars.toLocaleString(
            "es-AR"
          )}</p>
          <p><strong>Comisión %:</strong> ${i.comision_porc.toFixed(2)}%</p>
          <p><strong>Comisión ARS:</strong> $${i.comision_ars.toLocaleString(
            "es-AR"
          )}</p>
          <p><strong>Estado:</strong> ${i.estado || "Pendiente"}</p>
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
  const montoInput = document.getElementById("montoCheque");
  const tasaInput = document.getElementById("tasaCheque");
  const diasInput = document.getElementById("diasCheque");
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

  // Configurar eventos
  [montoInput, tasaInput, diasInput, comisionInput].forEach((input) => {
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
      "fechaCheque",
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

    // Guardar en Firestore
    await db.collection("descuento_cheque").add({
      fecha: getVal("fechaCheque"),
      cliente: getVal("clienteCheque"),
      monto: monto,
      tasa: tasa,
      dias: dias,
      comision: comision,
      interes: interes,
      monto_descontado: montoDescontado,
      estado: getVal("estadoCheque"),
      observaciones: getVal("observacionesCheque") || "",
      timestamp: new Date(),
    });

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
        '<tr><td colspan="9" style="text-align: center;">No hay registros</td></tr>';
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
    const fecha = c.fecha ? new Date(c.fecha).toLocaleDateString("es-AR") : "-";

    Swal.fire({
      title: `Descuento de Cheque - ${c.cliente}`,
      html: `
        <div style="text-align: left; margin: 15px 0;">
          <p><strong>Fecha:</strong> ${fecha}</p>
          <p><strong>Cliente:</strong> ${c.cliente}</p>
          <p><strong>Monto:</strong> $${c.monto.toLocaleString("es-AR")}</p>
          <p><strong>Tasa:</strong> ${c.tasa.toFixed(2)}%</p>
          <p><strong>Días:</strong> ${c.dias}</p>
          <p><strong>Comisión:</strong> $${c.comision.toLocaleString(
            "es-AR"
          )}</p>
          <p><strong>Interés:</strong> $${c.interes.toLocaleString("es-AR")}</p>
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
      await db.collection(coleccion).doc(id).delete();
      callback();
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
window.verDetallesCash = verDetallesCash;
window.verDetallesIngresoPesos = verDetallesIngresoPesos;
window.verDetallesDescuentoCheque = verDetallesDescuentoCheque;
