// initialData.js - Configuración inicial y utilidades (productos cargados vía /products.json)

export const INITIAL_PRODUCTS = [];

export const INITIAL_CLIENTS = [
  {
    "legacyId": 1,
    "dni": "11",
    "nombre": "mostrador",
    "telefono": "1234",
    "direccion": "calle 59#39w24"
  },
  {
    "legacyId": 5,
    "dni": "12",
    "nombre": "Claudia",
    "telefono": "0",
    "direccion": "0"
  }
];

export const STORE_CONFIG = {
  nombre: "Miscelánea María José",
  nit: "151515",
  telefono: "3171166497",
  celularWhatsApp: "573171166497",
  direccion: "Calle 59# 39 w24",
  barrio: "Bucaramanga",
  ciudad: "Bucaramanga, Santander",
  mensajeTicket: "¡Gracias por su compra en Miscelánea María José!"
};

export const CATEGORIAS_VALIDAS = [
  "Todos",
  "Cuadernos",
  "Dulcería",
  "Chancletas",
  "Papelería",
  "Desechables",
  "Bebidas",
  "Ropa",
  "Juguetería",
  "Alquiler",
  "Cintas",
  "Cordones",
  "Bolsas de Regalo",
  "Bisutería",
  "Belleza y Cuidado Personal",
  "Seguros"
];

export const INITIAL_USERS = [
  { id: 1, nombre: "Sebastian Sanabria", correo: "jhonsanabria407@gmail.com", rol: "Administrador", pass: "1505" },
  { id: 4, nombre: "Fabio", correo: "Fabio", rol: "Administrador", pass: "5936" },
  { id: 6, nombre: "Vendedora Katherin", correo: "Katherin", rol: "Asistente", pass: "4444" },
  { id: 7, nombre: "Asistente Maria Jose", correo: "Maria Jose", rol: "Asistente", pass: "1243" }
];

export const getProductImage = (prod) => {
  if (prod?.imagenes && Array.isArray(prod.imagenes) && prod.imagenes.length > 0 && prod.imagenes[0]?.trim()) {
    return prod.imagenes[0];
  }
  if (prod?.imagen && prod.imagen.trim()) return prod.imagen;
  const cat = prod?.categoria || "Papelería";
  const name = (prod?.nombre || "").toLowerCase();

  if (name.includes("silla")) return "https://images.unsplash.com/photo-1503602642458-232111445657?w=400&auto=format&fit=crop&q=60";
  if (name.includes("mesa")) return "https://images.unsplash.com/photo-1577140917170-285929fb55b7?w=400&auto=format&fit=crop&q=60";
  if (name.includes("liso") || name.includes("tono") || name.includes("shampoo") || name.includes("tinte") || name.includes("cabello") || name.includes("crema") || name.includes("keratina")) {
    return "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&auto=format&fit=crop&q=60";
  }
  if (name.includes("cuaderno") || cat === "Cuadernos") return "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=60";
  if (name.includes("agua") || cat === "Bebidas" || name.includes("gaseosa") || name.includes("jugo") || name.includes("refresco")) {
    return "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&auto=format&fit=crop&q=60";
  }
  if (cat === "Dulcería" || name.includes("toxtaco") || name.includes("papa") || name.includes("dulce") || name.includes("chocolat") || name.includes("chicle") || name.includes("galleta") || name.includes("snack")) {
    return "https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=400&auto=format&fit=crop&q=60";
  }
  if (cat === "Chancletas" || name.includes("chancla") || name.includes("sandalia")) return "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400&auto=format&fit=crop&q=60";
  if (cat === "Desechables" || name.includes("vaso") || name.includes("plato") || name.includes("pitillo") || name.includes("icopor")) {
    return "https://images.unsplash.com/photo-1577705998148-6da4f3963bc8?w=400&auto=format&fit=crop&q=60";
  }
  if (cat === "Ropa" || name.includes("camisa") || name.includes("media") || name.includes("interior") || name.includes("boxer") || name.includes("cepillo de ropa")) {
    return "https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=400&auto=format&fit=crop&q=60";
  }
  if (cat === "Juguetería" || name.includes("bomba") || name.includes("juego") || name.includes("pelota") || name.includes("alcancia")) {
    return "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400&auto=format&fit=crop&q=60";
  }
  if (cat === "Cintas" || name.includes("cinta")) {
    return "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&auto=format&fit=crop&q=60";
  }
  if (cat === "Cordones" || name.includes("cordon") || name.includes("cordón") || name.includes("cordones")) {
    return "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&auto=format&fit=crop&q=60";
  }
  if (cat === "Bolsas de Regalo" || name.includes("bolsa")) {
    return "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&auto=format&fit=crop&q=60";
  }
  if (cat === "Bisutería" || name.includes("arete") || name.includes("collar") || name.includes("pulsera") || name.includes("anillo") || name.includes("cadena") || name.includes("manilla") || name.includes("topo") || name.includes("joya")) {
    return "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&auto=format&fit=crop&q=60";
  }
  if (cat === "Seguros" || name.includes("seguro") || name.includes("estudiantil") || name.includes("póliza") || name.includes("poliza")) {
    return "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&auto=format&fit=crop&q=60";
  }
  return "https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=400&auto=format&fit=crop&q=60";
};
