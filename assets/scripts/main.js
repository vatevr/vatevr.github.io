(function($, window, document){
  // L.mapbox.accessToken = 'pk.eyJ1IjoiaWNoYmlubGVlciIsImEiOiJtQ1JCN2hZIn0.ePKRwXag9-Phz4_qd_epYA';
  // $(function(){
  //
  //
  //   var map = L.mapbox.map('map', 'mapbox.streets')
  //   .setView([38.9, -77], 12);
  //
  //   // Start with a fixed marker.
  //   var fixedMarker = L.marker(new L.LatLng(38.9131775, -77.032544), {
  //       icon: L.mapbox.marker.icon({
  //           'marker-color': 'ff8888'
  //       })
  //   }).bindPopup('Mapbox DC').addTo(map);
  //
  //   // Store the fixedMarker coordinates in a variable.
  //   var fc = fixedMarker.getLatLng();
  //
  //   // Create a featureLayer that will hold a marker and linestring.
  //   var featureLayer = L.mapbox.featureLayer().addTo(map);
  //
  //
  // });
  console.log("document ready");

  var grid = $("#grid").kendoGrid({
      selectable: true,
      dataSource: {
          type: "odata",
          transport: {
              read: "http://demos.telerik.com/kendo-ui/service/Northwind.svc/Orders"
          },
          schema: {
            model: {
              fields: {
                  OrderID: { type: "number" },
                  Freight: { type: "number" },
                  ShipName: { type: "string" },
                  OrderDate: { type: "date" },
                  ShipCity: { type: "string" }
              }
            }
          },
          pageSize: 20,
          serverPaging: true,
          serverFiltering: true,
          serverSorting: true
      },
      height: 550,
      filterable: true,
      sortable: true,
      pageable: true,
      dataBinding: onDataBinding,
      dataBound: onDataBound,
      columns: [{
              field: "OrderID",
              filterable: false
          },
          "Freight",
          {
              field: "OrderDate",
              title: "Order Date",
              format: "{0:MM/dd/yyyy}"
          }, {
              field: "ShipName",
              title: "Ship Name"
          }, {
              field: "ShipCity",
              title: "Ship City"
          }
      ]
  }).data("kendoGrid");

  $('.button').bind("click", function() {
    console.log(grid.dataSource.read());
    grid.refresh();
  });

  function onDataBinding(e){
    console.log(grid.dataSource.view()[0]);
  }

  function onDataBound(e){
    console.log(grid.dataSource.view()[0]);
  }

})(jQuery, window, document);
