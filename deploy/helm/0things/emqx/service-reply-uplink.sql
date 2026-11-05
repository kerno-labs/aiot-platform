SELECT
  nth(5, tokens(topic, '/')) AS product_key,
  nth(6, tokens(topic, '/')) AS device_key,
  'mqtt' AS transport,
  'service_reply' AS message_type,
  timestamp,
  map_put('topic', topic, map_new()) AS headers,
  payload AS payload
FROM "/sys/thing/service/reply/+/+"

