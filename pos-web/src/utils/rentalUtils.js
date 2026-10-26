/**
 * rentalUtils.js
 * Utilidades centralizadas para cálculo de estados, alertas, retrasos y fechas
 * de alquileres y reservas de mobiliario en la zona horaria de Colombia (America/Bogota, UTC-5).
 */

/**
 * Obtiene partes de fecha y hora en la zona horaria de Colombia (America/Bogota).
 */
export const getColombiaDateParts = (timestamp = Date.now()) => {
  const d = new Date(timestamp);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const parts = formatter.formatToParts(d);
  const map = {};
  parts.forEach((p) => {
    map[p.type] = p.value;
  });
  return {
    year: Number(map.year),
    month: Number(map.month), // 1 - 12
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    ymd: `${map.year}-${map.month}-${map.day}`
  };
};

/**
 * Obtiene timestamp UTC exacto para una fecha y hora local de Colombia (UTC-5).
 * @param {string} ymdStr - Formato YYYY-MM-DD
 * @param {string} timeStr - Formato HH:mm o HH:mm:ss
 */
export const getColombiaTimestamp = (ymdStr, timeStr = "12:00") => {
  if (!ymdStr) return null;
  const cleanTime = timeStr ? (timeStr.length === 5 ? `${timeStr}:00` : timeStr) : "12:00:00";
  // Sufijo -05:00 fuerza la interpretación en hora local de Colombia
  const iso = `${ymdStr}T${cleanTime}-05:00`;
  const t = new Date(iso).getTime();
  return isNaN(t) ? null : t;
};

/**
 * Calcula la diferencia exacta de días calendario entre una fecha de evento y la fecha actual en Colombia.
 * - Retorna > 0 si faltan días (futuro). Ej: hoy 26 oct a 1 nov => 6 días.
 * - Retorna 0 si el evento es HOY en Colombia.
 * - Retorna < 0 si el evento ya pasó en el calendario (retraso). Ej: hoy 26 oct evento 25 oct => -1 día.
 */
export const getCalendarDaysDiff = (eventYmd, now = Date.now()) => {
  if (!eventYmd) return null;
  const colNow = getColombiaDateParts(now);
  const [eY, eM, eD] = eventYmd.split("-").map(Number);
  if (!eY || !eM || !eD) return null;

  // Comparar a medianoche UTC estricta para evitar desfases horarios
  const todayMidnightUtc = Date.UTC(colNow.year, colNow.month - 1, colNow.day);
  const eventMidnightUtc = Date.UTC(eY, eM - 1, eD);
  return Math.round((eventMidnightUtc - todayMidnightUtc) / (24 * 60 * 60 * 1000));
};

/**
 * Analiza el estado, alertas, retrasos y badge de un alquiler o reserva.
 */
export const getRentalAlertInfo = (rental, now = Date.now()) => {
  if (!rental) {
    return {
      status: "activo",
      badgeText: "Activo",
      label: "Activo",
      color: "badge-blue",
      isOverdue: false,
      isReserva: false
    };
  }

  // 1. Alquiler devuelto
  if (rental.estado === "devuelto") {
    return {
      status: "devuelto",
      badgeText: "Devuelto",
      label: "Devuelto al inventario",
      color: "badge-green",
      elapsedHours: 0,
      isOverdue: false,
      isReserva: Boolean(rental.tipoOperacion === "reserva" || rental.esApartado || rental.fechaEvento)
    };
  }

  // 2. Alquiler apartado / reservado para fecha especial
  const isReserva = Boolean(
    rental.estado === "reservado" ||
    rental.tipoOperacion === "reserva" ||
    rental.esApartado ||
    rental.fechaEvento
  );

  if (isReserva) {
    const diasCalendario = getCalendarDaysDiff(rental.fechaEvento, now);

    let eventDateShort = "";
    let eventEmoji = "📅";
    if (rental.fechaEvento) {
      const [y, m, d] = rental.fechaEvento.split("-").map(Number);
      const evDate = new Date(y, m - 1, d);
      eventDateShort = evDate.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
      const evMonth = evDate.getMonth();
      eventEmoji = evMonth === 11 ? "🎄" : evMonth === 0 ? "🎉" : "📅";
    }

    // A. Evento en días futuros (> 1 día)
    if (diasCalendario !== null && diasCalendario > 1) {
      return {
        status: "reservado",
        badgeText: `${eventEmoji} ${eventDateShort} · Faltan ${diasCalendario} días`,
        label: `Apartado: Evento en ${diasCalendario} días (${rental.fechaEvento})`,
        color: "badge-purple",
        elapsedHours: 0,
        isOverdue: false,
        isReserva: true,
        diasFaltantes: diasCalendario
      };
    }

    // B. Evento MAÑANA (1 día)
    if (diasCalendario === 1) {
      return {
        status: "reservado",
        badgeText: `⏳ ${eventDateShort} · Mañana es el Evento`,
        label: `Apartado: Evento Mañana (${rental.fechaEvento})`,
        color: "badge-amber",
        elapsedHours: 0,
        isOverdue: false,
        isReserva: true,
        diasFaltantes: 1
      };
    }

    // C. Evento HOY (0 días)
    if (diasCalendario === 0) {
      // Verificar si tenía hora de entrega pactada y si esa hora ya expiró
      let hourOverdue = false;
      let diffMs = 0;
      if (rental.horaEvento) {
        const targetTime = getColombiaTimestamp(rental.fechaEvento, rental.horaEvento);
        if (targetTime && now > targetTime) {
          diffMs = now - targetTime;
          hourOverdue = diffMs >= 60 * 60 * 1000; // Al menos 1 hora de retraso
        }
      }

      if (hourOverdue) {
        const extraHours = Math.floor(diffMs / (1000 * 60 * 60));
        const elapsedMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return {
          status: "vencido",
          badgeText: `🚨 Retraso (+${extraHours}h ${elapsedMinutes}m)`,
          label: `¡RETRASO DE ENTREGA HOY! (+${extraHours}h ${elapsedMinutes}m de retraso)`,
          extraHours,
          elapsedMinutes,
          diasAtraso: 0,
          horasRestantes: extraHours,
          color: "badge-red",
          elapsedText: `${extraHours}h ${elapsedMinutes}m de retraso en la entrega pactada`,
          isOverdue: true,
          isReserva: true,
          diasFaltantes: 0
        };
      }

      return {
        status: "reservado",
        badgeText: "🎉 ¡EVENTO HOY!",
        label: `🎉 ¡EVENTO HOY!${rental.horaEvento ? ` (Hora entrega: ${rental.horaEvento})` : ""}`,
        color: "badge-green",
        elapsedHours: 0,
        isOverdue: false,
        isReserva: true,
        diasFaltantes: 0
      };
    }

    // D. Evento YA PASÓ (< 0 días) — Retraso confirmado
    if (diasCalendario !== null && diasCalendario < 0) {
      const diasAtraso = Math.abs(diasCalendario);
      const deadline = getColombiaTimestamp(
        rental.fechaDevolucionPactada || rental.fechaEvento,
        rental.horaEvento || "12:00"
      ) || (now - diasAtraso * 24 * 60 * 60 * 1000);

      const elapsedMs = Math.max(0, now - deadline);
      const totalOverdueHours = Math.floor(elapsedMs / (1000 * 60 * 60));
      const elapsedMinutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));
      const horasRestantes = totalOverdueHours % 24;

      const badgeDelay = diasAtraso >= 1
        ? (horasRestantes > 0 ? `🚨 ¡Vencido (+${diasAtraso}d ${horasRestantes}h)!` : `🚨 ¡Vencido (+${diasAtraso}d)!`)
        : `🚨 ¡Vencido (+${totalOverdueHours}h)!`;

      return {
        status: "vencido",
        badgeText: badgeDelay,
        label: `¡ALERTA DE EVENTO VENCIDO! (+${diasAtraso > 0 ? `${diasAtraso}d ` : ""}${horasRestantes}h ${elapsedMinutes}m de retraso)`,
        extraHours: totalOverdueHours,
        elapsedMinutes,
        diasAtraso,
        horasRestantes,
        color: "badge-red",
        elapsedText: `${diasAtraso > 0 ? `${diasAtraso}d ` : ""}${horasRestantes}h ${elapsedMinutes}m de retraso`,
        isOverdue: true,
        isReserva: true,
        diasFaltantes: diasCalendario
      };
    }

    // Fallback si no tiene fechaEvento
    return {
      status: "reservado",
      badgeText: `${eventEmoji} Apartado`,
      label: `Apartado: ${rental.observaciones || "Sin fecha fija"}`,
      color: "badge-purple",
      elapsedHours: 0,
      isOverdue: false,
      isReserva: true,
      diasFaltantes: null
    };
  }

  // 3. Alquiler estándar de mostrador / inmediato
  const start = new Date(rental.fechaInicio || Date.now()).getTime();
  const elapsedMs = now - start;
  const elapsedHours = Math.floor(elapsedMs / (1000 * 60 * 60));
  const elapsedMinutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));
  const maxHours = rental.duracionHoras || 24;

  if (elapsedHours >= maxHours) {
    const extraHours = elapsedHours - maxHours;
    const diasAtraso = Math.floor(extraHours / 24);
    const horasRestantes = extraHours % 24;

    const badgeDelay = diasAtraso >= 1
      ? (horasRestantes > 0 ? `¡Vencido (+${diasAtraso}d ${horasRestantes}h)!` : `¡Vencido (+${diasAtraso}d)!`)
      : `¡Vencido (+${extraHours}h)!`;

    return {
      status: "vencido",
      badgeText: badgeDelay,
      label: `¡ALERTA 24H VENCIDA! (+${diasAtraso > 0 ? `${diasAtraso}d ` : ""}${horasRestantes}h ${elapsedMinutes}m de retraso)`,
      extraHours,
      elapsedMinutes,
      diasAtraso,
      horasRestantes,
      color: "badge-red",
      elapsedText: `${elapsedHours}h ${elapsedMinutes}m transcurridas`,
      isOverdue: true,
      isReserva: false,
      hoursDiff: extraHours
    };
  } else if (elapsedHours >= maxHours - 4) {
    const remainingHours = maxHours - elapsedHours;
    return {
      status: "por_vencer",
      badgeText: `Por vencer (${remainingHours}h)`,
      label: `Por vencer (Quedan ${remainingHours}h)`,
      remainingHours,
      color: "badge-amber",
      elapsedText: `${elapsedHours}h ${elapsedMinutes}m transcurridas`,
      isOverdue: false,
      isReserva: false
    };
  } else {
    return {
      status: "activo",
      badgeText: `En Plazo (${elapsedHours}/${maxHours}h)`,
      label: `En Plazo (${elapsedHours}h de ${maxHours}h)`,
      color: "badge-blue",
      elapsedText: `${elapsedHours}h ${elapsedMinutes}m transcurridas`,
      isOverdue: false,
      isReserva: false
    };
  }
};

/**
 * Determina si un alquiler o reserva está vencido / con retraso de entrega.
 */
export const isRentalOverdue = (rental, now = Date.now()) => {
  return getRentalAlertInfo(rental, now).isOverdue;
};
