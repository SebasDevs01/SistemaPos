/**
 * Determina de forma infalible si un usuario es el Super Administrador "Sebastian"
 * Maneja acentos/tildes ("Sebastián" vs "Sebastian"), mayúsculas/minúsculas,
 * correo oficial o ID inicial.
 */
export function isUserSebastian(user) {
  if (!user) return false;
  const rawNombre = user.nombre || "";
  // Normalizar para remover tildes y caracteres diacríticos (ej. á -> a, é -> e)
  const nombreLimpio = rawNombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const correoLimpio = (user.correo || "").toLowerCase().trim();

  return (
    nombreLimpio.startsWith("sebastian") ||
    correoLimpio === "jhonsanabria407@gmail.com" ||
    user.id === 1 ||
    String(user.id) === "1"
  );
}
