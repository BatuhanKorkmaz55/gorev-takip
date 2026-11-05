import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQuickAdd, matchUser, parseDueWord } from "./quickAdd";

const users = [
  { id: "u1", name: "Ayşe Yılmaz", email: "ayse@firma.com" },
  { id: "u2", name: "Ali Kaya", email: "ali.kaya@firma.com" },
  { id: "u3", name: "Alican Demir", email: "alican@firma.com" },
  { id: "u4", name: "İsmail Öztürk", email: "ismail@firma.com" },
];
const today = "2026-11-05"; // Perşembe

test("tam örnek", () => {
  const r = parseQuickAdd("Teklif dosyasını hazırla @ayşe !acil #Satış yarın", { users, today });
  assert.equal(r.title, "Teklif dosyasını hazırla");
  assert.equal(r.assigneeId, "u1");
  assert.equal(r.priority, "URGENT");
  assert.deepEqual(r.tags, ["satış"]);
  assert.equal(r.dueDate, "2026-11-06");
});

test("sadece başlık", () => {
  const r = parseQuickAdd("  Faturaları kontrol et  ", { users, today });
  assert.equal(r.title, "Faturaları kontrol et");
  assert.equal(r.assigneeId, undefined);
  assert.equal(r.tokens.length, 0);
});

test("kullanıcı eşleştirme", () => {
  assert.equal(matchUser("ali", users)?.id, "u2"); // tam ilk isim, alican'dan önce
  assert.equal(matchUser("alic", users)?.id, "u3");
  assert.equal(matchUser("ismail", users)?.id, "u4");
  assert.equal(matchUser("İSMAİL", users)?.id, "u4");
  assert.equal(matchUser("ozturk", users)?.id, "u4");
  assert.equal(matchUser("ben", users, "u2")?.id, "u2");
  assert.equal(matchUser("al", users), undefined); // belirsiz
});

test("bulunamayan kişi başlıkta kalır", () => {
  const r = parseQuickAdd("Mail at @zeynep", { users, today });
  assert.equal(r.title, "Mail at @zeynep");
  assert.equal(r.tokens[0].ok, false);
});

test("tarihler", () => {
  assert.equal(parseDueWord("bugün", today), "2026-11-05");
  assert.equal(parseDueWord("Cuma", today), "2026-11-06");
  assert.equal(parseDueWord("perşembe", today), "2026-11-05");
  assert.equal(parseDueWord("pazartesi", today), "2026-11-09");
  assert.equal(parseDueWord("haftaya", today), "2026-11-12");
  assert.equal(parseDueWord("+3", today), "2026-11-08");
  assert.equal(parseDueWord("+10g", today), "2026-11-15");
  assert.equal(parseDueWord("20.11", today), "2026-11-20");
  assert.equal(parseDueWord("03.01", today), "2027-01-03");
  assert.equal(parseDueWord("15/12/2026", today), "2026-12-15");
  assert.equal(parseDueWord("31.02", today), undefined);
  assert.equal(parseDueWord("rapor", today), undefined);
});

test("öncelik kısayolları", () => {
  assert.equal(parseQuickAdd("Sunucu çöktü !!!", { today }).priority, "URGENT");
  assert.equal(parseQuickAdd("Yedek al !!", { today }).priority, "HIGH");
  assert.equal(parseQuickAdd("Rapor !düşük", { today }).priority, "LOW");
  assert.equal(parseQuickAdd("Harika!", { today }).title, "Harika!");
});

test("atamasız", () => {
  const r = parseQuickAdd("Genel iş @kimse", { users, today });
  assert.equal(r.assigneeId, null);
  assert.equal(r.title, "Genel iş");
});
