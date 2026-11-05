import { test } from "node:test";
import assert from "node:assert/strict";
import { addDaysKey, dueLabel, longDate } from "./dates";

const today = "2026-11-05"; // Perşembe

test("kelimeyle tarih", () => {
  assert.deepEqual(dueLabel("2026-11-03", today), { text: "2 gün gecikti", tone: "overdue" });
  assert.deepEqual(dueLabel("2026-11-05", today), { text: "Bugün", tone: "today" });
  assert.deepEqual(dueLabel("2026-11-06", today), { text: "Yarın", tone: "tomorrow" });
  assert.equal(dueLabel("2026-11-07", today).text, "Cumartesi, 7 Kas");
  assert.equal(dueLabel("2026-11-20", today).text, "20 Kas");
  assert.equal(dueLabel("2027-01-03", today).text, "3 Oca 2027");
  assert.equal(longDate(today), "Perşembe, 5 Kasım");
});

test("gün ekleme ay/yıl sınırını geçer", () => {
  assert.equal(addDaysKey("2026-12-31", 1), "2027-01-01");
  assert.equal(addDaysKey("2026-03-01", -1), "2026-02-28");
});
