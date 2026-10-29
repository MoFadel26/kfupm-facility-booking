// Load test for POST /api/reservations. Setup creates the facility and the user if they are missing.
//   k6 run -e BASE_URL=http://localhost:5080 -e TOKEN=<jwt for KFUPM_ID> perf/create-reservation.js
//
// Every request books a slot no other request in the run uses, so each one goes through the
// eligibility checks, the overlap query, the insert and the exclusion constraint
// and should answer 201. A 409 here means the test is broken, not the API.
import http from 'k6/http'
import { check } from 'k6'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5080'
const KFUPM_ID = __ENV.KFUPM_ID || '209900001'

export const options = {
  vus: 100,
  duration: '60s',
  thresholds: {
    http_req_failed: ['rate==0'],
  },
}

const json = { headers: { 'Content-Type': 'application/json' } }

export function setup() {
  // A new facility per run, so slots booked by an earlier run cannot collide.
  const facilityId = `F-PERF-${Date.now() % 1_000_000}`
  const facility = http.post(`${BASE_URL}/api/facilities`, JSON.stringify({
    facilityId,
    name: 'Load test room',
    type: 'Classroom',
    allowedGender: 'Any',
    allowedRole: 'Any',
  }), json)
  const user = http.post(`${BASE_URL}/api/users`, JSON.stringify({
    kfupmId: KFUPM_ID,
    name: 'Load Test',
    email: `s${KFUPM_ID}@kfupm.edu.sa`,
    role: 'Student',
    gender: 'Male',
  }), { ...json, responseCallback: http.expectedStatuses(201, 409) })
  // A 409 for the user means an earlier run created it.
  if (facility.status !== 201 || ![201, 409].includes(user.status))
    throw new Error(`setup failed: facility ${facility.status}, user ${user.status}`)
  return { facilityId }
}

// One-hour slots, 100,000 apart per VU, so no two requests overlap.
const BASE = Date.UTC(2040, 0, 1)
const HOUR = 3600 * 1000

export default function ({ facilityId }) {
  const start = BASE + ((__VU * 100_000) + __ITER) * HOUR
  const res = http.post(`${BASE_URL}/api/reservations`, JSON.stringify({
    startTime: new Date(start).toISOString(),
    endTime: new Date(start + HOUR).toISOString(),
    reason: 'Load test',
    targetParticipantCount: 2,
    facilityId,
  }), { headers: { ...json.headers, Authorization: `Bearer ${__ENV.TOKEN}` } })

  check(res, { 'status is 201': (r) => r.status === 201 })
}
