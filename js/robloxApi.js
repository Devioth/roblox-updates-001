const PROXY = "https://roblox-updates.unleashed-xyz.workers.dev/?url=";

async function proxyJson(url) {
   const r = await fetch(PROXY + encodeURIComponent(url));
   if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`Upstream ${r.status}: ${t || r.statusText}`);
   }
   return r.json();
}

export async function fetchGameByPlaceUrl(placeUrl) {
   const match = placeUrl.match(/roblox\.com\/games\/(\d+)/i);
   if (!match) throw new Error("Invalid Roblox URL");
   const placeId = match[1];

   const uni = await proxyJson(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
   if (!uni?.universeId) throw new Error("No universeId");

   const info = await proxyJson(`https://games.roblox.com/v1/games?universeIds=${uni.universeId}`);
   const g = info?.data?.[0];
   if (!g) throw new Error("Game info missing");

   const thumb = await proxyJson(
      `https://thumbnails.roblox.com/v1/games/icons?universeIds=${uni.universeId}&size=512x512&format=Png&isCircular=false`
   );

   return {
      placeId,
      universeId: uni.universeId,
      name: g.name,
      url: placeUrl,
      thumbnail: thumb?.data?.[0]?.imageUrl || "",
      lastUpdated: g.updated
   };
}

export async function fetchUpdates(universeIds) {
   const ids = universeIds.join(",");
   const data = await proxyJson(`https://games.roblox.com/v1/games?universeIds=${ids}`);
   return data?.data || [];
}
