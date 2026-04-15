import { test, expect } from "vitest";
import { parseD1PostRow } from "./specs";

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
