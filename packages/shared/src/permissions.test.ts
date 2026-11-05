import { test } from "node:test";
import assert from "node:assert/strict";
import { canAddNote, canChangeStatus, canEdit } from "./permissions";

const admin = { id: "a", role: "ADMIN" as const };
const ayse = { id: "ayse", role: "MEMBER" as const };
const mehmet = { id: "mehmet", role: "MEMBER" as const };
const zeynep = { id: "zeynep", role: "MEMBER" as const };

// Mehmet görevi Ayşe'ye verdi
const task = { creatorId: "mehmet", assigneeId: "ayse" };

test("durumu yalnızca görevi yapan kişi değiştirir", () => {
  assert.equal(canChangeStatus(ayse, task), true);
  assert.equal(canChangeStatus(mehmet, task), false, "veren kişi değiştiremez");
  assert.equal(canChangeStatus(admin, task), false, "yönetici değiştiremez");
  assert.equal(canChangeStatus(zeynep, task), false);
});

test("düzenleme ve silme: veren kişi ya da yönetici", () => {
  assert.equal(canEdit(mehmet, task), true);
  assert.equal(canEdit(admin, task), true);
  assert.equal(canEdit(ayse, task), false, "yapan kişi başlığı/sorumluyu değiştiremez");
  assert.equal(canEdit(zeynep, task), false);
});

test("not: yapan, veren ya da yönetici", () => {
  assert.equal(canAddNote(ayse, task), true);
  assert.equal(canAddNote(mehmet, task), true);
  assert.equal(canAddNote(admin, task), true);
  assert.equal(canAddNote(zeynep, task), false);
});

test("kendine verilen görev", () => {
  const own = { creatorId: "ayse", assigneeId: "ayse" };
  assert.equal(canChangeStatus(ayse, own), true);
  assert.equal(canEdit(ayse, own), true);
});
