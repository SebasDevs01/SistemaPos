const fs = require('fs');
const path = require('path');

const sqlPath = path.resolve(__dirname, '../../sis_java.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

// Parse productos
const products = [];
const lines = sqlContent.split('\n');
let inProducts = false;

for (let line of lines) {
  if (line.includes('INSERT INTO `productos`')) {
    inProducts = true;
  }
  if (inProducts) {
    const match = line.match(/\((\d+),\s*'([^']*)',\s*'([^']*)',\s*(\d+),\s*(\d+),\s*([\d\.]+)\)/);
    if (match) {
      const id = parseInt(match[1]);
      const codigo = match[2];
      const nombre = match[3];
      const proveedor = parseInt(match[4]);
      const stock = parseInt(match[5]);
      const precio = parseFloat(match[6]);

      let categoria = "Papelería";
      const lower = nombre.toLowerCase();

      if (lower.includes("silla") || lower.includes("mesa") || lower.includes("alquiler")) {
        categoria = "Alquiler";
      } else if (lower.includes("cuaderno") || lower.includes("block") || lower.includes("cartilla") || lower.includes("libro")) {
        categoria = "Cuadernos";
      } else if (lower.includes("bomba") || lower.includes("juego") || lower.includes("didactico") || lower.includes("parques") || lower.includes("alcancia")) {
        categoria = "Juguetería";
      } else if (lower.includes("plato") || lower.includes("pitillo") || lower.includes("vaso") || lower.includes("desechable")) {
        categoria = "Desechables";
      } else if (lower.includes("chancla") || lower.includes("chancleta") || lower.includes("sandalia")) {
        categoria = "Chancletas";
      } else if (lower.includes("ropa") || lower.includes("media") || lower.includes("camisa") || lower.includes("cepillo de ropa")) {
        categoria = "Ropa";
      } else if (lower.includes("dulce") || lower.includes("papa") || lower.includes("galleta") || lower.includes("chocolate") || lower.includes("paleta")) {
        categoria = "Dulcería";
      }

      const hasPackage = categoria === "Cuadernos" || categoria === "Desechables" || categoria === "Dulcería";

      products.push({
        legacyId: id,
        codigo,
        nombre,
        proveedorId: proveedor,
        stock,
        precio,
        permitePaquete: hasPackage,
        unidadesPorPaquete: hasPackage ? 10 : 1,
        precioPaquete: hasPackage ? Math.round(precio * 10 * 0.9) : precio,
        categoria,
        unidadMedida: "unidad"
      });
    }
    if (line.trim().endsWith(';')) {
      inProducts = false;
    }
  }
}

// Parse clientes
const clients = [];
let inClients = false;
for (let line of lines) {
  if (line.includes('INSERT INTO `clientes`')) {
    inClients = true;
  }
  if (inClients) {
    const match = line.match(/\((\d+),\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)'\)/);
    if (match) {
      clients.push({
        legacyId: parseInt(match[1]),
        dni: match[2],
        nombre: match[3],
        telefono: match[4],
        direccion: match[5]
      });
    }
    if (line.trim().endsWith(';')) {
      inClients = false;
    }
  }
}

// Add sample items for categories that might be sparse
// Add some chancletas sample models
products.push({
  legacyId: 9001,
  codigo: "CH-001",
  nombre: "Chancletas Havaianas Classic Unisex",
  proveedorId: 1,
  stock: 24,
  precio: 18000,
  permitePaquete: false,
  categoria: "Chancletas",
  unidadMedida: "par",
  tallas: ["36", "37", "38", "39", "40", "41"],
  colores: ["Negro", "Azul", "Blanco"]
});

products.push({
  legacyId: 9002,
  codigo: "CH-002",
  nombre: "Chancletas Niña Diseño Estampado",
  proveedorId: 1,
  stock: 15,
  precio: 15000,
  permitePaquete: false,
  categoria: "Chancletas",
  unidadMedida: "par",
  tallas: ["28", "30", "32", "34"],
  colores: ["Rosado", "Lila"]
});

// Add some dulcería
products.push({
  legacyId: 9003,
  codigo: "DUL-001",
  nombre: "Papas Margarita Pollo 105g",
  proveedorId: 1,
  stock: 40,
  precio: 3500,
  permitePaquete: true,
  unidadesPorPaquete: 12,
  precioPaquete: 38000,
  categoria: "Dulcería",
  unidadMedida: "unidad"
});

products.push({
  legacyId: 9004,
  codigo: "DUL-002",
  nombre: "Chocolatina Jet Tradicional",
  proveedorId: 1,
  stock: 100,
  precio: 1000,
  permitePaquete: true,
  unidadesPorPaquete: 24,
  precioPaquete: 21000,
  categoria: "Dulcería",
  unidadMedida: "unidad"
});

const outDir = path.resolve(__dirname, '../src/data');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const content = `// Catálogo migrado de sis_java.sql + extensiones de categoría
export const INITIAL_PRODUCTS = ${JSON.stringify(products, null, 2)};

export const INITIAL_CLIENTS = ${JSON.stringify(clients, null, 2)};

export const STORE_CONFIG = {
  nombre: "Miscelánea María José",
  nit: "151515",
  telefono: "6442703",
  celularWhatsApp: "573138432479",
  direccion: "Colombia - Bucaramanga",
  mensajeTicket: "¡Gracias por su compra en Miscelánea María José!"
};

export const CATEGORIAS_VALIDAS = [
  "Todos",
  "Cuadernos",
  "Dulcería",
  "Chancletas",
  "Papelería",
  "Desechables",
  "Ropa",
  "Juguetería",
  "Alquiler"
];
`;

fs.writeFileSync(path.join(outDir, 'initialData.js'), content, 'utf8');
console.log(`Listo! Migrados ${products.length} productos y ${clients.length} clientes a initialData.js`);
