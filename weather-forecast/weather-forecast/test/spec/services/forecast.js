'use strict';

describe('Service: Forecast', function () {

  // load the service's module
  beforeEach(module('weatherForecastApp'));

  // instantiate service
  var Forecast;
  beforeEach(inject(function (_Forecast_) {
    Forecast = _Forecast_;
  }));

  it('should exist', function () {
    expect(Forecast).toBeDefined();
  });

});
