// TSL模板 - 名称使用翻译键，实际显示名称在渲染时翻译
export const TSL_TEMPLATES = {
  empty: {
    nameKey: 'productDetail.featureDefinition.templates.empty',
    value: {
      schema: 'schema.json',
      version: '1.0.0',
      profile: {
        productKey: 'PRODUCT_KEY',
      },
      properties: [],
      events: [],
      services: [],
    },
  },
  sensor: {
    nameKey: 'productDetail.featureDefinition.templates.sensor',
    value: {
      schema: 'schema.json',
      version: '1.0.0',
      profile: {
        productKey: 'PRODUCT_KEY',
      },
      properties: [
        {
          identifier: 'temperature',
          name: 'Temperature',
          accessMode: 'r',
          required: false,
          dataType: {
            type: 'double',
            specs: {
              min: '-50',
              max: '150',
              unit: '°C',
              step: '0.1',
            },
          },
        },
        {
          identifier: 'humidity',
          name: 'Humidity',
          accessMode: 'r',
          required: false,
          dataType: {
            type: 'double',
            specs: {
              min: '0',
              max: '100',
              unit: '%',
              step: '0.1',
            },
          },
        },
      ],
      events: [
        {
          identifier: 'temp_humi_report',
          name: 'Temperature and Humidity Report',
          type: 'info',
          required: false,
          outputData: [
            {
              identifier: 'temperature',
              name: 'Temperature',
              dataType: {
                type: 'double',
                specs: {
                  min: '-50',
                  max: '150',
                  unit: '°C',
                  step: '0.1',
                },
              },
            },
            {
              identifier: 'humidity',
              name: 'Humidity',
              dataType: {
                type: 'double',
                specs: {
                  min: '0',
                  max: '100',
                  unit: '%',
                  step: '0.1',
                },
              },
            },
          ],
        },
      ],
      services: [],
    },
  },
  switch: {
    nameKey: 'productDetail.featureDefinition.templates.switch',
    value: {
      schema: 'schema.json',
      version: '1.0.0',
      profile: {
        productKey: 'PRODUCT_KEY',
      },
      properties: [
        {
          identifier: 'powerstate',
          name: 'Power State',
          accessMode: 'rw',
          required: false,
          dataType: {
            type: 'bool',
            specs: {
              '0': 'Off',
              '1': 'On',
            },
          },
        },
      ],
      events: [],
      services: [
        {
          identifier: 'set',
          name: 'Set',
          required: false,
          callType: 'async',
          inputData: [
            {
              identifier: 'powerstate',
              name: 'Power State',
              dataType: {
                type: 'bool',
                specs: {
                  '0': 'Off',
                  '1': 'On',
                },
              },
            },
          ],
          outputData: [],
        },
      ],
    },
  },
  advanced: {
    nameKey: 'productDetail.featureDefinition.templates.advanced',
    value: {
      schema: 'schema.json',
      version: '1.0.0',
      profile: {
        productKey: 'PRODUCT_KEY',
      },
      properties: [
        {
          identifier: 'location',
          name: 'Location',
          accessMode: 'r',
          required: false,
          dataType: {
            type: 'struct',
            specs: {
              lng: { type: 'double' },
              lat: { type: 'double' },
              speed: { type: 'float' },
            },
          },
        },
        {
          identifier: 'status',
          name: 'Status',
          accessMode: 'r',
          required: false,
          dataType: {
            type: 'enum',
            specs: {
              '0': 'Standby',
              '1': 'Working',
              '2': 'Fault',
            },
          },
        },
        {
          identifier: 'tags',
          name: 'Tags',
          accessMode: 'rw',
          required: false,
          dataType: {
            type: 'array',
            specs: {
              type: 'string',
              size: 10,
            },
          },
        },
      ],
      events: [
        {
          identifier: 'fault',
          name: 'Fault Alert',
          type: 'error',
          required: false,
          outputData: [
            {
              identifier: 'code',
              name: 'Fault Code',
              dataType: {
                type: 'int',
              },
            },
            {
              identifier: 'message',
              name: 'Fault Message',
              dataType: {
                type: 'string',
              },
            },
          ],
        },
      ],
      services: [
        {
          identifier: 'reboot',
          name: 'Reboot',
          required: false,
          callType: 'async',
          inputData: [],
          outputData: [
            {
              identifier: 'result',
              name: 'Result',
              dataType: {
                type: 'bool',
              },
            },
          ],
        },
      ],
    },
  },
} as const

// Common engineering units
export const COMMON_UNITS = [
  'none',
  '°C',
  '°F',
  '%',
  'V',
  'mV',
  'A',
  'mA',
  'W',
  'kW',
  'kW·h',
  'Pa',
  'kPa',
  'MPa',
  'bar',
  'm/s',
  'km/h',
  'rpm',
  'lx',
  'dB',
  'ppm',
  'mg/L',
  'μg/m³',
  's',
  'min',
  'h',
  'custom',
] as const
