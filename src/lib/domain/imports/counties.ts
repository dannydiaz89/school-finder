/**
 * California county codes, the first two digits of a CDS code. Stable since
 * the coding was adopted; listed so `--county Sacramento` can filter any
 * source file by CDS prefix without needing the directory file.
 */
export const COUNTY_CODES: Record<string, string> = {
  "01": "Alameda",
  "02": "Alpine",
  "03": "Amador",
  "04": "Butte",
  "05": "Calaveras",
  "06": "Colusa",
  "07": "Contra Costa",
  "08": "Del Norte",
  "09": "El Dorado",
  "10": "Fresno",
  "11": "Glenn",
  "12": "Humboldt",
  "13": "Imperial",
  "14": "Inyo",
  "15": "Kern",
  "16": "Kings",
  "17": "Lake",
  "18": "Lassen",
  "19": "Los Angeles",
  "20": "Madera",
  "21": "Marin",
  "22": "Mariposa",
  "23": "Mendocino",
  "24": "Merced",
  "25": "Modoc",
  "26": "Mono",
  "27": "Monterey",
  "28": "Napa",
  "29": "Nevada",
  "30": "Orange",
  "31": "Placer",
  "32": "Plumas",
  "33": "Riverside",
  "34": "Sacramento",
  "35": "San Benito",
  "36": "San Bernardino",
  "37": "San Diego",
  "38": "San Francisco",
  "39": "San Joaquin",
  "40": "San Luis Obispo",
  "41": "San Mateo",
  "42": "Santa Barbara",
  "43": "Santa Clara",
  "44": "Santa Cruz",
  "45": "Shasta",
  "46": "Sierra",
  "47": "Siskiyou",
  "48": "Solano",
  "49": "Sonoma",
  "50": "Stanislaus",
  "51": "Sutter",
  "52": "Tehama",
  "53": "Trinity",
  "54": "Tulare",
  "55": "Tuolumne",
  "56": "Ventura",
  "57": "Yolo",
  "58": "Yuba",
};

/** "Sacramento" or "34" -> "34". Undefined when unknown. */
export function countyCode(nameOrCode: string): string | undefined {
  const text = nameOrCode.trim();
  if (/^\d{1,2}$/.test(text)) {
    const code = text.padStart(2, "0");
    return code in COUNTY_CODES ? code : undefined;
  }
  const lower = text.toLowerCase();
  return Object.entries(COUNTY_CODES).find(([, name]) => name.toLowerCase() === lower)?.[0];
}
