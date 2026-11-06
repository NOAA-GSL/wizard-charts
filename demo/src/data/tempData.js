const tempData = {
  type: 'xarray.Dataset',
  dims: {
    x: 1,
    y: 1,
    percentile_precipitation_accumulation_6_hour_percentiles: 21,
    time_precipitation_accumulation_6_hour_percentiles: 4,
  },
  coords: {
    x: { dims: ['x'], data: [-98.36], attrs: {} },
    y: { dims: ['y'], data: [38.25], attrs: {} },
    percentile_precipitation_accumulation_6_hour_percentiles: {
      dims: ['percentile_precipitation_accumulation_6_hour_percentiles'],
      data: [
        0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85,
        90, 95, 100,
      ],
      attrs: {},
    },
    time_precipitation_accumulation_6_hour_percentiles: {
      dims: ['time_precipitation_accumulation_6_hour_percentiles'],
      data: [
        '2026-11-04T00:00:00.000000000',
        '2026-11-04T18:00:00.000000000',
        '2026-11-05T00:00:00.000000000',
        '2026-11-05T06:00:00.000000000',
      ],
      attrs: {},
    },
  },
  data_vars: {
    precipitation_accumulation_6_hour_percentiles: {
      dims: [
        'time_precipitation_accumulation_6_hour_percentiles',
        'percentile_precipitation_accumulation_6_hour_percentiles',
      ],
      data: [
        [
          0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
          0.0, 0.0, 0.0, 0.0, 0.0, 0.07999999821186066, 0.5,
        ],
        [
          0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
          0.019999999552965164, 0.05000000074505806, 0.07000000029802322,
          0.11999999731779099, 0.11999999731779099, 0.25999999046325684,
          0.4099999964237213,
        ],
        [
          0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
          0.0, 0.0, 0.0, 0.0, 0.019999999552965164, 0.019999999552965164,
          0.1899999976158142,
        ],
        [
          0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
          0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.3499999940395355,
        ],
      ],
      attrs: {
        grib_section3: [
          0, 3744965, 0, 0, 30, 1, 0, 6371200, 255, 255, 255, 255, 2345, 1597,
          19229000, 233723400, 48, 25000000, 265000000, 2539703, 2539703, 0, 64,
          25000000, 25000000, -90000000, 0,
        ],
        long_name: 'Total Precipitation',
        short_name: 'APCP',
        originating_center: 'US National Weather Service - NCEP',
        originating_sub_center: 'NWS Meteorological Development Laboratory',
        master_table_info: 'Version Implemented on 7 November 2001',
        product_definition_template_number:
          'Percentile forecasts at a horizontal level or in a horizontal layer in a continuous or non-continuous time interval. (see Template 4.10)',
        type_of_generating_process: 'Forecast',
        type_of_first_fixed_surface: 'Ground or Water Surface (unknown)',
        type_of_second_fixed_surface: 'Missing (unknown)',
        crs_wkt:
          'PROJCRS["unknown",BASEGEOGCRS["unknown",DATUM["unknown",ELLIPSOID["unknown",6371200,0,LENGTHUNIT["metre",1,ID["EPSG",9001]]]],PRIMEM["Greenwich",0,ANGLEUNIT["degree",0.0174532925199433],ID["EPSG",8901]]],CONVERSION["unknown",METHOD["Lambert Conic Conformal (2SP)",ID["EPSG",9802]],PARAMETER["Latitude of false origin",25,ANGLEUNIT["degree",0.0174532925199433],ID["EPSG",8821]],PARAMETER["Longitude of false origin",265,ANGLEUNIT["degree",0.0174532925199433],ID["EPSG",8822]],PARAMETER["Latitude of 1st standard parallel",25,ANGLEUNIT["degree",0.0174532925199433],ID["EPSG",8823]],PARAMETER["Latitude of 2nd standard parallel",25,ANGLEUNIT["degree",0.0174532925199433],ID["EPSG",8824]],PARAMETER["Easting at false origin",0,LENGTHUNIT["metre",1],ID["EPSG",8826]],PARAMETER["Northing at false origin",0,LENGTHUNIT["metre",1],ID["EPSG",8827]]],CS[Cartesian,2],AXIS["(E)",east,ORDER[1],LENGTHUNIT["metre",1,ID["EPSG",9001]]],AXIS["(N)",north,ORDER[2],LENGTHUNIT["metre",1,ID["EPSG",9001]]]]',
        gridlength_x_direction: 2539.703,
        gridlength_y_direction: 2539.703,
        latitude_first_gridpoint: 19.229,
        longitude_first_gridpoint: 233.7234,
        standard_name: 'lwe_thickness_of_precipitation_amount',
        cell_methods: 'time: sum',
        decoded_dtype: 'float32',
        coordinates:
          'duration forecast_reference_time ground_or_water_surface lead_time',
        add_offset: 0.0,
        scale_factor: 0.001,
        _FillValue: -2147483647,
        units: 'in',
      },
    },
  },
  attrs: {},
};

export default tempData;
