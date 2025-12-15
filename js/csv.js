// CSV format:
// category_id,category_name,placeId,universeId,game_name,game_url,thumbnail,lastUpdated

function esc(v) {
   const s = String(v ?? "");
   if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
   return s;
}

export function exportCsv(categories) {
   const header = [
      "category_id", "category_name", "placeId", "universeId", "game_name", "game_url", "thumbnail", "lastUpdated"
   ].join(",");

   const rows = [];
   for (const c of categories) {
      if (!c.games.length) {
         rows.push([c.id, c.name, "", "", "", "", "", ""].map(esc).join(","));
         continue;
      }
      for (const g of c.games) {
         rows.push([
            c.id, c.name, g.placeId, g.universeId, g.name, g.url, g.thumbnail, g.lastUpdated
         ].map(esc).join(","));
      }
   }

   return header + "\n" + rows.join("\n");
}

export function downloadText(filename, text) {
   const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
   const url = URL.createObjectURL(blob);
   const a = document.createElement("a");
   a.href = url;
   a.download = filename;
   document.body.appendChild(a);
   a.click();
   a.remove();
   URL.revokeObjectURL(url);
}

export async function importCsvFile(file) {
   const text = await file.text();
   return parseCsv(text);
}

// minimal CSV parser supporting quotes
function parseCsv(text) {
   const lines = text.replace(/\r/g, "").split("\n").filter(l => l.trim().length);
   if (lines.length < 1) throw new Error("Empty CSV");

   const out = new Map(); // category_id -> category object
   const header = lines[0].split(",").map(h => h.trim());

   const idx = (name) => header.indexOf(name);
   const iCatId = idx("category_id");
   const iCatName = idx("category_name");
   const iPlace = idx("placeId");
   const iUni = idx("universeId");
   const iName = idx("game_name");
   const iUrl = idx("game_url");
   const iThumb = idx("thumbnail");
   const iUpd = idx("lastUpdated");

   if ([iCatId, iCatName, iPlace, iUni, iName, iUrl, iThumb, iUpd].some(x => x === -1)) {
      throw new Error("CSV header mismatch");
   }

   for (let li = 1; li < lines.length; li++) {
      const cols = splitCsvLine(lines[li]);
      const catId = cols[iCatId] || crypto.randomUUID();
      const catName = cols[iCatName] || "Imported";

      if (!out.has(catId)) out.set(catId, { id: catId, name: catName, games: [] });

      const placeId = cols[iPlace];
      if (!placeId) continue; // category-only row

      out.get(catId).games.push({
         placeId,
         universeId: cols[iUni],
         name: cols[iName],
         url: cols[iUrl],
         thumbnail: cols[iThumb],
         lastUpdated: cols[iUpd]
      });
   }

   return Array.from(out.values());
}

function splitCsvLine(line) {
   const res = [];
   let cur = "";
   let inQ = false;

   for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
         if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
         else if (ch === '"') inQ = false;
         else cur += ch;
      } else {
         if (ch === '"') inQ = true;
         else if (ch === ",") { res.push(cur); cur = ""; }
         else cur += ch;
      }
   }
   res.push(cur);
   return res;
}
