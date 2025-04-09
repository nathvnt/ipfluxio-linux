export async function loadTrafficMap(mode) {
    const mapHTML = `
        <!-- <iframe id="traffic-map-${mode}" class="h-90 w-100 no-bord" src="../backend/maps/network_traffic_map.html"></iframe> -->
        <iframe id="traffic-map-${mode}" class="h-90 w-100 no-bord" src="file:///opt/ipfluxio/backend/maps/network_traffic_map.html"></iframe>
        <div id="map-menu-${mode}" class="h-10 w-100 flex sub-bg">
            <div class="refresh-btn-wrap">
                <button id="refresh-map-btn-${mode}" class="refresh-map-btn amber-btn">Refresh Map</button>
            </div>
            <div id="" class="g-15 v-center flex my-10 p-5 text-14 row-selectors">
                <label><input type="checkbox" name="map-type" value="bubble" id="bubble-map-${mode}" checked>Bubble Map</label>
                <label><input type="checkbox" name="map-type" value="choropleth" id="choropleth-map-${mode}">Choropleth Map (Urban Areas)</label>
            </div>
        </div>
       `;
    document.getElementById(`map-container-${mode}`).innerHTML = mapHTML
}
