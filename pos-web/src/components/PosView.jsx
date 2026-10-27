import React, { useState, useRef, useEffect, useMemo } from "react";
import { 
  Search, 
  Barcode, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  DollarSign, 
  Printer, 
  CheckCircle2, 
  ShoppingBag, 
  Layers, 
  User, 
  Sparkles,
  AlertCircle,
  AlertTriangle,
  Image as ImageIcon,
  Eye,
  Edit2,
  Clock,
  Scissors,
  Gift,
  Lock,
  Footprints,
  Shirt,
  ShieldCheck,
  X,
  Armchair,
  Calendar,
  Zap,
  PauseCircle,
  PlayCircle
} from "lucide-react";
import confetti from "canvas-confetti";
import { getProductImage } from "../data/initialData";
import ProductDetailModal from "./ProductDetailModal";
import ProductEditModal from "./ProductEditModal";
import VariantSelectionModal from "./VariantSelectionModal";
import StudentInsuranceModal from "./StudentInsuranceModal";
import RentalOrderModal from "./RentalOrderModal";
import RentalTicketModal from "./RentalTicketModal";
import MathPriceInput from "./MathPriceInput";
import { getColombiaTimeInfo, isShiftOwner } from "../services/firestoreService";

// Singleton AudioContext — se crea una vez y se reutiliza (0ms latencia en escaneos)
let _audioCtx = null;
function getScanAudioCtx() {
  try {
    if (!_audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) _audioCtx = new AC();
    }
    if (_audioCtx && _audioCtx.state === "suspended") _audioCtx.resume();
  } catch (_) {}
  return _audioCtx;
}

export default function PosView({ 
  products, 
  clients, 
  onCompleteSale, 
  onPrintTicket,
  storeConfig,
  currentUser,
  onSaveProduct,
  onDeleteProduct,
  onSaveClient,
  activeShift,
  onOpenCashRegister,
  onSaveRental,
  rentals = [],
  insurances = []
}) {
  // Claves de almacenamiento para mantener el ticket de venta entre secciones
  const CART_STORAGE_KEY = "pos_active_cart";
  const CLIENT_STORAGE_KEY = "pos_active_client";

  // Carrito persistente: no se borra al cambiar de sección ni al recargar la página
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Error al cargar carrito persistente de POS:", e);
    }
    return [];
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  // Cliente asignado persistente
  const [selectedClient, setSelectedClient] = useState(() => {
    try {
      const savedClient = localStorage.getItem(CLIENT_STORAGE_KEY);
      if (savedClient) {
        const parsed = JSON.parse(savedClient);
        if (parsed && (parsed.dni || parsed.nombre)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Error al cargar cliente persistente de POS:", e);
    }
    return clients[0] || { nombre: "Cliente Mostrador", dni: "0" };
  });

  // Guardar carrito en tiempo real en localStorage
  useEffect(() => {
    try {
      if (cart.length > 0) {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      } else {
        localStorage.removeItem(CART_STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Error al guardar carrito en localStorage:", e);
    }
  }, [cart]);

  // Guardar cliente seleccionado en tiempo real en localStorage
  useEffect(() => {
    try {
      if (selectedClient && selectedClient.dni && selectedClient.dni !== "0") {
        localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(selectedClient));
      } else {
        localStorage.removeItem(CLIENT_STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Error al guardar cliente en localStorage:", e);
    }
  }, [selectedClient]);

  // Modal de cobro
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [cashReceived, setCashReceived] = useState("");
  const [lastCompletedSale, setLastCompletedSale] = useState(null);
  const [statusModal, setStatusModal] = useState(null);

  const [selectedDetailProduct, setSelectedDetailProduct] = useState(null);
  const [selectedEditProduct, setSelectedEditProduct] = useState(null);
  const [variantTargetProduct, setVariantTargetProduct] = useState(null);
  const [insuranceTargetProduct, setInsuranceTargetProduct] = useState(null);
  const [rentalTargetProduct, setRentalTargetProduct] = useState(null);
  const [activeRentalTicket, setActiveRentalTicket] = useState(null);

  // ── 1. Venta Rápida Express (Fotocopias, Impresiones, Arreglos, Varios) ──
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false);
  const [quickConcept, setQuickConcept] = useState("");
  const [quickPrice, setQuickPrice] = useState("");
  const [quickQty, setQuickQty] = useState(1);

  // ── 2. Carritos en Espera (Pausar Venta) ──
  const PARKED_CARTS_KEY = "pos_parked_carts";
  const [parkedCarts, setParkedCarts] = useState(() => {
    try {
      const saved = localStorage.getItem(PARKED_CARTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // ── 3. Pago Mixto (Efectivo + Transferencia/Nequi/Tarjeta) ──
  const [mixedCash, setMixedCash] = useState("");
  const [mixedMethod, setMixedMethod] = useState("Nequi");

  // Pausar carrito actual para atender a otro cliente
  const handleParkCart = () => {
    if (cart.length === 0) return;
    const newParked = {
      id: `PARK-${Date.now()}`,
      cart: [...cart],
      client: selectedClient || { nombre: "Cliente Mostrador", dni: "0" },
      total: totalAmount,
      itemsCount: totalItemsCount,
      timestamp: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true })
    };
    const updated = [newParked, ...parkedCarts].slice(0, 5);
    setParkedCarts(updated);
    try { localStorage.setItem(PARKED_CARTS_KEY, JSON.stringify(updated)); } catch (_) {}
    clearCart();
    playScannerBeep(true);
  };

  // Reanudar un carrito que estaba en espera
  const handleRestoreParkedCart = (parkedId) => {
    const target = parkedCarts.find(p => p.id === parkedId);
    if (!target) return;
    if (cart.length > 0) {
      if (!confirm("Tienes productos en el carrito actual. ¿Deseas pausar el actual y retomar el seleccionado?")) {
        return;
      }
      const currentParked = {
        id: `PARK-${Date.now()}`,
        cart: [...cart],
        client: selectedClient || { nombre: "Cliente Mostrador", dni: "0" },
        total: totalAmount,
        itemsCount: totalItemsCount,
        timestamp: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true })
      };
      const updated = [currentParked, ...parkedCarts.filter(p => p.id !== parkedId)].slice(0, 5);
      setParkedCarts(updated);
      try { localStorage.setItem(PARKED_CARTS_KEY, JSON.stringify(updated)); } catch (_) {}
    } else {
      const updated = parkedCarts.filter(p => p.id !== parkedId);
      setParkedCarts(updated);
      try { localStorage.setItem(PARKED_CARTS_KEY, JSON.stringify(updated)); } catch (_) {}
    }

    setCart(target.cart);
    setSelectedClient(target.client);
    playScannerBeep(true);
  };

  // Eliminar un carrito en espera
  const handleDeleteParkedCart = (e, parkedId) => {
    e.stopPropagation();
    const updated = parkedCarts.filter(p => p.id !== parkedId);
    setParkedCarts(updated);
    try { localStorage.setItem(PARKED_CARTS_KEY, JSON.stringify(updated)); } catch (_) {}
  };

  // Confirmar Venta Rápida Express (Fotocopias, impresiones, etc.)
  const handleAddQuickSale = (presetConcept = null, presetPrice = null) => {
    const concept = presetConcept || quickConcept.trim() || "Varios / Misceláneo";
    const price = Number(presetPrice !== null ? presetPrice : quickPrice) || 0;
    const qty = Math.max(1, Number(quickQty) || 1);

    if (price <= 0) {
      alert("Por favor ingresa un precio válido mayor a 0.");
      return;
    }

    const expressId = `EXPRESS-${Date.now()}`;
    const subtotal = price * qty;

    playScannerBeep(true);
    setCart(prev => [
      ...prev,
      {
        cartItemId: expressId,
        productId: expressId,
        codigo: "VAR-EXPRESS",
        nombre: `⚡ ${concept}`,
        nombreBase: concept,
        presentacion: "servicio",
        unidadesReales: 1,
        precioUnitario: price,
        cantidad: qty,
        subtotal: subtotal,
        categoria: "Varios",
        isQuickExpress: true,
        stockIlimitado: true,
        maxStock: 99999
      }
    ]);

    setQuickConcept("");
    setQuickPrice("");
    setQuickQty(1);
    setIsQuickSaleOpen(false);
  };

  const barcodeInputRef = useRef(null);

  // Sintetizador de audio — reutiliza contexto singleton para 0ms latencia
  const playScannerBeep = (success = true) => {
    try {
      const ctx = getScanAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      if (success) {
        osc.frequency.setValueAtTime(1400, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else {
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      }
    } catch (e) {}
  };

  // Atajos de teclado profesionales (F2 buscar/escanear, F4 cobrar, Escape cerrar)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "F2") {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      } else if (e.key === "F4" && cart.length > 0) {
        e.preventDefault();
        setIsCheckoutOpen(true);
      } else if (e.key === "Escape") {
        if (isCheckoutOpen) setIsCheckoutOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, isCheckoutOpen]);

  // Cambiar disponibilidad (Disponible / Agotado)
  const handleToggleAvailability = async (prod) => {
    if (!onSaveProduct) return;
    const isAvail = Number(prod.stock || 0) > 0;
    const nextStock = isAvail ? 0 : 10;
    const updated = {
      ...prod,
      stock: nextStock
    };
    await onSaveProduct(updated);
    setStatusModal({
      title: !isAvail ? "Producto Disponible" : "Producto Marcado como Agotado",
      message: `El producto "${prod.nombre}" ahora figura como ${!isAvail ? 'DISPONIBLE con 10 unidades en stock.' : 'AGOTADO (Stock: 0).'}`,
      type: !isAvail ? "success" : "warning",
      productName: prod.nombre
    });
  };

  // Eliminar producto con confirmación
  const handleDeleteProductPrompt = async (prod) => {
    if (!onDeleteProduct) return;
    const confirmed = window.confirm(`¿Estás seguro de que deseas eliminar permanentemente "${prod.nombre}"?`);
    if (confirmed) {
      await onDeleteProduct(prod.id || prod.codigo);
      setStatusModal({
        title: "Producto Eliminado",
        message: `El producto "${prod.nombre}" ha sido eliminado satisfactoriamente del catálogo.`,
        type: "danger",
        productName: prod.nombre
      });
    }
  };

  // Mantener foco en el buscador/código de barras al cargar
  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  const triggerStockAlert = (msg) => {
    setStatusModal({
      title: "Notificación",
      message: msg,
      type: "info"
    });
  };

  // Atajos de teclado: F2 para cobrar, Esc para cancelar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "F2") {
        e.preventDefault();
        if (cart.length > 0) setIsCheckoutOpen(true);
      } else if (e.key === "Escape") {
        if (isCheckoutOpen) setIsCheckoutOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, isCheckoutOpen]);

  // Contar cuántas unidades REALES de un producto ya están en el carrito
  const getUnitsAlreadyInCart = (productOrId) => {
    if (!productOrId) return 0;
    const targetId = typeof productOrId === 'object' ? (productOrId.id || productOrId.codigo) : productOrId;
    const targetCode = typeof productOrId === 'object' ? productOrId.codigo : null;
    return cart
      .filter(item => item.productId === targetId || (targetCode && item.codigo === targetCode))
      .reduce((sum, item) => sum + (Number(item.cantidad || 0) * Number(item.unidadesReales !== undefined ? item.unidadesReales : 1)), 0);
  };

  // Comprobar si el producto tiene variantes (Bolsas, Cintas, Cordones, Ropa o Calzado)
  const hasVariants = (prod) => {
    if (!prod) return false;
    const cat = String(prod.categoria || "").trim().toLowerCase();
    const nom = String(prod.nombre || "").trim().toLowerCase();
    return (
      cat === "bolsas de regalo" ||
      cat === "cintas" ||
      cat === "cordones" ||
      cat === "chancletas" ||
      cat === "ropa" ||
      Boolean(prod.ventaPorMetro) ||
      Boolean(prod.stockIlimitado) ||
      (Array.isArray(prod.tallas) && prod.tallas.length > 0) ||
      (Array.isArray(prod.generos) && prod.generos.length > 0) ||
      (Array.isArray(prod.motivos) && prod.motivos.length > 0) ||
      (Array.isArray(prod.colores) && prod.colores.length > 0) ||
      nom.includes("cinta") ||
      nom.includes("cordon") ||
      nom.includes("cordón") ||
      nom.includes("cordones") ||
      nom.includes("chancleta") ||
      nom.includes("chancla") ||
      nom.includes("ropa") ||
      (nom.includes("bolsa") && (nom.includes("regalo") || nom.includes("papel") || nom.includes("brillante")))
    );
  };

  // Comprobar si el producto es de Seguros Escolares (requiere datos del estudiante)
  const isInsuranceProduct = (prod) => {
    if (!prod) return false;
    const cat = String(prod.categoria || "").trim().toLowerCase();
    const nom = String(prod.nombre || "").trim().toLowerCase();
    return cat === "seguros" || nom.includes("seguro escolar") || nom.includes("seguro estudiantil") || nom.includes("póliza escolar") || nom.includes("poliza escolar");
  };

  // Manejador de lector de código de barras
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    const query = searchTerm.trim().toLowerCase();
    const foundProduct = products.find(p => 
      String(p.codigo).toLowerCase() === query || 
      String(p.legacyId) === query
    );

    if (foundProduct) {
      if (isInsuranceProduct(foundProduct)) {
        setInsuranceTargetProduct(foundProduct);
      } else if (isRentalProduct(foundProduct)) {
        setRentalTargetProduct(foundProduct);
      } else if (hasVariants(foundProduct)) {
        setVariantTargetProduct(foundProduct);
      } else {
        addToCart(foundProduct, "unidad");
      }
      setSearchTerm("");
    } else {
      triggerStockAlert(`No se encontró ningún producto con el código "${searchTerm}"`);
    }
  };

  // Verificar si producto es de alquiler (sillas/mesas) — bloqueados en POS
  const isRentalProduct = (product) => {
    const cod = String(product.codigo || "").trim();
    const nom = String(product.nombre || "").toLowerCase();
    const cat = String(product.categoria || "").toLowerCase();
    return cat === "alquiler" || cod === "1001" || cod === "1002" ||
      nom.includes("alquiler") || (nom.includes("silla") && cat !== "") || (nom.includes("mesa") && cat === "alquiler");
  };

  // Confirmar venta desde modal de variantes (Bolsas, Cintas, Cordones, Chancletas, Ropa)
  const handleConfirmVariantSale = (variantData) => {
    const { product, subcategoria, motivo, color, genero, talla, metros, cantidad, precioUnitario, subtotal, isCinta, isCordon, tipoCordon, longitudCordon } = variantData;
    const prodId = product.id || product.codigo;

    const variantKey = [
      subcategoria || "",
      isCordon && tipoCordon ? `tipo-${tipoCordon}` : "",
      isCordon && longitudCordon ? `long-${longitudCordon}` : "",
      genero ? `gen-${genero}` : "",
      talla ? `talla-${talla}` : "",
      motivo ? `motivo-${motivo}` : "",
      color ? `color-${color}` : "",
      metros ? `${metros}m` : ""
    ].filter(Boolean).join("-");

    const cartItemId = `${prodId}-${variantKey || Date.now()}`;

    // Construir etiqueta descriptiva
    const tags = [];
    if (isCordon) {
      if (tipoCordon) tags.push(tipoCordon);
      if (longitudCordon) tags.push(longitudCordon.includes("(") ? longitudCordon.split(" ")[0] : longitudCordon);
      if (color) tags.push(`Color: ${color}`);
    } else {
      if (subcategoria && !product.nombre.toLowerCase().includes(subcategoria.toLowerCase())) {
        tags.push(subcategoria);
      }
      if (genero) tags.push(genero);
      if (talla) tags.push(`Talla: ${talla}`);
      if (motivo) tags.push(`Motivo: ${motivo}`);
      if (color) tags.push(`Color: ${color}`);
      if (metros) tags.push(`${metros}m`);
    }

    const fullNombre = tags.length > 0 ? `${product.nombre} (${tags.join(", ")})` : product.nombre;

    playScannerBeep(true);
    setCart(prevCart => {
      const existing = prevCart.find(item => item.cartItemId === cartItemId);
      if (existing) {
        return prevCart.map(item =>
          item.cartItemId === cartItemId
            ? { ...item, cantidad: item.cantidad + cantidad, subtotal: (item.cantidad + cantidad) * precioUnitario }
            : item
        );
      }
      return [
        ...prevCart,
        {
          cartItemId,
          productId: prodId,
          codigo: product.codigo,
          nombre: fullNombre,
          nombreBase: product.nombre,
          presentacion: isCinta ? "metro" : isCordon ? "par" : "unidad",
          unidadesReales: isCinta ? 0 : 1,
          precioUnitario,
          cantidad,
          subtotal,
          isCordon: Boolean(isCordon),
          tipoCordon: tipoCordon || null,
          longitudCordon: longitudCordon || null,
          genero: genero || null,
          talla: talla || null,
          motivo: motivo || null,
          color: color || null,
          metros: metros || null,
          subcategoria: subcategoria || null,
          categoria: product.categoria,
          stockIlimitado: isCinta || Boolean(product.stockIlimitado),
          maxStock: isCinta ? 99999 : (variantData.stockDisponibleVariante ?? product.stock)
        }
      ];
    });
  };

  // Confirmar venta de seguro escolar capturando datos del alumno
  const handleConfirmInsuranceSale = (insuranceData) => {
    if (!insuranceTargetProduct) return;
    const prod = insuranceTargetProduct;
    const prodId = prod.id || prod.codigo;
    const price = Number(insuranceData.precio) || Number(prod.precio) || 0;
    const cartItemId = `${prodId}-seguro-${Date.now()}`;

    playScannerBeep(true);
    setCart(prev => [
      ...prev,
      {
        cartItemId,
        productId: prodId,
        codigo: prod.codigo,
        nombre: `🛡️ Seguro: ${insuranceData.estudianteNombre} (${insuranceData.grado})`,
        nombreBase: prod.nombre,
        categoria: "Seguros",
        presentacion: "póliza",
        unidadesReales: 1,
        precioUnitario: price,
        cantidad: 1,
        subtotal: price,
        isSeguro: true,
        stockIlimitado: false,
        maxStock: prod.stock || 9999,
        seguroData: {
          apellido1: insuranceData.apellido1,
          apellido2: insuranceData.apellido2,
          nombre1: insuranceData.nombre1,
          nombre2: insuranceData.nombre2,
          estudianteNombre: insuranceData.estudianteNombre,
          sexo: insuranceData.sexo,
          tipoDocumento: insuranceData.tipoDocumento,
          numeroDocumento: insuranceData.numeroDocumento,
          identificacion: insuranceData.numeroDocumento,
          fechaNacimiento: insuranceData.fechaNacimiento,
          curso: insuranceData.curso,
          grado: insuranceData.grado,
          responsableVenta: insuranceData.responsableVenta || currentUser?.nombre || "Caja Mostrador",
          vendedor: insuranceData.responsableVenta || currentUser?.nombre || "Caja Mostrador",
          fechaVenta: insuranceData.fechaVenta || new Date().toISOString().split("T")[0],
          responsableVerificacion: insuranceData.responsableVerificacion || "",
          inclusion: insuranceData.inclusion || "NO",
          telefonoResponsable: insuranceData.telefonoResponsable || "",
          precio: price,
          observaciones: insuranceData.observaciones || ""
        }
      }
    ]);
    setInsuranceTargetProduct(null);
  };

  // Agregar al carrito con CONTROL ESTRICTO DE STOCK
  const addToCart = (product, presentacion = "unidad", talla = null) => {
    // Si es producto de seguros escolares, abrir modal para registrar estudiante
    if (isInsuranceProduct(product)) {
      setInsuranceTargetProduct(product);
      return;
    }

    // Si es producto de alquiler (sillas/mesas), abrir modal de alquiler / apartado
    if (isRentalProduct(product)) {
      setRentalTargetProduct(product);
      return;
    }

    // Si tiene variantes de bolsa o cinta y se llama directamente, abrir modal
    if (hasVariants(product) && presentacion === "unidad" && !talla) {
      setVariantTargetProduct(product);
      return;
    }

    const isRental = isRentalProduct(product);
    const prodId = product.id || product.codigo;
    const isPackage = presentacion === "paquete";
    const unitsToDeduct = isPackage ? (product.unidadesPorPaquete || 10) : 1;
    const price = isPackage ? (product.precioPaquete || product.precio * 10 * 0.9) : product.precio;

    const isUnlimited = product.categoria === "Cintas" || Boolean(product.stockIlimitado);
    const currentUnitsInCart = getUnitsAlreadyInCart(prodId);
    const newTotalUnitsNeeded = currentUnitsInCart + unitsToDeduct;

    // Validación de stock: ¿supera las existencias reales?
    if (!isUnlimited && newTotalUnitsNeeded > product.stock && product.categoria !== "Alquiler") {
      playScannerBeep(false);
      triggerStockAlert(
        `⚠️ Stock insuficiente: "${product.nombre}" solo tiene ${product.stock} unidades en existencia. Ya tienes ${currentUnitsInCart} en el carrito.`
      );
      return;
    }

    playScannerBeep(true);
    const cartItemId = `${prodId}-${presentacion}${talla ? `-${talla}` : ""}`;

    setCart(prevCart => {
      const existing = prevCart.find(item => item.cartItemId === cartItemId);
      if (existing) {
        return prevCart.map(item => 
          item.cartItemId === cartItemId 
            ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * price }
            : item
        );
      } else {
        return [
          ...prevCart,
          {
            cartItemId,
            productId: prodId,
            codigo: product.codigo,
            nombre: product.nombre,
            presentacion,
            unidadesReales: unitsToDeduct,
            precioUnitario: price,
            cantidad: 1,
            subtotal: price,
            talla: talla || null,
            categoria: product.categoria || (isRental ? "Alquiler" : "General"),
            isRental: Boolean(isRental),
            stockIlimitado: isUnlimited,
            maxStock: isUnlimited ? 99999 : product.stock
          }
        ];
      }
    });
  };

  // Modificar cantidad en carrito con CONTROL ESTRICTO DE STOCK
  const updateQuantity = (cartItemId, delta) => {
    setCart(prevCart => {
      const targetItem = prevCart.find(item => item.cartItemId === cartItemId);
      if (!targetItem) return prevCart;

      if (delta > 0) {
        // Verificar si sumar 1 excede el stock (excepto si es stock ilimitado como Cintas)
        const currentUnitsInCart = getUnitsAlreadyInCart(targetItem.productId);
        const needed = targetItem.unidadesReales;
        const product = products.find(p => (p.id || p.codigo) === targetItem.productId);
        const isUnlimited = targetItem.stockIlimitado || product?.categoria === "Cintas" || Boolean(product?.stockIlimitado);
        const maxAvailable = product ? product.stock : (targetItem.maxStock || 9999);

        if (!isUnlimited && currentUnitsInCart + needed > maxAvailable && targetItem.categoria !== "Alquiler") {
          triggerStockAlert(`🔔 Límite de existencias alcanzado: Solo hay ${maxAvailable} unidades en inventario.`);
          return prevCart;
        }
      }

      return prevCart
        .map(item => {
          if (item.cartItemId === cartItemId) {
            const newQty = item.cantidad + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              cantidad: newQty,
              subtotal: newQty * item.precioUnitario
            };
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const removeFromCart = (cartItemId) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setCart([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
      localStorage.removeItem(CLIENT_STORAGE_KEY);
    } catch (e) {}
  };

  // Totales
  const totalAmount = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const totalItemsCount = cart.reduce((acc, item) => acc + item.cantidad, 0);
  const cashNum = parseFloat(cashReceived) || 0;
  const changeAmount = Math.max(0, cashNum - totalAmount);

  // Finalizar Venta
  const handleFinalizeSale = async () => {
    if (cart.length === 0) return;
    // ── Guard anti-doble-click: evita que se registre la misma venta dos veces ──
    if (handleFinalizeSale._processing) return;
    handleFinalizeSale._processing = true;

    try {
      if (paymentMethod === "Efectivo" && cashNum < totalAmount) {
        alert(`El dinero recibido ($${cashNum.toLocaleString()}) es menor al total de la venta ($${totalAmount.toLocaleString()}).`);
        return;
      }

      if (paymentMethod === "Fiado") {
        if (!selectedClient || selectedClient.dni === "0" || selectedClient.nombre === "Cliente Mostrador") {
          alert("Para registrar una venta a crédito (Fiado), debes seleccionar un cliente registrado.");
          return;
        }
        const currentDebt = Number(selectedClient.saldoDeudor) || 0;
        const creditLimit = Number(selectedClient.limiteCredito) || 0;
        if (creditLimit > 0 && (currentDebt + totalAmount) > creditLimit) {
          const proceed = confirm(`⚠️ ALERTA DE CUPO MÁXIMO:\n\nEl cliente "${selectedClient.nombre}" tiene un límite de crédito de $${creditLimit.toLocaleString()} COP.\n\nDeuda actual: $${currentDebt.toLocaleString()} COP\nEsta venta: $${totalAmount.toLocaleString()} COP\nNueva deuda total: $${(currentDebt + totalAmount).toLocaleString()} COP (excede por $${((currentDebt + totalAmount) - creditLimit).toLocaleString()} COP).\n\n¿Deseas autorizar esta venta a crédito de todos modos?`);
          if (!proceed) return;
        }
      }

      if (paymentMethod === "Mixto") {
        const cashVal = Number(mixedCash) || 0;
        if (cashVal <= 0 || cashVal >= totalAmount) {
          alert(`En pago mixto, debes ingresar un monto en efectivo entre $1 y $${(totalAmount - 1).toLocaleString()} COP. El resto ($${(totalAmount - cashVal).toLocaleString()}) se cobrará por ${mixedMethod}.`);
          return;
        }
      }

      const segurosVendidos = cart
        .filter(item => item.isSeguro && item.seguroData)
        .map(item => ({
          ...item.seguroData,
          productoId: item.productId,
          productoNombre: item.nombreBase || item.nombre,
          codigo: item.codigo,
          vendedor: currentUser?.nombre || "Caja Mostrador",
          fechaRegistro: new Date().toISOString(),
          reportado: false
        }));

      const currentShift = activeShift || (typeof localStorage !== "undefined" ? JSON.parse(localStorage.getItem("pos_active_shift") || "null") : null);

      // ID único pre-generado: garantiza idempotencia — si se llama dos veces,
      // el segundo setDoc en Firestore sobreescribe el mismo documento en vez de crear uno nuevo
      const saleId = `VTA-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      // Sanitizar y normalizar cada artículo del carrito para evitar campos undefined / NaN en ventas compuestas
      const sanitizedItems = (cart || []).map(item => ({
        cartItemId: String(item.cartItemId || `${item.productId || item.codigo || 'item'}-${Date.now()}`),
        productId: String(item.productId || item.codigo || "").trim(),
        codigo: String(item.codigo || "").trim(),
        nombre: String(item.nombre || "Producto").trim(),
        nombreBase: String(item.nombreBase || item.nombre || "").trim(),
        presentacion: String(item.presentacion || "unidad"),
        unidadesReales: Number(item.unidadesReales) || (item.presentacion === "paquete" ? 10 : 1),
        precioUnitario: Number(item.precioUnitario) || 0,
        cantidad: Math.max(1, Number(item.cantidad) || 1),
        subtotal: Number(item.subtotal) || ((Math.max(1, Number(item.cantidad) || 1)) * (Number(item.precioUnitario) || 0)),
        categoria: String(item.categoria || "General"),
        isRental: Boolean(item.isRental),
        stockIlimitado: Boolean(item.stockIlimitado),
        maxStock: Number(item.maxStock) || 9999,
        ...(item.talla ? { talla: String(item.talla) } : {}),
        ...(item.color ? { color: String(item.color) } : {}),
        ...(item.motivo ? { motivo: String(item.motivo) } : {}),
        ...(item.genero ? { genero: String(item.genero) } : {}),
        ...(item.metros ? { metros: Number(item.metros) || item.metros } : {}),
        ...(item.isCordon ? { isCordon: true, tipoCordon: item.tipoCordon || null, longitudCordon: item.longitudCordon || null } : {}),
        ...(item.isSeguro && item.seguroData ? { isSeguro: true, seguroData: item.seguroData } : {})
      }));

      const calculatedTotal = sanitizedItems.reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0);
      const cleanTotal = calculatedTotal > 0 ? calculatedTotal : (Number(totalAmount) || 0);

      const isMixed = paymentMethod === "Mixto";
      const cashPortion = isMixed ? (Number(mixedCash) || 0) : (paymentMethod === "Efectivo" ? cashNum : 0);
      const transferPortion = isMixed ? Math.max(0, cleanTotal - cashPortion) : (paymentMethod !== "Efectivo" && paymentMethod !== "Fiado" ? cleanTotal : 0);

      const saleRecord = {
        id: saleId,
        shiftId: currentShift?.id || null,
        shiftApertura: currentShift?.fechaApertura || null,
        cliente: selectedClient || null,
        items: sanitizedItems,
        segurosVendidos: segurosVendidos.length > 0 ? segurosVendidos : null,
        total: cleanTotal,
        metodoPago: paymentMethod,
        pagoMixto: isMixed ? {
          efectivo: cashPortion,
          transferencia: transferPortion,
          metodoTransferencia: mixedMethod || "Nequi"
        } : null,
        efectivoRecibido: isMixed ? cashPortion : (paymentMethod === "Fiado" ? 0 : cashNum),
        cambio: isMixed ? 0 : (paymentMethod === "Fiado" ? 0 : changeAmount),
        fecha: new Date().toISOString(),
        vendedor: currentUser?.nombre || "Caja Mostrador"
      };

      // Si es fiado, acumular la deuda en el cliente
      if (paymentMethod === "Fiado" && onSaveClient && selectedClient) {
        const updatedClient = {
          ...selectedClient,
          saldoDeudor: (Number(selectedClient.saldoDeudor) || 0) + totalAmount,
          ultimoCredito: new Date().toISOString()
        };
        onSaveClient(updatedClient);
        setSelectedClient(updatedClient);
      }

      // ── RESPUESTA INSTANTÁNEA (0 ms de espera): UI sin congelación ──
      // Cerrar modal de cobro y limpiar carrito inmediatamente
      setIsCheckoutOpen(false);
      setCart([]);
      try {
        localStorage.removeItem(CART_STORAGE_KEY);
        localStorage.removeItem(CLIENT_STORAGE_KEY);
      } catch (e) {}
      setCashReceived("");
      playScannerBeep(true);

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });

      // Disparar previsualización / impresión de ticket térmico al instante
      if (onPrintTicket) {
        onPrintTicket(saleRecord);
      }
      setLastCompletedSale(saleRecord);

      // Sincronizar en segundo plano con la base de datos sin bloquear al usuario
      if (onCompleteSale) {
        onCompleteSale(saleRecord).catch(err => {
          console.error("Error guardando venta en background:", err);
        });
      }
    } finally {
      // Liberar el guard rápidamente
      setTimeout(() => { handleFinalizeSale._processing = false; }, 600);
    }
  };

  // Filtrado memoizado de productos en catálogo para alto rendimiento (evita recalcular en cada render o cambio de tema)
  const filteredProducts = useMemo(() => {
    return (products || []).filter(p => {
      if (!p) return false;

      // Filtro por categoría
      let matchesCategory = true;
      if (selectedCategory === "🚨 Sin Stock" || selectedCategory === "Sin Stock" || selectedCategory.includes("Sin Stock")) {
        const isUnlimited = p.stockIlimitado || p.categoria === "Cintas";
        const effStock = isUnlimited ? 99999 : (p.stockPorVariante && Object.keys(p.stockPorVariante).length > 0 ? Object.values(p.stockPorVariante).reduce((s, v) => s + Number(v || 0), 0) : Number(p.stock || 0));
        matchesCategory = !isUnlimited && effStock <= 0;
      } else if (selectedCategory === "⚠️ Bajo Stock (≤ 3)" || selectedCategory.includes("Bajo Stock")) {
        const isUnlimited = p.stockIlimitado || p.categoria === "Cintas";
        const effStock = isUnlimited ? 99999 : (p.stockPorVariante && Object.keys(p.stockPorVariante).length > 0 ? Object.values(p.stockPorVariante).reduce((s, v) => s + Number(v || 0), 0) : Number(p.stock || 0));
        matchesCategory = !isUnlimited && effStock > 0 && effStock <= 3;
      } else if (selectedCategory && selectedCategory !== "Todos") {
        const catProd = String(p.categoria || "").trim().toLowerCase();
        const cleanCatSel = String(selectedCategory).replace(/^[^\wáéíóúñ]+/i, "").trim().toLowerCase();
        matchesCategory = catProd === cleanCatSel || 
          (cleanCatSel === "belleza" && catProd.includes("belleza")) || 
          (cleanCatSel === "bisutería" && (catProd.includes("bisuteria") || catProd.includes("bisutería"))) ||
          (cleanCatSel === "seguros" && (catProd.includes("seguro") || catProd.includes("póliza") || catProd.includes("poliza")));
      }

      if (!matchesCategory) return false;

      // Filtro por buscador
      if (!searchTerm.trim()) return true;

      const query = searchTerm.toLowerCase().trim();
      const nombre = String(p.nombre || "").toLowerCase();
      const codigo = String(p.codigo || "").toLowerCase();
      const legacyId = String(p.legacyId || "");
      const categoria = String(p.categoria || "").toLowerCase();

      return nombre.includes(query) || codigo.includes(query) || legacyId.includes(query) || categoria.includes(query);
    });
  }, [products, selectedCategory, searchTerm]);

  // Límite de renderizado progresivo para evitar saturar el DOM (48 productos iniciales)
  const [displayLimit, setDisplayLimit] = useState(48);

  useEffect(() => {
    setDisplayLimit(48);
  }, [selectedCategory, searchTerm]);

  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, displayLimit);
  }, [filteredProducts, displayLimit]);

  const categoriesList = [
    "Todos",
    "🚨 Sin Stock",
    "⚠️ Bajo Stock (≤ 3)",
    "Bolsas de Regalo",
    "Cintas",
    "Cordones",
    "Belleza",
    "Bisutería",
    "Cuadernos",
    "Dulcería",
    "Chancletas",
    "Papelería",
    "Desechables",
    "Ropa",
    "Juguetería",
    "Alquiler",
    "Seguros"
  ];

  return (
    <div className="pos-fullscreen-container">
      {/* Ventana Emergente de Notificación / Estado de Producto */}
      {statusModal && (
        <div 
          className="modal-overlay" 
          style={{ zIndex: 9999, animation: "fadeIn 0.2s ease" }}
          onClick={() => setStatusModal(null)}
        >
          <div 
            className="glass-panel" 
            style={{ 
              maxWidth: "420px", 
              width: "90%", 
              padding: "26px 24px", 
              textAlign: "center",
              background: "var(--bg-card)",
              border: `2px solid ${
                statusModal.type === 'success' ? 'var(--neon-emerald)' : 
                statusModal.type === 'danger' ? 'var(--neon-rose)' : 'var(--neon-amber)'
              }`,
              borderRadius: "var(--radius-lg)",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.65)",
              animation: "popBadge 0.2s ease"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              margin: "0 auto 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: statusModal.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 
                          statusModal.type === 'danger' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: statusModal.type === 'success' ? 'var(--neon-emerald)' : 
                     statusModal.type === 'danger' ? 'var(--neon-rose)' : 'var(--neon-amber)',
              border: `1px solid ${
                statusModal.type === 'success' ? 'rgba(16, 185, 129, 0.35)' : 
                statusModal.type === 'danger' ? 'rgba(244, 63, 94, 0.35)' : 'rgba(245, 158, 11, 0.35)'
              }`
            }}>
              {statusModal.type === 'success' ? <CheckCircle2 size={32} /> :
               statusModal.type === 'danger' ? <Trash2 size={28} /> : <AlertCircle size={32} />}
            </div>

            <h3 style={{ 
              fontSize: "1.25rem", 
              fontWeight: 800, 
              color: "var(--text-main)", 
              marginBottom: "10px" 
            }}>
              {statusModal.title}
            </h3>

            <p style={{ 
              fontSize: "0.93rem", 
              color: "var(--text-muted)", 
              lineHeight: 1.5, 
              marginBottom: "22px" 
            }}>
              {statusModal.message}
            </p>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setStatusModal(null)}
              autoFocus
              style={{ 
                width: "100%", 
                padding: "12px 20px", 
                fontSize: "0.95rem", 
                fontWeight: 700,
                borderRadius: "var(--radius-sm)"
              }}
            >
              Entendido / Aceptar
            </button>
          </div>
        </div>
      )}

      {/* Columna Izquierda: Búsqueda y Productos */}
      <div className="pos-catalog-column">
        {/* Aviso de Horario y Caja (Abre 5:00 AM, Cierra 10:00 PM Colombia) */}
        {!activeShift ? (
          <div className="pos-shift-alert">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock size={16} className="alert-icon" />
              <span>
                <strong>Caja Cerrada:</strong> Horario oficial: <strong>5:00 AM a 10:00 PM (Hora Colombia)</strong>.
              </span>
            </div>
            {onOpenCashRegister && (
              <button
                type="button"
                onClick={onOpenCashRegister}
                className="btn btn-outline"
                style={{ padding: "4px 10px", fontSize: "0.76rem" }}
              >
                Abrir Turno de Caja
              </button>
            )}
          </div>
        ) : Boolean(activeShift?.fechaApertura && getColombiaTimeInfo(activeShift.fechaApertura).dateStr !== getColombiaTimeInfo().dateStr) ? (
          <div className="pos-shift-alert">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertTriangle size={18} className="alert-icon" />
              <span>
                <strong>Turno del Día Anterior Abierto:</strong> Esta caja fue abierta en una fecha anterior. Para que las ventas de hoy cuadren en la caja actual, realiza el cierre del turno anterior.
              </span>
            </div>
            {onOpenCashRegister && (
              <button
                type="button"
                onClick={onOpenCashRegister}
                className="btn-close-prev-shift"
              >
                Cerrar Turno de Ayer
              </button>
            )}
          </div>
        ) : !isShiftOwner(activeShift, currentUser) ? (
          <div className="pos-shift-alert">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Lock size={16} className="alert-icon" />
              <span>
                <strong>Caja en Uso ({activeShift.cajero}):</strong> Turno abierto en la sesión de <strong>{activeShift.cajero}</strong>.
              </span>
            </div>
            {onOpenCashRegister && (
              <button
                type="button"
                onClick={onOpenCashRegister}
                className="btn btn-outline"
                style={{ padding: "4px 10px", fontSize: "0.76rem" }}
              >
                Ver Estado de Caja
              </button>
            )}
          </div>
        ) : getColombiaTimeInfo().isPastClosing ? (
          <div style={{
            background: "rgba(239, 68, 68, 0.12)",
            border: "1.5px solid rgba(239, 68, 68, 0.5)",
            borderRadius: "12px",
            padding: "8px 14px",
            marginBottom: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.82rem",
            color: "#fca5a5",
            gap: "10px",
            flexWrap: "wrap"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0 }} />
              <span>
                <strong>Hora de Cierre Alcanzada (10:00 PM Colombia):</strong> Recuerda realizar el arqueo y cerrar la caja.
              </span>
            </div>
            {onOpenCashRegister && (
              <button
                type="button"
                onClick={onOpenCashRegister}
                className="btn btn-danger"
                style={{ padding: "4px 10px", fontSize: "0.76rem" }}
              >
                Realizar Cierre
              </button>
            )}
          </div>
        ) : null}

        {/* Barra superior de lector de código de barras */}
        <div className="glass-panel pos-catalog-controls" style={{ padding: "12px 16px" }}>
          <form onSubmit={handleBarcodeSubmit} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Barcode 
                size={22} 
                style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--neon-indigo, #4f46e5)" }} 
              />
              <input
                ref={barcodeInputRef}
                type="text"
                className="input-field"
                placeholder="Escanea el código de barras o escribe producto... (Enter)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: "48px", fontSize: "0.95rem", height: "42px" }}
              />
            </div>
            {searchTerm && (
              <button 
                type="button" 
                onClick={() => setSearchTerm("")}
                className="btn btn-outline"
                style={{ height: "42px", padding: "0 14px" }}
              >
                Limpiar
              </button>
            )}

            {/* Acceso rápido para Alquiler y Apartados de Sillas */}
            <button
              type="button"
              onClick={() => {
                const chairProduct = products.find(p => p.codigo === "1002" || String(p.nombre || "").toLowerCase().includes("silla"));
                setRentalTargetProduct(chairProduct || { codigo: "1002", nombre: "Alquiler de Sillas", precio: 1500 });
              }}
              className="btn btn-primary"
              style={{
                height: "42px",
                padding: "0 14px",
                background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontWeight: 700,
                fontSize: "0.85rem",
                whiteSpace: "nowrap",
                boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)"
              }}
              title="Registrar alquiler o apartar sillas para fechas especiales (Diciembre)"
            >
              <Armchair size={17} />
              <span>🪑 Alquiler / Apartar Sillas</span>
            </button>


          </form>

          {/* Categorías especializadas */}
          {(() => {
            const getEffStock = (p) => {
              if (p.stockIlimitado || p.categoria === "Cintas") return 99999;
              if (p.stockPorVariante && Object.keys(p.stockPorVariante).length > 0) {
                return Object.values(p.stockPorVariante).reduce((sum, v) => sum + Number(v || 0), 0);
              }
              return Number(p.stock || 0);
            };

            const sinStockCount = products.filter(p => !p.stockIlimitado && p.categoria !== "Cintas" && getEffStock(p) <= 0).length;
            const bajoStockCount = products.filter(p => !p.stockIlimitado && p.categoria !== "Cintas" && getEffStock(p) > 0 && getEffStock(p) <= 3).length;

            return (
              <div style={{ display: "flex", gap: "8px", overflowX: "auto", marginTop: "6px", paddingTop: "6px", paddingBottom: "6px", paddingLeft: "4px", paddingRight: "4px" }}>
                {categoriesList.map(cat => {
                  const isSinStock = cat.includes("Sin Stock");
                  const isBajoStock = cat.includes("Bajo Stock");
                  const isSelected = selectedCategory === cat;

                  let activeColor = "var(--neon-indigo, #4f46e5)";
                  let activeBg = "rgba(99, 102, 241, 0.16)";
                  let activeBorder = "1px solid var(--neon-indigo, #4f46e5)";

                  if (isSinStock) {
                    activeColor = "#ef4444";
                    activeBg = "rgba(239, 68, 68, 0.16)";
                    activeBorder = "1px solid #ef4444";
                  } else if (isBajoStock) {
                    activeColor = "#f59e0b";
                    activeBg = "rgba(245, 158, 11, 0.16)";
                    activeBorder = "1px solid #f59e0b";
                  }

                  return (
                    <button
                      key={cat}
                      type="button"
                      className={`category-pill-filter ${isSelected ? "category-pill-active" : ""}`}
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "var(--radius-full)",
                        border: isSelected ? activeBorder : isSinStock ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid var(--border-color)",
                        background: isSelected ? activeBg : isSinStock ? "rgba(239, 68, 68, 0.06)" : "var(--bg-glass)",
                        color: isSelected ? activeColor : isSinStock ? "#f87171" : isBajoStock ? "#fbbf24" : "var(--text-muted)",
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.2s"
                      }}
                    >
                      {cat === "Bolsas de Regalo" && "🛍️ "}
                      {cat === "Cintas" && "🎗️ "}
                      {cat === "Cordones" && "👟 "}
                      {cat === "Belleza" && "💄 "}
                      {cat === "Bisutería" && "💍 "}
                      {cat === "Cuadernos" && "📓 "}
                      {cat === "Dulcería" && "🍬 "}
                      {cat === "Chancletas" && "🩴 "}
                      {cat === "Papelería" && "✏️ "}
                      {cat === "Desechables" && "🗑️ "}
                      {cat === "Ropa" && "👕 "}
                      {cat === "Juguetería" && "🧸 "}
                      {cat === "Alquiler" && "🪑 "}
                      {cat === "Seguros" && "🛡️ "}
                      <span>{cat}</span>
                      {isSinStock && sinStockCount > 0 && (
                        <span
                          className="category-pill-count count-sin-stock"
                          style={{
                            fontSize: "0.7rem",
                            padding: "1px 6px",
                            borderRadius: "10px",
                            background: isSelected ? "#ef4444" : "rgba(239, 68, 68, 0.2)",
                            color: isSelected ? "#fff" : "#fca5a5",
                            fontWeight: 800
                          }}
                        >
                          {sinStockCount}
                        </span>
                      )}
                      {isBajoStock && bajoStockCount > 0 && (
                        <span
                          className="category-pill-count count-bajo-stock"
                          style={{
                            fontSize: "0.7rem",
                            padding: "1px 6px",
                            borderRadius: "10px",
                            background: isSelected ? "#f59e0b" : "rgba(245, 158, 11, 0.2)",
                            color: isSelected ? "#fff" : "#fcd34d",
                            fontWeight: 800
                          }}
                        >
                          {bajoStockCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Cuadrícula de Productos con Imagen adaptada al 100% del alto */}
        <div className="pos-products-grid">
          {filteredProducts.length === 0 ? (
            <div style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "3rem 1rem",
              color: "var(--text-dim)",
              background: "rgba(255, 255, 255, 0.02)",
              borderRadius: "16px",
              border: "1px dashed var(--border-color)",
              margin: "20px 0"
            }}>
              <ShoppingBag size={48} style={{ opacity: 0.3, marginBottom: "12px", color: "var(--accent-primary)" }} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "6px" }}>
                No se encontraron productos en "{selectedCategory}"
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "16px" }}>
                Prueba buscando otra palabra clave o selecciona la categoría "Todos".
              </p>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => { setSelectedCategory("Todos"); setSearchTerm(""); }}
                style={{ padding: "8px 18px", borderRadius: "10px" }}
              >
                Ver Todos los Productos
              </button>
            </div>
          ) : (
            <>
              {visibleProducts.map((prod, idx) => {
              const prodKey = `${prod.codigo}-${prod.legacyId || idx}`;
              const isBolsa = prod.categoria === "Bolsas de Regalo" || String(prod.nombre || "").toLowerCase().includes("bolsa");
              const isCinta = prod.categoria === "Cintas" || Boolean(prod.ventaPorMetro);
              const isCordon = prod.categoria === "Cordones" || String(prod.nombre || "").toLowerCase().includes("cordon") || String(prod.nombre || "").toLowerCase().includes("cordón");
              const isChancleta = prod.categoria === "Chancletas" || String(prod.nombre || "").toLowerCase().includes("chancl");
              const isRopa = prod.categoria === "Ropa" || String(prod.nombre || "").toLowerCase().includes("ropa");
              const isCalzadoRopa = isChancleta || isRopa || (Array.isArray(prod.tallas) && prod.tallas.length > 0);
              const isSeguro = isInsuranceProduct(prod);
              const isUnlimited = prod.categoria === "Cintas" || Boolean(prod.stockIlimitado);

              // Stock total global: para ropa, chancletas y bolsas calcula la suma exacta de sus variantes
              const totalProductStock = isUnlimited 
                ? 99999 
                : ((prod.stockPorVariante && Object.keys(prod.stockPorVariante).length > 0)
                    ? Object.values(prod.stockPorVariante).reduce((sum, v) => sum + Number(v || 0), 0)
                    : (Number(prod.stock) || 0));

              const inCartUnits = getUnitsAlreadyInCart(prod);
              const remainingStock = isUnlimited ? 99999 : Math.max(0, totalProductStock - inCartUnits);
              const packageUnits = prod.unidadesPorPaquete || 10;
              const canSellPackage = remainingStock >= packageUnits;
              const isAvailable = isUnlimited || remainingStock > 0;
              const prodHasVariants = hasVariants(prod);

              return (
                <div 
                  key={prodKey}
                  className={`pos-product-card ${!isUnlimited && remainingStock <= 0 ? 'unavailable' : ''} ${inCartUnits > 0 ? 'in-cart' : ''}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => isRentalProduct(prod) ? setRentalTargetProduct(prod) : (isSeguro ? setInsuranceTargetProduct(prod) : (prodHasVariants ? setVariantTargetProduct(prod) : setSelectedDetailProduct(prod)))}
                >
                  {/* Imagen del producto con Badges */}
                  <div className="product-card-img-wrap" style={{ minHeight: "120px", height: "120px" }}>
                    <img
                      src={getProductImage(prod)}
                      alt={prod.nombre}
                      loading="lazy"
                      className="product-card-img"
                      onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=300&auto=format&fit=crop&q=60";
                      }}
                    />
                    
                    {/* Badge de Categoría con icono apropiado */}
                    <span className="product-card-category-badge">
                      {isBolsa ? "🎁" : isCinta ? "🎗️" : isCordon ? "👟" : isChancleta ? "🩴" : isRopa ? "👕" : prod.categoria === "Bisutería" ? "💍" : isSeguro ? "🛡️" : "⭐"} {prod.categoria || "General"}
                    </span>

                    {/* Status Pill (Stock): Muestra la suma global exacta de las variantes individuales */}
                    <div className={`product-status-pill ${
                      isUnlimited
                        ? 'pill-available'
                        : remainingStock === 0 
                        ? 'pill-unavailable' 
                        : remainingStock <= 3 
                        ? 'pill-warning' 
                        : 'pill-available'
                    }`}>
                      <CheckCircle2 size={12} />
                      <span>
                        {isUnlimited ? "Stock: Ilimitado ∞" : remainingStock === 0 ? "AGOTADO" : `Stock: ${remainingStock}`}
                      </span>
                    </div>

                    {/* Badge de cantidad en carrito (con pop animación) */}
                    {inCartUnits > 0 && (
                      <div className="product-cart-qty-badge pop-badge" title={`${inCartUnits} en el carrito`}>
                        {inCartUnits}
                      </div>
                    )}
                  </div>

                  {/* Cuerpo de la Tarjeta */}
                  <div className="product-card-body">
                    <div>
                      {(() => {
                        const allPrices = [
                          ...(prod.preciosPorVariante ? Object.values(prod.preciosPorVariante) : []),
                          ...(prod.precioPorGenero ? Object.values(prod.precioPorGenero) : [])
                        ].map(Number).filter(v => !isNaN(v) && v > 0);

                        const baseP = Number(prod.precio) || 0;
                        const validPrices = allPrices.length > 0 ? allPrices : (baseP > 0 ? [baseP] : []);

                        let displayPrice = "$0";
                        if (validPrices.length > 0) {
                          const minP = Math.min(...validPrices);
                          const maxP = Math.max(...validPrices);
                          displayPrice = (minP === maxP)
                            ? `$${minP.toLocaleString()}`
                            : `$${minP.toLocaleString()} - $${maxP.toLocaleString()}`;
                        } else if (baseP > 0) {
                          displayPrice = `$${baseP.toLocaleString()}`;
                        }

                        const hasRange = validPrices.length > 1 && Math.min(...validPrices) !== Math.max(...validPrices);

                        return (
                          <div className="product-card-title-row">
                            <span className="product-card-code">Cód: {prod.codigo}</span>
                            <span className="product-card-price" style={{ fontSize: hasRange ? '0.8rem' : undefined }}>
                              {displayPrice}
                            </span>
                          </div>
                        );
                      })()}

                      <h3 className="product-card-title" title={prod.nombre}>
                        {prod.nombre}
                      </h3>

                      {/* Tipo o Modelo personalizado por escrito (solo si no es idéntico al nombre para no duplicar espacio) */}
                      {(prod.tipoArticulo || (isCalzadoRopa && prod.subcategoria)) && 
                        String(prod.tipoArticulo || prod.subcategoria).toLowerCase().trim() !== String(prod.nombre || "").toLowerCase().trim() && (
                        <div style={{ marginBottom: "4px" }}>
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "0.68rem",
                            fontWeight: 800,
                            padding: "2px 6px",
                            borderRadius: "6px",
                            background: isChancleta ? "rgba(245, 158, 11, 0.15)" : "rgba(139, 92, 246, 0.15)",
                            color: isChancleta ? "#fbbf24" : "#c084fc",
                            border: `1px solid ${isChancleta ? "rgba(245, 158, 11, 0.35)" : "rgba(139, 92, 246, 0.35)"}`
                          }}>
                            {isChancleta ? "🩴" : "👕"} {prod.tipoArticulo || prod.subcategoria}
                          </span>
                        </div>
                      )}

                      {/* Tallas si aplica (compactas) */}
                      {prod.tallas && prod.tallas.length > 0 && (
                        <div style={{ marginBottom: "4px" }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: "flex", gap: "3px", flexWrap: "wrap", alignItems: "center" }}>
                            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700 }}>Tallas:</span>
                            {prod.tallas.slice(0, 5).map(t => (
                              <button
                                key={t}
                                disabled={remainingStock <= 0}
                                onClick={(e) => { e.stopPropagation(); setVariantTargetProduct(prod); }}
                                style={{
                                  background: "rgba(255, 255, 255, 0.08)",
                                  border: "1px solid var(--border-color)",
                                  color: "var(--text-main)",
                                  padding: "1px 5px",
                                  borderRadius: "4px",
                                  fontSize: "0.68rem",
                                  cursor: remainingStock > 0 ? "pointer" : "not-allowed",
                                  fontWeight: 700
                                }}
                              >
                                T{t}
                              </button>
                            ))}
                            {prod.tallas.length > 5 && (
                              <span style={{ fontSize: "0.62rem", color: "var(--text-dim)", fontWeight: 600 }}>
                                +{prod.tallas.length - 5}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Toolbar de Gestión: Toggle Disponible + Ojito + Lápiz + Basurero (idéntico a la imagen 4) */}
                    <div className="card-admin-toolbar" onClick={(e) => e.stopPropagation()}>
                      {/* Switch Disponibilidad */}
                      <button 
                        type="button" 
                        className="card-avail-toggle" 
                        onClick={() => handleToggleAvailability(prod)}
                        title={isAvailable ? "Marcar como Agotado" : "Marcar como Disponible"}
                      >
                        <span className={`toggle-track ${isAvailable ? 'active' : ''}`}>
                          <span className="toggle-thumb" />
                        </span>
                        <span style={{ color: isAvailable ? '#10b981' : '#f87171' }}>
                          {isAvailable ? "Disponible" : "Agotado"}
                        </span>
                      </button>

                      {/* Botones de acción: Ojito, Lápiz, Basurero */}
                      <div className="card-action-btns">
                        <button
                          type="button"
                          className="btn-card-icon view"
                          onClick={() => setSelectedDetailProduct(prod)}
                          title="Ver Ficha del Producto (Ojito)"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-card-icon edit"
                          onClick={() => setSelectedEditProduct(prod)}
                          title="Editar Producto (Lápiz)"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-card-icon delete"
                          onClick={() => handleDeleteProductPrompt(prod)}
                          title="Eliminar Producto (Basurero)"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Botones de Venta POS */}
                    <div className="product-card-actions" onClick={(e) => e.stopPropagation()}>
                      {isRentalProduct(prod) ? (
                        <button
                          type="button"
                          onClick={() => setRentalTargetProduct(prod)}
                          className="btn-pos-add"
                          style={{
                            background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
                            boxShadow: "0 4px 14px rgba(79, 70, 229, 0.35)"
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <Armchair size={14} />
                            <span>Alquilar / Apartar Sillas</span>
                          </span>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800 }}>
                            ${Number(prod.precio || 1500).toLocaleString()}
                          </span>
                        </button>
                      ) : isSeguro ? (
                        <button
                          type="button"
                          onClick={() => setInsuranceTargetProduct(prod)}
                          className="btn-pos-add"
                          style={{
                            background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
                            boxShadow: "0 4px 14px rgba(13, 148, 136, 0.35)"
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <ShieldCheck size={14} />
                            <span>Vender Seguro Escolar</span>
                          </span>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800 }}>
                            ${Number(prod.precio).toLocaleString()}
                          </span>
                        </button>
                      ) : prodHasVariants ? (
                        <button
                          type="button"
                          onClick={() => setVariantTargetProduct(prod)}
                          className="btn-pos-add"
                          style={{
                            background: isCinta 
                              ? "linear-gradient(135deg, #059669 0%, #047857 100%)"
                              : isCordon
                              ? "linear-gradient(135deg, #f97316 0%, #ea580c 100%)"
                              : isCalzadoRopa
                              ? (isChancleta ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)")
                              : "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
                            boxShadow: isCinta 
                              ? "0 4px 14px rgba(5, 150, 105, 0.35)" 
                              : isCordon
                              ? "0 4px 14px rgba(249, 115, 22, 0.35)"
                              : isCalzadoRopa
                              ? (isChancleta ? "0 4px 14px rgba(245, 158, 11, 0.35)" : "0 4px 14px rgba(139, 92, 246, 0.35)")
                              : "0 4px 14px rgba(236, 72, 153, 0.35)"
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {isCinta ? <Scissors size={14} /> : isCordon ? <Footprints size={14} /> : isChancleta ? <Footprints size={14} /> : isRopa ? <Shirt size={14} /> : <Gift size={14} />}
                            <span>
                              {isCinta 
                                ? "Vender x Metros" 
                                : isCordon
                                ? "Elegir Color y Tipo"
                                : isBolsa 
                                ? "Elegir Motivo/Color" 
                                : isChancleta
                                ? "Elegir Talla y Género"
                                : isRopa
                                ? "Elegir Talla y Género"
                                : "Elegir Variantes"}
                            </span>
                          </span>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800 }}>
                            ${Number(prod.precio).toLocaleString()}{isCinta ? "/m" : isCordon ? "/par" : ""}
                          </span>
                        </button>
                      ) : (
                        <>
                          {/* Botón Unidad regular */}
                          <button
                            onClick={() => addToCart(prod, "unidad")}
                            disabled={!isUnlimited && remainingStock <= 0}
                            className="btn-pos-add"
                          >
                            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <ShoppingBag size={14} />
                              <span>{!isUnlimited && remainingStock <= 0 ? "Sin Stock" : inCartUnits > 0 ? `Agregar más (${inCartUnits})` : "Vender Unidad"}</span>
                            </span>
                            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800 }}>${Number(prod.precio).toLocaleString()}</span>
                          </button>

                          {/* Botón Paquete */}
                          {prod.permitePaquete && (
                            <button
                              onClick={() => addToCart(prod, "paquete")}
                              disabled={!canSellPackage}
                              className="btn-pos-package"
                              title={canSellPackage ? `Paquete x${packageUnits} unids` : `Faltan unidades para completar paquete de ${packageUnits}`}
                            >
                              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <Layers size={13} /> x{packageUnits}
                              </span>
                              <span style={{ fontFamily: "var(--font-mono)" }}>
                                ${Number(prod.precioPaquete || prod.precio * packageUnits * 0.9).toLocaleString()}
                              </span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
              })}
              {filteredProducts.length > displayLimit && (
                <div style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "20px 0 10px 0"
                }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setDisplayLimit(prev => prev + 48)}
                    style={{
                      padding: "10px 24px",
                      borderRadius: "12px",
                      borderColor: "rgba(99, 102, 241, 0.4)",
                      background: "var(--bg-card)",
                      color: "var(--text-main)",
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)"
                    }}
                  >
                    <span>📦 Cargar más productos ({filteredProducts.length - displayLimit} restantes)</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Columna Derecha: Carrito de Compras */}
      <div className="glass-panel pos-cart-column" style={{ padding: "16px", display: "flex", flexDirection: "column" }}>
        {/* Cabecera del Carrito */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: "12px",
          borderBottom: "1px solid var(--border-color)"
        }}>
          <div>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "8px" }}>
              <ShoppingBag size={18} color="var(--accent-blue)" />
              Ticket de Venta
            </h2>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              {totalItemsCount} artículos en lista
            </span>
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {cart.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleParkCart}
                  className="btn btn-outline"
                  style={{ padding: "5px 8px", fontSize: "0.75rem", borderColor: "rgba(245, 158, 11, 0.5)", color: "#fbbf24" }}
                  title="Pausar ticket actual para atender al siguiente cliente"
                >
                  <PauseCircle size={13} color="#fbbf24" /> Pausar
                </button>
                <button 
                  onClick={clearCart} 
                  className="btn btn-outline"
                  style={{ padding: "5px 8px", fontSize: "0.75rem", color: "var(--accent-rose)" }}
                  title="Vaciar carrito"
                >
                  <Trash2 size={13} /> Vaciar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Acciones Rápidas: Botón Venta Express (Fotocopias / Impresiones / Varios) */}
        <div style={{ marginTop: "8px", marginBottom: "6px" }}>
          <button
            type="button"
            onClick={() => setIsQuickSaleOpen(true)}
            className="btn btn-outline"
            style={{ width: "100%", padding: "6px 10px", fontSize: "0.78rem", borderColor: "rgba(59, 130, 246, 0.4)", color: "#60a5fa", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", background: "rgba(59, 130, 246, 0.08)" }}
            title="Agregar fotocopias, impresiones, arreglos o artículos express sin crear en catálogo"
          >
            <Zap size={14} color="#60a5fa" />
            <span style={{ fontWeight: 700 }}>+ Venta Express (Fotocopias / Impresiones / Varios)</span>
          </button>
        </div>

        {/* Tickets en Espera (Parked Carts) */}
        {parkedCarts.length > 0 && (
          <div style={{
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px dashed rgba(245, 158, 11, 0.4)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 10px",
            marginBottom: "8px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#fbbf24", display: "flex", alignItems: "center", gap: "4px" }}>
                <Clock size={13} /> Tickets en Espera ({parkedCarts.length}/5):
              </span>
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {parkedCarts.map((p, idx) => (
                <div
                  key={p.id}
                  onClick={() => handleRestoreParkedCart(p.id)}
                  style={{
                    background: "rgba(17, 24, 39, 0.95)",
                    border: "1px solid rgba(245, 158, 11, 0.5)",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.74rem"
                  }}
                  title="Pulsar para retomar este ticket en caja"
                >
                  <PlayCircle size={13} color="#fbbf24" />
                  <span style={{ fontWeight: 700, color: "var(--text-main)" }}>
                    #{idx + 1} {p.client?.nombre ? p.client.nombre.split(" ")[0] : "Cliente"} (${Number(p.total).toLocaleString()})
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteParkedCart(e, p.id)}
                    style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", padding: "0 2px", fontWeight: "bold" }}
                    title="Descartar este ticket"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selector de Cliente */}
        <div style={{ marginTop: "4px", marginBottom: "10px" }}>
          <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: "3px" }}>
            Cliente Asignado:
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <User size={16} color="var(--text-muted)" />
            <select
              className="input-field"
              value={selectedClient?.dni || "0"}
              onChange={(e) => {
                const found = clients.find(c => c.dni === e.target.value);
                if (found) setSelectedClient(found);
                else setSelectedClient({ nombre: "Cliente Mostrador", dni: "0" });
              }}
              style={{ padding: "6px 8px", fontSize: "0.825rem" }}
            >
              <option value="0">Cliente Mostrador (General)</option>
              {clients.map(c => (
                <option key={c.dni} value={c.dni}>
                  {c.nombre} ({c.dni})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de Ítems en Carrito con scroll interno independiente */}
        <div className="pos-cart-items-scroll" style={{ margin: "6px 0" }}>
          {cart.length === 0 ? (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--text-dim)",
              textAlign: "center",
              padding: "16px"
            }}>
              <ShoppingBag size={42} style={{ opacity: 0.3, marginBottom: "10px" }} />
              <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>Carrito vacío</p>
              <p style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                Escanea un código de barras o pulsa sobre un producto.
              </p>
            </div>
          ) : (
            cart.map(item => {
              const product = products.find(p => (p.id || p.codigo) === item.productId);
              const maxStock = product ? product.stock : (item.maxStock || 999);
              const currentTotalUnitsInCart = getUnitsAlreadyInCart(item.productId);
              const isPlusDisabled = (currentTotalUnitsInCart + item.unidadesReales) > maxStock;

              return (
                <div 
                  key={item.cartItemId}
                  style={{
                    background: "rgba(0, 0, 0, 0.2)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    padding: "8px 10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.825rem", color: "var(--text-main)", lineHeight: "1.2" }}>
                        {item.nombre}
                      </div>
                      <div style={{ display: "flex", gap: "4px", alignItems: "center", marginTop: "2px" }}>
                        {item.presentacion === "paquete" ? (
                          <span className="badge badge-purple" style={{ fontSize: "0.62rem" }}>
                            📦 Paquete x{item.unidadesReales}
                          </span>
                        ) : item.presentacion === "metro" ? (
                          <span className="badge" style={{ fontSize: "0.62rem", background: "rgba(16, 185, 129, 0.2)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.4)" }}>
                            📏 {item.metros} m
                          </span>
                        ) : (
                          <span className="badge badge-blue" style={{ fontSize: "0.62rem" }}>
                            Unidad
                          </span>
                        )}
                        {item.motivo && (
                          <span className="badge" style={{ fontSize: "0.62rem", background: "rgba(59, 130, 246, 0.2)", color: "#93c5fd", border: "1px solid rgba(59, 130, 246, 0.4)" }}>
                            🎨 {item.motivo}
                          </span>
                        )}
                        {item.color && (
                          <span className="badge" style={{ fontSize: "0.62rem", background: "rgba(236, 72, 153, 0.2)", color: "#f472b6", border: "1px solid rgba(236, 72, 153, 0.4)" }}>
                            🌈 {item.color}
                          </span>
                        )}
                        {item.genero && (
                          <span className="badge" style={{ fontSize: "0.62rem", background: "rgba(245, 158, 11, 0.2)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.4)" }}>
                            {item.genero === "Niño" ? "👦" : item.genero === "Niña" ? "👧" : item.genero === "Mujer" ? "👩" : "👨"} {item.genero}
                          </span>
                        )}
                        {item.talla && (
                          <span className="badge badge-amber" style={{ fontSize: "0.62rem" }}>
                            Talla: {item.talla}
                          </span>
                        )}
                        <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                          {item.stockIlimitado ? "(Stock: ∞)" : `(Stock: ${maxStock})`}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.cartItemId)}
                      style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: "2px" }}
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "3px" }}>
                    {/* Stepper con validación de stock */}
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "var(--bg-tertiary)", borderRadius: "4px", border: "1px solid var(--border-color)", padding: "1px" }}>
                      <button 
                        onClick={() => updateQuantity(item.cartItemId, -1)}
                        style={{ background: "none", border: "none", color: "var(--text-main)", padding: "3px 6px", cursor: "pointer" }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ minWidth: "22px", textAlign: "center", fontWeight: 700, fontSize: "0.85rem" }}>
                        {item.cantidad}
                      </span>
                      <button 
                        onClick={() => updateQuantity(item.cartItemId, 1)}
                        disabled={isPlusDisabled}
                        style={{
                          background: "none",
                          border: "none",
                          color: isPlusDisabled ? "var(--text-dim)" : "var(--text-main)",
                          padding: "3px 6px",
                          cursor: isPlusDisabled ? "not-allowed" : "pointer"
                        }}
                        title={isPlusDisabled ? `No puedes agregar más. Stock máximo alcanzado (${maxStock})` : "Agregar 1"}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Subtotal */}
                    <div style={{ textAlign: "right" }}>
                      <div className="price-tag" style={{ fontSize: "0.9rem", color: "#10b981" }}>
                        ${item.subtotal.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Resumen de Pago y Botón de Cobro Fijo al Fondo */}
        <div className="pos-cart-footer">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-main)" }}>TOTAL:</span>
            <span className="price-tag" style={{ fontSize: "1.35rem", color: "var(--accent-blue)", fontWeight: 800 }}>
              ${totalAmount.toLocaleString()} COP
            </span>
          </div>

          <button
            onClick={() => setIsCheckoutOpen(true)}
            disabled={cart.length === 0}
            className={`btn btn-success pos-checkout-btn ${cart.length === 0 ? "btn-checkout-empty" : "btn-checkout-ready"}`}
            style={{
              padding: "12px",
              fontSize: "1.05rem",
              fontWeight: 800,
              width: "100%",
              borderRadius: "var(--radius-md)"
            }}
          >
            <DollarSign size={20} />
            <span>Cobrar Venta (F2)</span>
          </button>
        </div>
      </div>

      {/* MODAL DE COBRO */}
      {isCheckoutOpen && (
        <div className="modal-overlay" onClick={() => setIsCheckoutOpen(false)}>
          <div
            className="modal-content modal-card checkout-modal-card"
            style={{
              maxWidth: "520px",
              width: "94%",
              maxHeight: "92vh",
              overflowY: "auto",
              overscrollBehavior: "contain",
              background: "var(--bg-secondary, #111827)",
              border: "1px solid var(--border-strong)",
              borderRadius: "24px",
              padding: "24px",
              boxShadow: "0 25px 65px -10px rgba(0,0,0,0.8)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-main)" }}>
                Cobrar Venta
              </h2>
              <button onClick={() => setIsCheckoutOpen(false)} className="btn btn-outline" style={{ padding: "6px 10px" }} title="Cerrar modal">
                <X size={18} />
              </button>
            </div>

            <div style={{
              background: "rgba(59, 130, 246, 0.12)",
              border: "1px solid rgba(59, 130, 246, 0.25)",
              borderRadius: "var(--radius-md)",
              padding: "16px",
              textAlign: "center",
              marginBottom: "18px"
            }}>
              <span style={{ fontSize: "0.8rem", color: "var(--accent-blue)", textTransform: "uppercase", fontWeight: 700 }}>
                Total a Cobrar
              </span>
              <div className="price-tag" style={{ fontSize: "2.1rem", color: "var(--text-main)", fontWeight: 800, marginTop: "2px" }}>
                ${totalAmount.toLocaleString()} COP
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "6px", fontWeight: 600 }}>
                Método de Pago:
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "5px" }}>
                {["Efectivo", "Nequi", "Daviplata", "Tarjeta", "Fiado", "Mixto"].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(m);
                      if (m !== "Efectivo" && m !== "Mixto") setCashReceived(totalAmount.toString());
                      if (m === "Mixto" && !mixedCash) {
                        setMixedCash(Math.floor(totalAmount / 2).toString());
                      }
                    }}
                    style={{
                      padding: "8px 2px",
                      borderRadius: "var(--radius-sm)",
                      border: paymentMethod === m ? "2px solid var(--accent-blue)" : "1px solid var(--border-color)",
                      background: paymentMethod === m ? "rgba(59, 130, 246, 0.2)" : "transparent",
                      color: paymentMethod === m ? (m === "Fiado" ? "#fbbf24" : m === "Mixto" ? "#34d399" : "var(--text-main)") : "var(--text-muted)",
                      fontWeight: 700,
                      fontSize: "0.76rem",
                      cursor: "pointer"
                    }}
                  >
                    {m === "Fiado" ? "💳 Fiado" : m === "Mixto" ? "⚡ Mixto" : m}
                  </button>
                ))}
              </div>
            </div>

            {/* SECCIÓN ESPECIAL CUANDO SE SELECCIONA PAGO MIXTO */}
            {paymentMethod === "Mixto" && (
              <div style={{
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                borderRadius: "12px",
                padding: "14px",
                marginBottom: "18px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#34d399" }}>
                    ⚡ Pago Dividido / Mixto
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Total: ${totalAmount.toLocaleString()} COP
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                      Parte en Efectivo ($):
                    </label>
                    <MathPriceInput
                        value={mixedCash}
                        onChange={(val) => setMixedCash(String(val))}
                        placeholder="Ej: 10000"
                        className="input-field"
                        style={{ fontSize: "1rem", height: "40px", fontFamily: "var(--font-mono)" }}
                        min={0}
                      />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                      Medio Digital:
                    </label>
                    <select
                      className="input-field"
                      value={mixedMethod}
                      onChange={(e) => setMixedMethod(e.target.value)}
                      style={{ fontSize: "0.85rem", height: "40px" }}
                    >
                      <option value="Nequi">Nequi</option>
                      <option value="Daviplata">Daviplata</option>
                      <option value="Tarjeta">Tarjeta Débito/Crédito</option>
                      <option value="Transferencia">Transferencia Bancolombia</option>
                    </select>
                  </div>
                </div>

                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "12px",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "rgba(0,0,0,0.25)"
                }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Saldo a cobrar por <strong>{mixedMethod}</strong>:
                  </span>
                  <strong style={{ fontSize: "1.1rem", color: "#34d399" }}>
                    ${Math.max(0, totalAmount - (Number(mixedCash) || 0)).toLocaleString()} COP
                  </strong>
                </div>
              </div>
            )}

            {/* SECCIÓN ESPECIAL CUANDO SE SELECCIONA FIADO / CRÉDITO */}
            {paymentMethod === "Fiado" && (
              <div style={{
                background: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                borderRadius: "12px",
                padding: "14px",
                marginBottom: "18px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fbbf24" }}>
                    💳 Venta a Crédito (Fiado)
                  </span>
                  {selectedClient && selectedClient.dni !== "0" && (
                    <span className="badge badge-amber" style={{ fontSize: "0.65rem" }}>
                      Cliente Registrado
                    </span>
                  )}
                </div>

                {(!selectedClient || selectedClient.dni === "0") ? (
                  <div>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "8px" }}>
                      ⚠️ No se puede fiar a "Cliente Mostrador". Selecciona a quién se le cargará la cuenta:
                    </p>
                    <select
                      className="input-field"
                      value={selectedClient?.dni || "0"}
                      onChange={(e) => {
                        const found = clients.find(c => c.dni === e.target.value);
                        if (found) setSelectedClient(found);
                      }}
                      style={{ fontSize: "0.88rem" }}
                    >
                      <option value="0">-- Selecciona un cliente registrado --</option>
                      {clients.filter(c => c.dni !== "0").map(c => (
                        <option key={c.dni} value={c.dni}>
                          {c.nombre} · DNI: {c.dni} (Deuda actual: ${(c.saldoDeudor || 0).toLocaleString()} COP)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff" }}>
                      {selectedClient.nombre} (C.C. {selectedClient.dni})
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginTop: "6px", color: "var(--text-muted)" }}>
                      <span>Deuda previa: ${(selectedClient.saldoDeudor || 0).toLocaleString()} COP</span>
                      <strong style={{ color: "#fbbf24" }}>
                        Nueva deuda total: ${((selectedClient.saldoDeudor || 0) + totalAmount).toLocaleString()} COP
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            )}

            {paymentMethod === "Efectivo" && (
              <div style={{ marginBottom: "18px" }}>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Efectivo Recibido ($):
                </label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <MathPriceInput
                    value={cashReceived}
                    onChange={(val) => setCashReceived(String(val))}
                    placeholder="Ej: 50000"
                    className="input-field"
                    style={{ fontSize: "1.2rem", height: "46px", textAlign: "right", fontFamily: "var(--font-mono)" }}
                    min={0}
                    autoFocus
                  />
                </div>

                <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                  <button 
                    type="button" 
                    onClick={() => setCashReceived(totalAmount.toString())}
                    className="btn btn-outline" 
                    style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                  >
                    Exacto
                  </button>
                  {[10000, 20000, 50000, 100000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCashReceived(val.toString())}
                      className="btn btn-outline"
                      style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                    >
                      ${val.toLocaleString()}
                    </button>
                  ))}
                </div>

                {cashNum > 0 && (
                  <div style={{
                    marginTop: "12px",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm)",
                    background: cashNum >= totalAmount ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)",
                    border: `1px solid ${cashNum >= totalAmount ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)"}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <span style={{ fontWeight: 700, color: cashNum >= totalAmount ? "#10b981" : "#f43f5e" }}>
                      {cashNum >= totalAmount ? "CAMBIO / VUELTOS:" : "DINERO INSUFICIENTE:"}
                    </span>
                    <span className="price-tag" style={{ fontSize: "1.2rem", fontWeight: 800, color: cashNum >= totalAmount ? "#10b981" : "#f43f5e" }}>
                      ${changeAmount.toLocaleString()} COP
                    </span>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="btn btn-outline"
                style={{ flex: 1, padding: "10px" }}
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleFinalizeSale}
                className="btn btn-success"
                style={{ flex: 2, padding: "10px", fontSize: "1rem" }}
              >
                <CheckCircle2 size={18} />
                <span>Confirmar Pago e Imprimir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RE-IMPRIMIR TRAS VENTA */}
      {lastCompletedSale && (
        <div className="modal-overlay" onClick={() => setLastCompletedSale(null)}>
          <div
            className="modal-content modal-card"
            style={{
              padding: "24px",
              textAlign: "center",
              maxWidth: "420px",
              width: "94%",
              background: "var(--bg-secondary, #111827)",
              border: "1px solid var(--border-strong)",
              borderRadius: "20px",
              boxShadow: "0 25px 65px -10px rgba(0,0,0,0.8)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              background: "rgba(16, 185, 129, 0.2)",
              color: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px"
            }}>
              <CheckCircle2 size={30} />
            </div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)" }}>
              ¡Venta Completada!
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
              Total: ${lastCompletedSale.total.toLocaleString()} COP ✅ {lastCompletedSale.metodoPago}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "18px" }}>
              <button
                onClick={() => onPrintTicket(lastCompletedSale)}
                className="btn btn-primary"
                style={{ padding: "10px", fontSize: "0.95rem" }}
              >
                <Printer size={16} />
                <span>Imprimir Ticket Térmico</span>
              </button>
              <button
                onClick={() => setLastCompletedSale(null)}
                className="btn btn-outline"
                style={{ padding: "8px" }}
              >
                Nueva Venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FICHA DEL PRODUCTO (VENTANA EMERGENTE AL HACER CLICK EN LA CARD O EN EL OJITO) */}
      <ProductDetailModal
        product={selectedDetailProduct}
        isOpen={!!selectedDetailProduct}
        onClose={() => setSelectedDetailProduct(null)}
        onAddToCart={addToCart}
        onEditProduct={(prod) => setSelectedEditProduct(prod)}
        onToggleAvailability={handleToggleAvailability}
      />

      {/* MODAL EDICIÓN RÁPIDA (LÁPIZ) */}
      <ProductEditModal
        product={selectedEditProduct}
        isOpen={!!selectedEditProduct}
        onClose={() => setSelectedEditProduct(null)}
        onSave={async (updated, originalKey) => {
          if (onSaveProduct) {
            await onSaveProduct(updated, originalKey);
            // Cerrar el modal de edición
            setSelectedEditProduct(null);
            // Si el modal de detalle estaba abierto para este producto,
            // actualizarlo con los datos frescos para reflejo inmediato
            if (selectedDetailProduct && (selectedDetailProduct.id || selectedDetailProduct.codigo) === (updated.id || updated.codigo)) {
              setSelectedDetailProduct(updated);
            }
            setStatusModal({
              title: "🎉 Producto Actualizado",
              message: `"${updated.nombre}" fue guardado exitosamente. El catálogo se actualizó en tiempo real.`,
              type: "success",
              productName: updated.nombre
            });
          }
        }}
      />

      {/* MODAL VARIANTES PARA BOLSAS DE REGALO Y CINTAS */}
      <VariantSelectionModal
        product={variantTargetProduct}
        isOpen={Boolean(variantTargetProduct)}
        onClose={() => setVariantTargetProduct(null)}
        onConfirm={handleConfirmVariantSale}
        cart={cart}
      />

      {/* MODAL DE DATOS PARA SEGUROS ESCOLARES (FORMATO OFICIAL LUIS CARLOS GALÁN) */}
      <StudentInsuranceModal
        isOpen={Boolean(insuranceTargetProduct)}
        onClose={() => setInsuranceTargetProduct(null)}
        product={insuranceTargetProduct}
        onConfirm={handleConfirmInsuranceSale}
        currentUser={currentUser}
        nextPolizaNumber={insurances.length + 1}
        maxPolizas={152}
      />

      {/* MODAL DE ALQUILER Y APARTADOS DE SILLAS / MESAS */}
      <RentalOrderModal
        isOpen={Boolean(rentalTargetProduct)}
        onClose={() => setRentalTargetProduct(null)}
        initialProduct={rentalTargetProduct}
        clients={clients}
        products={products}
        rentals={rentals}
        activeShift={activeShift}
        currentUser={currentUser}
        onSaveRental={onSaveRental}
        onCompleteSale={onCompleteSale}
        onPrintTicket={(rentalData) => setActiveRentalTicket(rentalData)}
      />

      {/* MODAL TICKET TÉRMICO DE ALQUILER / APARTADO */}
      <RentalTicketModal
        rental={activeRentalTicket}
        onClose={() => setActiveRentalTicket(null)}
        storeConfig={storeConfig}
      />

      {/* MODAL VENTA RÁPIDA EXPRESS (FOTOCOPIAS, IMPRESIONES, VARIOS) */}
      {isQuickSaleOpen && (
        <div className="modal-overlay" onClick={() => setIsQuickSaleOpen(false)}>
          <div
            className="modal-content modal-card"
            style={{
              maxWidth: "580px",
              width: "94%",
              background: "var(--bg-secondary, #111827)",
              border: "1px solid var(--border-strong)",
              borderRadius: "20px",
              padding: "24px",
              boxShadow: "0 25px 65px -10px rgba(0,0,0,0.85)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "8px" }}>
                <Zap size={20} color="#60a5fa" />
                Venta Rápida Express
              </h2>
              <button onClick={() => setIsQuickSaleOpen(false)} className="btn btn-outline" style={{ padding: "6px 10px" }} title="Cerrar modal">
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "14px" }}>
              Agrega servicios o artículos no codificados en segundos. Pulsa un botón rápido o ingresa un concepto y precio libre:
            </p>

            {/* Atajos Frecuentes de Miscelánea / Papelería */}
            <div style={{ marginBottom: "18px" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "8px", fontWeight: 700 }}>
                Atajos Frecuentes (1 clic para agregar):
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
                {[
                  { label: "Fotocopia B/N", price: 200, icon: "📄" },
                  { label: "Fotocopia Color", price: 500, icon: "🌈" },
                  { label: "Impresión B/N", price: 300, icon: "🖨️" },
                  { label: "Impresión Color", price: 1000, icon: "🎨" },
                  { label: "Laminado / Plastificado", price: 2000, icon: "🛡️" },
                  { label: "Escaneo a PDF / WhatsApp", price: 1000, icon: "📲" },
                  { label: "Minutos a Celular", price: 200, icon: "📞" },
                  { label: "Bolsa Regalo Express", price: 2500, icon: "🎁" }
                ].map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleAddQuickSale(preset.label, preset.price)}
                    className="btn btn-outline"
                    title={`${preset.label} - $${preset.price.toLocaleString("es-CO")}`}
                    style={{
                      padding: "9px 12px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "0.82rem",
                      borderColor: "rgba(59, 130, 246, 0.35)",
                      background: "rgba(30, 41, 59, 0.55)",
                      whiteSpace: "normal",
                      minHeight: "46px",
                      textAlign: "left"
                    }}
                  >
                    <span style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      flex: 1,
                      minWidth: 0,
                      lineHeight: 1.25
                    }}>
                      <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{preset.icon}</span>
                      <span style={{
                        color: "var(--text-main)",
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        wordBreak: "break-word"
                      }}>
                        {preset.label}
                      </span>
                    </span>
                    <strong style={{
                      color: "#60a5fa",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      fontSize: "0.85rem",
                      fontWeight: 800,
                      background: "rgba(59, 130, 246, 0.18)",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      border: "1px solid rgba(59, 130, 246, 0.35)",
                      letterSpacing: "0.3px"
                    }}>
                      ${preset.price.toLocaleString("es-CO")}
                    </strong>
                  </button>
                ))}
              </div>
            </div>

            {/* Concepto y Precio Personalizado */}
            <div style={{
              background: "rgba(0, 0, 0, 0.2)",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              padding: "14px"
            }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-main)", display: "block", marginBottom: "10px" }}>
                O escribe un artículo o servicio personalizado:
              </span>

              <div style={{ marginBottom: "10px" }}>
                <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: "3px" }}>
                  Concepto / Descripción:
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ej: Cartulina en pliego, Arreglo moño, Varios..."
                  value={quickConcept}
                  onChange={(e) => setQuickConcept(e.target.value)}
                  style={{ fontSize: "0.88rem" }}
                  autoFocus
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: "3px" }}>
                    Precio Unitario ($ COP):
                  </label>
                    <MathPriceInput
                      value={quickPrice}
                      onChange={(val) => setQuickPrice(String(val))}
                      placeholder="Ej: 1500 o 2*750"
                      className="input-field"
                      style={{ fontSize: "0.95rem", fontFamily: "var(--font-mono)" }}
                      min={0}
                    />
                </div>

                <div>
                  <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: "3px" }}>
                    Cantidad:
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={quickQty}
                    onChange={(e) => setQuickQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    style={{ fontSize: "0.95rem", textAlign: "center" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                <button
                  type="button"
                  onClick={() => setIsQuickSaleOpen(false)}
                  className="btn btn-outline"
                  style={{ flex: 1, padding: "8px" }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuickSale()}
                  className="btn btn-primary"
                  style={{ flex: 2, padding: "8px", fontWeight: 700 }}
                  disabled={!quickPrice || Number(quickPrice) <= 0}
                >
                  <Plus size={16} />
                  <span>Agregar al Ticket</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

