// src/lib/utils.ts
import type { FlightLeg, Reservation } from './types';

export const AGENCY = {
    phone: '+503 7937 8196',
    email: 'moran.solutions@gmail.com',
    social: 'FB/IG: Moran Solutions SAS de CV',
};
export const DEFAULT_OBS = `
<strong class="font-bold text-navy">Check-in y Abordaje:</strong> Se solicita a los pasajeros presentarse en el mostrador de facturación con un mínimo de tres (3) horas de antelación al horario de salida programado. El cierre del vuelo se realiza sesenta (60) minutos antes de la partida.<br/><br/>
<strong class="font-bold text-navy">Documentación de Viaje:</strong> Es responsabilidad exclusiva del pasajero asegurar la validez y vigencia de sus documentos de viaje. El nombre que figura en el boleto debe coincidir estrictamente con su identificación oficial (pasaporte para vuelos internacionales). Para Surinam, se requiere visa para la mayoría de las nacionalidades; por favor, verifique los requisitos específicos con la embajada o consulado correspondiente.<br/><br/>
<strong class="font-bold text-navy">Política de Cambios y Cancelaciones:</strong> Este boleto no es reembolsable ni transferible una vez superado el período de cortesía de 24 horas posteriores a la compra. Los cambios de fecha o ruta están sujetos a disponibilidad de tarifa y pueden conllevar penalizaciones por parte de la aerolínea, además de cargos administrativos adicionales.<br/><br/>
<strong class="font-bold text-navy">Equipaje Permitido:</strong> La franquicia de equipaje de bodega es de una (1) pieza de hasta 23 kg. El equipaje de mano está limitado a una (1) pieza de hasta 8 kg que cumpla con las dimensiones de cabina. Los cargos por exceso de equipaje se aplicarán según la política de la aerolínea y deben ser pagados directamente en el aeropuerto.<br/><br/>
<strong class="font-bold text-navy">Artículos Prohibidos y Restringidos:</strong> Queda estrictamente prohibido el transporte de mercancías peligrosas (aerosoles, líquidos inflamables, etc.) en el equipaje de mano o de bodega, de acuerdo con las regulaciones internacionales de la IATA. Cualquier artículo sospechoso será retirado por seguridad y puede resultar en la denegación de embarque.
`;


export function blankLeg(): FlightLeg {
    return {
        airline: '', flightNumber: '', date: '',
        depAirport: '', depCity: '', depTime: '',
        arrAirport: '', arrCity: '', arrTime: '',
        duration: '',
        personalItem: true,
        carryOn: false,
        checkedBaggage: true,
        checkedWeight: '23',
        checkedPieces: '1',
    };
}
export function blankReservation(): Omit<Reservation, 'id'> {
    return {
        clientName: '', passportNumber: '', reservationCode: '', pnr: '', ticketNumber: '',
        createdDate: new Date().toISOString().slice(0, 10),
        paymentAmount: '', paymentMethod: '',
        notes: DEFAULT_OBS,
        hasReturn: false,
        outboundFlights: [blankLeg()],
        returnFlights: [],
    };
}

// Escape defensivo para cuando se inyecta texto en innerHTML desde el cliente.
// En Astro (.astro) las expresiones {} ya escapan por defecto, así que esto
// solo se usa dentro de los <script> del cliente.
export function esc(s: unknown): string {
    return (s ?? '').toString().replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    } as Record<string, string>)[c]);
}

export function routeSummary(r: Pick<Reservation, 'outboundFlights'>): string {
    const out = (r.outboundFlights || []).filter((f) => f.depAirport || f.arrAirport);
    if (!out.length) return '— · —';
    return `${out[0].depAirport || '—'} → ${out[out.length - 1].arrAirport || '—'}`;
}
