SELECT
  clientid AS device_key,
  'mqtt' AS transport,
  'online_status' AS message_type,
  timestamp,
  map_put('event', event, map_new()) AS headers,
  json_encode(map_put('event', event, map_put('reason', reason, map_new()))) AS payload
FROM "$events/client_connected", "$events/client_disconnected"

