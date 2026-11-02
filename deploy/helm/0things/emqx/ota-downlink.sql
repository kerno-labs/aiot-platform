SELECT
  value AS payload,
  json_decode(value) AS command,
  CASE
    WHEN is_null(command.device_name) OR command.device_name = '' THEN command.device_key
    ELSE command.device_name
  END AS device_name
FROM "$sources/kafka_consumer:ota_upgrade_commands"
