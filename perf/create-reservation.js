// Load test for POST /api/reservations. Start the API with Bootstrap__AdminKfupmId set to
// ADMIN_ID (default 209900000), then:
//   k6 run -e BASE_URL=http://localhost:5080 perf/create-reservation.js
//
// Setup signs in an admin (to create a facility) and a student (who books), registering
// them on the first run. Every request books a slot no other request in the run uses, so
// each one goes through the eligibility checks, the overlap query, the insert and the
// exclusion constraint and should answer 201. A 409 here means the test is broken, not
// the API.
import http from 'k6/http'
import { check } from 'k6'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5080'
const ADMIN_ID = __ENV.ADMIN_ID || '209900000'
const STUDENT_ID = __ENV.STUDENT_ID || '209900001'
const PASSWORD = 'load-test-password'

export const options = {
  vus: 100,
  duration: '60s',
  thresholds: {
    // Only the bookings: setup's register calls answer 409 on every run after the first.
    'http_req_failed{scenario:default}': ['rate==0'],
  },
}

const json = { headers: { 'Content-Type': 'application/json' } }

/** Logs in, registering the account first if it does not exist yet. Returns a token. */
function signIn(kfupmId) {
  http.post(`${BASE_URL}/api/auth/register`, JSON.stringify({
    kfupmId,
    name: `Load Test ${kfupmId}`,
    email: `s${kfupmId}@kfupm.edu.sa`,
    gender: 'Male',
    password: PASSWORD,
  }), { ...json, responseCallback: http.expectedStatuses(201, 409) })
  const login = http.post(`${BASE_URL}/api/auth/login`,
    JSON.stringify({ kfupmId, password: PASSWORD }), json)
  if (login.status !== 200) throw new Error(`login as ${kfupmId} failed: ${login.status}`)
  return login.json('token')
}

export function setup() {
  const adminToken = signIn(ADMIN_ID)
  const token = signIn(STUDENT_ID)

  // A new facility per run, so slots booked by an earlier run cannot collide.
  const facilityId = `F-PERF-${Date.now() % 1_000_000}`
  const facility = http.post(`${BASE_URL}/api/facilities`, JSON.stringify({
    facilityId,
    name: 'Load test room',
    type: 'Classroom',
    allowedGender: 'Any',
    allowedRole: 'Any',
  }), { headers: { ...json.headers, Authorization: `Bearer ${adminToken}` } })
  if (facility.status !== 201) throw new Error(`creating the facility failed: ${facility.status}`)
  return { facilityId, token }
}

// One-hour slots, 100,000 apart per VU, so no two requests overlap.
const BASE = Date.UTC(2040, 0, 1)
const HOUR = 3600 * 1000

export default function ({ facilityId, token }) {
  const start = BASE + ((__VU * 100_000) + __ITER) * HOUR
  const res = http.post(`${BASE_URL}/api/reservations`, JSON.stringify({
    startTime: new Date(start).toISOString(),
    endTime: new Date(start + HOUR).toISOString(),
    reason: 'Load test',
    targetParticipantCount: 2,
    facilityId,
  }), { headers: { ...json.headers, Authorization: `Bearer ${token}` } })

  check(res, { 'status is 201': (r) => r.status === 201 })
}
