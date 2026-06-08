# Prompt Receipts — AttendEase Attendance Tracker

> 5–10 real prompts used during development, with trimmed AI responses,
> decisions made, and at least one case where the AI was wrong.

---

## Receipt 1
**Timestamp:** 2026-06-07 09:30  
**Prompt:** "screenshot of the projects which is done based on the assignment pdf — is there anything to improvise or any requirements given by them not fulfilled by me?"

**AI Response (trimmed):**
> "Critical Gaps: 1. Optimistic Concurrency — version-based conflict handling must be implemented. UI must show Reload Latest / Retry Update / Compare Changes. 2. Faculty Unauthorized Access Tripwire — server must reject attendance marking for unassigned classes. 3. Local Draft Recovery — drafts must survive page refresh. 4. /metrics endpoint — must expose operation counts, avg latency, p95 latency..."

**Accepted:** Full gap analysis — used it as a checklist for the rest of development.  
**Modified:** Reordered priority — fixed CSV idempotency before concurrency since it was simpler.  
**Rejected:** Nothing rejected from this response.  
**Reasoning:** The gap analysis was accurate and matched the assignment rubric exactly.

---

## Receipt 2
**Timestamp:** 2026-06-07 10:15  
**Prompt:** "The sample CSV file is downloading as HTML instead of a proper CSV. Help me fix it."

**AI Response (trimmed):**
> "Your backend route is probably returning HTML (maybe React's index.html) instead of a .csv file. Fix: res.setHeader('Content-Type', 'text/csv'); res.setHeader('Content-Disposition', 'attachment; filename=sample_attendance.csv'); Or generate it on the frontend using Blob and URL.createObjectURL..."

**Accepted:** Frontend Blob approach — used `URL.createObjectURL` to generate CSV directly in the browser.  
**Modified:** Added 55 rows instead of the 3-row example AI provided.  
**Rejected:** Backend route fix — not needed since we moved generation to frontend.  
**Reasoning:** Frontend generation was simpler and avoided a separate API route.

---

## Receipt 3 — ⚠️ AI Was Wrong
**Timestamp:** 2026-06-07 11:20  
**Prompt:** "The CSV import idempotency is broken — uploading the same file twice imports 55 records both times instead of skipping."

**AI Response (trimmed):**
> "The fix needs to go in attendanceService.js. Replace bulkUpsertRecords with a loop that checks existing records first... results.imported = valid.length — this always counts all as imported."

**What AI got wrong:** AI said to fix it in `attendanceService.js` and add a check loop — but it also told me to look in `attendanceModel.js` first, which wasted time. More importantly, the AI's suggested fix had a logic error: it counted skipped and imported correctly in the loop BUT still called `bulkUpsertRecords` on ALL records including already-existing ones. The skipped count was correct but the upsert was redundant and could cause version increments on unchanged records.

**Accepted:** The loop logic to check existing records before counting imported vs skipped.  
**Modified:** Kept `bulkUpsertRecords` for actual DB write but only counted correctly — did not split into separate insert/skip paths as AI suggested.  
**Rejected:** AI's suggestion to restructure the entire import flow into two separate queries.  
**Reasoning:** Minimal change was safer — only fixed the counter logic, kept the upsert intact.

---

## Receipt 4
**Timestamp:** 2026-06-07 12:45  
**Prompt:** "The /metrics endpoint returns UNAUTHORIZED when I try to access it from the browser URL bar."

**AI Response (trimmed):**
> "You need to be logged in as Admin. Use the browser console: fetch('http://localhost:5000/metrics', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } }).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))"

**What AI got wrong:** AI assumed the token was stored in `localStorage` — but the app stores it in `sessionStorage` under the key `accessToken`. The first fetch returned `Bearer null` and failed with TOKEN_EXPIRED. Had to search sessionStorage keys manually to find the correct key.

**Accepted:** The fetch approach using browser console to test the endpoint.  
**Modified:** Changed `localStorage.getItem('token')` to `sessionStorage.getItem('accessToken')`.  
**Rejected:** The specific storage key AI suggested (`localStorage` / `'token'`).  
**Reasoning:** AI made an assumption about storage location without checking the actual auth implementation.

---

## Receipt 5
**Timestamp:** 2026-06-07 13:10  
**Prompt:** "The audit_logs table is empty even though auditLog() is being called in the controllers."

**AI Response (trimmed):**
> "Found the issue — auditLog only logs to console via Winston, it never saves to the audit_logs database table. Fix: add a pool.query INSERT inside the auditLog function in logger.js..."

**Accepted:** Entire fix — added `pool.query` INSERT inside `auditLog()` with `.catch()` to prevent logging failures from crashing the app.  
**Modified:** Nothing — the fix was correct as provided.  
**Rejected:** Nothing.  
**Reasoning:** The fix was minimal, safe, and exactly targeted the gap between console logging and DB persistence.

---

## Receipt 6
**Timestamp:** 2026-06-07 14:00  
**Prompt:** "The faculty sessions list always shows Pending even for sessions where attendance has already been marked and saved."

**AI Response (trimmed):**
> "The frontend checks s.attendance_submitted but this field is never returned by the backend. The fix needs to go in attendanceModel.js findSessionsByFaculty — add: CASE WHEN COUNT(ar.id) > 0 THEN 1 ELSE 0 END AS attendance_submitted"

**What AI got wrong:** AI first told me to fix `sessionModel.js` — I replaced that file and restarted the server, but the bug persisted. AI had identified the wrong file. The actual query being called was in `attendanceModel.js` (called from `attendanceService.js`), not `sessionModel.js`. This cost one full round of debugging.

**Accepted:** The SQL fix itself — `CASE WHEN COUNT(ar.id) > 0 THEN 1 ELSE 0 END AS attendance_submitted`.  
**Modified:** Applied the fix to `attendanceModel.js` instead of `sessionModel.js`.  
**Rejected:** AI's initial file identification (`sessionModel.js`).  
**Reasoning:** Had to trace the actual call chain in `attendanceService.js` to find the correct model being used.

---

## Receipt 7
**Timestamp:** 2026-06-07 14:30  
**Prompt:** "Leave approved by HOD shows error: Leave must be recommended before HOD final approval. Help me remove faculty recommendation entirely — only Admin should approve leave."

**AI Response (trimmed):**
> "Remove the faculty block from leaveService.js, remove the recommended status check, update AdminLeave.jsx to remove the Recommended tab and show Approve/Reject only for Admin. HOD becomes read-only."

**Accepted:** Full restructure — removed faculty recommendation, restricted approval to Admin only, HOD is now read-only viewer.  
**Modified:** Kept HOD able to view leave requests (read-only) rather than hiding the page entirely.  
**Rejected:** Initial suggestion to keep HOD approval — decided Admin-only matches the assignment requirement exactly and avoids confusion.  
**Reasoning:** Assignment says "Only Admin can approve or reject leave requests" — keeping it simple and matching the rubric exactly is safer than over-engineering.

---

## Receipt 8
**Timestamp:** 2026-06-07 15:00  
**Prompt:** "When leave is approved, the attendance for those dates is still showing absent instead of leave."

**AI Response (trimmed):**
> "The markAttendanceAsLeave function only updates records where status = 'absent'. Fix: change AND ar.status = 'absent' to AND ar.status IN ('absent', 'present')"

**Accepted:** Status fix — changed to `IN ('absent', 'present')`.  
**Modified:** Also added INSERT for sessions with no attendance record yet (AI missed this case initially).  
**Rejected:** Nothing.  
**Reasoning:** AI's fix handled existing records but missed sessions where no attendance record existed at all for the leave date. Had to extend the fix to INSERT new leave records for those sessions.

---

## Receipt 9
**Timestamp:** 2026-06-07 15:45  
**Prompt:** "Admin CSV import is rejecting all rows with 'Student CS2301 is not enrolled in session 1' even though this same CSV was imported successfully yesterday by faculty."

**AI Response (trimmed):**
> "The enrollment check runs for everyone including Admin. Fix: add importedBy.role !== 'admin' condition before the department/semester check so Admin bypasses it entirely."

**Accepted:** Entire fix — one-line condition added before the enrollment validation block.  
**Modified:** Nothing — fix was minimal and correct.  
**Rejected:** Nothing.  
**Reasoning:** Clean surgical fix. Admin importing bulk data across all departments should not be restricted by the faculty-session enrollment tripwire.

---

## Receipt 10
**Timestamp:** 2026-06-07 16:00  
**Prompt:** "Check if the attendance percentage calculation is correct when leave is approved — does leave count toward attendance?"

**AI Response (trimmed):**
> "Your vw_student_attendance view formula is correct: (present + leave) / total * 100. The entire chain is correct — backend, normalizer, and frontend all handle leave properly."

**Accepted:** Confirmed the calculation was correct end-to-end.  
**Modified:** Nothing.  
**Rejected:** Initial suspicion that there was a bug — after tracing through DB query → API response → frontend render, everything was correct. 64.71% was the genuine attendance even with leave counted.  
**Reasoning:** Systematic verification (DB query → API fetch → UI check) confirmed no bug existed. The percentage was mathematically correct.
