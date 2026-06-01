import { test, expect } from "vitest";
import { parseD1PostRow, parseInstagramRow, parseInstagramRows } from "./specs";

test("parseD1PostRow successfully parses a valid row", () => {
  const mockD1Row = {
    id: 1,
    text: "Happy Birthday!",
    account: "rcnairobisouth",
    photos_json: '["photo1.jpg", "photo2.jpg"]',
    hashtags_json: '["#birthday", "#rotary"]',
    type: "BIRTHDAY_POST",
  };

  const domainModel = parseD1PostRow(mockD1Row);

  expect(domainModel.id).toBe(1);
  expect(domainModel.photos).toEqual(["photo1.jpg", "photo2.jpg"]);
  expect(domainModel.hashtags).toEqual(["#birthday", "#rotary"]);
  expect(domainModel.media_type).toBe("BIRTHDAY_POST");
});

test("parseD1PostRow handles null JSON columns as empty arrays", () => {
  const mockD1Row = {
    id: 2,
    text: null,
    account: null,
    photos_json: null,
    hashtags_json: null,
  };

  const domainModel = parseD1PostRow(mockD1Row);

  expect(domainModel.photos).toEqual([]);
  expect(domainModel.hashtags).toEqual([]);
});

test("parseD1PostRow throws on malformed id", () => {
  const malformedRow = {
    id: "not-a-number",
  };

  expect(() => parseD1PostRow(malformedRow)).toThrow();
});

test("parseD1PostRow handles JSON parse failures gracefully", () => {
  const mockD1Row = {
    id: 3,
    text: null,
    account: null,
    photos_json: "{invalid json}",
    hashtags_json: "[invalid json",
  };

  const domainModel = parseD1PostRow(mockD1Row);
  expect(domainModel.photos).toEqual([]);
  expect(domainModel.hashtags).toEqual([]);
});

test("parseD1PostRow prepends validRow.file_name to photos array and filters duplicates", () => {
  const mockD1Row = {
    id: 4,
    text: null,
    account: null,
    photos_json: '["photo1.jpg", "photo2.jpg", "matched.jpg"]',
    hashtags_json: null,
    file_name: "matched.jpg",
  };

  const domainModel = parseD1PostRow(mockD1Row);
  expect(domainModel.photos).toEqual(["matched.jpg", "photo1.jpg", "photo2.jpg"]);
});

test("parseInstagramRow and parseInstagramRows parse raw instagram row data", () => {
  const mockRow = {
    id: 10,
    photo_src: "thumb.jpg",
    text: "Caption text",
  };

  const parsed = parseInstagramRow(mockRow);
  expect(parsed).toEqual({
    postId: 10,
    src: "thumb.jpg",
    text: "Caption text",
  });

  const parsedList = parseInstagramRows([mockRow]);
  expect(parsedList[0]).toEqual(parsed);
});
