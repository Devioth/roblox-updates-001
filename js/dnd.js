export function wireDragAndDrop({ categories, onMoveGame, toast }) {
   // cards will set dataTransfer: placeId + fromCatId
   // drop target = .games-scroll

   document.addEventListener("dragstart", (e) => {
      const card = e.target.closest?.(".game-card");
      if (!card) return;
      const placeId = card.dataset.placeId;
      const fromCatId = card.dataset.catId;
      e.dataTransfer.setData("text/placeId", placeId);
      e.dataTransfer.setData("text/fromCatId", fromCatId);
      e.dataTransfer.effectAllowed = "move";
   });

   document.addEventListener("dragover", (e) => {
      const lane = e.target.closest?.(".games-scroll");
      if (!lane) return;
      e.preventDefault();
      lane.classList.add("drag-over");
      e.dataTransfer.dropEffect = "move";
   });

   document.addEventListener("dragleave", (e) => {
      const lane = e.target.closest?.(".games-scroll");
      if (!lane) return;
      lane.classList.remove("drag-over");
   });

   document.addEventListener("drop", (e) => {
      const lane = e.target.closest?.(".games-scroll");
      if (!lane) return;
      e.preventDefault();
      lane.classList.remove("drag-over");

      const placeId = e.dataTransfer.getData("text/placeId");
      const fromCatId = e.dataTransfer.getData("text/fromCatId");
      const toCatId = lane.dataset.catId;

      if (!placeId || !fromCatId || !toCatId) return;
      if (fromCatId === toCatId) return; // no reorder inside category (as requested)

      onMoveGame(placeId, fromCatId, toCatId);
      const toName = categories.find(c => c.id === toCatId)?.name || "category";
      toast(`Moved to ${toName}`);
   });
}
