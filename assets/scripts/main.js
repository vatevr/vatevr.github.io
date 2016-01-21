(function($, window, document){
  L.mapbox.accessToken = 'pk.eyJ1IjoiaWNoYmlubGVlciIsImEiOiJtQ1JCN2hZIn0.ePKRwXag9-Phz4_qd_epYA';
  $(function(){


    var map = L.mapbox.map('map', 'mapbox.streets')
    .setView([38.9, -77], 12);

    // Start with a fixed marker.
    var fixedMarker = L.marker(new L.LatLng(38.9131775, -77.032544), {
        icon: L.mapbox.marker.icon({
            'marker-color': 'ff8888'
        })
    }).bindPopup('Mapbox DC').addTo(map);

    // Store the fixedMarker coordinates in a variable.
    var fc = fixedMarker.getLatLng();

    // Create a featureLayer that will hold a marker and linestring.
    var featureLayer = L.mapbox.featureLayer().addTo(map);


  });
})(jQuery, window, document);
