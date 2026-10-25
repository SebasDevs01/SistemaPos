"""
pos_tools.py — Módulo para conectar Orion con el Sistema POS via Firebase REST API.
Consulta ventas del día, inventario, seguros escolares y alertas de stock.
"""

import requests
import datetime
from config import POS_PROJECT_ID

FIREBASE_BASE = f"https://firestore.googleapis.com/v1/projects/{POS_PROJECT_ID}/databases/(default)/documents"


def _get_collection(collection: str, limit: int = 50) -> list:
    """Obtiene documentos de una colección de Firestore."""
    url = f"{FIREBASE_BASE}/{collection}?pageSize={limit}"
    try:
        resp = requests.get(url, timeout=8)
        if resp.status_code == 200:
            docs = resp.json().get("documents", [])
            return docs
    except Exception:
        pass
    return []


def _extract_field(fields: dict, key: str):
    """Extrae el valor de un campo Firestore."""
    f = fields.get(key, {})
    for tipo in ["stringValue", "integerValue", "doubleValue", "booleanValue", "timestampValue"]:
        if tipo in f:
            val = f[tipo]
            if tipo in ["integerValue"]:
                return int(val)
            if tipo in ["doubleValue"]:
                return float(val)
            return val
    if "arrayValue" in f:
        items = f["arrayValue"].get("values", [])
        return [list(i.values())[0] if i else "" for i in items]
    if "mapValue" in f:
        return {k: _extract_field(v if isinstance(v, dict) else {}, "") for k, v in f["mapValue"].get("fields", {}).items()}
    return None


def consultar_ventas_hoy() -> str:
    """Consulta el total de ventas registradas hoy en el POS."""
    try:
        # En Firestore la colección oficial es "ventas" (fallback a "sales")
        docs = _get_collection("ventas", limit=200) or _get_collection("sales", limit=200)
        hoy = datetime.date.today().isoformat()
        total = 0.0
        count = 0
        for doc in docs:
            fields = doc.get("fields", {})
            fecha = _extract_field(fields, "fecha") or _extract_field(fields, "createdAt") or ""
            if hoy in str(fecha):
                monto = _extract_field(fields, "total") or _extract_field(fields, "totalFinal") or 0
                try:
                    total += float(monto)
                    count += 1
                except Exception:
                    pass
        if count == 0:
            return "No hay ventas registradas por el momento en el sistema para el día de hoy."
        return f"Hoy se han registrado {count} venta{'s' if count != 1 else ''} en el sistema, con un total acumulado de ${total:,.0f} pesos."
    except Exception as e:
        return f"No pude consultar las ventas: {str(e)}"


def consultar_inventario(termino: str = "") -> str:
    """Busca productos en el inventario del POS."""
    try:
        # En Firestore la colección oficial es "productos" (fallback a "products")
        docs = _get_collection("productos", limit=200) or _get_collection("products", limit=200)
        if not docs:
            return "No pude obtener el inventario en este momento."
        
        resultados = []
        for doc in docs:
            fields = doc.get("fields", {})
            nombre = _extract_field(fields, "nombre") or ""
            categoria = _extract_field(fields, "categoria") or ""
            precio = _extract_field(fields, "precio") or 0
            stock = _extract_field(fields, "stock") or 0
            activo = _extract_field(fields, "activo")
            if activo is False:
                continue
            if termino and termino.lower() not in nombre.lower() and termino.lower() not in categoria.lower():
                continue
            resultados.append((nombre, categoria, precio, stock))
        
        if not resultados:
            return f"No encontré productos que coincidan con '{termino}' en el inventario."
        
        if termino:
            items = [f"{n} ({c}) — Stock: {s}, Precio: ${p:,}" for n, c, p, s in resultados[:5]]
            return f"Encontré {len(resultados)} producto(s) relacionados con '{termino}': {'; '.join(items)}."
        else:
            total = len(resultados)
            bajos = [(n, s) for n, c, p, s in resultados if isinstance(s, (int, float)) and s <= 3]
            resp = f"El inventario cuenta con {total} productos activos."
            if bajos:
                bajos_str = ", ".join([f"{n} (stock: {s})" for n, s in bajos[:4]])
                resp += f" Hay {len(bajos)} productos con stock bajo o agotado: {bajos_str}."
            return resp
    except Exception as e:
        return f"Error al consultar el inventario: {str(e)}"


def consultar_seguros() -> str:
    """Consulta los seguros escolares registrados en el POS."""
    try:
        docs = _get_collection("seguros", limit=100)
        if not docs:
            return "No hay seguros escolares registrados en el sistema."
        
        total = len(docs)
        hoy = datetime.date.today().isoformat()
        hoy_count = 0
        total_hoy = 0.0
        
        for doc in docs:
            fields = doc.get("fields", {})
            fecha = _extract_field(fields, "fechaRegistro") or _extract_field(fields, "createdAt") or ""
            if hoy in str(fecha):
                hoy_count += 1
                precio = _extract_field(fields, "precio") or 0
                try:
                    total_hoy += float(precio)
                except Exception:
                    pass
        
        resp = f"Hay {total} seguro{'s' if total != 1 else ''} escolar{'es' if total != 1 else ''} registrado{'s' if total != 1 else ''} en el sistema."
        if hoy_count > 0:
            resp += f" Hoy se registraron {hoy_count}, totalizando ${total_hoy:,.0f} pesos."
        return resp
    except Exception as e:
        return f"Error al consultar seguros: {str(e)}"


def consultar_alertas_stock() -> str:
    """Verifica cuántos productos tienen stock bajo o agotado."""
    try:
        docs = _get_collection("productos", limit=200) or _get_collection("products", limit=200)
        agotados = []
        bajos = []
        for doc in docs:
            fields = doc.get("fields", {})
            nombre = _extract_field(fields, "nombre") or "Producto"
            stock = _extract_field(fields, "stock") or 0
            activo = _extract_field(fields, "activo")
            if activo is False:
                continue
            if isinstance(stock, (int, float)):
                if stock == 0:
                    agotados.append(nombre)
                elif stock <= 3:
                    bajos.append(f"{nombre} ({int(stock)})")
        
        if not agotados and not bajos:
            return "El inventario está en buen estado. No hay productos agotados ni con stock crítico."
        
        resp = ""
        if agotados:
            resp += f"{len(agotados)} producto(s) agotado(s): {', '.join(agotados[:5])}{'...' if len(agotados) > 5 else ''}. "
        if bajos:
            resp += f"{len(bajos)} producto(s) con stock bajo: {', '.join(bajos[:4])}{'...' if len(bajos) > 4 else ''}."
        return resp.strip()
    except Exception as e:
        return f"Error al revisar alertas de stock: {str(e)}"


def consultar_clientes_frecuentes(top: int = 5) -> str:
    """Obtiene los clientes más frecuentes según número de compras y gasto total."""
    try:
        docs = _get_collection("ventas", limit=500) or _get_collection("sales", limit=500)
        if not docs:
            return "No hay ventas registradas para calcular clientes frecuentes."

        from collections import defaultdict
        clientes: dict = defaultdict(lambda: {"compras": 0, "total": 0.0, "nombre": ""})

        for doc in docs:
            fields = doc.get("fields", {})
            cliente_field = fields.get("cliente", {})
            cliente_map = cliente_field.get("mapValue", {}).get("fields", {}) if "mapValue" in cliente_field else {}
            nombre = ""
            if cliente_map:
                nombre = _extract_field(cliente_map, "nombre") or _extract_field(cliente_map, "dni") or ""
            if not nombre:
                nombre = _extract_field(fields, "clienteNombre") or _extract_field(fields, "vendedor") or "Mostrador"

            nombre = str(nombre).strip()
            if not nombre or nombre.lower() in ("mostrador", "cliente mostrador", ""):
                continue

            total = _extract_field(fields, "total") or _extract_field(fields, "totalFinal") or 0
            try:
                total = float(total)
            except Exception:
                total = 0.0

            clientes[nombre]["compras"] += 1
            clientes[nombre]["total"] += total
            clientes[nombre]["nombre"] = nombre

        if not clientes:
            return "No se encontraron clientes frecuentes registrados en las ventas."

        top_n = int(top) if top else 5
        ordenados = sorted(clientes.values(), key=lambda c: c["compras"], reverse=True)[:top_n]
        items = [f"{c['nombre']} — {c['compras']} compra{'s' if c['compras'] != 1 else ''}, ${c['total']:,.0f} total" for c in ordenados]
        return f"Top {len(items)} cliente(s) más frecuentes: {'; '.join(items)}."
    except Exception as e:
        return f"Error consultando clientes frecuentes: {str(e)}"


def consultar_rentas_activas() -> str:
    """Consulta los alquileres de mobiliario activos o con saldo pendiente."""
    try:
        docs = _get_collection("alquileres", limit=100) or _get_collection("rentals", limit=100)
        if not docs:
            return "No hay registros de alquiler en el sistema."

        activos = []
        vencidos = []
        hoy = datetime.datetime.now()

        for doc in docs:
            fields = doc.get("fields", {})
            estado = _extract_field(fields, "estado") or ""
            if estado == "devuelto":
                continue

            cliente = _extract_field(fields, "clienteNombre") or "Cliente"
            item = _extract_field(fields, "item") or "Mobiliario"
            saldo = _extract_field(fields, "saldoPendiente") or 0
            fecha_inicio = _extract_field(fields, "fechaInicio") or ""
            duracion = _extract_field(fields, "duracionHoras") or 24

            try:
                saldo = float(saldo)
            except Exception:
                saldo = 0.0

            vencido = False
            if fecha_inicio:
                try:
                    fi = datetime.datetime.fromisoformat(fecha_inicio.replace("Z", "+00:00")).replace(tzinfo=None)
                    elapsed_h = (hoy - fi).total_seconds() / 3600
                    vencido = elapsed_h >= float(duracion)
                except Exception:
                    pass

            entrada = f"{cliente} ({item})" + (f", saldo pendiente: ${saldo:,.0f}" if saldo > 0 else "")
            if vencido:
                vencidos.append(entrada)
            else:
                activos.append(entrada)

        partes = []
        if activos:
            partes.append(f"{len(activos)} alquiler(es) activo(s): {'; '.join(activos[:4])}{'...' if len(activos) > 4 else ''}")
        if vencidos:
            partes.append(f"⚠️ {len(vencidos)} vencido(s) sin devolver: {'; '.join(vencidos[:3])}{'...' if len(vencidos) > 3 else ''}")
        if not partes:
            return "No hay alquileres activos en este momento."
        return ". ".join(partes) + "."
    except Exception as e:
        return f"Error consultando alquileres activos: {str(e)}"


def resumen_del_dia() -> str:
    """Genera un resumen ejecutivo del día: ventas, stock crítico, rentas y seguros."""
    try:
        ventas_str = consultar_ventas_hoy()
        stock_str = consultar_alertas_stock()
        rentas_str = consultar_rentas_activas()
        seguros_str = consultar_seguros()

        partes = [
            f"📊 VENTAS: {ventas_str}",
            f"📦 INVENTARIO: {stock_str}",
            f"🪑 ALQUILERES: {rentas_str}",
            f"🛡️ SEGUROS: {seguros_str}",
        ]
        return " | ".join(partes)
    except Exception as e:
        return f"Error generando resumen del día: {str(e)}"

