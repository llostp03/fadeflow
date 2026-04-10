import { API_BASE } from '../config/appConstants';

/**
 * Payload for a future barber-facing appointments API.
 * @typedef {Object} AIAppointmentDraft
 * @property {string} clientName
 * @property {string} service
 * @property {string} barberName
 * @property {string} preferredDate
 * @property {string} preferredTime
 * @property {string[]} [conversationSummary] — short staff context from the chat
 */

/**
 * Persist an AI-assisted booking. Wire to e.g. `POST /ai-bookings` when the backend accepts it.
 * @param {AIAppointmentDraft} payload
 * @returns {Promise<{ ok: boolean, confirmation?: string, error?: string }>}
 */
export async function submitAIAppointmentDraft(payload) {
  // const res = await fetch(`${API_BASE}/ai-bookings`, {
  //   method: 'POST',
  //   headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  //   body: JSON.stringify(payload),
  // });
  // const data = await res.json().catch(() => ({}));
  // if (!res.ok) return { ok: false, error: String(data.detail || data.error || 'Request failed') };
  // return { ok: true, confirmation: data.confirmation };

  void API_BASE;
  void payload;
  return {
    ok: false,
    error:
      'Booking API not connected yet. Your details are ready to send once the barber endpoint is live.',
  };
}
