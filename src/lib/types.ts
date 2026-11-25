// Tipos compartidos entre páginas, componentes y endpoints de la API.

export interface FlightLeg {
    airline: string;
    flightNumber: string;
    date: string;
    depAirport: string;
    depCity: string;
    depTime: string;
    arrAirport: string;
    arrCity: string;
    arrTime: string;
    duration: string;
    // --- Equipaje ---
    personalItem: boolean;   // artículo personal, siempre incluido (informativo)
    carryOn: boolean;        // equipaje de mano 10kg
    checkedBaggage: boolean; // equipaje documentado
    checkedWeight: "23" | "25";
    checkedPieces: string;   // número de piezas, ej. "1"
}

// Llaves de FlightLeg que se muestran como <input type="text"> en el
// formulario. Excluye los campos de equipaje, que tienen su propio
// bloque de checkboxes/select (ver FlightLegFields.astro y ReservationForm.astro).
export type FlightLegTextKey =
    | "airline"
    | "flightNumber"
    | "date"
    | "depAirport"
    | "depCity"
    | "depTime"
    | "arrAirport"
    | "arrCity"
    | "arrTime"
    | "duration";

export interface Reservation {
    id: string;
    clientName: string;
    passportNumber: string;
    reservationCode: string;
    pnr: string;
    ticketNumber: string;
    createdDate: string; // ISO yyyy-mm-dd
    paymentAmount: string;
    paymentMethod: string;
    notes: string;
    hasReturn: boolean;
    outboundFlights: FlightLeg[];
    returnFlights: FlightLeg[];
    createdAt?: string;
    updatedAt?: string;
}

// Forma en la que se guarda cada fila en Supabase (snake_case).
export interface ReservationRow {
    id: string;
    client_name: string;
    passport_number: string;
    reservation_code: string;
    pnr: string;
    ticket_number: string;
    created_date: string;
    payment_amount: string;
    payment_method: string;
    notes: string;
    has_return: boolean;
    outbound_flights: FlightLeg[];
    return_flights: FlightLeg[];
    created_at: string;
    updated_at: string;
}

export function rowToReservation(row: ReservationRow): Reservation {
    return {
        id: row.id,
        clientName: row.client_name,
        passportNumber: row.passport_number,
        reservationCode: row.reservation_code,
        pnr: row.pnr,
        ticketNumber: row.ticket_number,
        createdDate: row.created_date,
        paymentAmount: row.payment_amount,
        paymentMethod: row.payment_method,
        notes: row.notes,
        hasReturn: row.has_return,
        outboundFlights: row.outbound_flights ?? [],
        returnFlights: row.return_flights ?? [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim());

// Normaliza un tramo (viene de la IA o del formulario) para que SIEMPRE
// tenga la forma esperada: strings reales (nunca null/number) y booleanos.
export function normalizeLeg(raw: any): FlightLeg {
    const l = raw && typeof raw === 'object' ? raw : {};
    const pieces = parseInt(str(l.checkedPieces), 10);
    return {
        airline: str(l.airline),
        flightNumber: str(l.flightNumber),
        date: str(l.date),
        depAirport: str(l.depAirport),
        depCity: str(l.depCity),
        depTime: str(l.depTime),
        arrAirport: str(l.arrAirport),
        arrCity: str(l.arrCity),
        arrTime: str(l.arrTime),
        duration: str(l.duration),
        personalItem: true,
        carryOn: l.carryOn === true || l.carryOn === 'true',
        checkedBaggage: l.checkedBaggage === undefined ? true : l.checkedBaggage === true || l.checkedBaggage === 'true',
        checkedWeight: str(l.checkedWeight) === '25' ? '25' : '23',
        checkedPieces: String(Number.isFinite(pieces) && pieces > 0 ? pieces : 1),
    };
}

export function reservationToRow(r: Partial<Reservation>) {
    const hasReturn = r.hasReturn === true;
    const date = str(r.createdDate);
    const now = new Date().toISOString();

    const row: Record<string, any> = {
        client_name: str(r.clientName),
        passport_number: str(r.passportNumber),
        reservation_code: str(r.reservationCode),
        pnr: str(r.pnr),
        ticket_number: str(r.ticketNumber),
        created_date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : now.slice(0, 10),
        payment_amount: str(r.paymentAmount),
        payment_method: str(r.paymentMethod),
        notes: r.notes === null || r.notes === undefined ? '' : String(r.notes),
        has_return: hasReturn,
        outbound_flights: Array.isArray(r.outboundFlights) ? r.outboundFlights.map(normalizeLeg) : [],
        return_flights: hasReturn && Array.isArray(r.returnFlights) ? r.returnFlights.map(normalizeLeg) : [],
    };

    // Solo se incluye el id si existe (para updates).
    if (r.id) {
        row.id = r.id;
    }

    return row;
}
